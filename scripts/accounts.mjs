#!/usr/bin/env node
/**
 * Builds `src/content/accounts.json` — the sales the transcriptions record,
 * gathered by year.
 *
 * ## What this is, and the four words it is not
 *
 * It is not *Edward Hopper's income*. Six batches of one volume are
 * transcribed out of forty-two across six, so every figure here is a **floor
 * under a number nobody knows yet**, and it moves as batches land. The
 * coverage block is written into the output for that reason: a total without
 * its denominator is the kind of thing that gets quoted.
 *
 * It is also not the ledger's own arithmetic. Jo Hopper wrote « 2000 - 1/3 »
 * and, three columns later, what the cheque came to. This script recomputes
 * the commission from the price and the fraction and **checks it against the
 * receipt she wrote**, and where the two disagree it says so rather than
 * preferring either. Her figure is the record; the arithmetic is a test of the
 * reading, and a mismatch usually means a digit was misread rather than that
 * she was wrong.
 *
 * ## The basis: accrual, dated at the sale
 *
 * These leaves carry both dates — the day a work sold and the day the cheque
 * cleared — and they are frequently years apart. Night Windows sold in
 * December 1928 and was paid for in April 1934. Booking it here at the sale is
 * the accrual basis, and it is the one that answers « how did the work go in
 * 1928 ». A cash-basis account of the same rows would be a different and
 * equally true statement; the receipt dates are carried on every entry so it
 * could be built without re-reading a leaf.
 *
 * ## What counts as a sale
 *
 * A cell that carries a price and the dealer's cut — `25 - 1/3`, `30 - 1/4`,
 * `250 - 10%`, `1500 - 1/3 Com.` That pattern is Jo Hopper's, it is
 * unambiguous, and it is the only thing recognised. A bare figure is not
 * counted: the price columns also hold valuations, asking prices for works
 * that did not sell, and the amounts of earlier receipts, and no rule
 * separates those from a sale except the commission written beside it.
 *
 * **Everything not recognised is reported, never dropped.** `unparsed` carries
 * a count and a sample by reason. A parser that silently skips what it does
 * not understand produces a total that looks complete, and a total that looks
 * complete is the one nobody re-checks.
 *
 *   npm run accounts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readTranscripts, workKey } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');

/* ------------------------------------------------------------- dates */

/**
 * The year a cell states, as a four-figure year.
 *
 * The leaves write it every way: « Oct. 6, 24 », « Feb. 14" '57 », « 1930 »,
 * « Fall 1923 », and — where the row is one of a run — nothing at all but a
 * ditto. Two figures are expanded on the century the ledgers occupy: the books
 * run 1913 to 1967, so `24` is 1924 and there is no ambiguity to resolve.
 * Anything outside 1900–1970 is refused rather than coerced.
 */
function yearOf(cell) {
  const s = cell.trim();
  if (!s) return null;
  const four = /\b(1[89]\d\d|20\d\d)\b/.exec(s);
  if (four) {
    const y = Number(four[1]);
    return y >= 1900 && y <= 1970 ? y : null;
  }
  // « Oct. 6, 24 », « Feb. 14" '57 », « , 27 », or a cell holding nothing but
  // « 28 ». A comma or an apostrophe must introduce it, or it must be the whole
  // cell: without that, « Feb. 20 » reads as the year 1920 rather than the
  // twentieth of February, and Book I leaves 28 and 30 duly booked four sales
  // to a year before the ledger opens.
  const two = /^'?(\d{2})\.?$/.exec(s) ?? /[,']\s*'?(\d{2})\b/.exec(s);
  if (two) {
    const n = Number(two[1]);
    const y = 1900 + n;
    return y >= 1900 && y <= 1970 ? y : null;
  }
  return null;
}

/**
 * The year a *receipt* cell states — a stricter rule than `yearOf`.
 *
 * The date column may write a year on its own: « 28 » under « Oct. 6, 24 »
 * means 1928 and nothing else can be meant. A money column may not, and this
 * is where a first attempt went wrong: Book I leaf 5 rules « Date | Amount |
 * Dealer, and terms » and its rows read « June 5, 29 | 20 | Rehn 30 - 1/3 »,
 * where the 20 is twenty dollars — thirty less a third — and was read as the
 * year 1920. Sixty-two sales acquired a receipt date nine years before the
 * sale, which is the sort of impossibility a total quietly absorbs.
 *
 * So a receipt year must be introduced by a month or a comma. A bare number in
 * a money column is money.
 */
function receiptYearOf(cell) {
  const s = cell.trim();
  if (!s) return null;
  if (!/(jan|feb|mar|ap|apr|may|jun|jul|aug|sep|oct|nov|dec|spring|summer|fall|winter|,)/i.test(s))
    return null;
  return yearOf(s);
}

