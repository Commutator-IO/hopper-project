import { useEffect, useRef, useState } from 'react';
import { Page } from './components/Frame.tsx';
import { BY_NOTEBOOK, NOTEBOOK_BY_ID } from './content/catalogue.ts';
import { collectionUrl, sheetPageUrl, sheetUrl, useManifest } from './lib/batches.ts';
import { url } from './lib/base.ts';
import { PAAM_COLLECTION_URL, notebookPath, paamPartsOverlapping } from './lib/diaries.ts';
import type { NotebookKey } from './lib/types.ts';

/**
 * One of Josephine Hopper's notebooks, as the Whitney has digitised it.
 *
 * The page is the facsimile and the Whitney's own words about it, and
 * nothing else: no transcription exists here, and the page does not pretend
 * to one. The sheets are fetched from the Whitney's server as they are looked
 * at, exactly as a ledger's are, and none is stored. The coverage mark says
 * only that PAAM publishes a typed transcript for these years — not that it
 * is of this notebook.
 */
const A = 'text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600';

export function NotebookPage({ id }: { id: NotebookKey }) {
  const notebook = NOTEBOOK_BY_ID.get(id)!;
  const sheets = BY_NOTEBOOK.get(id) ?? [];
  const parts = paamPartsOverlapping(notebook);
  const [seq, setSeq] = useState(() => {
    try {
      const n = Number(new URLSearchParams(location.search).get('sheet'));
      return n >= 1 && n <= sheets.length ? n : 1;
    } catch {
      return 1;
    }
  });
  const sheet = sheets[seq - 1];

  // The transcription, where one exists: rendered by `npm run render` from
  // `transcripts/notebooks/<id>.tex` to the same reading view a batch gets,
  // shown beside the facsimile and kept in step with it both ways — the
  // rendered page reports the sheet it is scrolled to, and a thumbnail
  // chosen here scrolls it to that sheet — over the same two messages the
  // ledgers' reader uses. Where none exists the pane says so, and shows the
  // shape one takes.
  const manifest = useManifest();
  const transcript = manifest?.transcripts?.[`notebook#${id}`];
  const hasTranscript = Boolean(transcript?.html);
  const frame = useRef<HTMLIFrameElement>(null);
  const transcriptUrl = url(`/transcripts/notebooks/${id}.html`);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const ref = Number(e.data?.hopperSheet);
      if (!ref) return;
      const s = sheets.find((x) => x.ref === ref);
      if (s) setSeq(s.seq);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [sheets]);
  const show = (n: number) => {
    setSeq(n);
    const s = sheets[n - 1];
    if (s && frame.current?.contentWindow) {
      frame.current.contentWindow.postMessage({ hopperGoto: s.ref }, '*');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') show(Math.min(sheets.length, seq + 1));
      if (e.key === 'ArrowLeft') show(Math.max(1, seq - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <Page path={notebookPath(id)}>
      <header className="border-b border-ink-200 py-10">
        <p className="text-[12px] uppercase tracking-wider text-ink-400">
          Josephine Hopper’s notebooks — nothing transcribed
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
      </header>

      <section className="py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl text-ink-900">Every sheet, in the order it was photographed</h2>
          <span className="text-[12.5px] text-ink-400">← → to turn</span>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {sheets.map((s) => (
            <button
              key={s.ref}
              onClick={() => show(s.seq)}
              title={s.descriptor}
              className={`shrink-0 rounded border ${
                s.seq === seq ? 'border-brand-600' : 'border-ink-200 hover:border-ink-400'
              } bg-white p-0.5`}
            >
              <img
                src={sheetUrl(s.ref, 'thm')}
                alt={s.descriptor}
                loading="lazy"
                className="h-20 w-auto"
              />
              <div className="mt-0.5 text-center text-[10.5px] text-ink-500">
                {s.leaf === null ? '—' : s.spread === null ? s.leaf : `${s.leaf}–${s.spread}`}
              </div>
            </button>
          ))}
        </div>

        {sheet && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* The transcription pane, on the left as in the ledgers' reader:
                the rendered page, or the plain statement that none exists. */}
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3 text-[12px] uppercase tracking-wider text-ink-400">
                <span>Transcription</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal ${
                    hasTranscript ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {hasTranscript ? (manifest?.declared?.[`notebook#${id}`] ?? 'drafted') : 'not transcribed'}
                </span>
              </div>
              {hasTranscript ? (
                <iframe
                  ref={frame}
                  src={transcriptUrl}
                  title={`Transcription — ${notebook.title}`}
                  className="mt-2 h-[85vh] w-full rounded border border-ink-200 bg-white"
                />
              ) : (
                <div className="mt-2 rounded border border-dashed border-ink-300 bg-white p-5 text-[14px] leading-relaxed text-ink-700">
                  <p>
                    Nothing of this notebook has been read yet. When it is, the transcription
                    stands here beside the sheet it came from, in the same reading view the
                    ledgers get: one file for the notebook under{' '}
                    <code className="font-mono text-[12.5px]">transcripts/notebooks/{id}.tex</code>,
                    read <strong>in entries</strong> rather than in rows — each opened by the date
                    as she wrote it, with the date the transcriber assigns beside it, small, as the
                    one editorial claim an entry carries — and with the same apparatus as the
                    ledgers: what was illegible, what was read doubtfully, what she struck, and
                    whose hand.
                  </p>
                  <p className="mt-3">
                    <a href={url('/transcripts/_specimen/notebook.html')} className={A}>
                      See the specimen ↗
                    </a>{' '}
                    — a page in that shape that transcribes nothing, so the layout can be checked
                    before any reading is published.
                  </p>
                </div>
              )}
            </div>

            <figure className="min-w-0">
              <div className="flex items-center justify-between gap-3 text-[13px] text-ink-600">
                <button
                  onClick={() => show(Math.max(1, seq - 1))}
                  disabled={seq === 1}
                  className="rounded-full border border-ink-200 px-3 py-1 disabled:opacity-40"
                >
                  ← previous
                </button>
                <figcaption className="min-w-0 truncate">
                  <span className="text-ink-900">{sheet.descriptor}</span>
                  <span className="text-ink-400">
                    {' '}
                    · sheet {sheet.seq} of {sheets.length} · ref {sheet.ref} ·{' '}
                    <a href={sheetPageUrl(sheet.ref)} className={A}>
                      at the Whitney ↗
                    </a>
                  </span>
                </figcaption>
                <button
                  onClick={() => show(Math.min(sheets.length, seq + 1))}
                  disabled={seq === sheets.length}
                  className="rounded-full border border-ink-200 px-3 py-1 disabled:opacity-40"
                >
                  next →
                </button>
              </div>
              <img
                src={sheetUrl(sheet.ref, 'pre')}
                alt={sheet.descriptor}
                className="mt-3 max-h-[85vh] w-auto max-w-full rounded border border-ink-200 bg-white"
              />
            </figure>
          </div>
        )}
        <p className="prose-note mt-6 max-w-3xl">
          The image is fetched from the Whitney’s own server as it is looked at and is stored
          nowhere here. The descriptor above each sheet is the Whitney’s, verbatim.
        </p>
      </section>
    </Page>
  );
}
