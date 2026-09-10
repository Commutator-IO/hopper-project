import { useEffect, useState } from 'react';
import { url } from './base.ts';
import { shownState, type State } from './progress.ts';
import type { LedgerKey, Manifest, Sheet } from './types.ts';

/**
 * The twelve-sheet batch, shared by the reading panes and by the skill.
 *
 * The Grothendieck project this method comes from uses twenty pages, and
 * twenty is wrong here. A page of Grothendieck is a page of prose and formulae
 * read once through. A ledger leaf is a ruled table forty lines deep, and
 * every line carries a date, a place, a price and a fraction — Jo Hopper's
 * commissions run « 25 – 1/3 » and her figures « 16.66 » — none of which can
 * be skimmed and any one of which is wrong if it is guessed. Twelve is what a
 * pass sustains at that density, and it is also about what a person re-checks
 * against the photograph in one sitting.
 *
 * The same division serves both ends: what the pane shows is the very set of
 * sheets handed to the transcriber.
 */
export const BATCH_SIZE = 12;

export const batchCount = (sheets: number) => Math.max(1, Math.ceil(sheets / BATCH_SIZE));

/** The sheets a batch covers, by position in the digitised book. */
export function batchRange(k: number, sheets: number): { first: number; last: number } {
  return { first: (k - 1) * BATCH_SIZE + 1, last: Math.min(k * BATCH_SIZE, sheets) };
}

export const batchId = (ledger: string, batch: number) => `${ledger}#${batch}`;

export const batchName = (k: number) => `batch-${String(k).padStart(2, '0')}`;

/**
 * The sheet's own image, as the Whitney serves it — no copy, no relay.
 *
 * This is the one place where this project is structurally simpler than the
 * Grothendieck workbench it is modelled on, and the simplification was
 * measured rather than assumed. Four facts about
 * `resourcespace.whitney.org/pages/download.php`, checked on 5 September 2026:
 *
 * — it answers a plain cross-origin `GET`, and **echoes whatever `Origin` it is
 *   sent** into `Access-Control-Allow-Origin`, so even `fetch` is permitted;
 * — its certificate is a current Let's Encrypt one, so nothing has to be
 *   waived to talk to it;
 * — it sets no referer check, so a request from this site is served exactly as
 *   one from theirs;
 * — it honours `Range`, answering `206` with a correct `Content-Range`.
 *
 * Its `Content-Security-Policy: frame-ancestors 'self'` forbids *framing* the
 * response, and that is the only restriction in force — which is why this is an
 * `<img>` and not an `<iframe>`, and why the whole relay tier of the parent
 * project has no counterpart here. Montpellier needed a Node process on a
 * hostname because a browser could not make the request at all. A browser can
 * make this one.
 *
 * So nothing of the archive is stored, for the strongest possible reason:
 * there is nowhere for it to be stored. The bytes go from the Whitney to the
 * reader.
 */
export function sheetUrl(ref: number, size: SheetSize = 'pre'): string {
  const q = new URLSearchParams({
    ref: String(ref),
    size,
    ext: 'jpg',
    page: '1',
    alternative: '-1',
    watermarked: '',
    k: '',
    noattach: 'true',
  });
  return `https://resourcespace.whitney.org/pages/download.php?${q}`;
}

/**
 * The sizes ResourceSpace will serve without a login, measured on Book I sheet
 * 1 (`ref=16761`).
 *
 * `pre` is the reading size and the largest of them: **1292 × 2000**, about
 * 3 MB, roughly 170 ppi across a 7½-inch leaf. It is enough — Jo Hopper's
 * hand and her figures are legible at it, which was the first thing checked
 * before any of this was built.
 *
 * `scr`, `lpr`, `hpr` and the original are **not** public: they return the
 * login page as `text/html`, with a `200`, which is worth knowing because a
 * naive fetch of them yields a 43 KB "image" and no error. Whoever wants the
 * 2239 × 3465 original asks the Whitney for it.
 */
export type SheetSize = 'col' | 'thm' | 'pre';

/** The Whitney's own record page for a sheet — where a reader goes to cite it. */
export const sheetPageUrl = (ref: number) =>
  `https://resourcespace.whitney.org/pages/view.php?ref=${ref}`;

/**
 * The Whitney's own catalogue record for the volume.
 *
 * Distinct from the ResourceSpace collection: that is the digitisation, sheet
 * by sheet, and this is the object — 96.208 to 96.213 — with its accession,
 * its measurements and its credit line. A reader citing a ledger should cite
 * this.
 */
export const whitneyWorkUrl = (work: number) => `https://whitney.org/collection/works/${work}`;

/** The collection as the Whitney presents it, for the ledger's own credit line. */
export const collectionUrl = (collection: number) =>
  `https://resourcespace.whitney.org/pages/search.php?search=%21collection${collection}`;

export const transcriptUrl = (ledger: string, k: number, ext: string) =>
  url(`/transcripts/${ledger}/${batchName(k)}.${ext}`);

/** What exists for a batch, or nothing. */
export const entryOf = (m: Manifest | null, ledger: string, k: number) =>
  m?.transcripts?.[batchId(ledger, k)];

/** The manifest, fetched once. `null` until it arrives, and on any failure. */
export function useManifest(): Manifest | null {
  const [m, setM] = useState<Manifest | null>(null);
  useEffect(() => {
    let live = true;
    fetch(url('/transcripts/manifest.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => live && setM(j))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return m;
}

/**
 * A batch's state — the declaration and the evidence, combined by
 * `shownState`.
 *
 * There is deliberately one notion of state in this project and not two. The
 * evidence lives in the manifest (which files exist) and the declarations live
 * in `transcripts/status.json` (what somebody has claimed); this is the only
 * place the two meet, so a page cannot show one and a table the other.
 */
export function batchState(m: Manifest | null, ledger: string, k: number): State {
  const key = batchId(ledger, k);
  const e = m?.transcripts?.[key];
  return shownState(m?.declared?.[key], { transcribed: Boolean(e?.tex || e?.html) });
}

/** The sheets of one batch, in reading order. */
export function sheetsOfBatch(all: Sheet[], k: number): Sheet[] {
  const { first, last } = batchRange(k, all.length);
  return all.slice(first - 1, last);
}

/** Which batch a sheet falls in. */
export const batchOfSeq = (seq: number) => Math.floor((seq - 1) / BATCH_SIZE) + 1;

/** A ledger's slug is also its URL. */
export const ledgerPath = (id: LedgerKey) => `/${id}/`;

/**
 * A notebook's transcript, beside the batches'.
 *
 * A notebook is one file and not a run of batches — `transcripts/notebooks/
 * <id>.tex`, appended to sitting by sitting — so it is keyed in the manifest
 * `notebook#<id>` and served from one address per format. The reading panes
 * take either shape and nothing else changes: the same frame, the same two
 * messages, the same download row.
 */
export const notebookId = (id: string) => `notebook#${id}`;

export const notebookTranscriptUrl = (id: string, ext: string) =>
  url(`/transcripts/notebooks/${id}.${ext}`);

/** What exists for a notebook, or nothing. */
export const notebookEntryOf = (m: Manifest | null, id: string) =>
  m?.transcripts?.[notebookId(id)];
