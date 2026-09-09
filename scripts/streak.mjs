#!/usr/bin/env node
/**
 * Every dated row in the six ledgers, resolved to a calendar day.
 *
 * ## What this counts, and what it therefore is not
 *
 * It says on which days the books **record** something — a cheque cleared, a
 * bill rendered, a plate sold, a picture delivered. It is not a record of days
 * Edward Hopper worked, and the difference is not pedantry: the data itself
 * shows the trap. Sunday carries a sixth of the days a weekday does, and August
 * is the thinnest month in the year. Those are the weeks the Hoppers were on
 * the Cape painting, with the dealers behind them in New York. **The painting
 * season is the gap**, so a reader who takes density for productivity reads the
 * chart exactly backwards. Any page showing this has to say so.
 *
 * Josephine Hopper wrote almost every line being counted here.
 *
 * ## Why it reads the transcriptions and not the accounts
 *
 * `accounts.mjs` classifies rows into charges and receipts, and issue #20
 * records that it is currently wrong about Book IV. This script needs none of
 * that: it wants the date column and nothing else, so it goes to the `.tex`
 * files directly and is unaffected.
 *
 * ## Three rules, and why each exists
 *
 *   1. A day is emitted only where **a month name is followed by a day
 *      number**. « Aug. in the City » and « Approaching a City » are picture
 *      titles; without the day-number requirement both become dates and
 *      Book III acquires an August it does not have.
 *   2. **A bare year on a line of its own** sets the year for the rows beneath
 *      it and is not itself a day. That is Book IV's own device.
 *   3. Where a leaf runs December into January and its heading names two
 *      consecutive years, **the year rolls forward**. Every roll is counted and
 *      reported, because it is the one place this script decides something the
 *      paper does not say outright.
 *
 * Nothing is dropped in silence: a row carrying a month that yields no day is
 * counted into `rowsWithMonthUnresolved` and shown on the page.
 */
import { readTranscripts } from './lib/ledger.mjs';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, ap: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

// The full name has to be spelled out in the alternation. Written as bare
// three-letter stems, « Jul » matched the first three letters of « July », the
// pattern then wanted a digit and found a « y », and every month written out in
// full was dropped without a word — the corpus appeared to contain no July at
// all. The day-number requirement still keeps the picture titles out.
const MONTH_RE =
  '(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|Ap|May|Jun(?:e)?|Jul(?:y)?' +
  '|Aug(?:ust)?|Sept(?:ember)?|Sep|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

// « Feb. 3, 28 » · « Nov. 15th » · « July 6 » · « Mar. 4, 1927 »
//
// The year group has to close the cell. Leaf 67 records seven weeks of teaching
// as « Feb 3rd, 10," 17," » — a list of lesson days, not a date with a year —
// and a year group that would take any trailing pair read the second day as
// 1910, which then became the year for every row under it on that leaf.
const MD = new RegExp(
  `\\b${MONTH_RE}\\.?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s*,?\\s*'?(\\d{2,4})\\s*\\.?\\s*$)?`, 'i');
