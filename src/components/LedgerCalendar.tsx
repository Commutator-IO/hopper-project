/**
 * The days the six books record, one year at a time.
 *
 * ## What the reader is looking at, and the misreading it invites
 *
 * A dense grid of squares reads as productivity, and here that is backwards.
 * These are the days a **transaction** was written down — a cheque cleared, a
 * bill rendered, a plate sold — and the ledger's quiet weeks are the working
 * ones: Sunday carries a sixth of a weekday's days, and August is the thinnest
 * month in the year, because August is Truro and Gloucester and the dealers are
 * behind them in New York. The caption says so above the grid rather than in a
 * footnote, because by the time a reader reaches a footnote they have already
 * formed the wrong impression.
 *
 * ## Why this replaced the strip that was here
 *
 * The old year strip measured *sheets whose Whitney descriptor names a year*,
 * which in practice meant Book IV and nothing else: it is a running account, so
 * its cataloguer had a date for every leaf, while Book I's descriptors say
 * « Page 56 [multiple works] » and name no year at all. So five volumes were
 * invisible in a chart about time. `scripts/streak.mjs` reads the
 * transcriptions' own date columns instead, which every volume has wherever
 * somebody has done the reading, and resolves them to the day.
 *
 * ## Sunday on the top line
 *
 * Not a convention borrowed from elsewhere. Putting Sunday first makes the
 * Sabbath a blank line running the width of every year, so the single most
 * important fact about what this chart measures is legible without reading a
 * word.
 */
import { useMemo, useState } from 'react';
import streak from '../content/streak.json';
import { url } from '../lib/base.ts';

interface Streak {
  span: [number, number];
  ledgers: string[];
  rowsDated: number;
  distinctDays: number;
  years: [number, number, number][];
  days: [string, number, number, string | null][];
}

const DATA = streak as unknown as Streak;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT: Record<string, string> = {
  'book-i': 'Book I', 'book-ii': 'Book II', 'book-iii': 'Book III',
  'book-iv': 'Book IV', 'book-v': 'Book V', dealers: 'Dealers',
};

/**
 * The bands are uneven because the data is.
 *
 * Two thirds of the recorded days carry a single entry, so equal bands would
 * paint almost the whole corpus one colour and reserve four steps for the
 * hundred-odd days above it. These are the site's own brand ramp, which runs
 * light to dark and is therefore already a sequential scale; the empty cell is
 * neutral ink-200 so that « nothing recorded » never reads as a low value.
 */
const BANDS = [1, 2, 4, 8] as const;

// Two spellings of one ramp, and the duplication is load-bearing: an SVG
// `rect` is painted by `fill`, and a `bg-*` class sets `background-color`,
// which SVG ignores entirely. Classing the cells `bg-brand-300` renders a
// grid of 366 invisible squares with no error anywhere.
const STEP_FILL = ['fill-brand-200', 'fill-brand-300', 'fill-brand-400',
                   'fill-brand-500', 'fill-brand-700'];
const STEP_BG = ['bg-brand-200', 'bg-brand-300', 'bg-brand-400',
                 'bg-brand-500', 'bg-brand-700'];
const EMPTY_FILL = 'fill-ink-200';
const EMPTY_BG = 'bg-ink-200';
const stepOf = (n: number) => {
  for (let i = 0; i < BANDS.length; i++) if (n <= BANDS[i]) return i;
  return STEP_FILL.length - 1;
};
const fillFor = (n: number) => (n ? STEP_FILL[stepOf(n)] : EMPTY_FILL);

const CELL = 11;
const GAP = 3;
const PITCH = CELL + GAP;

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const isoOf = (dt: Date) => dt.toISOString().slice(0, 10);

/** Whole weeks since the Sunday on or before 1 January of the date's own year. */
function colOf(dt: Date) {
  const y = dt.getUTCFullYear();
  const jan1 = utc(y, 0, 1);
  const anchor = utc(y, 0, jan1.getUTCDate() - jan1.getUTCDay());
  return Math.floor((dt.getTime() - anchor.getTime()) / 604800000);
}
/** A year spans 53 or 54 Sunday-started columns, depending where 1 January falls. */
const weeksIn = (y: number) => colOf(utc(y, 11, 31)) + 1;

