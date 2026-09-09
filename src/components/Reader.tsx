import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cite } from './Cite.tsx';
import { Downloads } from './Downloads.tsx';
import { FacsimilePane } from './FacsimilePane.tsx';
import { TranscriptPane } from './TranscriptPane.tsx';
import {
  BATCH_SIZE,
  batchCount,
  batchOfSeq,
  batchState,
  batchRange,
  sheetsOfBatch,
  useManifest,
} from '../lib/batches.ts';
import { BY_LEDGER, LEDGER_BY_ID } from '../content/catalogue.ts';
import { issueUrl } from '../lib/report.ts';
import type { State } from '../lib/progress.ts';
import type { Ledger, Manifest, Sheet } from '../lib/types.ts';

/**
 * The two-pane reader, shared by every book and by the archive.
 *
 * It is one component on purpose. Two readers would drift, and the single
 * thing this view promises is that the transcript and the photograph stay in
 * step: scrolling the one turns the other, and clicking a thumbnail scrolls
 * back. A second implementation of that would be a second set of bugs in the
 * only feature the site has.
 *
 * The state lives here too, because it is all one mechanism — which batch is
 * open, which edition, and which sheet the transcript last reported are three
 * facts the two panes share, and splitting them across two call sites is how
 * they get out of step.
 */

export const STATE_COLOURS: Record<State, string> = {
  todo: 'bg-ink-200 text-ink-600',
  drafted: 'bg-brand-100 text-brand-700',
  checked: 'bg-relu-200 text-relu-700',
  skipped: 'bg-alerte-100 text-alerte-700',
};

export interface OpenBatch {
  ledger: Ledger;
  batch: number;
  sheets: Sheet[];
}

/**
 * The sheet a leaf number names, and the batch it falls in.
 *
 * A leaf number is what a citation cites — it is the number written on the
 * paper, in the Hoppers' own hand, and the only one of the three numbering
 * systems a reader of the book ever sees. So it has to be linkable, even
 * though it is not an address in the sense `ref` is: the Whitney photographed
 * several hinged leaves twice, and Book II's leaf 33 is sheets 25 and 26.
 *
 * Resolving to the first match is what makes that harmless. The first is the
 * one bound first — the leaf as the book presents it, clipping down — and the
 * facsimile pane puts the second beside it, so nothing is hidden by the
 * choice. A leaf nobody wrote a number on cannot be named this way at all,
 * which is correct rather than a gap: there is nothing to name it by.
 */
export function resolveLeaf(ledger: string, leaf: number): { batch: number; ref: number } | null {
  const hit = BY_LEDGER.get(ledger)?.find((s) => s.leaf !== null && s.leaf === leaf);
  return hit ? { batch: batchOfSeq(hit.seq), ref: hit.ref } : null;
}

/**
 * Everything the reader needs, driven by the URL fragment.
 *
 * `#book-i/3` names the third batch of Book I — what one writes down when
 * noting where to resume, and what the transcription skill cites in the header
 * of the file it produces. State living only in React would not be shareable,
 * and a project whose unit of work is a batch needs the batch to have an
 * address.
 *
 */
