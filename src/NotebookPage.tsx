import { useCallback, useEffect, useState } from 'react';
import { Page } from './components/Frame.tsx';
import { Downloads } from './components/Downloads.tsx';
import { FacsimilePane } from './components/FacsimilePane.tsx';
import { STATE_COLOURS } from './components/Reader.tsx';
import { TranscriptPane } from './components/TranscriptPane.tsx';
import { BY_NOTEBOOK, NOTEBOOK_BY_ID } from './content/catalogue.ts';
import { collectionUrl, notebookEntryOf, notebookId, sheetUrl, useManifest } from './lib/batches.ts';
import { url } from './lib/base.ts';
import { PAAM_COLLECTION_URL, notebookPath, paamPartsOverlapping } from './lib/diaries.ts';
import { shownState } from './lib/progress.ts';
import { issueUrl } from './lib/report.ts';
import type { Manifest, Notebook, NotebookKey, NotebookSheet } from './lib/types.ts';

/**
 * One of Josephine Hopper's notebooks, as the Whitney has digitised it.
 *
 * The page is the Whitney's own words about the notebook and a strip of its
 * sheets; the reading happens in the same full-screen two-pane view the
 * ledgers get — transcript on the left, photograph on the right, each turning
 * the other — opened from any thumbnail and addressed by the URL fragment, so
 * a sheet can be handed to somebody. The sheets are fetched from the
 * Whitney's server as they are looked at, exactly as a ledger's are, and none
 * is stored. The header counts the sheets the transcription names, read off
 * the file, and claims no more.
 */
const A = 'text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600';

/**
 * The reader's address: `#read` opens it at the first sheet, `#read/89300`
 * at that sheet. The ref rather than the page number, for the reason the
 * ledgers give — an opening photographed whole carries two page numbers and
 * a cover none, and the ResourceSpace ref is the one stable name a sheet has.
 */
function readHash(sheets: NotebookSheet[]): { open: boolean; ref: number | undefined } {
  const h = /^#read(?:\/(\d+))?$/.exec(location.hash);
  if (!h) return { open: false, ref: undefined };
  const ref = h[1] ? Number(h[1]) : undefined;
  return { open: true, ref: sheets.some((s) => s.ref === ref) ? ref : undefined };
}

export function NotebookPage({ id }: { id: NotebookKey }) {
  const notebook = NOTEBOOK_BY_ID.get(id)!;
  const sheets = BY_NOTEBOOK.get(id) ?? [];
  const parts = paamPartsOverlapping(notebook);
  const manifest = useManifest();
  const hasTranscript = Boolean(notebookEntryOf(manifest, id)?.html);
  // Sheets the transcription names, read off the file by `npm run manifest`:
  // a half-read notebook shows as half read, and nothing here is hard-coded.
  const readSheets = manifest?.readNotebooks?.[id] ?? 0;

  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<number | undefined>(undefined);
  const [goto, setGoto] = useState<number | undefined>(undefined);

  useEffect(() => {
    const apply = () => {
      const h = readHash(sheets);
      setOpen(h.open);
      if (h.open) {
        setSheet(h.ref);
        setGoto(h.ref);
      }
    };
    apply();
    addEventListener('hashchange', apply);
    return () => removeEventListener('hashchange', apply);
  }, [sheets]);

  const read = useCallback((ref?: number) => {
    history.replaceState(null, '', `#read${ref ? `/${ref}` : ''}`);
    setOpen(true);
    setSheet(ref);
    setGoto(ref);
  }, []);
  const close = useCallback(() => {
    history.replaceState(null, '', location.pathname);
    setOpen(false);
  }, []);
  const onSheet = useCallback((ref: number) => setSheet(ref), []);

  return (
    <Page path={notebookPath(id)}>
      <header className="border-b border-ink-200 py-10">
        <p className="text-[12px] uppercase tracking-wider text-ink-400">
          Josephine Hopper’s notebooks —{' '}
          {readSheets ? `${readSheets} of ${sheets.length} sheets read` : 'nothing transcribed'}
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink-900">
          {notebook.title}
          <span className="ml-3 align-middle text-[13px] font-normal text-ink-400">{notebook.date}</span>
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-700">{notebook.scope}</p>
        <dl className="mt-5 grid max-w-3xl gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2">
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-400">Sheets</dt>
            <dd className="tabular text-ink-700">{sheets.length}</dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-400">Archive</dt>
            <dd className="text-ink-700">
              Sanborn Hopper Archive, Series IV, Subseries A
              {notebook.archiveNumber ? ` · ${notebook.archiveNumber}` : ''}
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-400">At the Whitney</dt>
            <dd>
              <a href={collectionUrl(notebook.collection)} className={A}>
                the digitised notebook ↗
              </a>
            </dd>
          </div>
          <div className="flex gap-3">
            <dt className="w-24 shrink-0 text-ink-400">Typed transcript</dt>
            <dd className="text-ink-700">
              {parts.length ? (
                <>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11.5px] text-brand-700">
                    PAAM {parts.map((p) => p.part).join(', ')}
                  </span>{' '}
                  covers {parts[0].from}–{parts[parts.length - 1].to}; whether it includes this
                  notebook is not established —{' '}
                  <a href={PAAM_COLLECTION_URL} className={A}>
                    PAAM ↗
                  </a>
                </>
              ) : (
                'none known'
              )}
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={() => read()}
            className="rounded-full bg-ink-900 px-4 py-1.5 text-[13px] text-white transition hover:bg-ink-700"
          >
            {hasTranscript ? 'Read it beside the sheets' : 'Turn the sheets'}
          </button>
          <span className="text-[12.5px] text-ink-400">
            the same two-pane view as the ledgers — Escape closes it
          </span>
        </div>
      </header>

      <section className="py-6">
        <h2 className="font-serif text-2xl text-ink-900">Every sheet, in the order it was photographed</h2>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {sheets.map((s) => (
            <button
              key={s.ref}
              onClick={() => read(s.ref)}
              title={s.descriptor}
              className="shrink-0 rounded border border-ink-200 bg-white p-0.5 transition hover:border-ink-400"
            >
              <img src={sheetUrl(s.ref, 'thm')} alt={s.descriptor} loading="lazy" className="h-20 w-auto" />
              <div className="mt-0.5 text-center text-[10.5px] text-ink-500">
                {s.leaf === null ? '—' : s.spread === null ? s.leaf : `${s.leaf}–${s.spread}`}
              </div>
            </button>
          ))}
        </div>

        {!hasTranscript && (
          <div className="mt-6 max-w-3xl rounded border border-dashed border-ink-300 bg-white p-5 text-[14px] leading-relaxed text-ink-700">
            <p>
              Nothing of this notebook has been read yet. When it is, the transcription stands
              beside the sheet it came from, in the same reading view the ledgers get: one file for
              the notebook under{' '}
              <code className="font-mono text-[12.5px]">transcripts/notebooks/{id}.tex</code>, read{' '}
              <strong>in entries</strong> rather than in rows — each opened by the date as she wrote
              it, with the date the transcriber assigns beside it, small, as the one editorial claim
              an entry carries — and with the same apparatus as the ledgers: what was illegible,
              what was read doubtfully, what she struck, and whose hand.
            </p>
            <p className="mt-3">
              <a href={url('/transcripts/_specimen/notebook.html')} className={A}>
                See the specimen ↗
              </a>{' '}
              — a page in that shape that transcribes nothing, so the layout can be checked before
              any reading is published.
            </p>
          </div>
        )}
        <p className="prose-note mt-6 max-w-3xl">
          The image is fetched from the Whitney’s own server as it is looked at and is stored
          nowhere here. The descriptor above each sheet is the Whitney’s, verbatim.
        </p>
      </section>

      {open && (
        <NotebookReader
          manifest={manifest}
          notebook={notebook}
          sheets={sheets}
          sheet={sheet}
          onSheet={onSheet}
          goto={goto}
          setGoto={setGoto}
          onClose={close}
        />
      )}
    </Page>
  );
}

