import {
  jaroWinklerSimilarity,
  normalizedLevenshteinSimilarity,
} from '../../../core/utils/string-similarity.utils';
import type { SmartElementSemanticSnapshot } from './smart-locator.utils';

export type ConfidenceTier = 'auto' | 'review' | 'fail';

export interface SimilarityResult {
  score: number;
  breakdown: {
    role: number;
    name: number;
    text: number;
    tag: number;
  };
}

// Averages two different string-similarity algorithms so neither one's blind spot (e.g. Jaro-Winkler favoring shared prefixes) dominates alone.
// e.g. blendedTextSimilarity("What needs to be done?", "What needs to be done") → jw≈0.98, lev≈0.96 → ≈0.97
const blendedTextSimilarity = (left: string, right: string): number => {
  const jw = jaroWinklerSimilarity(left, right);
  const lev = normalizedLevenshteinSimilarity(left, right);
  return (jw + lev) / 2;
};

const weightedAverage = (parts: Array<{ value: number; weight: number }>): number => {
  if (parts.length === 0) {
    return 0;
  }

  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight === 0) {
    return 0;
  }

  const total = parts.reduce((sum, part) => sum + part.value * part.weight, 0);
  return total / totalWeight;
};

const ROLE_WEIGHT = 0.25;
const NAME_WEIGHT = 0.25;
const TEXT_WEIGHT = 0.2;
const TAG_WEIGHT = 0.05;
const CORE_TOTAL_WEIGHT = ROLE_WEIGHT + NAME_WEIGHT + TEXT_WEIGHT + TAG_WEIGHT;

// Compares a recorded fingerprint against a LIVE one (see extractLiveSemanticSnapshot) —
// both sides are real role/name/text/tag values, never selector metadata.
// e.g. identical role/name/text/tag + matching parent + matching neighbors →
// { score: 1, breakdown: { role: 1, name: 1, text: 1, tag: 1 } }
export const scoreCandidateSimilarity = (
  recorded: SmartElementSemanticSnapshot | undefined,
  live: SmartElementSemanticSnapshot,
): SimilarityResult => {
  if (recorded === undefined) {
    return {
      score: 0,
      breakdown: {
        role: 0,
        name: 0,
        text: 0,
        tag: 0,
      },
    };
  }

  // A missing field (either side) scores the same as a confirmed mismatch — not
  // knowing is never worth more than knowing it's wrong.
  const role =
    recorded.role.length === 0 || live.role.length === 0
      ? 0
      : recorded.role === live.role
        ? 1
        : 0;

  const name =
    recorded.name.length === 0 || live.name.length === 0
      ? 0
      : blendedTextSimilarity(live.name, recorded.name);

  const text =
    recorded.text.length === 0 || live.text.length === 0
      ? 0
      : blendedTextSimilarity(live.text, recorded.text);

  const tag =
    recorded.tag.length === 0 || live.tag.length === 0
      ? 0
      : recorded.tag === live.tag
        ? 1
        : 0;

  const parentMatches =
    recorded.parent !== undefined && recorded.parent === live.parent;

  const neighborsMatch =
    recorded.neighbors !== undefined &&
    recorded.neighbors.length > 0 &&
    live.neighbors !== undefined &&
    live.neighbors.some(neighbor => recorded.neighbors?.includes(neighbor) === true);

  // Fixed denominator (CORE_TOTAL_WEIGHT), not just the weight of checked fields —
  // so an unchecked/missing field reduces the score exactly like a mismatch would,
  // instead of being excluded and letting the remaining fields carry full weight.
  const coreScore =
    (role * ROLE_WEIGHT + name * NAME_WEIGHT + text * TEXT_WEIGHT + tag * TAG_WEIGHT) /
    CORE_TOTAL_WEIGHT;

  // Boost-only on top: included only when matched, so a mismatch never drags the score down.
  const score = weightedAverage([
    { value: coreScore, weight: CORE_TOTAL_WEIGHT },
    ...(parentMatches ? [{ value: 1, weight: 0.15 }] : []),
    ...(neighborsMatch ? [{ value: 1, weight: 0.1 }] : []),
  ]);

  return {
    score,
    breakdown: { role, name, text, tag },
  };
};

// Maps a score to an action: 'auto' heals silently, 'review' heals but flags for a human, 'fail' triggers the suggestion search instead.
export const confidenceTierForScore = (score: number): ConfidenceTier => {
  if (score >= 0.95) {
    return 'auto';
  }

  if (score >= 0.85) {
    return 'review';
  }

  return 'fail';
};
