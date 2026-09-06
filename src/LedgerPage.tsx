import { Page } from './components/Frame.tsx';
import { BatchGrid, Reader, useReader } from './components/Reader.tsx';
import { BY_LEDGER, LEDGER_BY_ID } from './content/catalogue.ts';
import { batchOfSeq, collectionUrl, sheetUrl, whitneyWorkUrl } from './lib/batches.ts';
import { url } from './lib/base.ts';
import type { LedgerKey } from './lib/types.ts';

/**
 * One ledger, as the Whitney holds it.
 *
 * There is no thematic regrouping anywhere on this site, and that is a
 * decision rather than an omission. An earlier version of this page offered
 * six reading "books" — three reproducing a volume and three drawn across
 * volumes by us — each having to announce at its head whose grouping it was.
 * The Hoppers filed their work in six volumes and numbered them; the Whitney
 * accessioned those six volumes as 96.208 to 96.213 and digitised them in
 * order. That is an organisation with an author, and a second one laid over it
 * would only ever be ours.
 *
 * So the unit of reading here is the unit of the archive, and every URL, batch
 * and citation on the site names a volume the Whitney can be asked about.
 */
export function LedgerPage({ id }: { id: LedgerKey }) {
  const ledger = LEDGER_BY_ID.get(id);
  const r = useReader();
  if (!ledger) throw new Error(`Unknown ledger ${id}`);
  const sheets = BY_LEDGER.get(id) ?? [];
  const withLeaf = sheets.filter((s) => s.leaf !== null).length;
  const tags = r.manifest?.tags?.[id] ?? [];
  const read = r.manifest?.read?.[id] ?? 0;

  return (
    <Page path={`/${id}/`}>
      <header className="border-b border-ink-200 py-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-serif text-3xl text-ink-900">{ledger.title}</h1>
          <span className="font-mono text-[13px] text-ink-500">{ledger.objectNumber}</span>
          <span className="text-[13px] text-ink-500">{ledger.date}</span>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          {ledger.about}
        </p>

        <dl className="mt-6 grid max-w-4xl gap-x-8 gap-y-1.5 text-[13px] text-ink-600 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink-400">Sheets</dt>
            <dd className="tabular text-ink-900">
              {sheets.length}
              <span className="text-ink-400">
                {' '}
                · {withLeaf} carry a leaf number, {sheets.length - withLeaf} do not
              </span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink-400">Transcribed</dt>
            <dd className="tabular text-ink-900">{read}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink-400">Medium</dt>
            <dd>{ledger.extendedMedium}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink-400">Dimensions</dt>
            <dd>{ledger.dimensions}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink-400">Credit</dt>
            <dd>{ledger.credit}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-ink-400">At the Whitney</dt>
            <dd className="flex flex-wrap gap-x-3">
              <a
                href={whitneyWorkUrl(ledger.whitneyWork)}
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                catalogue record ↗
              </a>
              <a
                href={collectionUrl(ledger.collection)}
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                all {sheets.length} sheets ↗
              </a>
            </dd>
          </div>
        </dl>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-ink-400">Tags</span>
            {tags.map((t) => (
              <span
                key={t}
                title="From the \keywords{} line of a transcription — the only source of tags here, so no tag can describe a sheet nobody has read"
                className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] text-brand-700"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-500">
          Read a batch
        </h2>
        <p className="prose-note mt-1 max-w-3xl">
          Twelve sheets to a batch — what one pass sustains against a ruled leaf forty lines
          deep. The transcript opens on the left and the Whitney’s photograph on the right;
          scrolling the one turns the other.
        </p>
        <div className="mt-4">
          <BatchGrid ledger={ledger} manifest={r.manifest} onOpen={(k) => r.goToBatch(id, k)} />
        </div>
      </section>

      <section className="py-8">
        <h2 className="font-serif text-xl text-ink-900">Every sheet, in the order it was bound</h2>
        <p className="prose-note mt-1.5 max-w-3xl">
          Each caption is the Whitney’s own File or Component Descriptor, unshortened — including
          the ones recording that a leaf is turned on its side, or that a sheet came loose between
          two others.
          {ledger.quotedBare && (
            <>
              {' '}
              For this volume the descriptors name the work <em>without</em> quotation marks, so
              no quoted line is shown: deciding where a title ends and a cataloguer’s note begins
              would be guesswork on every sheet.
            </>
          )}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {sheets.map((s) => (
            <button
              key={s.ref}
              onClick={() => {
                r.goToBatch(id, batchOfSeq(s.seq), s.ref);
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
                    {s.leaf === null ? s.kind.replace('-', ' ') : `Leaf ${s.leaf}`}
                    {s.spread !== null && `–${s.spread}`}
                  </span>
                  <span className="font-mono text-[10px] text-ink-400">{s.ref}</span>
                </div>
                <p className="prose-note mt-0.5 line-clamp-2 text-[11px]">{s.descriptor}</p>
                {s.years.length > 0 && (
                  <a
                    href={url(`/timeline/#y${s.years[0]}`)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 inline-block text-[10.5px] text-brand-700 hover:underline"
                  >
                    {s.years.join('–')} ↗
                  </a>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {r.openBatch && (
        <Reader
          manifest={r.manifest}
          open={r.openBatch}
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
