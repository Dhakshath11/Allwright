// Collapse all whitespace runs (spaces, tabs, newlines, NBSP) to a single space
// before trimming — raw DOM text/innerText frequently carries inconsistent
// internal whitespace that would otherwise be scored as a mismatch. Case is
// preserved on purpose: name/text identity is case-sensitive.
const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();

// Edit-distance similarity: 1 minus the fraction of single-char inserts/deletes/substitutions needed to turn one string into the other.
export const normalizedLevenshteinSimilarity = (left: string, right: string): number => {
  const a = normalize(left);
  const b = normalize(right);

  if (a === b) {
    return 1;
  }

  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = [];
  for (let i = 0; i < rows; i += 1) {
    matrix.push(new Array<number>(cols).fill(0));
  }

  for (let i = 0; i < rows; i += 1) {
    matrix[i]![0] = i;
  }

  for (let j = 0; j < cols; j += 1) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i < rows; i += 1) {
    const currentRow = matrix[i]!;
    const previousRow = matrix[i - 1]!;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow[j] = Math.min(
        previousRow[j]! + 1,
        currentRow[j - 1]! + 1,
        previousRow[j - 1]! + cost,
      );
    }
  }

  const distance = matrix[a.length]![b.length]!;
  return 1 - distance / Math.max(a.length, b.length);
};

// Matches chars within a small sliding window (ignoring order) then penalizes for transpositions among the matches — tolerant of typos/reordering unlike raw edit distance.
export const jaroSimilarity = (left: string, right: string): number => {
  const a = normalize(left);
  const b = normalize(right);

  if (a === b) {
    return 1;
  }

  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const maxDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = Array(a.length).fill(false);
  const bMatches = Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i += 1) {
    const start = Math.max(0, i - maxDistance);
    const end = Math.min(i + maxDistance + 1, b.length);

    for (let j = start; j < end; j += 1) {
      if (bMatches[j] || a[i] !== b[j]) {
        continue;
      }

      aMatches[i] = true;
      bMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) {
    return 0;
  }

  let transpositions = 0;
  let j = 0;

  for (let i = 0; i < a.length; i += 1) {
    if (!aMatches[i]) {
      continue;
    }

    while (!bMatches[j]) {
      j += 1;
    }

    if (a[i] !== b[j]) {
      transpositions += 1;
    }

    j += 1;
  }

  const t = transpositions / 2;
  return (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
};

// Jaro similarity boosted for strings sharing a common prefix (up to 4 chars, +0.1 of the remaining gap per char) — rewards near-identical starts (e.g. renamed suffixes/typos).
export const jaroWinklerSimilarity = (left: string, right: string): number => {
  const a = normalize(left);
  const b = normalize(right);

  const jaro = jaroSimilarity(a, b);
  const prefixLength = (() => {
    let count = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i += 1) {
      if (a[i] !== b[i]) {
        break;
      }

      count += 1;
    }

    return count;
  })();

  return jaro + prefixLength * 0.1 * (1 - jaro);
};