export function useReader() {
  const manifest = useManifest();
  const [open, setOpen] = useState<{ ledger: string; batch: number } | null>(null);
  const [sheet, setSheet] = useState<number | undefined>(undefined);
  const [goto, setGoto] = useState<number | undefined>(undefined);

  const onSheet = useCallback((ref: number) => setSheet(ref), []);

  useEffect(() => {
    const readHash = () => {
      // `#book-ii/leaf-36` opens the leaf the Hoppers numbered 36, wherever it
      // falls. This is the form to hand somebody, because a leaf number is the
      // only one of the three numbering systems written on the paper: a batch
      // is this site's unit of work and a ref is ResourceSpace's, but « leaf
      // 36 » is what the book itself says and what a citation cites.
      //
      // It is spelt `leaf-36` rather than `36` because the batch form already
      // occupies that slot, and `#book-i/6` cannot mean the sixth batch and the
      // sixth leaf at once. Resolution is one-way: the leaf is accepted as
      // input and answered with the canonical batch and ref, so a link that
      // was shared keeps working even if the batching ever changes.
      const asLeaf = /^#([\w-]+)\/leaf-(\d+)$/.exec(location.hash);
      if (asLeaf) {
        const found = resolveLeaf(asLeaf[1], Number(asLeaf[2]));
        setOpen(found ? { ledger: asLeaf[1], batch: found.batch } : null);
        setGoto(found?.ref);
        setSheet(found?.ref);
        return;
      }
      // `#book-i/6` opens the batch; `#book-i/6/18297` opens it and scrolls the
      // transcript to that sheet. The third part is the ResourceSpace ref,
      // which is the sheet's only stable address — a leaf number is not one,
      // because two photographs of a hinged clipping carry the same leaf.
      const h = /^#([\w-]+)\/(\d+)(?:\/(\d+))?$/.exec(location.hash);
      setOpen(h ? { ledger: h[1], batch: Number(h[2]) } : null);
      const ref = h && h[3] ? Number(h[3]) : undefined;
      setGoto(ref);
      // Also the sheet, and this is the half that was missing. `goto` drives
      // the transcript, which scrolls itself to the sheet and reports back —
      // but a batch with no transcription reports nothing, so the facsimile
      // pane fell back to the first sheet of the batch. Book I's leaves 66 to
      // 77 are in batches nobody has transcribed, and every link to one of them
      // opened the book eleven leaves early.
      setSheet(ref);
    };
    readHash();
    addEventListener('hashchange', readHash);
    return () => removeEventListener('hashchange', readHash);
  }, []);

  const goToBatch = useCallback((ledger: string, batch: number, ref?: number) => {
    history.replaceState(null, '', `#${ledger}/${batch}${ref ? `/${ref}` : ''}`);
    setOpen({ ledger, batch });
    setSheet(ref);
    setGoto(ref);
  }, []);

  const close = useCallback(() => {
    history.replaceState(null, '', location.pathname);
    setOpen(null);
  }, []);

  const openBatch: OpenBatch | null = useMemo(() => {
    if (!open) return null;
    const ledger = LEDGER_BY_ID.get(open.ledger);
    const all = BY_LEDGER.get(open.ledger);
    if (!ledger || !all) return null;
    return { ledger, batch: open.batch, sheets: sheetsOfBatch(all, open.batch) };
  }, [open]);

  return {
    manifest,
    openBatch,
    sheet,
    onSheet,
    goto,
    setGoto,
    goToBatch,
    close,
  };
}

interface ReaderProps {
  manifest: Manifest | null;
  open: OpenBatch;
  sheet: number | undefined;
  onSheet: (ref: number) => void;
  goto: number | undefined;
  setGoto: (ref: number | undefined) => void;
  onClose: () => void;
}

