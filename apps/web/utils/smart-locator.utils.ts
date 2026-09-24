import { test, type Locator, type Page } from '@playwright/test';
import { LocatorActionError, type LocatorSuggestion } from '../../../core/utils/locator-error';
import type {
  LocatorLike,
  SmartLocatorCandidate,
  SmartLocatorResolution,
  WaitState,
} from '../../../core/contracts/locator.contract';
import { WebLocator } from './web.utils';

type AriaRole = Parameters<Page['getByRole']>[0];

export type SmartLocatorStrategy =
  | { kind: 'testId'; value: string }
  | { kind: 'placeholder'; value: string }
  | { kind: 'label'; value: string }
  | { kind: 'text'; value: string }
  | { kind: 'role'; role: AriaRole; name?: string }
  | { kind: 'css'; value: string };

export interface SmartElementSemanticSnapshot {
  role: string;
  name: string;
  text: string;
  tag: string;
  parent?: string;
  neighbors?: string[];
}

// A single locator "version" — the shape repeated both at the top level of
// SmartElementProfile (current version) and inside its history[] (past
// versions). Grouped directly above SmartElementProfile since it extends this.
export interface SmartElementVersion {
  preferredLocator: SmartLocatorStrategy;
  fallbackLocators: SmartLocatorStrategy[];
}

// On-disk shape (registry JSON), one entry per logical element, example:
// {
//   "id": "newTodoInput",
//   "semanticSnapshot": { "role": "textbox", "name": "...", "text": "...", "tag": "input" },
//   "preferredLocator": { "kind": "role", "role": "textbox", "name": "..." },  // current version (from SmartElementVersion)
//   "fallbackLocators": [ { "kind": "placeholder", "value": "..." } ],         // current version (from SmartElementVersion)
//   "history": [                                                              // past versions, same 2-field shape
//     { "preferredLocator": { "kind": "css", "value": "input.new-todo" }, "fallbackLocators": [] }
//   ]
// }
export interface SmartElementProfile extends SmartElementVersion {
  id: string;
  history: SmartElementVersion[];
  semanticSnapshot?: SmartElementSemanticSnapshot;
  // Explicit, human-authored justification for why `preferredLocator` does
  // not follow the testId > role > label > placeholder > text > css
  // priority order (see registry-lint.utils.ts). Required to downgrade a
  // priority lint error to an informational note instead of silencing it.
  priorityOverrideReason?: string;
}

// A registry file on disk is just { "elements": SmartElementProfile[] }.
export interface SmartRegistry {
  elements: SmartElementProfile[];
}

export interface SmartHealingResult {
  succeeded: boolean;
  selectedLocator?: WebLocator;
  selectedCandidate?: string;
  score?: number;
  tier?: 'auto' | 'review' | 'fail';
  failedCandidates: string[];
  suggestion?: LocatorSuggestion;
}

type CandidateLocatorBuilder = () => WebLocator;
type HealingResolver = (params: {
  action: string;
  failedCandidates: string[];
}) => Promise<SmartHealingResult>;

const describeSuggestion = (suggestion: LocatorSuggestion): string =>
  suggestion.constructedLocator !== undefined
    ? suggestion.constructedLocator.value
    : `role=${suggestion.semantics.role}, name="${suggestion.semantics.name}"`;

// Builds the actual Playwright locator for one strategy — the only place strategy.kind is turned into a real page.getByX/locator call.
export const locatorFromStrategy = (page: Page, strategy: SmartLocatorStrategy): WebLocator => {
  switch (strategy.kind) {
    case 'testId':
      return new WebLocator(page.getByTestId(strategy.value));
    case 'placeholder':
      return new WebLocator(page.getByPlaceholder(strategy.value));
    case 'label':
      return new WebLocator(page.getByLabel(strategy.value));
    case 'text':
      return new WebLocator(page.getByText(strategy.value));
    case 'role':
      return new WebLocator(page.getByRole(strategy.role, strategy.name !== undefined ? { name: strategy.name } : undefined));
    case 'css':
      return new WebLocator(page.locator(strategy.value));
  }
};

export class SmartWebLocator implements LocatorLike {
  private readonly candidates: SmartLocatorCandidate<WebLocator>[];

  constructor(
    private readonly id: string,
    candidateBuilders: Array<{ description: string; build: CandidateLocatorBuilder }>,
    private readonly healingResolver?: HealingResolver,
  ) {
    this.candidates = candidateBuilders.map(candidate => ({
      description: candidate.description,
      resolve: candidate.build,
    }));
  }

