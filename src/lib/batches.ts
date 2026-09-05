import { useEffect, useState } from 'react';
import { shownState, type State } from './progress.ts';
import type { Edition, LedgerKey, Manifest, Sheet, TranscriptEntry } from './types.ts';

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

/** The collection as the Whitney presents it, for the ledger's own credit line. */
export const collectionUrl = (collection: number) =>
  `https://resourcespace.whitney.org/pages/search.php?search=%21collection${collection}`;

export const transcriptUrl = (ledger: string, k: number, edition: Edition, ext: string) =>
  `/transcripts/${ledger}/${batchName(k)}.${edition}.${ext}`;

/**
 * The same, for an edition whose unit is the whole ledger.
 *
 * Book IV's record edition is the case that forced this: it is one running
 * account from 1913 to 1967, its page totals carried forward across every
 * batch boundary, and a record edition cut at sheet 12 would state balances
 * that are true of no page in the book.
 *
 * The file repeats the ledger's slug rather than saying `ledger`, because
 * these are offered as downloads and `ledger.rec.pdf` in a downloads folder
 * says nothing about which of the six books it holds.
 */
export const ledgerTranscriptUrl = (ledger: string, edition: Edition, ext: string) =>
  `/transcripts/${ledger}/${ledger}.${edition}.${ext}`;

/** The ledger-wide artifacts, if this book has any. */
export const ledgerEntry = (m: Manifest | null, ledger: string): TranscriptEntry | undefined =>
  m?.ledgers?.[ledger];

/** Whether a given edition of a batch is served by the ledger-wide file. */
export function servedByLedger(
  m: Manifest | null,
  ledger: string,
  edition: Edition,
  ext: 'html' | 'tex' | 'pdf' | 'xml',
): boolean {
  return (ledgerEntry(m, ledger)?.[ext] ?? []).includes(edition);
}

/**
 * Where a batch's edition actually lives.
 *
 * The ledger-wide file wins when it exists, because it is the one that covers
 * the sheets in view; the per-batch file is the fallback. Every link to a
 * reading view or a download goes through here, so the two namings cannot
 * drift apart — they did once, and a record edition of all 161 sheets of Book
 * IV was reported as "1 of 14 batches".
 */
export function editionUrl(
  m: Manifest | null,
  ledger: string,
  k: number,
  edition: Edition,
  ext: 'html' | 'tex' | 'pdf' | 'xml',
): string {
  return servedByLedger(m, ledger, edition, ext)
    ? ledgerTranscriptUrl(ledger, edition, ext)
    : transcriptUrl(ledger, k, edition, ext);
}

/** The manifest, fetched once. `null` until it arrives, and on any failure. */
export function useManifest(): Manifest | null {
  const [m, setM] = useState<Manifest | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/transcripts/manifest.json')
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
  const per = m?.transcripts?.[key];
  const whole = m?.ledgers?.[ledger];
  const hasEdition = (e: Edition) =>
    (per?.tex ?? []).includes(e) ||
    (per?.html ?? []).includes(e) ||
    (whole?.tex ?? []).includes(e) ||
    (whole?.html ?? []).includes(e);
  return shownState(m?.declared?.[key], {
    transcribed: hasEdition('en'),
    recorded: hasEdition('rec'),
  });
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
