import { Page } from './components/Frame.tsx';
import { BatchGrid, Reader, useReader } from './components/Reader.tsx';
import { book, ledgersOf, sheetCountOf, sheetsOf } from './content/books.ts';
import { batchOfSeq } from './lib/batches.ts';
import { LEDGER_BY_ID } from './content/catalogue.ts';
import type { BookKey } from './lib/types.ts';

/**
 * One reading book.
 *
 * The head of every one of these pages says, in one sentence, **where the
 * grouping came from** — the archive's or ours. That is not a courtesy. Three
 * of the six books reproduce a volume exactly and three are threads we drew
 * across the archive; citing « the Apparatus » does not commit you to the same
 * thing as citing 96.208, and a reader has to be able to tell without opening
 * the repository.
 */
export function BookPage({ bookKey }: { bookKey: BookKey }) {
  const b = book(bookKey);
  const r = useReader();
  const sheets = sheetsOf(b);
  const ledgers = ledgersOf(b);

  return (
    <Page path={b.path}>
      <header className="border-b border-ink-200 py-10">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-serif text-3xl text-ink-900">{b.title}</h1>
          <span className="text-[13px] text-ink-500">{b.period}</span>
        </div>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">{b.subtitle}</p>

        {/* The provenance of the grouping, stated before anything else. */}
        <div
          className={`mt-5 max-w-3xl rounded-card border px-4 py-3 text-[13px] leading-relaxed ${
            b.archiveUnit
              ? 'border-relu-200 bg-relu-50 text-ink-700'
              : 'border-encours-200 bg-encours-50 text-ink-700'
          }`}
        >
          <strong className="text-ink-900">
            {b.archiveUnit
              ? `This grouping is the archive’s: ${
                  LEDGER_BY_ID.get(b.archiveUnit)?.title
                } (${LEDGER_BY_ID.get(b.archiveUnit)?.objectNumber}), entire.`
              : 'This grouping is ours.'}
          </strong>{' '}
          {b.rationale}
        </div>

        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
          <div>
            <dt className="text-ink-400">Sheets</dt>
            <dd className="tabular text-ink-900">{sheetCountOf(b)}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Volumes drawn on</dt>
            <dd className="text-ink-900">
              {ledgers.map((l) => `${l.ledger.short} (${l.sheets})`).join(' · ')}
            </dd>
          </div>
          <div>
            <dt className="text-ink-400">Whitney accession</dt>
            <dd className="font-mono text-[12px] text-ink-900">
              {ledgers.map((l) => l.ledger.objectNumber).join(', ')}
            </dd>
          </div>
        </dl>
      </header>

      {/* Batch rows, one per volume this book draws on. Batches are cut by
          volume rather than by book, on purpose: the transcriber works through
          a volume in the order it is bound, and a batch that spanned two books
          would be a set of sheets nobody could open in sequence. */}
      <section className="border-b border-ink-200 py-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-500">
          Read a batch
        </h2>
        <p className="prose-note mt-1 max-w-3xl">
          Twelve sheets to a batch — what one pass sustains against a ruled leaf forty lines deep.
          The transcript opens on the left and the Whitney’s photograph on the right; scrolling
          the one turns the other.
        </p>
        <div className="mt-4 space-y-4">
          {ledgers.map(({ ledger }) => (
            <div key={ledger.id}>
              <div className="mb-1.5 text-[12.5px] text-ink-600">
                {ledger.title}{' '}
                <span className="font-mono text-[11px] text-ink-400">{ledger.objectNumber}</span>
              </div>
              <BatchGrid
                ledger={ledger}
                manifest={r.manifest}
                onOpen={(k) => r.goToBatch(ledger.id, k)}
              />
            </div>
          ))}
        </div>
      </section>

      {b.sections.map((s) => (
        <section key={s.title} className="border-b border-ink-200 py-8 last:border-0">
          <h2 className="font-serif text-xl text-ink-900">{s.title}</h2>
          <p className="prose-note mt-1.5 max-w-3xl">{s.intro}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {s.sheets.map((ref) => {
              const sheet = sheets.find((x) => x.ref === ref);
              if (!sheet) return null;
              const ledger = LEDGER_BY_ID.get(sheet.ledger);
              if (!ledger) return null;
              return (
                <button
                  key={ref}
                  onClick={() => {
                    r.goToBatch(sheet.ledger, batchOfSeq(sheet.seq));
                    r.setGoto(ref);
                  }}
                  className="card group p-3 text-left transition hover:border-brand-400"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-ink-900">
                      {sheet.leaf === null ? 'unnumbered' : `Leaf ${sheet.leaf}`}
                      {sheet.spread !== null && `–${sheet.spread}`}
                    </span>
                    <span className="font-mono text-[10.5px] text-ink-400">{sheet.ref}</span>
                  </div>
                  <p className="prose-note mt-1 line-clamp-3 text-[12px]">{sheet.descriptor}</p>
                  {sheet.quoted.length > 0 && !ledger.quotedBare && (
                    <p className="mt-1.5 text-[11.5px] italic text-brand-700">
                      “{sheet.quoted[0]}”
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

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