  private chainCandidates(
    transformer: (locator: WebLocator) => WebLocator,
    suffix: string,
  ): SmartWebLocator {
    const mapped = this.candidates.map(candidate => ({
      description: `${candidate.description}${suffix}`,
      build: () => transformer(candidate.resolve()),
    }));

    return new SmartWebLocator(this.id, mapped, this.healingResolver);
  }

//   [
//   { description: "preferred:newTodoInput",  resolve: () => locatorFromStrategy(page, profile.preferredLocator) },
//   { description: "fallback#1:newTodoInput", resolve: () => locatorFromStrategy(page, strategy) },
// ]
  private async resolve(action: string): Promise<WebLocator> {
    const failedCandidates: string[] = [];

    for (const candidate of this.candidates) {
      const resolved = candidate.resolve();           // (1) build the WebLocator — still no DOM hit
      const count = await resolved.count();           // (2) FIRST real DOM query
      if (count > 0) {                                // (3) found it — stop here
        if (failedCandidates.length > 0) {
          console.warn(
            `[SmartLocator:${this.id}] ${action} recovered using ${candidate.description}. Failed first: ${failedCandidates.join(' | ')}`,
          );
          test.info().annotations.push({ type: 'info', description: `Resolved via ${candidate.description}` });
        }
        return resolved;
      }

      failedCandidates.push(candidate.description);
    }

    if (this.healingResolver !== undefined) {
      // First execution of the closure's body, not just a lookup — nothing about `healed` exists
      // before this line runs. The closure itself was only ever built (cheap, no DOM) back in
      // createHealingResolver; the actual history-candidate search/scoring/artifact-write all
      // happen starting right here, triggered by this one call.
      const healed = await this.healingResolver({ action, failedCandidates });
      if (healed.succeeded && healed.selectedLocator !== undefined && healed.selectedCandidate !== undefined) {
        const tierTag = healed.tier !== undefined ? ` tier=${healed.tier}` : '';
        const scoreTag = healed.score !== undefined ? ` score=${healed.score.toFixed(3)}` : '';
        console.warn(
          `[SmartLocator:${this.id}] ${action} healed using ${healed.selectedCandidate}.${tierTag}${scoreTag}`,
        );
        test.info().annotations.push({
          type: 'info',
          description: `Healed via history — tier=${healed.tier ?? 'unknown'}, score=${healed.score?.toFixed(3) ?? 'n/a'}`,
        });
        return healed.selectedLocator;
      }

      if (healed.suggestion !== undefined) {
        test.info().annotations.push({
          type: 'info',
          description: `Suggestion: ${describeSuggestion(healed.suggestion)} (score=${healed.suggestion.score.toFixed(2)})`,
        });
      }

      const result: SmartLocatorResolution = {
        succeeded: false,
        failedCandidates,
      };

      throw new LocatorActionError(
        `smartResolve(${action})`,
        this.id,
        new Error(JSON.stringify(result)),
        healed.suggestion,
      );
    }

    const result: SmartLocatorResolution = {
      succeeded: false,
      failedCandidates,
    };

    throw new LocatorActionError(
      `smartResolve(${action})`,
      this.id,
      new Error(JSON.stringify(result)),
    );
  }

  async resolvePlaywrightLocator(action: string): Promise<Locator> {
    return (await this.resolve(action)).locator;
  }

  async tap(): Promise<void> {
    await (await this.resolve('tap')).tap();
  }

  async fill(text: string): Promise<void> {
    await (await this.resolve('fill')).fill(text);
  }

  async scrollIntoViewIfNeeded(): Promise<void> {
    await (await this.resolve('scrollIntoViewIfNeeded')).scrollIntoViewIfNeeded();
  }

  async isVisible(): Promise<boolean> {
    return (await this.resolve('isVisible')).isVisible();
  }

  async isEnabled(): Promise<boolean> {
    return (await this.resolve('isEnabled')).isEnabled();
  }

  async isSelected(): Promise<boolean> {
    return (await this.resolve('isSelected')).isSelected();
  }

  async isFocused(): Promise<boolean> {
    return (await this.resolve('isFocused')).isFocused();
  }

  async isChecked(): Promise<boolean> {
    return (await this.resolve('isChecked')).isChecked();
  }