export function Reader({
  manifest,
  open,
  sheet,
  onSheet,
  goto,
  setGoto,
  onClose,
}: ReaderProps) {
  const { ledger, batch, sheets } = open;
  const all = BY_LEDGER.get(ledger.id) ?? [];
  const total = batchCount(all.length);
  const { first, last } = batchRange(batch, all.length);

  /**
   * The leaves this batch covers, beside the sheets.
   *
   * These are two different numbering systems and they diverge hard: batch 2 of
   * Book I is sheets 13 to 24 and leaves 6 to 16, because the Whitney's
   * sequence counts the covers, the flyleaves, the index leaves, the versos and
   * the odd opening photographed whole, while the Hoppers numbered only the
   * written leaves. A header that gave the sheet range alone sat above a
   * transcript headed « Leaf 6 » and read as a bug in the site.
   *
   * Sheets with no leaf number written on them — about one in nine — are simply
   * absent from the range rather than being given one.
   */
  const leafRange = (() => {
    const ls = sheets
      .map((s) => (s.leaf === null ? null : Number(s.leaf)))
      .filter((n): n is number => n !== null && Number.isFinite(n));
    if (!ls.length) return null;
    const lo = Math.min(...ls);
    const hi = Math.max(...ls);
    return lo === hi ? String(lo) : `${lo}–${hi}`;
  })();
  const state = batchState(manifest, ledger.id, batch);
  const currentSheet = sheets.find((s) => s.ref === sheet) ?? sheets[0];

  // Escape closes the reader. It is a full-height overlay over a long page,
  // and without this the only way out is a small button in one corner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-50">
      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-200 bg-white px-3 py-2">
        <button
          onClick={onClose}
          className="rounded-full border border-ink-200 px-2.5 py-0.5 text-[12px] text-ink-600 transition hover:border-ink-400"
        >
          ← Close
        </button>

        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink-900">{ledger.title}</div>
          <div className="text-[11.5px] text-ink-500">
            sheets {first}–{last} of {all.length}
            {leafRange && <> · leaves {leafRange}</>} · batch {batch} of {total} ·{' '}
            <span className="font-mono">{ledger.objectNumber}</span>
          </div>
        </div>

        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_COLOURS[state]}`}
        >
          {state}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            disabled={batch === 1}
            onClick={() => location.assign(`#${ledger.id}/${batch - 1}`)}
            className="rounded-full border border-ink-200 px-2 py-0.5 text-[12px] text-ink-600 disabled:opacity-30"
          >
            ‹ batch
          </button>
          <button
            disabled={batch === total}
            onClick={() => location.assign(`#${ledger.id}/${batch + 1}`)}
            className="rounded-full border border-ink-200 px-2 py-0.5 text-[12px] text-ink-600 disabled:opacity-30"
          >
            batch ›
          </button>
        </div>

        <Downloads manifest={manifest} ledger={ledger.id} batch={batch} />

        <Cite manifest={manifest} ledger={ledger} batch={batch} sheet={currentSheet} />

        <a
          href={issueUrl({
            ledger: ledger.id,
            ledgerTitle: ledger.title,
            batch,
            ref: currentSheet?.ref,
            leaf: currentSheet?.leaf,
          })}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-alerte-200 px-2.5 py-0.5 text-[11.5px] text-alerte-700 transition hover:border-alerte-500"
          title="Everything here is first-pass machine work. Corrections are the point of publishing it."
        >
          Report a reading
        </a>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-h-0 border-r border-ink-200">
          <TranscriptPane
            manifest={manifest}
            ledger={ledger.id}
            batch={batch}
            onSheet={onSheet}
            goto={goto}
          />
        </div>
        <div className="min-h-0 max-lg:hidden">
          <FacsimilePane
            sheets={sheets}
            current={currentSheet?.ref}
            onSelect={(ref) => {
              onSheet(ref);
              setGoto(ref);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** Batch cards for one ledger — the row a book page and the archive both show. */
export function BatchGrid({
  ledger,
  manifest,
  onOpen,
}: {
  ledger: Ledger;
  manifest: Manifest | null;
  onOpen: (batch: number) => void;
}) {
  const all = BY_LEDGER.get(ledger.id) ?? [];
  const n = batchCount(all.length);
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: n }, (_, i) => i + 1).map((k) => {
        const state = batchState(manifest, ledger.id, k);
        const { first, last } = batchRange(k, all.length);
        // The leaf range too: the chips are numbered by sheet, and the reader
        // they open is headed by leaf. Batch 2 of Book I is sheets 13-24 and
        // leaves 6-16, and only saying so keeps the two from reading as a
        // contradiction.
        const ls = sheetsOfBatch(all, k)
          .map((x) => (x.leaf === null ? null : Number(x.leaf)))
          .filter((x): x is number => x !== null && Number.isFinite(x));
        const leaves = ls.length
          ? Math.min(...ls) === Math.max(...ls)
            ? ` · leaf ${Math.min(...ls)}`
            : ` · leaves ${Math.min(...ls)}–${Math.max(...ls)}`
          : '';
        return (
          <button
            key={k}
            onClick={() => onOpen(k)}
            title={`Sheets ${first}–${last}${leaves} — ${state}`}
            className={`rounded-md px-2 py-1 text-[11.5px] tabular transition hover:ring-1 hover:ring-ink-400 ${STATE_COLOURS[state]}`}
          >
            {first}–{last}
          </button>
        );
      })}
      <span className="self-center pl-1 text-[11px] text-ink-400">
        {n} batches of {BATCH_SIZE}
      </span>
    </div>
  );
}
