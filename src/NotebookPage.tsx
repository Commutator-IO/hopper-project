import { useEffect, useState } from 'react';
import { Page } from './components/Frame.tsx';
import { BY_NOTEBOOK, NOTEBOOK_BY_ID } from './content/catalogue.ts';
import { collectionUrl, sheetPageUrl, sheetUrl } from './lib/batches.ts';
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setSeq((s) => Math.min(sheets.length, s + 1));
      if (e.key === 'ArrowLeft') setSeq((s) => Math.max(1, s - 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sheets.length]);

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
              onClick={() => setSeq(s.seq)}
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
          <figure className="mt-6">
            <div className="flex items-center justify-between gap-3 text-[13px] text-ink-600">
              <button
                onClick={() => setSeq((s) => Math.max(1, s - 1))}
                disabled={seq === 1}
                className="rounded-full border border-ink-200 px-3 py-1 disabled:opacity-40"
              >
                ← previous
              </button>
              <figcaption>
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
                onClick={() => setSeq((s) => Math.min(sheets.length, s + 1))}
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
        )}
        <p className="prose-note mt-6 max-w-3xl">
          The image is fetched from the Whitney’s own server as it is looked at and is stored
          nowhere here. The descriptor above each sheet is the Whitney’s, verbatim.
        </p>
      </section>
    </Page>
  );
}