  async getText(): Promise<string> {
    return (await this.resolve('getText')).getText();
  }

  async getValue(): Promise<string> {
    return (await this.resolve('getValue')).getValue();
  }

  async waitFor(options: { state: WaitState; timeout?: number }): Promise<void> {
    await (await this.resolve('waitFor')).waitFor(options);
  }

  first(): this {
    return this.chainCandidates(locator => locator.first(), '.first()') as this;
  }

  last(): this {
    return this.chainCandidates(locator => locator.last(), '.last()') as this;
  }

  nth(index: number): this {
    return this.chainCandidates(locator => locator.nth(index), `.nth(${index})`) as this;
  }

  async count(): Promise<number> {
    return (await this.resolve('count')).count();
  }

  async all(): Promise<this[]> {
    const primary = await this.resolve('all');
    return (await primary.all()).map(locator => {
      const wrapped = new SmartWebLocator(this.id, [
        {
          description: `[materialized] ${this.id}`,
          build: () => locator,
        },
      ]);
      return wrapped as this;
    });
  }
}

// registry JSON (on disk)
//    │  fs.readFileSync + JSON.parse
//    ▼
// SmartRegistry { elements: SmartElementProfile[] }   ← in-memory, held by SmartWebUtils
//    │  registry.elements.find(id)
//    ▼
// SmartElementProfile                                  ← ONE element's full static data
//   { id, preferredLocator, fallbackLocators, history, semanticSnapshot }
//    │  buildSmartLocatorFromProfile(page, profile, healingResolver?)
//    ▼
// c
//   healingResolver?: closure over the WHOLE profile (so it can reach .history + .semanticSnapshot later)
// resolve()/tap()/fill()/etc. sit on top of this data — they pick a candidate, then delegate to it
// Note: SmartWebLocator is an wrapper to all the locators (Candidates) for a given registry, because that class has all the 
// appropriate method to perform actions on those locators example: 
// resolve() -> to resolve the best candidate into a Playwright locator
// tap -> to perform a click action on the resolved Playwright locator
// fill -> to fill an input field on the resolved Playwright locator etc.
// Also, we are not using the WebUtils facade here (Present in coreutils/web/utils/web.utils.ts); 
// SmartWebLocator interacts with Playwright locators directly.
export const buildSmartLocatorFromProfile = (
  page: Page,
  profile: SmartElementProfile,
  healingResolver?: HealingResolver,
): SmartWebLocator => {
  const allCandidates: Array<{ description: string; build: CandidateLocatorBuilder }> = [
    {
      description: `preferred:${profile.id}`,
      // Same lazy-closure pattern as createHealingResolver (§8.1) — build is a thunk, not invoked until candidate.resolve() runs.
      build: () => locatorFromStrategy(page, profile.preferredLocator), // Provides playwright locator for the preferred strategy
    },
    ...profile.fallbackLocators.map((strategy, index) => ({
      description: `fallback#${index + 1}:${profile.id}`,
      build: () => locatorFromStrategy(page, strategy),
    })),
  ];

  // Wraps WebLocator directly, bypassing the WebUtils facade — needs candidate selection before any action can run.
  return new SmartWebLocator(profile.id, allCandidates, healingResolver);
};

// Flattens every past version's preferred + fallback strategies into one list — used as healing candidates when current locators fail.
export const listHistoryCandidates = (profile: SmartElementProfile): SmartLocatorStrategy[] => {
  return profile.history.flatMap(version => [
    version.preferredLocator,
    ...version.fallbackLocators,
  ]);
};

// Root node of Playwright's ariaSnapshot() YAML, e.g. `- button "Submit" [disabled]`.
// Only the first line is read — nested children (if any) aren't part of this element's own identity.
const parseAriaSnapshotRootNode = (yaml: string): { role: string; name: string } => {
  const firstLine = yaml.split('\n').find(line => line.trim().length > 0) ?? '';
  const match = /^[\s-]*([a-zA-Z]+)(?:\s+"([^"]*)")?/.exec(firstLine.trim());
  return {
    role: match?.[1] ?? '',
    name: match?.[2] ?? '',
  };
};