const pretty = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DOW[utc(y, m - 1, d).getUTCDay()]} ${d} ${MONTHS[m - 1]} ${y}`;
};

export function LedgerCalendar({
  year,
  onPickYear,
}: {
  year: number;
  onPickYear: (y: number) => void;
}) {
  const [hover, setHover] = useState<{ iso: string; x: number; y: number } | null>(null);

  const byDate = useMemo(() => {
    const m = new Map<string, { n: number; bits: number; ref: string | null }>();
    for (const [d, n, bits, ref] of DATA.days) m.set(d, { n, bits, ref });
    return m;
  }, []);

  const info = useMemo(
    () => DATA.years.find(([y]) => y === year) ?? [year, 0, 0],
    [year],
  );

  /** The year's own busiest day, for the headline beside it. */
  const top = useMemo(() => {
    let best: { iso: string; n: number } | null = null;
    for (const [d, n] of DATA.days) {
      if (d.slice(0, 4) !== String(year)) continue;
      if (!best || n > best.n) best = { iso: d, n };
    }
    return best;
  }, [year]);

  const weeks = weeksIn(year);
  const width = weeks * PITCH;
  const height = 7 * PITCH;

  const cells = useMemo(() => {
    const out: { iso: string; x: number; y: number; n: number }[] = [];
    for (const d = utc(year, 0, 1); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
      const iso = isoOf(d);
      out.push({
        iso,
        x: colOf(d) * PITCH,
        y: d.getUTCDay() * PITCH,
        n: byDate.get(iso)?.n ?? 0,
      });
    }
    return out;
  }, [year, byDate]);

  const openLeaf = (iso: string) => {
    const rec = byDate.get(iso);
    if (!rec?.ref) return;
    const [led, batch, ref] = rec.ref.split('/');
    window.location.href = url(`/${led}/#${led}/${batch}/${ref}`);
  };

  const hovered = hover ? byDate.get(hover.iso) : undefined;

  return (
    <div className="relative">
      {/* The year's headline: what this one year holds, in its own figures. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-ink-200 pb-3">
        <span className="font-serif text-3xl tabular text-ink-900">{year}</span>
        {info[1] ? (
          <span className="tabular text-[13px] text-ink-500">
            <strong className="font-semibold text-ink-800">{info[1]}</strong> day
            {info[1] === 1 ? '' : 's'} ·{' '}
            <strong className="font-semibold text-ink-800">{info[2]}</strong> entr
            {info[2] === 1 ? 'y' : 'ies'}
            {top && (
              <>
                {' '}
                · busiest {pretty(top.iso).replace(/^\w+ /, '').replace(` ${year}`, '')} ({top.n})
              </>
            )}
          </span>
        ) : (
          <span className="text-[13px] text-ink-400">no dated entry in the transcribed leaves</span>
        )}
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPickYear(year - 1)}
            disabled={year <= DATA.span[0]}
            aria-label="Previous year"
            className="h-6 w-7 rounded border border-ink-200 bg-ink-50 text-[13px] leading-none text-ink-700 hover:border-brand-400 hover:text-brand-600 disabled:opacity-35 disabled:hover:border-ink-200 disabled:hover:text-ink-700"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onPickYear(year + 1)}
            disabled={year >= DATA.span[1]}
            aria-label="Next year"
            className="h-6 w-7 rounded border border-ink-200 bg-ink-50 text-[13px] leading-none text-ink-700 hover:border-brand-400 hover:text-brand-600 disabled:opacity-35 disabled:hover:border-ink-200 disabled:hover:text-ink-700"
          >
            →
          </button>
        </span>
      </div>

      <div className="overflow-x-auto pt-3">
        <div className="flex gap-2" style={{ minWidth: width + 40 }}>
          {/* Sunday first, so the Sabbath is a blank line across the year. */}
          <div className="flex flex-col pt-[15px] text-[9.5px] text-ink-400">
            {DOW.map((d, i) => (
              <span
                key={d}
                className={`flex items-center ${i === 0 ? 'font-semibold text-brand-600' : ''}`}
                style={{ height: PITCH }}
              >
                {d}
              </span>
            ))}
          </div>

          <div>
            <svg width={width} height={15} viewBox={`0 0 ${width} 15`} aria-hidden="true">
              {MONTHS.map((m, i) => (
                <text
                  key={m}
                  x={colOf(utc(year, i, 1)) * PITCH}
                  y={11}
                  className="fill-ink-400"
                  style={{ fontSize: 9.5 }}
                >
                  {m}
                </text>
              ))}
            </svg>
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${year}: ${info[1]} days recorded, ${info[2]} entries`}
              onMouseLeave={() => setHover(null)}
            >
              {cells.map((c) => (
                <rect
                  key={c.iso}
                  x={c.x}
                  y={c.y}
                  width={CELL}
                  height={CELL}
                  rx={2}
                  className={`${fillFor(c.n)} ${c.n ? 'cursor-pointer' : ''}`}
                  tabIndex={c.n ? 0 : undefined}
                  role={c.n ? 'button' : undefined}
                  aria-label={c.n ? `${pretty(c.iso)}, ${c.n} entries` : undefined}
                  onMouseEnter={(e) =>
                    setHover({ iso: c.iso, x: e.clientX, y: e.clientY })
                  }
                  onFocus={(e) => {
                    const b = (e.target as SVGRectElement).getBoundingClientRect();
                    setHover({ iso: c.iso, x: b.left + b.width / 2, y: b.top });
                  }}
                  onBlur={() => setHover(null)}
                  onClick={() => c.n && openLeaf(c.iso)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openLeaf(c.iso);
                    }
                  }}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-3 text-[11px] text-ink-500">
        <span>Entries recorded on a day</span>
        <span className="flex items-center gap-[3px]">
          <span className={`inline-block h-3 w-3 rounded-sm ${EMPTY_BG}`} title="no entry" />
          {STEP_BG.map((s, i) => (
            <span
              key={s}
              className={`inline-block h-3 w-3 rounded-sm ${s}`}
              title={i === 0 ? '1 entry' : i < BANDS.length ? `up to ${BANDS[i]}` : 'more'}
            />
          ))}
        </span>
        <span className="tabular text-ink-400">none → 29 in a day</span>
        <span className="ml-auto text-ink-400">
          A day carrying an entry opens the leaf that records it.
        </span>
      </div>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 max-w-[16rem] rounded bg-ink-900 px-2.5 py-1.5 text-[12px] text-ink-50 shadow-lg"
          style={{
            left: Math.min(hover.x + 14, window.innerWidth - 230),
            top: hover.y + 18,
          }}
          role="status"
        >
          <div className="tabular font-semibold">{pretty(hover.iso)}</div>
          <div className="text-ink-300">
            {hovered
              ? `${hovered.n} ${hovered.n === 1 ? 'entry' : 'entries'} · ${DATA.ledgers
                  .filter((_, i) => hovered.bits & (1 << i))
                  .map((l) => SHORT[l] ?? l)
                  .join(', ')}`
              : 'nothing recorded'}
          </div>
        </div>
      )}
    </div>
  );
}