const isDitto = (cell) => /^["'”″\s.]*$/.test(cell) && /["'”″]/.test(cell);

/**
 * The year a cell states when the cell states nothing but a date.
 *
 * Book I rules its leaves and puts the date first. Book II rules no headings
 * at all: a leaf is one work, and its one sale line runs buyer, price and the
 * cut, the cheque, and then the date — « Mrs. Geo. H. Davis … | 1200 - 1/3 - |
 * 800. | Feb. 9, 1937. » So the year is in the last column and never in the
 * first, and reading it takes a test narrow enough not to become the
 * any-column search that the loop below refuses.
 *
 * The test is that the cell is a date and *only* a date: a month, or a day, at
 * the head of it — behind « Rec'd » or « Check » where she wrote one — and the
 * year closing it. Book I's own unruled rows fail it, which is the point.
 * « 1250. Dec. 29, 37. » on leaf 58 is a cheque and a date sharing a cell and
 * « Mrs. Betty Beal 30 - 1/3 = 20. Feb. 14, 57. » on leaf 11 is an entire
 * sale; in both the year is the day the money came, not the day the work went
 * out, and dating a sale by it would be the same mistake in a new column.
 *
 * The year is taken from the pattern rather than from `yearOf`, because what
 * is wanted is the year that *closes* the cell: « 6, 20, '45. » on Book II
 * leaf 43 is the twentieth of June 1945, and `yearOf` reading left to right
 * would find « , 20 » first and call it 1920.
 */
const DATE_ONLY =
  /^(?:(?:rec['’]?d|check|cheque)\.?\s*)?(?:(?:jan|feb|mar|apr|ap|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?|[0-3]?\d\s*[.,])\s*[0-3]?\d\s*["”″']{0,2}\s*[.,]?\s*['’]?((?:1[89]|20)?\d\d)\s*[.,\-–—]*$/i;

function dateOnlyYearOf(cell) {
  const m = DATE_ONLY.exec(cell.trim());
  if (!m) return null;
  const n = Number(m[1]);
  const y = n < 100 ? 1900 + n : n;
  return y >= 1900 && y <= 1970 ? y : null;
}

/**
 * Which column of a row dates the sale.
 *
 * The date column is the first one, because that is where the ledgers rule it,
 * and the only leaves that move it are the ones that rule nothing. Three
 * conditions, and all three are needed:
 *
 * **The leaf rules no headings.** Where a heading exists it says what the
 * columns are, and it is what the two rules above already answer to. Many of
 * them name the last column outright — « when rec'd. », « Payment rec'd Date »,
 * « Date of check rec'd » — and that column is a receipt and not a sale, so a
 * ruled leaf is read exactly as it is ruled.
 *
 * **The first column dates nothing.** Where it carries a year, or a ditto
 * standing for the year above, it is the date column and there is nothing to
 * decide.
 *
 * **The last column is a date and nothing else**, by the test above.
 *
 * Together these reach Book II's leaves and no others. Six of the sale rows
 * Book I leaves undated stand on unruled leaves, and all six fail the third
 * condition — which is why the condition is worth its length.
 */
function dateColumnOf(row) {
  const cells = row.plain;
  if (cells.length < 2) return 0;
  if ((row.header ?? []).join('').trim()) return 0;
  const first = cells[0] ?? '';
  if (yearOf(first) !== null || isDitto(first)) return 0;
  return dateOnlyYearOf(cells[cells.length - 1] ?? '') !== null ? cells.length - 1 : 0;
}

/* ------------------------------------------------------------ money */

/**
 * Every sale a row states.
 *
 * A price, a dash, and the cut: `1/3`, `1/4`, `1/10`, `10%`, `15%`. The price
 * may carry a dollar sign or a comma. Two sales in one row is normal on the
 * etchings leaves, where one line records an impression going out through two
 * dealers, so all matches are returned rather than the first.
 */
/** A group purchase: one sale spread over the leaves of every work in it. */
const GROUP = /\b(average|per group|group of|purchase of \d+|\d+ etchings for)\b/i;

const SALE = /\$?\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*[-–—]\s*(?:(1)\s*\/\s*([0-9]+)|([0-9]{1,2})\s*%)/g;

function salesIn(text) {
  const out = [];
  for (const m of text.matchAll(SALE)) {
    const gross = Number(m[1].replace(/,/g, ''));
    if (!Number.isFinite(gross) || gross <= 0) continue;
    const rate = m[3] ? 1 / Number(m[3]) : Number(m[4]) / 100;
    if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) continue;
    out.push({
      gross,
      rate,
      rateWritten: m[3] ? `1/${m[3]}` : `${m[4]}%`,
      commission: gross * rate,
      net: gross * (1 - rate),
    });
  }
  return out;
}

/** A receipt she wrote — the rightmost columns are decimal, or a vulgar third. */
function receiptIn(text) {
  const frac = /\b([0-9][0-9,]*)\s+([0-9])\s*\/\s*([0-9])\b/.exec(text);
  if (frac) return Number(frac[1].replace(/,/g, '')) + Number(frac[2]) / Number(frac[3]);
  const dec = /\b([0-9][0-9,]*\.[0-9]{1,2})\b/.exec(text);
  if (dec) return Number(dec[1].replace(/,/g, ''));
  return null;
}

/* --------------------------------------------------------------- go */

const files = readTranscripts(root);
const entries = [];
const unparsed = [];

for (const file of files) {
  const groups = [...file.works.map((w) => w.rows), file.looseRows];
  for (const rows of groups) {
    // A ditto in the date column means the row above, and only within one run
    // of rows. It is carried forward here and nowhere else.
    let lastYear = null;
    for (const row of rows) {
      const cells = row.plain;
      const joined = cells.join(' ');
      const sales = salesIn(joined);

      const dateCol = dateColumnOf(row);
      const dateCell = cells[dateCol] ?? '';
      let year = dateCol === 0 ? yearOf(dateCell) : dateOnlyYearOf(dateCell);
      let yearFrom = dateCol === 0 ? 'date column' : 'date column, last in the row';
      if (year === null && isDitto(dateCell) && lastYear !== null) {
        year = lastYear;
        yearFrom = 'ditto, from the row above';
      }
      // No further search. A first attempt read a year out of any column that
      // had one, on the theory that the ruling often stops matching what she
      // wrote — and it booked thirty-one sales to the wrong year, because the
      // other columns are full of years that are not sale dates: the plate's
      // own date in a \work{} heading, « Mod. Mus. cat. E - H - 1933 » in a
      // marginal, the year of a reproduction. Every sale of American Landscape
      // from 1927 to 1957 was filed under 1920, which is when the plate was
      // made. The date column or a ditto, or the row is reported unread.
      if (year !== null) lastYear = year;

      if (!sales.length) continue;

      const where = {
        ledger: row.ledger,
        batch: row.batch,
        leaf: row.leaf,
        ref: row.ref,
        work: row.work,
        section: row.section,
        // The row as read, kept so the counterparty can be looked for in it
        // later. Not written to the JSON — `entries` is already long — but the
        // party tally below has nothing else to match against.
        rowText: joined,
      };

      // On the etchings leaves the first column dates the *exhibition*, not the
      // sale: the header says « Date | accepted / Refused | Exhibitions | Sold
      // to, and terms | Received ». Book I leaf 30 carries « Feb. 7, 20 | R |
      // Soc. of Etchers, Chicago » and, in the same row, a Keppel sale whose
      // cheque cleared in October 1927 — one line for one impression's whole
      // history. Dating that sale 1920 would be wrong by seven years, and the
      // row is not careless: the sale's own date was simply never written.
      //
      // This is the finding the exercise turned up, and it bounds the accrual
      // basis rather than defeating it. The oils leaves date the sale and can
      // be accounted on it; the etchings leaves record only when the money
      // arrived. Those rows are reported here with their receipt year, so a
      // cash-basis account of them could be built without re-reading a leaf.
      const exhibitionDated = /accepted|refused/i.test((row.header ?? []).join(' '));
      if (exhibitionDated && sales.length) {
        unparsed.push({
          reason:
            'the date column of this leaf dates the exhibition, not the sale — the sale has no ' +
            'date of its own, only the date its cheque cleared',
          receiptYear: yearOf(cells[cells.length - 1] ?? '') ?? null,
          ...where,
          row: cells,
        });
        continue;
      }

      if (GROUP.test(joined)) {
        // The Carnegie Institute bought eleven etchings together in June 1949
        // for $300, « average of 27.27 - 1/3 Rehn Gal. = $18 ». That is one
        // transaction, and the ledger records it on the leaf of every plate in
        // the group — it is already on four of the twelve leaves transcribed,
        // and will be on eleven. Counting the per-plate average as a sale
        // multiplies one $300 purchase by the size of the group. There is no
        // safe automatic answer, so it is reported and left out of the totals.
        unparsed.push({
          reason:
            'a group sale — one transaction written on the leaf of every work in the group, ' +
            'so counting the per-work average here would multiply it',
          ...where,
          row: cells,
        });
        continue;
      }

      if (year === null) {
        unparsed.push({
          reason: 'a sale whose date column states no year, and no ditto to carry one from',
          ...where,
          row: cells,
        });
        continue;
      }

      // The cell the sale's own date came from is never read as a receipt: that
      // is what makes this a receivable rather than a restatement of the sale,
      // and it holds wherever the date column turns out to be. Taking it out
      // leaves Book II's rows ending on the figure she wrote for the cheque —
      // « 1200 - 1/3 - | 800. » — which is what the check below is for.
      const money = cells.filter((_, i) => i !== dateCol);
      const receipt = receiptIn(money[money.length - 1] ?? '');
      // When the money came. She writes it either in its own « When rec'd. »
      // column or, on the leaves that rule fewer columns, in the same cell as
      // the amount — « 3000 \quad June 3, 1931. » Both are looked at, and the
      // sale's own date column never is: that is what makes this a receivable
      // rather than a restatement of the sale.
      let receiptYear =
        receiptYearOf(money[money.length - 1] ?? '') ??
        (money.length > 1 ? receiptYearOf(money[money.length - 2] ?? '') : null);
      // A cheque cannot clear before the work went out. Where it appears to,
      // the year found is something else — a plate's date, a reproduction —
      // and the receipt is dropped rather than allowed to shorten a debt.
      if (receiptYear !== null && year !== null && receiptYear < year) receiptYear = null;
      for (const s of sales) {
        const check =
          receipt !== null && sales.length === 1
            ? Math.abs(receipt - s.net) < 0.02
              ? 'agrees'
              : 'disagrees'
            : null;
        entries.push({
          year,
          yearFrom,
          gross: s.gross,
          rateWritten: s.rateWritten,
          commission: Number(s.commission.toFixed(2)),
          net: Number(s.net.toFixed(2)),
          receiptWritten: sales.length === 1 ? receipt : null,
          receiptYear,
          check,
          ...where,
        });
      }
    }
  }
}

/* ------------------------------------------ the same sale, twice */

/**
 * Sales recorded in two volumes, collapsed to one.
 *
 * Book II is the first volume to make this necessary and every volume after it
 * will make it worse: the Hoppers kept more than one book, and a work that
 * mattered got written into both. Blackwell's Island is the case that found
 * it — Book I leaf 57 and Book II leaf 35 record the same 2500 less a third to
 * Russel Allen, and Jo Hopper says so herself on the second leaf, « See Book I
 * p. 57 » and « This listed in Book I ».
 *
 * Left alone that sale would rank first in any table of works by revenue, at
 * exactly twice what it fetched. **An invented figure is a transaction that
 * did not happen**, and one arrived at by adding is no better than one arrived
 * at by misreading a digit.
 *
 * The rule is deliberately narrow: same work title, same gross, same
 * commission written, recorded in *different* volumes. Two volumes agreeing on
 * a title and a price to the dollar are recording one event; within a volume
 * nothing is collapsed, because an etching edition really does sell at
 * twenty-five dollars over and over on one leaf. Every collapse is reported in
 * `duplicates` so it can be argued with, and the year kept is the earlier of
 * the two — which is the one that says when the work left the studio.
 */
const dupKey = (e) => `${workKey(e.work ?? '')}|${e.gross}|${e.rateWritten ?? ''}`;
const duplicates = [];
const deduped = [];
{
  const byKey = new Map();
  for (const e of entries) {
    if (!e.work) {
      deduped.push(e);
      continue;
    }
    const k = dupKey(e);
    const prior = byKey.get(k);
    if (prior && prior.ledger !== e.ledger) {
      const [keep, drop] = prior.year <= e.year ? [prior, e] : [e, prior];
      duplicates.push({
        work: e.work,
        gross: e.gross,
        net: e.net,
        kept: { ledger: keep.ledger, leaf: keep.leaf, ref: keep.ref, year: keep.year },
        dropped: { ledger: drop.ledger, leaf: drop.leaf, ref: drop.ref, year: drop.year },
      });
      // `entries` keeps every row — nothing is dropped from the record — but
      // the one not counted says so, so a reader of the JSON can see why the
      // rows and the totals differ.
      drop.duplicateOf = { ledger: keep.ledger, leaf: keep.leaf, ref: keep.ref };
      if (keep !== prior) {
        deduped[deduped.indexOf(prior)] = keep;
        byKey.set(k, keep);
      }
      continue;
    }
    if (!prior) byKey.set(k, e);
    deduped.push(e);
  }
}

/* ------------------------------------------------------------ tally */

const byYear = new Map();
for (const e of deduped) {
  if (!byYear.has(e.year))
    byYear.set(e.year, { year: e.year, sales: 0, gross: 0, commission: 0, net: 0, disagreements: 0 });
  const y = byYear.get(e.year);
  y.sales++;
  y.gross += e.gross;
  y.commission += e.commission;
  y.net += e.net;
  if (e.check === 'disagrees') y.disagreements++;
}
/**
 * The debt side.
 *
 * A work goes to the dealer in one year and the cheque arrives in another, so
 * between the two the buyer — or, more often, the gallery — owes the Hoppers
 * money. That gap is the whole reason an accrual account differs from a cash
 * one, and on these leaves it is not a rounding: the longest run in what has
 * been transcribed is a watercolour consigned to Rehn in October 1924 and paid
 * for in June 1962, thirty-eight years later.
 *
 * `accrued` is booked in the year of the leaf's date column; `received` in the
 * year the receipt names, against whatever year the sale was booked to.
 * `outstanding` is the running difference — what was owed at the end of that
 * year on the sales this archive can see. It is not a company's receivables
 * ledger and does not pretend to be: a sale whose receipt was never recorded
 * stays outstanding for ever here, which is a statement about the transcription
 * and not about whether Hopper was paid.
 */
const cash = new Map();
let neverReceived = 0;
for (const e of deduped) {
  if (e.receiptYear === null) {
    neverReceived += e.net;
    continue;
  }
  cash.set(e.receiptYear, (cash.get(e.receiptYear) ?? 0) + e.net);
}

const years = [...byYear.values()]
  .sort((a, b) => a.year - b.year)
  .map((y) => ({
    ...y,
    gross: Number(y.gross.toFixed(2)),
    commission: Number(y.commission.toFixed(2)),
    net: Number(y.net.toFixed(2)),
    received: Number((cash.get(y.year) ?? 0).toFixed(2)),
  }));

// The running debt, over every year the account touches — including years in
// which nothing was sold but a cheque arrived for something older.
const allYears = [...new Set([...byYear.keys(), ...cash.keys()])].sort((a, b) => a - b);
let running = 0;
const receivable = allYears.map((year) => {
  const accrued = byYear.get(year)?.net ?? 0;
  const received = cash.get(year) ?? 0;
  running += accrued - received;
  return {
    year,
    accrued: Number(accrued.toFixed(2)),
    received: Number(received.toFixed(2)),
    outstanding: Number(running.toFixed(2)),
  };
});


/**
 * Works by what they brought in, net of commission.
 *
 * Two things have to be said on the page beside it or the ranking lies.
 *
 * **It ranks titles, not objects.** The Cat Boat is one etching plate sold
 * twenty-one times at twenty-five dollars; Tables for Ladies is one canvas
 * sold once for four and a half thousand. Both are one row here, and `sales`
 * is the column that tells them apart — a reader who ignores it will read an
 * edition as a masterpiece and the other way round.
 *
 * **It is a floor and it moves.** Half the sale rows carry no work at all,
 * because the leaf puts the price on a line that names no title, and the
 * archive is a seventh read. Every batch transcribed changes this table, which
 * is the point of publishing it rather than a reason not to.
 */
const byWork = new Map();
for (const e of deduped) {
  if (!e.work || !e.net) continue;
  const k = workKey(e.work);
  const w = byWork.get(k) ?? {
    title: e.work,
    net: 0,
    gross: 0,
    sales: 0,
    years: [],
    ledgers: new Set(),
  };
  w.net += e.net;
  w.gross += e.gross;
  w.sales += 1;
  if (e.year && !w.years.includes(e.year)) w.years.push(e.year);
  w.ledgers.add(e.ledger);
  byWork.set(k, w);
}
const works = [...byWork.values()]
  .map((w) => ({
    ...w,
    net: Number(w.net.toFixed(2)),
    gross: Number(w.gross.toFixed(2)),
    years: w.years.sort((a, b) => a - b),
    ledgers: [...w.ledgers].sort(),
  }))
  .sort((a, b) => b.net - a.net);

/* ------------------------------------------------- who was on the row */

/**
 * The parties named beside the sales, ranked — dealers apart from buyers.
 *
 * ## Why these are two tables and never one
 *
 * On the etchings leaves the name written next to the price is almost always
 * the **dealer**: « Keppel 30 - 1/3 », « Downtown Gallery - 25 - 1/3 ». The
 * person who took the print home is named only when Jo Hopper happened to know
 * it — « Keppel to Fr. Crowninshield », « Rehn - to Mrs. Bliss ». Ranking the
 * two together would put Keppel at the head of a table of Hopper's *customers*
 * and read as though one man bought forty etchings, when what he did was sell
 * them. So there are two rankings, and the shorter one is the more interesting:
 * it is short because the ledger usually did not record a buyer, not because
 * the pictures went nowhere.
 *
 * ## Where the names come from, and why not from a list of Hopper's dealers
 *
 * From the `\keywords{}` lines of the transcriptions, and from nothing else.
 * A term there arrives already declared — `dealer:Frederick Keppel`,
 * `collection:Library of Congress`, `person:Frank Crowninshield` — and the
 * declaration was made by somebody who had read the sheets. That is the whole
 * reason this is possible at all: **no string test can tell a dealer from a
 * buyer**, as `parseKeyword` says at length. « Corcoran Gallery » is a museum
 * and « Downtown Gallery » is a dealer, and they differ by nothing an
 * algorithm can see.
 *
 * The consequence is a coverage limit worth stating: a party the tagger never
 * named cannot appear here however often the leaves sold to them. This ranks
 * what has been *tagged*, inside what has been transcribed.
 *
 * ## Matching, and the two ways it refuses
 *
 * The keywords give full names; the leaves write short ones. « Frederick
 * Keppel » in the tag has to find « Keppel 30 - 1/3 » on the row, so each
 * party carries a surname — the last word of the label that is not a
 * gallery-or-museum word, else the first — and a row is credited if it
 * contains the full label or that surname.
 *
 * Two labels with the same surname are the same party only if one's words are
 * contained in the other's. « Kennedy » and « Kennedy Galleries » merge;
 * « Nelson Rockefeller » and « David Rockefeller » do not, and neither do
 * Boston's Public Library and its Museum of Fine Arts, nor Carl Hamilton and
 * Hamilton College. Real merges that this refuses are declared by hand in
 * `party-aliases.json` and nowhere else.
 *
 * Where a surname is left pointing at more than one party — the leaf says
 * « Rockefeller » and three are declared — **the row is reported as ambiguous
 * rather than credited to a guess**. Rows naming nobody are reported too. The
 * two counts are the denominator of the tables, and they are on the page.
 */
const partyAliases = JSON.parse(
  readFileSync(resolve(root, 'src/content/party-aliases.json'), 'utf8'),
);

// Words that name what an institution *is* rather than which one it is. A
// surname is picked past them: « Rehn Gallery » is Rehn, « Whitney Museum of
// American Art » is Whitney. They are not dropped from the containment test
// below, where « Hamilton College » and « Carl Hamilton » have to stay apart.
const GENERIC = new Set(
  ('gallery galleries gal inc museum museums art arts of the and institute institution ' +
    'collection collections company shop rooms room mus center centre club society university ' +
    'univ memorial fine national american new york library public school academy association ' +
    'foundation city college studio print makers brothers bros son sons')
    .split(' '),
);

/** A label reduced to letters, so « Pène » and « Pene » are one word. */
const bare = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z-]/g, '');

/** The words of a label that carry identity: not initials, not punctuation. */
const wordsOf = (label) =>
  label
    .replace(/\\&/g, '&')
    .split(/\s+/)
    .map(bare)
    .filter((w) => w.length >= 3);

/** The name the leaves are likely to write: the last distinguishing word. */
const surnameOf = (label) => {
  const ok = wordsOf(label).filter((w) => !GENERIC.has(w));
  return ok.length ? ok[ok.length - 1] : null;
};

/** Whether two labels may be one party: same surname, one's words inside the other's. */
const compatible = (a, b) => {
  const [x, y] = [new Set(wordsOf(a)), new Set(wordsOf(b))];
  const sub = (p, q) => [...p].every((w) => q.has(w));
  return sub(x, y) || sub(y, x);
};

const declaredSame = new Map();
for (const group of partyAliases.same ?? [])
  for (const label of group) declaredSame.set(label, group[0]);

const parties = [];
for (const file of files)
  for (const { facet, label } of file.keywords) {
    if (!['dealer', 'person', 'collection'].includes(facet)) continue;
    const role = facet === 'dealer' ? 'dealer' : 'buyer';
    const surname = surnameOf(label);
    if (!surname) {
      // No word that distinguishes it — « New York Public Library » is four
      // generic words. It stands alone and is matched only in full.
      if (!parties.some((p) => p.labels.has(label))) {
        parties.push({ role, surname: null, labels: new Set([label]) });
      }
      continue;
    }
    const declared = declaredSame.get(label);
    const found = parties.find(
      (p) =>
        p.role === role &&
        p.surname === surname &&
        (declared
          ? [...p.labels].some((l) => declaredSame.get(l) === declared)
          : [...p.labels].every((l) => compatible(l, label))),
    );
    if (found) found.labels.add(label);
    else parties.push({ role, surname, labels: new Set([label]) });
  }

// The name shown is the fullest spelling the taggers used, so a table row
// reads « Frederick Keppel » rather than whichever batch was transcribed first.
for (const p of parties) {
  p.name = [...p.labels].sort((a, b) => b.length - a.length)[0].replace(/\\&/g, '&');
  p.aliases = [...p.labels].map((l) => l.replace(/\\&/g, '&')).sort();
  p.tally = { sales: 0, net: 0, gross: 0, years: new Set(), works: new Set() };
}

// A surname claimed by more than one party cannot settle a row that writes only
// the surname. Collected here so those rows can be reported rather than guessed.
const bySurname = new Map();
for (const p of parties) {
  if (!p.surname) continue;
  const k = `${p.role}|${p.surname}`;
  bySurname.set(k, (bySurname.get(k) ?? []).concat(p));
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Both ends bounded, with a possessive or a plural allowed at the tail: the
// leaves write « Rehns » and « Keppel's » for the same firm. Without the
// closing boundary « Stein » found Steinberg on Book I leaf 64 and David
// Steine on Book II leaf 53, and Charles Stein was credited with two sales he
// had nothing to do with — which is a buyer invented out of a prefix.
const hasWord = (text, word) => new RegExp(`\\b${esc(word)}(?:['’]?s)?\\b`, 'i').test(text);

/**
 * Surnames that cannot settle a row on their own, because another party's name
 * contains them.
 *
 * « Huntington Hartford » of California and « Robert W. Huntington » of
 * Hartford, Connecticut are two buyers whose names are each made of the
 * other's surname, and the leaves write both short. Crediting either from a
 * surname would put one man's five thousand dollars on the other's row. So a
 * surname that appears inside any other party's label stops being evidence,
 * and rows carrying only it are reported ambiguous.
 */
const collides = new Set((partyAliases.weakSurnames ?? []).map(bare));
for (const p of parties) {
  if (!p.surname) continue;
  const inAnotherName = parties.some(
    (q) => q !== p && [...q.labels].some((l) => wordsOf(l).includes(p.surname)),
  );
  if (inAnotherName) collides.add(p.surname);
}

let namedNobody = 0;
let ambiguous = 0;
for (const e of deduped) {
  const text = (e.rowText ?? '').replace(/\\&/g, '&');
  const hits = new Set();
  let sawAmbiguous = false;
  for (const p of parties) {
    if ([...p.labels].some((l) => hasWord(text, l.replace(/\\&/g, '&')))) {
      hits.add(p);
      continue;
    }
    if (!p.surname || !hasWord(text, p.surname)) continue;
    const rivals = bySurname.get(`${p.role}|${p.surname}`) ?? [];
    if (rivals.length > 1 || collides.has(p.surname)) sawAmbiguous = true;
    else hits.add(p);
  }
  if (!hits.size) {
    if (sawAmbiguous) ambiguous++;
    else namedNobody++;
    continue;
  }
  if (sawAmbiguous) ambiguous++;
  for (const p of hits) {
    p.tally.sales++;
    p.tally.net += e.net;
    p.tally.gross += e.gross;
    if (e.year) p.tally.years.add(e.year);
    if (e.work) p.tally.works.add(e.work);
  }
}

const ranked = (role) =>
  parties
    .filter((p) => p.role === role && p.tally.sales > 0)
    .map((p) => ({
      name: p.name,
      aliases: p.aliases.length > 1 ? p.aliases : undefined,
      sales: p.tally.sales,
      net: Number(p.tally.net.toFixed(2)),
      gross: Number(p.tally.gross.toFixed(2)),
      works: p.tally.works.size,
      first: Math.min(...p.tally.years),
      last: Math.max(...p.tally.years),
    }))
    .sort((a, b) => b.net - a.net || b.sales - a.sales);

const dealersRanked = ranked('dealer');
const buyersRanked = ranked('buyer');

const attributed = deduped.filter((e) => e.work && e.net).length;

const checked = deduped.filter((e) => e.check !== null);
const disagree = checked.filter((e) => e.check === 'disagrees');

const out = {
  generated: new Date().toISOString(),
  basis: 'accrual, dated at the leaf\'s own date column',
  note:
    'Sales the transcriptions record, dated at the sale rather than at the cheque. Built only ' +
    'from transcribed leaves, so every figure is a floor under a number nobody knows yet, not a ' +
    "total of Edward Hopper's income. Nothing here is taken from any source but the .tex files.",
  limit:
    'The accrual basis reaches the oils and not the etchings, and the ledgers are the reason. ' +
    'On the oils leaves the first column dates the sale. On the etchings leaves it dates the ' +
    'exhibition — the header reads « Date | accepted / Refused | Exhibitions | Sold to, and ' +
    'terms | Received » — and one line carries an impression\'s whole history, so a sale in it ' +
    'has no date of its own but the day its cheque cleared. Those rows are in `unparsed` with ' +
    'their receipt year rather than dated wrongly, and a cash-basis account could be built from ' +
    'them without re-reading a leaf. Book II rules no columns at all, and it needs the other ' +
    'half of the same rule: a leaf there is one work with one sale line — buyer, price and the ' +
    'cut, the cheque, the date — so the date is in the last column and never in the first. It ' +
    'is read there only on a leaf that rules nothing, only where the first column dates nothing, ' +
    'and only where the last cell holds a date and nothing besides.',
  coverage: {
    ledgersTranscribed: [...new Set(files.map((f) => f.ledger))],
    ledgersCounted: [...new Set(entries.map((e) => e.ledger))].sort(),
    batches: files.length,
    sheets: files.reduce((n, f) => n + f.sheets.length, 0),
    note:
      'Only the volumes and batches listed. Everything unread contributes nothing, and every ' +
      'figure here moves as batches land.',
    countedNote:
      'Transcribed and counted are not the same thing, and the difference is the ruling. Every ' +
      'figure on this page is read out of a ruled row — a `ledgertable` in the .tex — because a ' +
      'row puts the price in one cell and the date in another, and the column a date stands in ' +
      'is what says whether it dates the sale or the cheque. A volume whose leaves rule nothing ' +
      'and write the sale as a sentence is read here and counted nowhere: its money is on the ' +
      'sheets, in the transcriptions, and outside these totals. Book III and Book V are in that ' +
      'position now, and naming them is the point — a total that quietly omitted them would ' +
      'look like a smaller number rather than a narrower one.',
  },
  arithmetic: {
    checkable: checked.length,
    agree: checked.length - disagree.length,
    disagree: disagree.length,
    note:
      "Where a row states one sale and one receipt, the receipt is compared with price less " +
      'commission. A disagreement is reported, never corrected: it most often means a figure was ' +
      'misread, and it points at the row to go back to.',
  },
  years,
  receivable,
  receivableNote:
    'What was owed to the Hoppers at the end of each year on the sales this archive can see. A ' +
    'sale is accrued in the year of the leaf\'s date column and discharged in the year its ' +
    'receipt names. ' +
    Number(neverReceived.toFixed(2)) +
    ' of net has no receipt date to discharge it. Most of that is Book II, whose leaves write ' +
    'one date to a sale and do not separate the day the work went out from the day the cheque ' +
    'came: the one date is booked at the sale, and no payment is invented out of it. The rest ' +
    'is a statement about how much has been read and not about whether Hopper was paid.',
  works,
  worksNote:
    attributed +
    ' of ' +
    deduped.length +
    ' sale rows name a work at all — the rest carry a price on a line that names no title — so ' +
    'this is a floor that moves with every batch transcribed, and a work absent from it may ' +
    'simply be on a leaf nobody has read.',
  duplicates: {
    count: duplicates.length,
    note:
      'The same sale written into two volumes, counted once. Collapsed before every total on ' +
      'this page, not only before the ranking. ' +
      'Matched on title, price and the commission written, and only across different volumes: ' +
      'within one volume a repeated price is a repeated sale of an edition. Reported so the ' +
      'collapse can be argued with rather than trusted.',
    sample: duplicates,
  },
  parties: {
    dealers: dealersRanked,
    buyers: buyersRanked,
    namedNobody,
    ambiguous,
    counted: deduped.length,
    note:
      'Who stands beside the price. On the etchings leaves that is almost always the dealer — ' +
      '« Keppel 30 - 1/3 » — and the person who took the print home is named only where Jo ' +
      'Hopper knew it, which is why the second table is the shorter one. The two are told apart ' +
      'by the facet the transcription itself declares: dealer:, against person: and collection:. ' +
      'No string test could do it — « Corcoran Gallery » is a museum and « Downtown Gallery » is ' +
      'a dealer — so a party nobody tagged cannot appear here however often the leaves sold to ' +
      'them, and this ranks what has been tagged inside what has been transcribed.',
    matchNote:
      'A row is credited to a party when it carries that party\'s name or their surname. Two ' +
      'spellings are one party only where one\'s words sit inside the other\'s, so Kennedy and ' +
      'Kennedy Galleries merge while Nelson, David and Mrs. John D. Rockefeller stay three ' +
      'buyers, and Boston\'s Public Library stays out of its Museum of Fine Arts. The merges ' +
      'that rule wrongly refuses are declared by hand in party-aliases.json. Where a leaf writes ' +
      'only a surname that more than one declared party shares, the row is reported ambiguous ' +
      'rather than credited to a guess.',
  },
  entries: entries.map(({ rowText, ...e }) => e),
  unparsed: {
    count: unparsed.length,
    sample: unparsed.slice(0, 25),
  },
};

writeFileSync(resolve(root, 'src/content/accounts.json'), JSON.stringify(out, null, 2) + '\n');

const tGross = years.reduce((n, y) => n + y.gross, 0);
const tNet = years.reduce((n, y) => n + y.net, 0);
process.stdout.write(
  `accounts: ${deduped.length} sales counted of ${entries.length} rows, across ${years.length} years ` +
    `(${years[0]?.year}–${years[years.length - 1]?.year})\n` +
    `          gross ${tGross.toFixed(2)}, commission ${(tGross - tNet).toFixed(2)}, net ${tNet.toFixed(2)}\n` +
    `          arithmetic checkable on ${checked.length}, ${disagree.length} disagree\n` +
    `          ${works.length} work(s) named, ${duplicates.length} cross-volume duplicate(s) collapsed\n` +
    `          ${unparsed.length} sale-bearing row(s) with no year, reported not dropped\n` +
    `          ${dealersRanked.length} dealer(s) and ${buyersRanked.length} named buyer(s) ranked; ` +
    `${namedNobody} row(s) name nobody tagged, ${ambiguous} ambiguous by surname\n`,
);
