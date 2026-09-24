// Shape produced by suggestion-search.utils.ts (findSuggestion/resolveSuggestion) — a best-effort
// guess at the element a stale/healed-away locator was probably supposed to match. `constructedLocator`
// is only present if the resolved element had a real `id`; otherwise only `semantics` is reported and
// a human must author the locator manually.
export interface LocatorSuggestion {
  score: number;
  semantics: { role: string; name: string; text: string; tag: string };
  constructedLocator?: { kind: 'css'; value: string };
}

// The only place (action, locatorDescription, suggestion) get turned into the error's human-readable
// `.message` string. Never called directly outside this file — only from the constructor below, via
// `super(...)`. `suggestion === undefined` (e.g. no healing resolver ran, or nothing scored high
// enough) yields the bare `base` message; otherwise the message gains a "Did you mean...?" or
// "Closest semantic match..." clause depending on whether resolveSuggestion found a usable `id`.
const formatMessage = (
  action: string,
  locatorDescription: string,
  suggestion?: LocatorSuggestion,
): string => {
  const base = `${action}() failed — locator: ${locatorDescription}`;
  if (suggestion === undefined) {
    return base;
  }

  if (suggestion.constructedLocator !== undefined) {
    return `${base}. Did you mean: ${suggestion.constructedLocator.value} (score ${suggestion.score.toFixed(2)})?`;
  }

  const { role, name } = suggestion.semantics;
  return `${base}. Closest semantic match (score ${suggestion.score.toFixed(2)}): role=${role}, name="${name}" — no id, author manually.`;
};

// Thrown by SmartWebLocator.resolve() (and plain WebLocator actions) whenever a locator action can't
// find/interact with its target. `action`/`locatorDescription`/`cause` are always supplied;
// `suggestion` is only ever passed when the caller ran the full healing+suggestion pipeline and it
// produced something — a plain fallback-exhausted-with-no-healer failure omits it entirely.
export class LocatorActionError extends Error {
  readonly action: string;
  readonly locatorDescription: string;
  override readonly cause: unknown;
  // Kept as its own readonly field (not just baked into `.message`) so callers — e.g. the healing
  // artifact writer — can read the structured suggestion data back out programmatically, not just
  // the formatted string.
  readonly suggestion?: LocatorSuggestion;

  constructor(action: string, locatorDescription: string, cause: unknown, suggestion?: LocatorSuggestion) {
    super(formatMessage(action, locatorDescription, suggestion));
    this.name = 'LocatorActionError';
    this.action = action;
    this.locatorDescription = locatorDescription;
    this.cause = cause;
    this.suggestion = suggestion;
  }
}