const DM = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${MONTH_RE}\\.?\\s*(\\d{4})?\\b`, 'i');
const ANY_MONTH = new RegExp(`\\b${MONTH_RE}\\b`, 'i');
// A ditto standing for the month already in force: « " 27 », « '' 4 ».
const DITTO_DAY = /^\s*(?:"|''|„|”|“)\s*(\d{1,2})(?:st|nd|rd|th)?\s*\.?\s*$/;
const BARE_YEAR = /^\s*(1[89]\d\d)\s*\.?\s*$/;

const LO = 1890, HI = 1970;

const yearFrom = (raw) => {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return null;
  if (n >= LO && n <= HI) return n;
  // « 28 » in « Feb. 3, 28 ». The ledgers run 1913-1967, so a bare pair is 19xx.
  if (n >= 0 && n <= 99) {
    const y = 1900 + n;
    return y >= LO && y <= HI ? y : null;
  }
  return null;
};

const valid = (y, m, d) => {
  if (!y || !m || !d) return false;
  if (y < LO || y > HI || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const iso = (y, m, d) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** The years a section heading names, in the order written. */
const headingYears = (section) =>
  [...String(section ?? '').matchAll(/\b(1[89]\d\d)\b/g)].map((x) => Number(x[1]));

const files = readTranscripts(root);
const LEDGER_ORDER = ['book-i', 'book-ii', 'book-iii', 'book-iv', 'book-v', 'dealers'];
const days = new Map();
let rolled = 0, unresolved = 0, emitted = 0;
const perLedger = {};

for (const f of files) {
  let curYear = null, curMonth = null, lastLeaf = null, heading = [];

  for (const row of f.looseRows) {
    if (row.leaf !== lastLeaf) {
      // A new leaf: the month no longer carries, and the heading is re-read.
      lastLeaf = row.leaf;
      curMonth = null;
      heading = headingYears(row.section);
      if (heading.length) curYear = heading[0];
    }

    const cells = (row.plain ?? []).map((c) => String(c ?? '').trim());

    // Rule 2: a bare year standing alone.
    const bare = cells.find((c) => BARE_YEAR.test(c));
    if (bare && cells.filter(Boolean).length <= 1) {
      curYear = Number(BARE_YEAR.exec(bare)[1]);
      continue;
    }
    if (cells[0] && BARE_YEAR.test(cells[0])) curYear = Number(BARE_YEAR.exec(cells[0])[1]);

    // Rule 1: month + day, anywhere in the row, first hit wins.
    let y = null, m = null, d = null, found = false;
    for (const c of cells) {
      if (!c) continue;
      const a = MD.exec(c);
      if (a) {
        m = MONTHS[a[1].toLowerCase()]; d = Number(a[2]); y = yearFrom(a[3]);
        found = true; break;
      }
      const b = DM.exec(c);
      if (b) {
        d = Number(b[1]); m = MONTHS[b[2].toLowerCase()]; y = yearFrom(b[3]);
        found = true; break;
      }
    }

    // A ditto in the date column: the month in force, a new day.
    if (!found && cells[0] && DITTO_DAY.test(cells[0]) && curMonth) {
      m = curMonth; d = Number(DITTO_DAY.exec(cells[0])[1]); found = true;
    }

    if (!found) {
      if (cells.some((c) => ANY_MONTH.test(c))) unresolved++;
      continue;
    }

    if (y === null) y = curYear;
    // Rule 3: December into January inside one leaf whose heading spans two years.
    if (curMonth !== null && m < curMonth && curMonth - m >= 6 && heading.length >= 2) {
      const next = heading[heading.length - 1];
      if (next === (y ?? 0) + 1) { y = next; rolled++; }
    }
    curMonth = m;
    if (y !== null) curYear = y;

    if (!valid(y, m, d)) { unresolved++; continue; }

    const key = iso(y, m, d);
    if (!days.has(key)) days.set(key, { n: 0, ledgers: new Set(), refs: new Set() });
    const rec = days.get(key);
    rec.n++;
    rec.ledgers.add(f.ledger);
    if (row.ref) rec.refs.add(`${f.ledger}/${f.batch}/${row.ref}`);
    perLedger[f.ledger] = (perLedger[f.ledger] ?? 0) + 1;
    emitted++;
  }
}

if (!days.size) {
  process.stderr.write('streak: no dated row found in any transcription — refusing to write\n');
  process.exit(1);
}

const sorted = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
// A ledger is carried as a bit per volume rather than a list of strings: the
// file is read by the browser and the same six names on 1,200 rows is most of
// its weight.
const bitsOf = (set) =>
  LEDGER_ORDER.reduce((b, id, i) => (set.has(id) ? b | (1 << i) : b), 0);

const dayRows = sorted.map(([date, r]) => [date, r.n, bitsOf(r.ledgers), [...r.refs][0] ?? null]);

const asDate = (s) => new Date(`${s}T00:00:00Z`);
const stamps = sorted.map(([d]) => asDate(d));
const runs = [];
let run = [stamps[0]];
for (let i = 1; i < stamps.length; i++) {
  if ((stamps[i] - stamps[i - 1]) === 86400000) run.push(stamps[i]);
  else { runs.push(run); run = [stamps[i]]; }
}
runs.push(run);
runs.sort((a, b) => b.length - a.length);

const dow = Array(7).fill(0);   // Sunday first, as the calendar draws it
const mon = Array(12).fill(0);
const yearDays = new Map(), yearRows = new Map();
for (const [date, n] of dayRows) {
  const dt = asDate(date);
  dow[dt.getUTCDay()]++;
  mon[dt.getUTCMonth()]++;
  const y = dt.getUTCFullYear();
  yearDays.set(y, (yearDays.get(y) ?? 0) + 1);
  yearRows.set(y, (yearRows.get(y) ?? 0) + n);
}

const lo = Number(dayRows[0][0].slice(0, 4));
const hi = Number(dayRows[dayRows.length - 1][0].slice(0, 4));
const years = [];
for (let y = lo; y <= hi; y++) years.push([y, yearDays.get(y) ?? 0, yearRows.get(y) ?? 0]);

const busiest = [...dayRows].sort((a, b) => b[1] - a[1]).slice(0, 8)
  .map(([date, n, bits, ref]) => ({
    date, n, ledgers: LEDGER_ORDER.filter((_, i) => bits & (1 << i)), ref,
  }));

const payload = {
  generated: new Date().toISOString(),
  basis:
    'Every row of the six ledgers whose date column resolves to a calendar day. ' +
    'These are the days the books record a transaction, not the days Edward Hopper ' +
    'worked, and Josephine Hopper wrote almost all of them.',
  span: [lo, hi],
  ledgers: LEDGER_ORDER,
  rowsDated: emitted,
  distinctDays: dayRows.length,
  rowsWithMonthUnresolved: unresolved,
  yearRolls: rolled,
  perLedger,
  longestRun: [runs[0].length, runs[0][0].toISOString().slice(0, 10),
               runs[0][runs[0].length - 1].toISOString().slice(0, 10)],
  dow, mon, years, busiest,
  days: dayRows,
};

writeFileSync(resolve(root, 'src/content/streak.json'), `${JSON.stringify(payload, null, 1)}\n`);

process.stdout.write(
  `streak: ${emitted} dated row(s) on ${dayRows.length} distinct day(s), ${lo}–${hi}\n` +
  `        ${unresolved} row(s) name a month and yield no day, reported not dropped; ` +
  `${rolled} year roll(s)\n` +
  `        ${Object.entries(perLedger).map(([k, v]) => `${k} ${v}`).join(', ')}\n`,
);
