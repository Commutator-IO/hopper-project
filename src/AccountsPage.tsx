import { useMemo } from 'react';
import { Page } from './components/Frame.tsx';
import accountsData from './content/accounts.json';
import { LEDGERS } from './content/catalogue.ts';
import { url } from './lib/base.ts';

/**
 * The sales the transcriptions record, gathered by year.
 *
 * ## What this page is careful not to be
 *
 * It is not Edward Hopper's income, and the coverage line says so before any
 * figure appears. Six batches of one volume are transcribed out of forty-two
 * across six, so every number here is a **floor under a number nobody knows
 * yet**. A total without its denominator is exactly the kind of thing that
 * gets quoted, and a table looks like data in a way that prose does not.
 *
 * ## Why the rows that could not be read are on the page
 *
 * Because they are the most interesting thing on it. `scripts/accounts.mjs`
 * refuses to date a sale from anything but the leaf's own date column, and on
 * the etchings leaves that column dates the *exhibition* — so most etching
 * sales have no accrual date at all, only the day the cheque cleared. Hiding
 * that would leave a tidy table that quietly omits half the archive. Showing
 * it turns a gap into a finding: the oils can be accounted on the accrual
 * basis and the etchings cannot, and the ledger's own ruling is the reason.
 *
 * Nothing on this page is computed from anything but the `.tex` files.
 */

interface Year {
  year: number;
  sales: number;
  gross: number;
  commission: number;
  net: number;
  disagreements: number;
  /**
   * Cheques that cleared in this year, whatever year the sale was made — net
   * of commission, on the same basis as `net`. Written by `accounts.mjs`
   * alongside the accrual figures and, until the bars were paired, never read.
   */
  received: number;
}

interface Work {
  title: string;
  net: number;
  gross: number;
  sales: number;
  years: number[];
  ledgers: string[];
}

/**
 * A dealer or a buyer, with what the rows naming them came to.
 *
 * `net` is what the Hoppers kept on those rows, on both tables — so the
 * dealers' column is not the dealer's own take, and is not comparable with a
 * commission. It answers « how much of the archive went through this name ».
 */
interface Party {
  name: string;
  aliases?: string[];
  sales: number;
  net: number;
  gross: number;
  works: number;
  first: number;
  last: number;
}

interface Unparsed {
  reason: string;
  ledger: string;
  leaf: string | null;
  work: string | null;
  row: string[];
}

const A = accountsData as unknown as {
  basis: string;
  note: string;
  limit: string;
  coverage: {
    ledgersTranscribed: string[];
    ledgersCounted: string[];
    batches: number;
    sheets: number;
    note: string;
    countedNote: string;
  };
  arithmetic: { checkable: number; agree: number; disagree: number; note: string };
  /**
   * The same money split by which trade earned it. `years` below is the art
   * alone; this is where Book IV's illustration income lives.
   */
  activities: {
    key: string;
    label: string;
    ledgers: string[];
    batches: number;
    rows: number;
    years: { year: number; accrued: number; received: number; notRecorded: number; outstanding: number }[];
    totals: { accrued: number; collected: number; outstanding: number; notRecorded: number };
  }[];
  activitiesNote: string;
  /** Book IV's own counts — what was read as a charge, and what was set aside. */
  illustration: {
    charges: number;
    receipts: number;
    subtotalsExcluded: number;
    deductionsExcluded: number;
    netsExcluded: number;
    carriedSumsExcluded: number;
    struckExcluded: number;
    wordlessReceipts: number;
    blankDescription: number;
    note: string;
  };
  years: Year[];
  works: Work[];
  worksNote: string;
  duplicates: { count: number; note: string; sample: { work: string; net: number }[] };
  parties: {
    dealers: Party[];
    buyers: Party[];
    namedNobody: number;
    ambiguous: number;
    counted: number;
    note: string;
    matchNote: string;
  };
  receivable: { year: number; accrued: number; received: number; outstanding: number }[];
  receivableNote: string;
  entries: { year: number; leaf: string | null; work: string | null; gross: number; rateWritten: string; net: number; check: string | null; receiptWritten: number | null }[];
  unparsed: { count: number; sample: Unparsed[] };
};

