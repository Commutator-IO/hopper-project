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
 * not say and this site does not guess. What it can do, now that the four are
 * read whole, is link each part whose years a notebook shares, so that the
 * two readings can be put side by side by anybody who cares to.
 */
export const PAAM_COLLECTION_URL = 'https://paam.org/collection/the-hoppers/';

export const WHITNEY_NOTEBOOKS_URL =
  'https://resourcespace.whitney.org/pages/collections_featured.php?parent=153740';

/**
 * The typed transcripts themselves, as PAAM shares them: five PDFs in one
 * Google Drive folder, given to this project by Madeleine Larson of PAAM in
 * September 2026. Each is a scan of a typescript — an old typewriter, with
 * page numbers added by hand — organised by dated entry: Part I opens
 * « Jo Hopper Diary 1933-34 » and runs « Thurs. AM », « Fri. night »,
 * « Sun. Apr. 1 ». The scans carry no text layer, so nothing here was
 * searched; what was looked at was the first pages of Parts I and V, and
 * that is all the description below rests on.
 */
export const PAAM_FOLDER_URL =
  'https://drive.google.com/drive/folders/1qxODXu9iDrufhRjxuF3m4K7OSqL0uCpc';

export const PAAM_TRANSCRIBER = 'Madeleine Larson, Provincetown Art Association and Museum';

/** PAAM's five typed transcripts, by the years each names, with the PDF of each. */
export const PAAM_PARTS: { part: string; from: number; to: number; url: string }[] = [
  { part: 'Part I', from: 1933, to: 1938, url: 'https://drive.google.com/file/d/1mtdnlac-23li3Q0HCny9M4U2_fxzaFWn/view' },
  { part: 'Part II', from: 1938, to: 1940, url: 'https://drive.google.com/file/d/1PV90IsBXrhs42sCk6op29pJDCUJCAopo/view' },
  { part: 'Part III', from: 1940, to: 1942, url: 'https://drive.google.com/file/d/1cc14lQjV2d8qYY9NxmzD0lupUGfGdXS7/view' },
  { part: 'Part IV', from: 1942, to: 1944, url: 'https://drive.google.com/file/d/15nHPqf5zK_WnU73_XuqXIw6gEKeClXiw/view' },
  { part: 'Part V', from: 1944, to: 1956, url: 'https://drive.google.com/file/d/1h4tbq1U98PwFr-EGV7YeiRgwHM5DbGwX/view' },
];

/**
 * Where a typescript and a notebook read here are known to carry the same
 * words — observed on the scan, page by page, and nowhere else. One so far:
 * page 325 of Part V, headed « 1944 con. », lists « 1944 Fall at S. Truro /
 * 1945 - Summer at S. Truro / April '45 Salmagudi prize for Office at Night /
 * xmas '45 few days before E.H. elected to Amer. Institute of Arts and
 * letters », which is the black notebook's page 21 nearly word for word —
 * except that the notebook writes « Xmas 44 ». Which is a copy of which the
 * pages do not say.
 */
export const PAAM_PARALLELS: { notebook: string; part: string; page: number; what: string }[] = [
  {
    notebook: 'black-notebook',
    part: 'Part V',
    page: 325,
    what: 'a year chronicle of 1944 and 1945 in nearly the words of the notebook’s page 21 — the Salmagundi prize, the election to the Institute — with « xmas ’45 » where the notebook has « Xmas 44 »',
  },
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
