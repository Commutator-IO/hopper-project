import { useMemo, useState } from 'react';
import { Page } from './components/Frame.tsx';
import { BatchGrid, Reader, useReader } from './components/Reader.tsx';
import { LEDGERS, BY_LEDGER } from './content/catalogue.ts';
import { UNPLACED } from './content/books.ts';
import { batchOfSeq, collectionUrl, sheetUrl } from './lib/batches.ts';
import type { Sheet, SheetKind } from './lib/types.ts';

/**
 * All six ledgers, in the archive's own order, searchable.
 *
 * The books are ways of reading; this is the archive as it stands. Every sheet
 * is reachable from here, including the ones no book lists — and if any exist,
 * the page says how many rather than letting them vanish.
 */

const KIND_LABEL: Record<SheetKind, string> = {
  cover: 'cover',
  'front-matter': 'front matter',
  leaf: 'leaf',
  verso: 'verso',
  inserted: 'inserted',
};

export function ArchivePage() {
  const r = useReader();
  const [q, setQ] = useState('');
  const [kinds, setKinds] = useState<Set<SheetKind>>(new Set());

  const query = q.trim().toLowerCase();

  const match = useMemo(() => {
    return (s: Sheet) => {
      if (kinds.size && !kinds.has(s.kind)) return false;
      if (!query) return true;
      // The descriptor is searched whole, and the resource ref as a string:
      // people paste refs. The leaf number is searched as `leaf 58` rather
      // than as a bare number, because a bare `58` in a search box means the
      // year, the price and the leaf at once and would return all three.
      return (
        s.descriptor.toLowerCase().includes(query) ||
        String(s.ref).includes(query) ||
        (s.leaf !== null && `leaf ${s.leaf}`.includes(query))
      );
    };
  }, [query, kinds]);

  const toggle = (k: SheetKind) =>
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <Page path="/archive/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">All six ledgers</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          The archive as the Whitney holds it: six volumes, 96.208 to 96.213, in the order the
          sheets were photographed. Every descriptor below is the Whitney’s own sentence,
          unshortened — including the ones that record that a leaf is turned on its side, or that
          a sheet came loose between two others.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search descriptors, titles, resource refs…"
            className="w-72 rounded-full border border-ink-300 bg-white px-4 py-1.5 text-[13.5px] outline-none placeholder:text-ink-400 focus:border-brand-500"
          />
          {(Object.keys(KIND_LABEL) as SheetKind[]).map((k) => (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={`rounded-full border px-2.5 py-1 text-[12px] transition ${
                kinds.has(k)
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-ink-200 text-ink-500 hover:border-ink-400'
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </header>

      {UNPLACED.length > 0 && (
        <div className="mt-6 rounded-card border border-alerte-200 bg-alerte-50 px-4 py-3 text-[13px] text-alerte-700">
          {UNPLACED.length} sheet{UNPLACED.length === 1 ? '' : 's'} belong to no reading book.
          That is a gap in the books, not in the archive — the sheets are all here.
        </div>
      )}

      {LEDGERS.map((ledger) => {
        const all = BY_LEDGER.get(ledger.id) ?? [];
        const shown = all.filter(match);
        if (query || kinds.size) {
          if (!shown.length) return null;
        }
        return (
          <section key={ledger.id} className="border-b border-ink-200 py-8 last:border-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-serif text-xl text-ink-900">{ledger.title}</h2>
              <span className="font-mono text-[12px] text-ink-500">{ledger.objectNumber}</span>
              <span className="text-[12.5px] text-ink-500">{ledger.date}</span>
              <span className="tabular text-[12.5px] text-ink-400">
                {shown.length === all.length ? `${all.length} sheets` : `${shown.length} of ${all.length}`}
              </span>
              <a
                href={collectionUrl(ledger.collection)}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                at the Whitney ↗
              </a>
            </div>

            <dl className="mt-2 grid max-w-4xl gap-x-8 gap-y-1 text-[12.5px] text-ink-600 sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-400">Medium</dt>
                <dd>{ledger.extendedMedium}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-400">Dimensions</dt>
                <dd>{ledger.dimensions}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-ink-400">Credit</dt>
                <dd>{ledger.credit}</dd>
              </div>
            </dl>

            {(r.manifest?.tags?.[ledger.id] ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wider text-ink-400">Tags</span>
                {(r.manifest?.tags?.[ledger.id] ?? []).map((t) => (
                  <button
                    key={t}
                    onClick={() => setQ(t)}
                    title="Extracted from the record edition's summary — the only source of tags here"
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] text-brand-700 transition hover:bg-brand-100"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {ledger.quotedBare && (
              <p className="prose-note mt-2 max-w-3xl">
                The Whitney’s descriptors for this volume name the work <em>without</em> quotation
                marks — “Cape Cod Evening [p. 31]”. Nothing here parses that, because deciding
                where a title ends and a cataloguer’s note begins would be guesswork on every
                sheet, so no quoted line is shown. The descriptor is given whole instead.
              </p>
            )}

            <div className="mt-4">
              <BatchGrid
                ledger={ledger}
                manifest={r.manifest}
                onOpen={(k) => r.goToBatch(ledger.id, k)}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {shown.map((s) => (
                <button
                  key={s.ref}
                  onClick={() => {
                    r.goToBatch(s.ledger, batchOfSeq(s.seq));
                    r.setGoto(s.ref);
                  }}
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
                      <span className="text-[11.5px] font-medium text-ink-900">
                        {s.leaf === null ? KIND_LABEL[s.kind] : `Leaf ${s.leaf}`}
                      </span>
                      <span className="font-mono text-[10px] text-ink-400">{s.ref}</span>
                    </div>
                    <p className="prose-note mt-0.5 line-clamp-2 text-[11px]">{s.descriptor}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {r.openBatch && (
        <Reader
          manifest={r.manifest}
          open={r.openBatch}
          edition={r.edition}
          setEdition={r.setEdition}
          sheet={r.sheet}
          onSheet={r.onSheet}
          goto={r.goto}
          setGoto={r.setGoto}
          onClose={r.close}
        />
      )}
    </Page>
  );
}
