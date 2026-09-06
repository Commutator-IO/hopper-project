import { useCallback, useEffect, useMemo, useState } from 'react';
import { Downloads } from './Downloads.tsx';
import { FacsimilePane } from './FacsimilePane.tsx';
import { TranscriptPane } from './TranscriptPane.tsx';
import {
  BATCH_SIZE,
  batchCount,
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
      const h = /^#([\w-]+)\/(\d+)$/.exec(location.hash);
      setOpen(h ? { ledger: h[1], batch: Number(h[2]) } : null);
    };
    readHash();
    addEventListener('hashchange', readHash);
    return () => removeEventListener('hashchange', readHash);
  }, []);

  const goToBatch = useCallback((ledger: string, batch: number) => {
    history.replaceState(null, '', `#${ledger}/${batch}`);
    setOpen({ ledger, batch });
    setSheet(undefined);
    setGoto(undefined);
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
            sheets {first}–{last} of {all.length} · batch {batch} of {total} ·{' '}
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
        return (
          <button
            key={k}
            onClick={() => onOpen(k)}
            title={`Sheets ${first}–${last} — ${state}`}
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
