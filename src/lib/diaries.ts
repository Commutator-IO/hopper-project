import type { Notebook } from './types.ts';

/**
 * Where the diaries are, as the two institutions state it.
 *
 * The Whitney's Sanborn Hopper Archive holds what its description counts as
 * ninety notebooks by Josephine Nivison Hopper and has digitised four; the
 * Provincetown Art Association and Museum holds 22 diaries of 1933–1956 and
 * publishes typed transcripts of Josephine Hopper's diaries in five parts —
 * including, it says, diaries not in its own collection — as an open folder
 * linked from its collection page. The parts are named by the years they
 * cover, and that is all this site knows about them: which notebook a part
 * transcribes, and whether any of the Whitney's four is among them, PAAM does
 * not say and this site does not guess.
 */
export const PAAM_COLLECTION_URL = 'https://paam.org/collection/the-hoppers/';

export const WHITNEY_NOTEBOOKS_URL =
  'https://resourcespace.whitney.org/pages/collections_featured.php?parent=153740';

/** PAAM's five typed transcripts, by the years each names. */
export const PAAM_PARTS: { part: string; from: number; to: number }[] = [
  { part: 'Part I', from: 1933, to: 1938 },
  { part: 'Part II', from: 1938, to: 1940 },
  { part: 'Part III', from: 1940, to: 1942 },
  { part: 'Part IV', from: 1942, to: 1944 },
  { part: 'Part V', from: 1944, to: 1956 },
];

/**
 * The PAAM parts whose years overlap a notebook's recorded date.
 *
 * A coverage mark and not a claim of coverage: it says a typed transcript
 * exists for those years, and nothing about whether it is of this notebook.
 */
export function paamPartsOverlapping(n: Notebook) {
  const [a, b] = n.years;
  return PAAM_PARTS.filter((p) => p.to >= a && p.from <= b);
}

export const notebookPath = (id: string) => `/diaries/${id}/`;
