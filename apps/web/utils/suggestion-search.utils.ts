import type { Page } from '@playwright/test';
import type { LocatorSuggestion } from '../../../core/utils/locator-error';
import { extractLiveSemanticSnapshot, type SmartElementSemanticSnapshot } from './smart-locator.utils';
import { scoreCandidateSimilarity } from './similarity-engine.utils';
import { WebLocator } from './web.utils';

export interface AriaSnapshotNode {
  role: string;
  name: string;
}

export interface SuggestionCandidate {
  role: string;
  name: string;
  score: number;
}

// A step below history-healing's 0.85 floor — this stage only ever fires as a
// last resort, so the bar for "worth mentioning at all" is deliberately lower.
const SUGGESTION_MIN_SCORE = 0.5;

// Flattens Playwright's ariaSnapshot() YAML into a flat list of { role, name } pairs.
// Only role + name ever come out — bracketed attributes like [level=1]/[checked]/[href=...]
// are always discarded, and nesting/indentation is ignored (only identity matters here,
// not tree structure). Attribute-only lines (e.g. "- /url: ...") are skipped entirely.
//
// e.g. given:
//   - heading "todos" [level=1]
//   - textbox "What needs to be done?"
//   - list:
//     - listitem:
//       - checkbox "Toggle Todo" [checked]
//       - text: Buy milk
//       - button "Delete"
//   - link "GitHub" [href=...]
//     - /url: https://github.com
//   - strong: "2"
//   - text: items left
//
// this returns:
//   [
//     { role: "heading",  name: "todos" },
//     { role: "textbox",  name: "What needs to be done?" },
//     { role: "list",     name: "" },
//     { role: "listitem", name: "" },
//     { role: "checkbox", name: "Toggle Todo" },
//     { role: "text",     name: "Buy milk" },
//     { role: "button",   name: "Delete" },
//     { role: "link",     name: "GitHub" },
//     { role: "strong",   name: "2" },
//     { role: "text",     name: "items left" },
//   ]
// (the "- /url: ..." line is dropped, and every "[...]" attribute vanishes with no trace)
// NOTE: role corresponds to TAG in DOM.
export const parseAriaSnapshotNodes = (yaml: string): AriaSnapshotNode[] => {
  const nodes: AriaSnapshotNode[] = [];

  for (const rawLine of yaml.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('- /')) {
      continue;
    }

    const withoutDash = line.replace(/^-\s*/, '');

    // "role \"name\"" (+ optional "[attrs]" or trailing ":") — e.g. `heading "todos" [level=1]`
    const quotedNameMatch = /^([a-zA-Z][\w-]*)\s+"([^"]*)"/.exec(withoutDash);
    if (quotedNameMatch !== null) {
      nodes.push({ role: quotedNameMatch[1] ?? '', name: quotedNameMatch[2] ?? '' });
      continue;
    }

    // "role: value" / "role: \"value\"" / bare "role:" — e.g. `strong: "2"`, `list:`
    const colonMatch = /^([a-zA-Z][\w-]*):\s*"?([^"]*?)"?\s*$/.exec(withoutDash);
    if (colonMatch !== null) {
      nodes.push({ role: colonMatch[1] ?? '', name: colonMatch[2] ?? '' });
    }
  }

  return nodes;
};

// Cheap first pass: score every node from a single aria-snapshot round trip using
// only role/name — tag/text aren't known until a candidate is actually resolved.
export const findBestSuggestionCandidate = (
  nodes: AriaSnapshotNode[],
  recorded: SmartElementSemanticSnapshot | undefined,
): SuggestionCandidate | undefined => {
  if (recorded === undefined) {
    return undefined;
  }

  let best: SuggestionCandidate | undefined;

  for (const node of nodes) {
    const { score } = scoreCandidateSimilarity(recorded, {
      role: node.role,  
      name: node.name,
      text: '',
      tag: '',
    });

    if (best === undefined || score > best.score) {
      best = { role: node.role, name: node.name, score };
    }
  }

  if (best === undefined || best.score < SUGGESTION_MIN_SCORE) {
    return undefined;
  }

  return best;
};

// One whole-page ariaSnapshot() round trip, parsed and scored to find the best-guess candidate.
export const searchForSuggestionCandidate = async (
  page: Page,
  recorded: SmartElementSemanticSnapshot | undefined,
): Promise<SuggestionCandidate | undefined> => {
  const yaml = await page.locator('body').ariaSnapshot();
  const nodes = parseAriaSnapshotNodes(yaml);
  return findBestSuggestionCandidate(nodes, recorded);
};

// Resolves a scored candidate back to a live element via getByRole — this is the
// only point where the suggestion becomes an actual, actionable locator instead of
// just a role/name guess. Discarded if not currently visible (see isVisible check
// below), since a hidden element isn't something a human can act on right now.
// An id on the resolved element upgrades the suggestion to a constructable `#id`
// locator; without one, only the semantics (role/name/text/tag) are reported.
export const resolveSuggestion = async (
  page: Page,
  candidate: SuggestionCandidate,
): Promise<LocatorSuggestion | undefined> => {
  const role = candidate.role as Parameters<Page['getByRole']>[0];
  const options = candidate.name.length > 0 ? { name: candidate.name } : undefined;
  const resolved = new WebLocator(page.getByRole(role, options).first());

  // isVisible() covers both cases in one check: it returns false immediately when
  // nothing matches at all, and also false when a match exists but is hidden — a
  // hidden suggestion isn't actionable, so it's not worth reporting either.
  const visible = await resolved.isVisible();
  if (!visible) {
    return undefined;
  }

  // Need to get the Semantic snapshot and the element's ID concurrently, which can be sent to the user in the report.
  const [semantics, id] = await Promise.all([
    extractLiveSemanticSnapshot(resolved),
    resolved.locator.evaluate(element => element.id),
  ]);

  return {
    score: candidate.score,
    semantics,
    constructedLocator: id.length > 0 ? { kind: 'css', value: `#${id}` } : undefined,
  };
};

// Top-level entry point for the whole suggestion-search stage — chains the cheap
// scoring pass (searchForSuggestionCandidate) into the live resolution pass
// (resolveSuggestion). Returns undefined if no node scored high enough, or if the
// winning candidate turned out not to exist/not be visible on the live page.
//
// e.g. recorded = { role: "textbox", name: "What needs to be done?", text: "", tag: "input" }
// and the page still has a visible `<input id="new-todo">` matching that role/name →
//   {
//     score: 0.667,
//     semantics: { role: "textbox", name: "What needs to be done?", text: "", tag: "input" },
//     constructedLocator: { kind: "css", value: "#new-todo" },
//   }
// If that element has no `id`, constructedLocator is omitted — only `semantics` is
// reported, and a human has to author the locator manually.
export const findSuggestion = async (
  page: Page,
  recorded: SmartElementSemanticSnapshot | undefined,
): Promise<LocatorSuggestion | undefined> => {
  const candidate = await searchForSuggestionCandidate(page, recorded);
  if (candidate === undefined) {
    return undefined;
  }

  return resolveSuggestion(page, candidate);
};
