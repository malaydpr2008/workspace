/**
 * Deterministic LexoRank between calculation helper
 * Computes lexicographically sorted rank strings strictly between prevRank and nextRank.
 * Handles:
 *  - inserting before the first item (prevRank === null)
 *  - inserting after the last item (nextRank === null)
 *  - inserting into an empty list (prevRank === null && nextRank === null)
 *  - inserting between two arbitrary rank strings without string collisions
 */

function generateAfter(s: string): string {
  if (!s) return 'm';
  for (let i = s.length - 1; i >= 0; i--) {
    const code = s.charCodeAt(i);
    if (code < 122) { // up to 'z'
      return s.slice(0, i) + String.fromCharCode(code + 1);
    }
  }
  return s + 'm';
}

function generateBefore(s: string): string {
  if (!s) return 'a';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code > 33) { // above '!'
      const mid = Math.floor((33 + code) / 2);
      return s.slice(0, i) + String.fromCharCode(mid);
    }
  }
  return String.fromCharCode(32) + s;
}

export function generateRankBetween(
  prevRank: string | null,
  nextRank: string | null
): string {
  // Case 1: Initial empty list
  if (!prevRank && !nextRank) {
    return '0|h0:';
  }

  // Case 2: Insert before first item
  if (!prevRank && nextRank) {
    return generateBefore(nextRank);
  }

  // Case 3: Insert after last item
  if (prevRank && !nextRank) {
    return generateAfter(prevRank);
  }

  // Case 4: Fallback if ranks are inverted or equal
  if (prevRank! >= nextRank!) {
    return generateAfter(prevRank!);
  }

  const p = prevRank!;
  const n = nextRank!;

  // Find longest common prefix
  let i = 0;
  while (i < p.length && i < n.length && p[i] === n[i]) {
    i++;
  }

  const prefix = p.slice(0, i);

  // If p is prefix of n
  if (i === p.length) {
    const nSuffix = n.slice(i);
    return p + generateBefore(nSuffix);
  }

  const pCode = p.charCodeAt(i);
  const nCode = n.charCodeAt(i);

  if (nCode - pCode > 1) {
    const mid = Math.floor((pCode + nCode) / 2);
    return prefix + String.fromCharCode(mid);
  }

  // Adjacent character codes (nCode - pCode === 1)
  return prefix + p[i] + generateAfter(p.slice(i + 1));
}
