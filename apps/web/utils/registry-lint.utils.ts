// Registry quality gate — validates *.registry.json content (locator priority
// choices), never touches the DOM or the live page. Pure functions only, so this
// can run standalone in CI (scripts/lint-smart-registries.ts) with no browser.
// 'error' severity blocks CI (see lint-smart-registries.ts); 'warning'/'info' don't.
import type { SmartElementProfile, SmartLocatorStrategy, SmartRegistry } from './smart-locator.utils';

// Lower number = higher priority. Stable, prompt-friendly, semantic
// selectors come first; css is the last resort because it is the most
// likely to break silently on markup/styling changes.
const KIND_RANK: Record<SmartLocatorStrategy['kind'], number> = {
  testId: 1,
  role: 2,
  label: 3,
  placeholder: 4,
  text: 5,
  css: 6,
};

// testId, role and label are considered "strong" — they describe the
// element's identity/semantics rather than its markup structure or styling.
const STRONG_RANK_THRESHOLD = 3;

export type RegistryLintSeverity = 'error' | 'warning' | 'info';

export interface RegistryLintIssue {
  elementId: string;
  severity: RegistryLintSeverity;
  message: string;
}

const rankOf = (strategy: SmartLocatorStrategy): number => KIND_RANK[strategy.kind];

const describeStrategy = (strategy: SmartLocatorStrategy): string => {
  return strategy.kind === 'role'
    ? `role:${strategy.role}${strategy.name !== undefined ? `:${strategy.name}` : ''}`
    : `${strategy.kind}:${strategy.value}`;
};

export const lintSmartElementProfile = (profile: SmartElementProfile): RegistryLintIssue[] => {
  const issues: RegistryLintIssue[] = [];
  const isOverridden = profile.priorityOverrideReason !== undefined;

  // Rule 1 — is a stronger locator sitting unused in fallbackLocators while a
  // weaker one is preferred? Only rule that can produce 'error' severity.
  const preferredRank = rankOf(profile.preferredLocator);
  const betterFallback = profile.fallbackLocators.find(candidate => rankOf(candidate) < preferredRank);

  if (betterFallback !== undefined) {
    issues.push({
      elementId: profile.id,
      severity: isOverridden ? 'info' : 'error',
      message: isOverridden
        ? `preferredLocator ${describeStrategy(profile.preferredLocator)} is lower priority than fallback ${describeStrategy(betterFallback)}, accepted via override: "${profile.priorityOverrideReason}".`
        : `preferredLocator ${describeStrategy(profile.preferredLocator)} (rank ${preferredRank}) is lower priority than available fallback ${describeStrategy(betterFallback)} (rank ${rankOf(betterFallback)}). Promote it to preferredLocator, or add "priorityOverrideReason" to justify the exception.`,
    });
  }

  // Rule 2 — are fallbackLocators themselves best-first? Copy before sorting so
  // the registry's own array/objects are never mutated by this read-only check.
  const sortedFallbacks = [...profile.fallbackLocators].sort((a, b) => rankOf(a) - rankOf(b));
  const isSorted = profile.fallbackLocators.every((candidate, index) => candidate === sortedFallbacks[index]);

  if (!isSorted) {
    issues.push({
      elementId: profile.id,
      severity: 'warning',
      message: `fallbackLocators are not ordered by priority (testId > role > label > placeholder > text > css). Current order: ${profile.fallbackLocators.map(describeStrategy).join(' > ')}.`,
    });
  }

  // Rule 3 — across everything currently active (history excluded — that's past,
  // not current), is there a strong locator anywhere, or only weak ones?
  const activeCandidates = [profile.preferredLocator, ...profile.fallbackLocators];
  const bestActiveRank = Math.min(...activeCandidates.map(rankOf));

  if (bestActiveRank > STRONG_RANK_THRESHOLD) {
    issues.push({
      elementId: profile.id,
      severity: isOverridden ? 'info' : 'warning',
      message: isOverridden
        ? `No strong locator (testId/role/label) is registered as an active candidate, accepted via override: "${profile.priorityOverrideReason}".`
        : 'No strong locator (testId/role/label) is registered as an active candidate (preferred or fallback) — only placeholder/text/css are available. Confirm none of the stronger kinds exist in the DOM before shipping.',
    });
  }

  return issues;
};

export const lintSmartRegistry = (registry: SmartRegistry): RegistryLintIssue[] => {
  return registry.elements.flatMap(lintSmartElementProfile);
};

// Example — Rule 1: preferred={kind:'css', rank 6}, fallbacks=[{testId, rank 1}] -> betterFallback found -> 'error' (or 'info' if priorityOverrideReason is set).
// Example — Rule 2: fallbacks=[{placeholder, rank 4}, {role, rank 2}] -> sorted would be [role, placeholder] -> order differs -> 'warning'.
// Example — Rule 3: preferred={placeholder, rank 4}, fallbacks=[{css, rank 6}, {text, rank 5}] -> bestActiveRank=4 > 3 -> 'warning' (or 'info' if overridden).