/**
 * The ledgers' two-pane reader, for a notebook.
 *
 * The panes are the ledgers' own — `TranscriptPane` and `FacsimilePane`,
 * unchanged, talking over the same two messages — and only the header
 * differs, because a notebook has no batch to step through and nothing to
 * cite by leaf. What the ledgers' `Reader` keeps in one place for the reason
 * it gives, this keeps in the same place for the same reason.
 */
function NotebookReader({
  manifest,
  notebook,
  sheets,
  sheet,
  onSheet,
  goto,
  setGoto,
  onClose,
}: {
  manifest: Manifest | null;
  notebook: Notebook;
  sheets: NotebookSheet[];
  sheet: number | undefined;
  onSheet: (ref: number) => void;
  goto: number | undefined;
  setGoto: (ref: number | undefined) => void;
  onClose: () => void;
}) {
  const key = notebookId(notebook.id);
  const state = shownState(manifest?.declared?.[key], {
    transcribed: Boolean(notebookEntryOf(manifest, notebook.id)?.html),
  });
  const current = sheets.find((s) => s.ref === sheet) ?? sheets[0];
  const read = manifest?.readNotebooks?.[notebook.id] ?? 0;

  const select = useCallback(
    (ref: number) => {
      history.replaceState(null, '', `#read/${ref}`);
      onSheet(ref);
      setGoto(ref);
    },
    [onSheet, setGoto],
  );

  // Escape closes; the arrows turn, as the page did before it had a reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      const i = sheets.findIndex((s) => s.ref === current?.ref);
      if (e.key === 'ArrowRight' && sheets[i + 1]) select(sheets[i + 1].ref);
      if (e.key === 'ArrowLeft' && sheets[i - 1]) select(sheets[i - 1].ref);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, select, sheets, current]);

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
          <div className="truncate text-[13px] font-semibold text-ink-900">
            Josephine Hopper — {notebook.title}
          </div>
          <div className="text-[11.5px] text-ink-500">
            {read ? `${read} of ${sheets.length} sheets read` : `${sheets.length} sheets`} ·{' '}
            {notebook.date}
            {notebook.archiveNumber && (
              <>
                {' '}
                · <span className="font-mono">{notebook.archiveNumber}</span>
              </>
            )}
          </div>
        </div>

        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATE_COLOURS[state]}`}>
          {state}
        </span>

        <div className="ml-auto" />

        <Downloads manifest={manifest} ledger="notebooks" batch={0} notebook={notebook.id} />

        <a
          href={url('/method/#glossary')}
          className="rounded-full border border-ink-200 px-2.5 py-0.5 text-[11.5px] text-ink-600 transition hover:border-ink-400"
          title="Her abbreviations, and what they mean"
        >
          Glossary
        </a>

        <a
          href={issueUrl({
            ledger: notebook.id,
            ledgerTitle: notebook.title,
            ref: current?.ref,
            leaf: current?.leaf,
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
            ledger="notebooks"
            batch={0}
            notebook={notebook.id}
            onSheet={onSheet}
            goto={goto}
          />
        </div>
        <div className="min-h-0 max-lg:hidden">
          <FacsimilePane sheets={sheets} current={current?.ref} onSelect={select} />
        </div>
      </div>
    </div>
  );
}
