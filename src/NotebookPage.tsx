import { useCallback, useEffect, useRef, useState } from 'react';
import { Page } from './components/Frame.tsx';
import { Downloads } from './components/Downloads.tsx';
import { FacsimilePane } from './components/FacsimilePane.tsx';
import { SittingGrid, STATE_COLOURS } from './components/Reader.tsx';
import { TagCloud } from './components/Tags.tsx';
import { TranscriptPane } from './components/TranscriptPane.tsx';
import { BY_NOTEBOOK, NOTEBOOK_BY_ID } from './content/catalogue.ts';
import {
  BATCH_SIZE,
  batchCount,
  batchRange,
  collectionUrl,
  notebookEntryOf,
  notebookId,
  sheetUrl,
  useManifest,
} from './lib/batches.ts';
import { url } from './lib/base.ts';
import { PAAM_COLLECTION_URL, notebookPath, paamPartsOverlapping } from './lib/diaries.ts';
import { shownState } from './lib/progress.ts';
import { issueUrl } from './lib/report.ts';
import type { Manifest, Notebook, NotebookKey, NotebookSheet, Tag } from './lib/types.ts';

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
/** How long a deliberate choice outranks the transcript's own scroll report. */
const GRACE_MS = 900;

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
  const readRefs = manifest?.readNotebookRefs?.[id] ?? [];
  const tags: Tag[] = manifest?.tags?.[id] ?? [];

  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<number | undefined>(undefined);
  const [goto, setGoto] = useState<number | undefined>(undefined);

  /**
   * Two guards over the transcript's scroll reports.
   *
   * The transcript is an iframe with a scroll spy: it posts the sheet it is
   * scrolled to, and it posts one as soon as it loads — from the top, which is
   * the notebook's first sheet. That report races the scroll we asked for and
   * whichever lands last wins, so choosing sitting 3 could leave the header
   * reading « sitting 1 ».
   *
   * `pinned` is the strong case: a sitting nobody has read is not in the file
   * at all, so the frame can never scroll there and never report it. Its
   * reports are about some other part of the notebook and are dropped for as
   * long as that sheet is open — which is the pin the facsimile needs.
   *
   * `graceUntil` is the race. It cannot be settled by waiting for the frame to
   * report back the sheet we asked for, because it reports whatever its spy
   * sees and that is usually a neighbour: asking for sheet 13 and being told
   * 97533 is normal and correct. So reports are dropped for a moment after a
   * deliberate choice, and after that the reader's own scrolling governs —
   * which is the feature, and it still works.
   */
  const pinned = useRef(false);
  const graceUntil = useRef(0);

  const onSheet = useCallback((ref: number) => {
    if (pinned.current) return;
    if (Date.now() < graceUntil.current) return;
    setSheet(ref);
  }, []);

  /**
   * A sheet the reader chose — a chip, a thumbnail, an arrow key, the URL.
   *
   * Always wins, and arms both guards. `readRefs` is captured rather than read
   * later so that a choice made before the manifest lands is not mistaken for
   * an unread sheet once it does.
   */
  const pick = useCallback(
    (ref: number | undefined, refs: number[]) => {
      pinned.current = ref !== undefined && refs.length > 0 && !refs.includes(ref);
      graceUntil.current = Date.now() + GRACE_MS;
      setSheet(ref);
      setGoto(ref);
    },
    [],
  );

  useEffect(() => {
    const apply = () => {
      const h = readHash(sheets);
      setOpen(h.open);
      if (h.open) pick(h.ref, readRefs);
    };
    apply();
    addEventListener('hashchange', apply);
    return () => removeEventListener('hashchange', apply);
  }, [sheets, readRefs, pick]);

  const read = useCallback(
    (ref?: number) => {
      history.replaceState(null, '', `#read${ref ? `/${ref}` : ''}`);
      setOpen(true);
      pick(ref, readRefs);
    },
    [pick, readRefs],
  );

  const select = useCallback(
    (ref: number) => {
      history.replaceState(null, '', `#read/${ref}`);
      pick(ref, readRefs);
    },
    [pick, readRefs],
  );

  const close = useCallback(() => {
    history.replaceState(null, '', location.pathname);
    setOpen(false);
  }, []);

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
        {tags.length > 0 && (
          <div className="mt-5 border-t border-ink-100 pt-4">
            <p className="prose-note max-w-3xl">
              Tags come from the <code>\keywords{'{}'}</code> line of the transcription, which is
              their only source — so no tag can describe a sheet nobody has read. A notebook is one
              file with one such line, covering the notebook as far as it has been read:{' '}
              {tags[0].batches.length === 1
                ? `sitting ${tags[0].batches[0]}`
                : `sittings ${tags[0].batches.join(', ')}`}
              . They are a way in, not a filter — unlike a ledger’s, they cannot narrow to one
              part of the book, because the line does not say which term came from which sitting.
            </p>
            <div className="mt-3 max-w-4xl">
              <TagCloud
                tags={tags}
                picked={null}
                onPick={null}
                title={(t) =>
                  `Written after reading ${t.batches.length === 1 ? 'sitting' : 'sittings'} ${t.batches.join(', ')}`
                }
              />
            </div>
          </div>
        )}
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-500">
          Read a sitting
        </h2>
        <p className="prose-note mt-1 max-w-3xl">
          Twelve sheets to a sitting — the same span a ledger batch takes, and for the same reason:
          what one pass sustains before the reading quietly gets worse. The notebook is one file, so
          a sitting is a place to start rather than a document of its own. The transcript opens on
          the left and the Whitney’s photograph on the right; scrolling the one turns the other.
        </p>
        <div className="mt-4">
          <SittingGrid
            sheets={sheets}
            readRefs={readRefs}
            declared={manifest?.declared?.[notebookId(id)]}
            onOpen={(ref) => read(ref)}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => read()}
            className="rounded-full bg-ink-900 px-4 py-1.5 text-[13px] text-white transition hover:bg-ink-700"
          >
            {hasTranscript ? 'Read it beside the sheets' : 'Turn the sheets'}
          </button>
          <span className="text-[12.5px] text-ink-400">
            opens at the first sheet — Escape closes it
          </span>
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-serif text-xl text-ink-900">
          Every sheet, in the order it was photographed
        </h2>
        <p className="prose-note mt-1.5 max-w-3xl">
          Each caption is the Whitney’s own File or Component Descriptor, unshortened. Where the
          number stamped on the page disagrees with it, the page’s own number is the one shown and
          the sheet says so when opened.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {sheets.map((s) => {
            const isRead = readRefs.includes(s.ref);
            const label =
              s.leaf === null
                ? s.kind.replace('-', ' ')
                : s.spread === null
                  ? `Page ${s.leaf}`
                  : `Pages ${s.leaf}–${s.spread}`;
            // The Whitney's descriptor for a notebook sheet is usually the
            // same words as the label — « Pages 2-3 » under « Pages 2–3 » —
            // and repeating it fills the card with nothing. It is shown where
            // it differs, which is where it matters: seven sheets of this
            // notebook are stamped two pages ahead of what the Whitney calls
            // them, and there the two lines are the whole point.
            const norm = (x: string) => x.toLowerCase().replace(/[–—-]/g, '-').trim();
            const differs = norm(s.descriptor) !== norm(label);
            return (
              <button
                key={s.ref}
                onClick={() => read(s.ref)}
                className="card group overflow-hidden text-left transition hover:border-brand-400"
              >
                <img
                  src={sheetUrl(s.ref, 'col')}
                  alt=""
                  loading="lazy"
                  className="h-28 w-full bg-ink-100 object-contain"
                />
                <div className="p-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-[11.5px] font-medium text-ink-900">{label}</span>
                    <span className="font-mono text-[10px] text-ink-400">{s.ref}</span>
                  </div>
                  {differs && (
                    <p className="prose-note mt-0.5 line-clamp-2 text-[11px]">
                      {s.restamped ? <>Whitney: {s.descriptor}</> : s.descriptor}
                    </p>
                  )}
                  <span
                    className={
                      'mt-1 inline-block text-[10.5px] ' +
                      (isRead ? 'text-brand-700' : 'text-ink-400')
                    }
                  >
                    {isRead ? 'transcribed' : 'not read'}
                  </span>
                </div>
              </button>
            );
          })}
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
          nowhere here. A card is headed by the number stamped on the page; where the Whitney’s own
          descriptor names a different one it is given beneath, verbatim and marked as theirs, and
          the sheet says why when opened.
        </p>
      </section>

      {open && (
        <NotebookReader
          manifest={manifest}
          notebook={notebook}
          sheets={sheets}
          readRefs={readRefs}
          sheet={sheet}
          onSheet={onSheet}
          onPick={select}
          goto={goto}
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
  readRefs,
  sheet,
  onSheet,
  onPick,
  goto,
  onClose,
}: {
  manifest: Manifest | null;
  notebook: Notebook;
  sheets: NotebookSheet[];
  readRefs: number[];
  sheet: number | undefined;
  onSheet: (ref: number) => void;
  onPick: (ref: number) => void;
  goto: number | undefined;
  onClose: () => void;
}) {
  const key = notebookId(notebook.id);
  const state = shownState(manifest?.declared?.[key], {
    transcribed: Boolean(notebookEntryOf(manifest, notebook.id)?.html),
  });
  const current = sheets.find((s) => s.ref === sheet) ?? sheets[0];
  const read = manifest?.readNotebooks?.[notebook.id] ?? 0;

  // The sitting the open sheet falls in, and where its neighbours start. A
  // notebook is one document, so this scrolls rather than loads — but the
  // page offers a sitting to open and the reader has to be steppable by the
  // same unit, or the two disagree about what a sitting is.
  const sittings = batchCount(sheets.length);
  const index = Math.max(0, sheets.findIndex((s) => s.ref === current?.ref));
  const sitting = Math.floor(index / BATCH_SIZE) + 1;
  const span = batchRange(sitting, sheets.length);
  const firstOf = (k: number) => sheets[(k - 1) * BATCH_SIZE]?.ref;
  const isRead = current ? readRefs.includes(current.ref) : false;

  const select = onPick;

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
            sheets {span.first}–{span.last} of {sheets.length} · sitting {sitting} of {sittings} ·{' '}
            {read ? `${read} read` : 'none read'} · {notebook.date}
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

        <div className="ml-auto flex items-center gap-1">
          <button
            disabled={sitting === 1}
            onClick={() => {
              const r = firstOf(sitting - 1);
              if (r) select(r);
            }}
            className="rounded-full border border-ink-200 px-2 py-0.5 text-[12px] text-ink-600 disabled:opacity-30"
          >
            ‹ sitting
          </button>
          <button
            disabled={sitting === sittings}
            onClick={() => {
              const r = firstOf(sitting + 1);
              if (r) select(r);
            }}
            className="rounded-full border border-ink-200 px-2 py-0.5 text-[12px] text-ink-600 disabled:opacity-30"
          >
            sitting ›
          </button>
        </div>

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
          {isRead ? (
            <TranscriptPane
              manifest={manifest}
              ledger="notebooks"
              batch={0}
              notebook={notebook.id}
              onSheet={onSheet}
              goto={goto}
            />
          ) : (
            // The notebook has a transcription; this sheet is not in it. Showing
            // the file anyway would put somebody else's page beside this
            // photograph and let it scroll — which is how the facsimile got
            // dragged back to sheet 1. The command names *this* sitting.
            <div className="grid h-full place-items-center bg-white p-8 text-center">
              <div className="max-w-md">
                <p className="text-[14px] text-ink-700">
                  Sitting {sitting} has not been read.
                </p>
                <p className="prose-note mt-2">
                  Sheets {span.first}–{span.last} of {sheets.length}. The photograph is on the
                  right, at the resolution the Whitney publishes. Reading this sitting is one pass
                  of the transcribe-hopper skill, appended to the notebook’s one file:
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(`/transcribe-hopper ${notebook.id} ${sitting}`)
                  }
                  title="Copy this command"
                  className="mt-3 w-full rounded-card border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[13px] text-ink-800 transition hover:border-brand-400 hover:text-brand-700"
                >
                  /transcribe-hopper {notebook.id} {sitting}
                </button>
                <p className="prose-note mt-2">
                  Twelve sheets, one pass, one conversation. Past twelve the quality of reading
                  degrades towards the end with nothing to signal it.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="min-h-0 max-lg:hidden">
          <FacsimilePane sheets={sheets} current={current?.ref} onSelect={select} />
        </div>
      </div>
    </div>
  );
}