// Nearest ancestor with a data-testid (recorded as "parent"), plus sibling elements'
// testids (used below to reverse-lookup neighbor profile ids) — boost-only context.
// e.g. for <input data-testid="newTodoInput"> under <div data-testid="todoApp"><ul data-testid="todoList">...:
// { parentTestId: "todoApp", siblingTestIds: ["todoList", "todoItem-1", "todoItem-2"] }
const extractLiveDomContext = async (
  locator: WebLocator,
): Promise<{ parentTestId: string; siblingTestIds: string[] }> => {
  return locator.locator.evaluate(element => {
    // Climb until an ancestor with data-testid is found, or we run off the top of the tree (parent === null).
    let parent = element.parentElement;
    while (parent !== null && !parent.hasAttribute('data-testid')) {
      parent = parent.parentElement;
    }

    // Search scope for siblings: the testid'd ancestor if found, else just the direct parent, else the element itself (never null).
    const container = parent ?? element.parentElement ?? element;
    const siblingTestIds = Array.from(container.querySelectorAll('[data-testid]'))
      .filter(node => node !== element) // an element is never its own sibling
      .map(node => node.getAttribute('data-testid') ?? '')
      .filter(value => value.length > 0); // defends against a theoretical data-testid="" match

    return {
      parentTestId: parent?.getAttribute('data-testid') ?? '',
      siblingTestIds,
    };
  });
};

const strategyTestIdValue = (strategy: SmartLocatorStrategy): string | undefined =>
  strategy.kind === 'testId' ? strategy.value : undefined;

// Translates live sibling testids into registry profile ids (scoring compares profile ids, not raw testids).
// Only matches profiles whose locator is testId-kind — cheap string comparison, no locator resolution needed.
// A sibling testid with no matching testId-locator profile is silently dropped, not passed through as-is.
// Output would be an array of profile ids corresponding to the sibling testids that have matching testId-locator profiles in the registry.
// Later, during scoring similiary, number of neigbours retained will add points.
const reverseLookupNeighborProfileIds = (
  siblingTestIds: string[],
  registry: SmartRegistry,
): string[] => {
  if (siblingTestIds.length === 0) {
    return [];
  }

  return registry.elements
    .filter(profile =>
      [profile.preferredLocator, ...profile.fallbackLocators].some(strategy => {
        const testId = strategyTestIdValue(strategy);
        return testId !== undefined && siblingTestIds.includes(testId);
      }),
    )
    .map(profile => profile.id);
};

// Reads real facts off an already-resolved element (role/name via Playwright's own
// accessibility computation, not a hand-rolled implicit-role table) — used to verify
// identity during healing/suggestion scoring, instead of trusting selector metadata.
// `context.registry` aka Profile registry is optional: without it, parent is still computed but neighbors
// is left undefined (no registry to reverse-lookup sibling testids against).
export const extractLiveSemanticSnapshot = async (
  locator: WebLocator,
  context?: { registry: SmartRegistry },
): Promise<SmartElementSemanticSnapshot> => {
  const [tag, innerText, formValueText, ariaYaml, domContext] = await Promise.all([
    locator.locator.evaluate(el => el.tagName.toLowerCase()),     // Extracts the tag name of the element in lowercase.
    locator.getText(),                                            // Extracts the visible text content of the element.
    // Form controls (input/textarea) never have innerText — their identity lives in placeholder/value instead. Without this, `text` is structurally always empty
    // for them, which drags every healing/suggestion score down regardless of match quality.
    locator.locator.evaluate(el =>                                // Extracts the placeholder or value for input/textarea elements, empty string otherwise.
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        ? el.placeholder || el.value
        : '',
    ),
    locator.locator.ariaSnapshot(),                               // Captures the accessibility snapshot of the element.  
    extractLiveDomContext(locator),                               // Extracts the live DOM context of the element, including parent and sibling test IDs.  
  ]);

  const text = innerText.length > 0 ? innerText : formValueText;  // An element can have either visible text or form value text as its content.
  const { role, name } = parseAriaSnapshotRootNode(ariaYaml);     // Parses the role and name from the accessibility snapshot of the element.

  return {
    role,
    name: name.length > 0 ? name : text,
    tag,
    text,
    parent: domContext.parentTestId.length > 0 ? domContext.parentTestId : undefined,
    // Registry lookup of sibiling/neighbors present happens here, once, so scoring later is just a cheap array comparison (no registry access at score time).
    neighbors:
      context !== undefined
        ? reverseLookupNeighborProfileIds(domContext.siblingTestIds, context.registry)
        : undefined,
  };
};