/**
 * One trade, with the three states its money can be in.
 *
 * The bar is stacked rather than grouped because the three are parts of one
 * whole — collected + outstanding + not recorded is exactly what was accrued,
 * at every level, and the generator asserts it. A grouped bar would let a
 * reader add them and get twice the money.
 */
function Trade({
  a,
}: {
  a: {
    key: string;
    label: string;
    ledgers: string[];
    rows: number;
    years: { year: number; accrued: number; notRecorded: number }[];
    totals: { accrued: number; collected: number; outstanding: number; notRecorded: number };
  };
}) {
  const t = a.totals;
  const pct = (n: number) => (t.accrued > 0 ? (n / t.accrued) * 100 : 0);
  // The years it *earned* in, not the years the account touches: art's series
  // runs to 1962 because a cheque arrived then, and a span printed above the
  // words « earned, as the rows state it » must not include a year that sold
  // nothing.
  const earning = a.years.filter((y) => y.accrued + y.notRecorded > 0);
  const first = earning[0]?.year;
  const last = earning[earning.length - 1]?.year;
  const buckets = [
    { k: 'Collected', v: t.collected, cls: 'bg-relu-500', help: 'a cheque is recorded against it' },
    {
      k: 'Still owed',
      v: t.outstanding,
      cls: 'bg-encours-500',
      help: 'accrued, and no cheque yet in the leaves read',
    },
    {
      k: 'Not recorded',
      v: t.notRecorded,
      cls: 'bg-ink-300',
      help: 'the row states no receipt of any kind — an absence, not a debt',
    },
  ];

  return (
    <div className="rounded-card border border-ink-200 bg-white px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-semibold text-ink-900">{a.label}</h3>
        <span className="text-[11.5px] text-ink-400">
          {first === last ? first : `${first}–${last}`}
        </span>
      </div>
      <div className="mt-0.5 text-[11.5px] text-ink-400">
        {a.ledgers.map(named).join(', ')} · {a.rows} rows
      </div>

      <div className="mt-3 font-serif text-2xl tabular text-ink-900">${money(t.accrued)}</div>
      <div className="text-[11px] uppercase tracking-wider text-ink-400">earned, as the rows state it</div>

      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-sm bg-ink-100">
        {buckets.map((b) =>
          b.v > 0 ? (
            <span
              key={b.k}
              className={b.cls}
              style={{ width: `${pct(b.v)}%` }}
              title={`${b.k}: $${money(b.v)}`}
            />
          ) : null,
        )}
      </div>

      <dl className="mt-3 space-y-1.5">
        {buckets.map((b) => (
          <div key={b.k} className="flex items-baseline gap-2">
            <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-sm ${b.cls}`} />
            <dt className="text-[12.5px] text-ink-700">{b.k}</dt>
            <dd className="ml-auto shrink-0 tabular text-[12.5px] text-ink-900">
              ${money(b.v)}
            </dd>
            <dd className="w-10 shrink-0 text-right tabular text-[11.5px] text-ink-400">
              {t.accrued > 0 ? `${Math.round(pct(b.v))}%` : '—'}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">
        {buckets.find((b) => b.v > 0 && b.k === 'Not recorded')
          ? 'Most of what looks unpaid here is unwritten rather than unsettled.'
          : 'Every charge in this book is followed to a cheque or is still open.'}
      </p>
    </div>
  );
}

/**
 * The two trades on one time axis.
 *
 * Each trade is scaled to its own peak on purpose. The illustration work runs
 * at fifteen and twenty dollars a drawing and the oils at thousands a canvas,
 * so a shared axis would draw four years of steady weekly earning as a flat
 * line — which is the opposite of what the strip is for. What is comparable
 * here is *when*, and the figures are in the cards above.
 */
function Spans({
  activities,
}: {
  activities: { key: string; label: string; years: { year: number; accrued: number; notRecorded: number }[] }[];
}) {
  const live = activities.filter((a) => a.years.length);
  if (!live.length) return null;
  const all = live.flatMap((a) => a.years.map((y) => y.year));
  const from = Math.min(...all);
  const to = Math.max(...all);
  const span = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const tone: Record<string, string> = { art: 'bg-brand-400', illustration: 'bg-edward-500' };

  return (
    <div className="mt-4 space-y-3">
      {live.map((a) => {
        const by = new Map(a.years.map((y) => [y.year, y.accrued + y.notRecorded]));
        const peak = Math.max(...by.values(), 1);
        return (
          <div key={a.key}>
            <div className="flex items-baseline gap-2 text-[11.5px] text-ink-500">
              <span className={`inline-block h-2 w-2 rounded-sm ${tone[a.key] ?? 'bg-ink-400'}`} />
              {a.label}
            </div>
            <div className="mt-1 flex h-12 items-end gap-px">
              {span.map((year) => {
                const v = by.get(year) ?? 0;
                return (
                  <span
                    key={year}
                    className={`flex-1 rounded-t-[1px] ${v > 0 ? (tone[a.key] ?? 'bg-ink-400') : 'bg-ink-100'}`}
                    style={{ height: v > 0 ? `${Math.max(6, (v / peak) * 100)}%` : '2px' }}
                    title={v > 0 ? `${year}: $${money(v)}` : `${year}: nothing recorded`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-[11px] tabular text-ink-400">
        <span>{from}</span>
        <span>{to}</span>
      </div>
    </div>
  );
}

/** A volume's own short name — « Book III », not the `book-iii` of a filename. */
const named = (id: string) => LEDGERS.find((l) => l.id === id)?.short ?? id;

const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function AccountsPage() {
  const totals = useMemo(
    () =>
      A.years.reduce(
        (t, y) => ({
          sales: t.sales + y.sales,
          gross: t.gross + y.gross,
          commission: t.commission + y.commission,
          net: t.net + y.net,
        }),
        { sales: 0, gross: 0, commission: 0, net: 0 },
      ),
    [],
  );

  /**
   * Volumes this page names as transcribed and does not count.
   *
   * Read off the data rather than listed here, so it empties itself if the
   * generator ever reaches an unruled leaf. See `coverage.countedNote`.
   */
  const uncounted = useMemo(() => {
    const counted = new Set(A.coverage.ledgersCounted);
    return A.coverage.ledgersTranscribed
      .filter((id) => !counted.has(id))
      .map(named);
  }, []);

  const illustration = A.activities?.find((a) => a.key === 'illustration');
  // How many batches the pocket book would take in all, so the fraction read
  // is observed rather than written into the sentence and left to go stale.
  const ivBatches = useMemo(
    () => Math.max(1, Math.ceil((LEDGERS.find((l) => l.id === 'book-iv')?.sheets ?? 0) / 12)),
    [],
  );

  // One scale for both bars, and it is a net scale on purpose. Gross carries
  // the dealer's third and `received` does not, so a gross bar drawn beside a
  // received bar would show every year under-collected by exactly the
  // commission — an artefact of the two bases, not a fact about the cheques.
  const peak = useMemo(
    () => Math.max(...A.years.map((y) => Math.max(y.net, y.received ?? 0))),
    [],
  );

  return (
    <Page path="/accounts/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Accounts</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          What the transcribed leaves record in sales, gathered by year, on the accrual basis —
          booked when the work went out rather than when the cheque cleared. Gross is the price
          Jo Hopper wrote; the commission is the dealer’s fraction written beside it, recomputed
          here and checked against the receipt she recorded.
        </p>
        <p className="prose-note mt-2 max-w-3xl">
          The date is the leaf’s own date column — the first, where the leaf rules its columns,
          and the last on Book II’s leaves, which rule none and put the date after the buyer, the
          price and the cheque. That column is not always the day of sale: on the watercolour
          leaves it is headed « Date kept at Rehn Gallery » and dates the consignment, on the
          etchings leaves it dates the exhibition. So this is an account of
          when work entered the market, which is the nearest thing to a sale date these books
          keep. Where the column dates something else entirely the row is reported below rather
          than dated wrongly.
        </p>
        <div className="mt-4 max-w-3xl rounded-card border border-alerte-200 bg-alerte-50 px-4 py-3">
          <p className="text-[13.5px] leading-relaxed text-ink-800">
            <strong className="font-semibold">This is not Edward Hopper’s income.</strong>{' '}
            {A.coverage.batches} batches of {A.coverage.ledgersTranscribed.map(named).join(', ')} are
            transcribed — {A.coverage.sheets} sheets of the 504 in the six volumes. Every figure
            below is a floor under a number nobody knows yet, and it moves as batches land.
          </p>
          {illustration && illustration.rows > 0 && (
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-800">
              <strong className="font-semibold">
                And every table below this one is his own work only.
              </strong>{' '}
              Book IV is a pocket cash book of magazine and advertising commissions — a different
              trade, on a different basis — so it is counted apart rather than added in. It has
              its own section directly below, and every figure after that is the sale of a
              picture.
            </p>
          )}
          {uncounted.length > 0 && (
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-800">
              <strong className="font-semibold">
                And it does not count every volume it names.
              </strong>{' '}
              The figures are read out of ruled rows, because a row puts the price in one cell and
              the date in another, and which column a date stands in is what says whether it dates
              the sale or the cheque. {uncounted.join(' and ')}{' '}
              {uncounted.length > 1 ? 'write' : 'writes'} the sale as a sentence on an unruled
              leaf, so {uncounted.length > 1 ? 'those volumes are' : 'that volume is'} transcribed
              here and counted nowhere. That money is on the sheets and outside these totals.
            </p>
          )}
        </div>
      </header>

      <section className="border-b border-ink-200 py-6">
        <h2 className="text-[11px] uppercase tracking-wider text-ink-400">
          Sales of his own work — Book I, Book II and the dealers’ book
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-4">
        {[
          { k: 'Sales recorded', v: String(totals.sales) },
          { k: 'Gross', v: `$${money(totals.gross)}` },
          { k: 'Dealer commission', v: `$${money(totals.commission)}` },
          { k: 'Net to the Hoppers', v: `$${money(totals.net)}` },
        ].map((c) => (
          <div key={c.k}>
            <div className="text-[11px] uppercase tracking-wider text-ink-400">{c.k}</div>
            <div className="font-serif text-2xl tabular text-ink-900">{c.v}</div>
          </div>
        ))}
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Two trades, and what came of the money</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          Edward Hopper earned in two ways and kept two kinds of book about it. Books I, II, III
          and V and the dealers’ book record him selling his own work; Book IV is a stationer’s
          pocket cash book of magazine and advertising commissions. Adding them would make one
          number out of two trades that barely share a decade, so they stand apart here — and
          each is split by what actually became of the money.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {A.activities.map((a) => (
            <Trade key={a.key} a={a} />
          ))}
        </div>

        <p className="prose-note mt-4 max-w-3xl">
          <strong className="font-semibold text-ink-700">Three states and not two</strong>, because
          the two books do not record the same things. Book IV names a cheque for very nearly
          every charge in it, so what it leaves undischarged is nearer to a real debt than a
          silence. The work books mostly do not: a leaf there often writes one date to a sale and
          never separates the day the picture went out from the day the money came. So a sale can
          sit unpaid because the buyer had not paid, or because Jo Hopper did not write it down,
          and those are not the same fact. Folding them together would set tens of thousands of
          dollars of <em>silence</em> beside a few hundred of real debt and invite you to compare
          them.
        </p>
        <p className="prose-note mt-3 max-w-3xl">
          <strong className="font-semibold text-ink-700">
            Book IV’s « still owed » is not all debt either
          </strong>
          , and it is read high rather than low. {A.illustration.blankDescription} of its charges
          describe nothing at all, and a figure with no words beside it is as often a sum the
          writer ruled off under her own items as a price she forgot to name. Where a cheque, a
          bill or a « less » line stands under such a sum it is recognised and excluded; where
          nothing answers it, or where the leaf’s own arithmetic disagrees with itself — leaf 125
          rules off 2700 over two oils of 1200 — it is counted as a charge and inflates both the
          gross and what looks unpaid. That is the largest open question in this volume, and it
          is stated here rather than smoothed.
        </p>

        <h3 className="mt-8 font-serif text-[17px] text-ink-900">When each trade earned</h3>
        <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          One bar to a year, each trade to its own scale — the point is the shape and the span,
          not the height, because a twenty-dollar line drawing and a three-thousand-dollar canvas
          would flatten each other on one axis.
        </p>
        <Spans activities={A.activities} />
        <p className="prose-note mt-3 max-w-3xl">
          In what has been read so far the two do not overlap at all: the illustration income
          stops in {illustration?.years[illustration.years.length - 1]?.year} and the first sale
          of his own work is booked in {A.years[0]?.year}. That gap is the part of the career the
          paintings books do not mention — and it is a gap in the <em>transcription</em> before it
          is a gap in the life: Book IV runs to 1967, and {illustration?.batches} of its{' '}
          {ivBatches} batches are read.
        </p>
      </section>

      <section className="py-6">
        <h2 className="font-serif text-xl text-ink-900">Year by year</h2>
        <p className="prose-note mt-2 max-w-3xl">
          Two bars to a year, to one scale throughout and both net of the dealer’s commission:
          the upper is what the year <em>sold</em>, the lower what it{' '}
          <em>collected</em> — cheques that cleared in that year, whatever year the sale was
          made. Where the lower bar is the longer, the year was paid for work it did not do:
          1931 collects $4,280 against $232 sold, because the two big canvases of 1930 were paid
          for then. The shape is the archive’s, not a reading of it: the oils sell from 1928, the
          peak is 1930, and what follows is the Depression arriving in a household’s books.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-sm bg-brand-400" /> sold, net
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-6 rounded-sm bg-ink-300" /> collected
          </span>
        </p>
        <table className="mt-4 w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5 text-left font-normal">Year</th>
              <th className="py-1.5 text-right font-normal">Sales</th>
              <th className="py-1.5 text-right font-normal">Gross</th>
              <th className="py-1.5 text-right font-normal">Commission</th>
              <th className="py-1.5 text-right font-normal">Net</th>
              <th className="w-1/3 py-1.5 text-left font-normal" />
            </tr>
          </thead>
          <tbody>
            {A.years.map((y) => (
              <tr key={y.year} className="border-b border-ink-100">
                <td className="py-1.5 tabular text-ink-900">{y.year}</td>
                <td className="py-1.5 text-right tabular text-ink-500">{y.sales}</td>
                <td className="py-1.5 text-right tabular text-ink-900">${money(y.gross)}</td>
                <td className="py-1.5 text-right tabular text-ink-500">
                  −${money(y.commission)}
                </td>
                <td className="py-1.5 text-right tabular text-ink-900">${money(y.net)}</td>
                <td className="py-1.5 pl-3">
                  <span
                    className="block h-1.5 rounded-sm bg-brand-400"
                    style={{ width: `${Math.max(y.net > 0 ? 1 : 0, (y.net / peak) * 100)}%` }}
                    title={`sold ${money(y.net)} net`}
                  />
                  <span
                    className="mt-0.5 block h-1.5 rounded-sm bg-ink-300"
                    style={{
                      width: `${Math.max((y.received ?? 0) > 0 ? 1 : 0, ((y.received ?? 0) / peak) * 100)}%`,
                    }}
                    title={`collected ${money(y.received ?? 0)}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">What each work brought in</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          The same sales cut by work rather than by year, net of the dealer’s commission. It
          ranks <em>titles</em>, not objects, and the sales column is the only thing that keeps
          the two apart: a plate sold twenty-one times at twenty-five dollars and a canvas sold
          once for three thousand are both one row here.
        </p>
        <p className="prose-note mt-2 max-w-3xl">
          {A.worksNote}
        </p>
        {A.duplicates.count > 0 && (
          <p className="prose-note mt-2 max-w-3xl">
            {A.duplicates.count === 1 ? 'One sale was' : `${A.duplicates.count} sales were`}{' '}
            written into two volumes and {A.duplicates.count === 1 ? 'is' : 'are'} counted once,
            here and in every total above —{' '}
            {A.duplicates.sample.map((d) => d.work).join(', ')}. Jo Hopper cross-referenced{' '}
            {A.duplicates.count === 1 ? 'it' : 'them'} herself. Left alone,{' '}
            {A.duplicates.count === 1 ? 'it' : 'they'} would rank at exactly twice what{' '}
            {A.duplicates.count === 1 ? 'it' : 'they'} fetched.
          </p>
        )}
        <table className="mt-4 w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5 text-left font-normal">Work</th>
              <th className="py-1.5 text-right font-normal">Sales</th>
              <th className="py-1.5 text-right font-normal">Years</th>
              <th className="py-1.5 text-right font-normal">Net</th>
              <th className="w-1/4 py-1.5 text-left font-normal" />
            </tr>
          </thead>
          <tbody>
            {A.works.slice(0, 10).map((w) => (
              <tr key={w.title} className="border-b border-ink-100">
                <td className="py-1.5 text-ink-900">{w.title}</td>
                <td className="py-1.5 text-right tabular text-ink-500">{w.sales}</td>
                <td className="py-1.5 text-right tabular text-ink-500">
                  {w.years.length === 0
                    ? '—'
                    : w.years.length === 1
                      ? w.years[0]
                      : `${w.years[0]}–${w.years[w.years.length - 1]}`}
                </td>
                <td className="py-1.5 text-right tabular text-ink-900">${money(w.net)}</td>
                <td className="py-1.5 pl-3">
                  <span
                    className="inline-block h-2 rounded-sm bg-brand-400 align-middle"
                    style={{ width: `${Math.max(1, (w.net / A.works[0].net) * 100)}%` }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Who was on the other side</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          Two rankings, and they are not the same question. The name beside the price on an
          etchings leaf is almost always the <em>dealer</em> — « Keppel 30&nbsp;-&nbsp;1/3 » — and
          what he did with the print was sell it. The person who took it home is named only where
          Jo Hopper happened to know, and that is why the second table is the shorter one: it is
          short because the ledger usually did not record a buyer, not because the pictures went
          nowhere.
        </p>
        <p className="prose-note mt-2 max-w-3xl">
          Net is what the <em>Hoppers</em> kept, on both tables. The dealers’ column is therefore
          not the dealer’s own take and cannot be read as one — it says how much of the archive
          passed through that name.
        </p>
        <p className="prose-note mt-2 max-w-3xl">{A.parties.note}</p>

        <div className="mt-5 grid gap-x-10 gap-y-8 lg:grid-cols-2">
          {[
            {
              heading: 'Through whom it sold',
              caption: 'Dealers and galleries.',
              rows: A.parties.dealers,
            },
            {
              heading: 'Who bought it',
              caption: 'Buyers and collections the leaves name.',
              rows: A.parties.buyers,
            },
          ].map((t) => (
            <div key={t.heading}>
              <h3 className="font-serif text-[15px] text-ink-900">{t.heading}</h3>
              <p className="mt-1 text-[12.5px] text-ink-500">{t.caption}</p>
              {t.rows.length === 0 ? (
                <p className="prose-note mt-3">
                  Nothing here yet — no batch transcribed so far names one.
                </p>
              ) : (
                <table className="mt-3 w-full text-[13.5px]">
                  <thead>
                    <tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-400">
                      <th className="py-1.5 text-left font-normal">Name</th>
                      <th className="py-1.5 text-right font-normal">Sales</th>
                      <th className="py-1.5 text-right font-normal">Years</th>
                      <th className="py-1.5 text-right font-normal">Net</th>
                      <th className="w-1/5 py-1.5 text-left font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.slice(0, 10).map((p) => (
                      <tr key={p.name} className="border-b border-ink-100">
                        <td className="py-1.5 text-ink-900">
                          {p.name}
                          {p.aliases && (
                            <span
                              className="ml-1.5 text-[11.5px] text-ink-400"
                              title={`written on the leaves as ${p.aliases.join(', ')}`}
                            >
                              +{p.aliases.length - 1}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 text-right tabular text-ink-500">{p.sales}</td>
                        <td className="py-1.5 text-right tabular text-ink-500">
                          {p.first === p.last ? p.first : `${p.first}–${p.last}`}
                        </td>
                        <td className="py-1.5 text-right tabular text-ink-900">
                          ${money(p.net)}
                        </td>
                        <td className="py-1.5 pl-3">
                          <span
                            className="inline-block h-2 rounded-sm bg-brand-400 align-middle"
                            style={{ width: `${Math.max(1, (p.net / t.rows[0].net) * 100)}%` }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>

        <p className="prose-note mt-5 max-w-3xl">
          {A.parties.namedNobody} of the {A.parties.counted} counted sales name nobody the
          transcriptions have tagged, and a further {A.parties.ambiguous} write only a surname
          that more than one party could answer to — « Rockefeller » where three are on record,
          « Hartford » where the word is as often the Connecticut city as the Californian buyer.
          Those rows are reported rather than credited to a guess, which is why the two tables
          together account for well under half the sales above.
        </p>
        <p className="prose-note mt-2 max-w-3xl">{A.parties.matchNote}</p>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">What went undischarged</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          A work went to the dealer in one year and the cheque arrived in another, and in between
          somebody owed the Hoppers money. That gap is the whole difference between an accrual
          account and a cash one, and on these leaves it is not a rounding: the longest wait in
          what has been transcribed is a watercolour left at the Rehn Gallery in October 1924 and
          paid for in June 1962 — thirty-eight years.
        </p>
        <p className="prose-note mt-2 max-w-3xl">{A.receivableNote}</p>
        <p className="prose-note mt-2 max-w-3xl">
          The last column is deliberately not headed <em>owed</em>. It is everything the leaves
          have not followed to a cheque, and the section at the top of this page splits that in
          two: of the ${money(A.years.reduce((n, y) => n + y.net, 0))} accrued here, only what
          carries a receipt date can be called settled or unsettled at all, and the rest — nearly
          two thirds — is a row that says nothing either way. A debt and a silence run together in
          this column because the running total cannot tell them apart; the cards above can.
        </p>
        <table className="mt-4 w-full max-w-3xl text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5 text-left font-normal">Year</th>
              <th className="py-1.5 text-right font-normal">Accrued</th>
              <th className="py-1.5 text-right font-normal">Received</th>
              <th className="py-1.5 text-right font-normal">Undischarged at year end</th>
            </tr>
          </thead>
          <tbody>
            {A.receivable.map((r) => (
              <tr key={r.year} className="border-b border-ink-100">
                <td className="py-1.5 tabular text-ink-900">{r.year}</td>
                <td className="py-1.5 text-right tabular text-ink-700">${money(r.accrued)}</td>
                <td className="py-1.5 text-right tabular text-ink-700">
                  {r.received ? `$${money(r.received)}` : '—'}
                </td>
                <td className="py-1.5 text-right tabular text-ink-900">
                  ${money(r.outstanding)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="prose-note mt-3 max-w-3xl">
          1931 is the shape of the thing: $232 accrued and $4,280 received, because the cheques
          for the 1930 canvases arrived after the year that sold them. A cash account would call
          1931 a good year and an accrual account calls it the collapse. Both are true and they
          are about different things.
        </p>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">What the ledgers do not record</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          <strong className="font-semibold">Costs.</strong> There is no expense column anywhere in
          the transcribed sheets, because these are sales ledgers: they record what came in.
          Canvas, paint, copper plates, the printer, the Truro house, the summers at Gloucester,
          the 1925 journey to Santa Fe, the years in Paris — none of it is costed anywhere on
          these leaves. Searching all {A.coverage.sheets} transcribed sheets for an outgoing
          turns up exactly two lines, and one of them is income: a New York State sales tax of $15
          at one per cent on Night Windows, and an insurance payment of $1,000{' '}
          <em>received</em> in November 1929.
        </p>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          So no profit figure can be derived from this archive, and none is shown. The dealer’s
          commission is the one business cost the ledgers do quantify, and it is a large one: a third of nearly every line and{' '}
          {((100 * (A.years.reduce((n, y) => n + y.commission, 0))) /
            A.years.reduce((n, y) => n + y.gross, 0)).toFixed(1)}
          % of gross across everything read so far. « Net to the Hoppers » above is therefore
          revenue after commission, not profit, and the difference is every other cost of being a
          painter.
        </p>
        <p className="prose-note mt-3 max-w-3xl">
          An estimate of the rest would have to come from outside the archive, and that is not
          this page’s to make. Where a named source states such a figure it belongs in a work’s
          note, carrying that source — never in a table derived from the sheets, where it would
          be indistinguishable from something Jo Hopper wrote down.
        </p>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">What the accrual basis cannot reach</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">{A.limit}</p>
        <p className="prose-note mt-3 max-w-3xl">
          {A.unparsed.count} rows are reported rather than counted — a sale whose year nothing on
          the leaf states, or a money column carrying writing that is not a figure in dollars.
          They are listed because a parser that silently skips what it cannot read produces a
          total that looks complete, and a total that looks complete is the one nobody re-checks.
          The sample below is taken a reason at a time rather than off the top of the list, so
          that a kind of refusal with one row under it is as visible as a kind with a hundred.
        </p>
        <ul className="mt-4 max-w-3xl">
          {A.unparsed.sample.map((u, i) => (
            <li key={i} className="border-b border-ink-100 py-2 text-[12.5px] leading-relaxed">
              <span className="text-ink-400">
                {u.ledger} {u.leaf ? `leaf ${u.leaf}` : ''}
                {u.work ? ` · ${u.work}` : ''}
              </span>
              <div className="text-ink-700">{u.row.filter(Boolean).join('  |  ')}</div>
              <div className="text-ink-400">{u.reason}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Checking her arithmetic against ours</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          {A.arithmetic.note} Of {A.arithmetic.checkable} rows that state one sale and one
          receipt, {A.arithmetic.agree} agree and {A.arithmetic.disagree} do not.
        </p>
        <ul className="mt-3 max-w-3xl">
          {A.entries
            .filter((e) => e.check === 'disagrees')
            .map((e, i) => (
              <li key={i} className="border-b border-ink-100 py-2 text-[12.5px] text-ink-700">
                <span className="text-ink-400">
                  {e.year} · leaf {e.leaf} {e.work ? `· ${e.work}` : ''}
                </span>{' '}
                — {e.gross} less {e.rateWritten} is {money(e.net)}, and she wrote{' '}
                {e.receiptWritten !== null ? money(e.receiptWritten) : '—'}.
              </li>
            ))}
        </ul>
        <p className="prose-note mt-3 max-w-3xl">
          A disagreement is not an error until somebody has looked. Every one of these so far is
          the ledger being richer than the check: a row that sold two impressions and recorded
          one receipt for both, a sale paid in two instalments, a third rounded up rather than
          down. The check earns its place anyway — it is the cheapest thing that would catch a
          misread digit.
        </p>
      </section>

      <section className="border-t border-ink-200 py-8">
        <p className="prose-note max-w-3xl">
          {A.note} Rebuilt by <code>npm run accounts</code> from{' '}
          <a
            href={url('/method/')}
            className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
          >
            the transcriptions
          </a>{' '}
          alone, and it changes only when they do.
        </p>
      </section>
    </Page>
  );
}
