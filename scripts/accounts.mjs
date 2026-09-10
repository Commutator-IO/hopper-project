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
/**
 * A sample that shows every reason there is, rather than the first `n` rows.
 *
 * Round-robin over the distinct reasons, so a kind of refusal that has one row
 * in it is as visible as a kind that has a hundred and eighty. The rare kind is
 * the one worth seeing: a reason with a single row under it is usually either
 * the newest rule or the wrongest one.
 */
const byReason = (rows, n) => {
  const groups = new Map();
  for (const r of rows) {
    if (!groups.has(r.reason)) groups.set(r.reason, []);
    groups.get(r.reason).push(r);
  }
  const out = [];
  const queues = [...groups.values()];
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (out.length >= n) break;
      if (q.length) out.push(q.shift());
    }
  }
  return out;
};

/**
 * Which trade a volume records.
 *
 * Books I, II, III and V and the dealers' book record Edward Hopper selling
 * his own work; Book IV records him being paid for somebody else's. Keeping
 * the two apart is not a nicety — through the years this batch covers they are
 * nearly disjoint in time, and a single total would say that a man who sold
 * almost no pictures before 1924 was earning steadily, which is true only
 * because he was drawing two line drawings a week for the Associated Sunday
 * Magazines at twenty dollars each.
 *
 * Everything that is not the pocket book is « art », rather than the reverse,
 * so a volume nobody has classified is counted with the work rather than
 * silently invented as a second income.
 */
const activityOf = (ledger) => (ledger === 'book-iv' ? 'illustration' : 'art');

for (const file of files) {
  if (activityOf(file.ledger) !== 'art') continue;
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
          activity: 'art',
          ...where,
        });
      }
    }
  }
}

/* --------------------------------------------- Book IV: the pocket book */

/**
 * The illustration income, which is shaped nothing like the rest.
 *
 * Book IV is a stationer's pocket memorandum book with the money column
 * already printed, and every assumption the reader above rests on is false in
 * it. There is no commission, so the `price - 1/3` pattern that defines a sale
 * everywhere else appears nowhere. The money is split across two cells,
 * dollars and cents, by two printed red rules. No column is headed, in
 * fifty-four years. And the date column gives a month and a day but never a
 * year: the year is written once, alone, on a line of its own, and carries
 * until the next one.
 *
 * So it gets its own reader, and the reader has to decide three things.
 *
 * **What a charge is.** A row states a client, then its items one per line
 * with a price, then « Bill rendered » with their total, then « Rec'd by
 * check » in red. Counting the items *and* the bill would double every
 * commission in the volume. Counting only the bill would lose the many blocks
 * that were never billed on their own line. So: the items are the charge, and
 * a bill is counted only where nothing was itemised since the last settlement
 * — which is exactly the case of « June 25 Everybodys' Magazine / 3 half tone
 * drawings / The Hero » and then, alone, « June 27 Bill rendered 125 ».
 *
 * **What a bare figure is.** A money row whose description column is empty is
 * either a subtotal ruled off above — she draws the rule, and the transcription
 * does not record it — or a charge whose description she did not write. What
 * follows it settles the first half of the question: both kinds are answered
 * on the next line, a subtotal by the bill it exists to be billed on, an
 * undescribed charge by the cheque that clears it. Leaves 21, 22 and 23 are
 * the first: bare figures followed by « bill ».
 *
 * Where the answer is a cheque the two shapes are identical on the page, and
 * the arithmetic is what tells them apart — the same arithmetic the leaves'
 * own notes use, « thirteen titles at 15 make that figure exactly ». A
 * subtotal is the sum of the priced lines directly above it, back to the last
 * settlement; a charge is not. Leaf 37's 195 gathers ten Adventure Magazine
 * titles on its own leaf and three more carried over the leaf-turn from leaf
 * 36, and leaves 25 and 31 do the same for 225 and 180. Leaf 39's 100 stands
 * under « The House that Patty built » with nothing priced above it since the
 * last cheque, and is the charge itself; so are leaf 14's 30, which follows a
 * 25 that does not make it, and leaf 46's undescribed 60. Both counts are
 * reported below.
 *
 * An earlier rule here asked only « is a bill next? », which read every one of
 * those three ruled-off sums as a fresh charge and counted six hundred dollars
 * of Adventure Magazine drawings twice.
 *
 * **What is struck out.** An entry crossed corner to corner never happened,
 * and a figure inside `\struck{}` is not money the book is owed. Leaf 47's
 * Association Men drawing is the case: twenty dollars under a pencil X, with
 * no receipt anywhere. Counting it was wrong twice over — once for the
 * twenty, and once because a struck row counts as *itemised* under the rule
 * above, so the genuine bill of 50 three lines below it was read as
 * restating a charge that was never made and dropped. A row whose figure is
 * wholly struck is excluded from the charges and from the receipts alike,
 * and takes no part in what stands above or below it.
 *
 * **When it happened.** The year carries forward from the last line that
 * states one, and across a batch boundary, because the volume is continuous
 * and the batches are read in order. It carries *only* across contiguous
 * batches: if batch 5 is transcribed and batches 3 and 4 are not, a year taken
 * from batch 2 would be four leaves and possibly two years stale, so the chain
 * is broken and the rows are reported unread until the volume states a year
 * again.
 *
 * The volume states a year in three positions, not one. On a line of its own
 * inside the table — « 1916 », leaf 14, nothing else in the row. In the date
 * cell of a row that carries a description as well, which is leaf 44's
 * « 1920 | 1 rough sketch », and which dates that row too. And, from 1918
 * on, in pencil above a date and across the red rule, which the edition
 * records as a `\marginal{}` after the table because there is nowhere in a
 * ruled row to put a thing written over one: leaf 28's « 19 18 » and leaf
 * 38's « 1919 ». A marginal year is taken at the position the edition puts
 * it, which is the end of its leaf, so the few rows standing under the pencil
 * on that leaf itself keep the year before it — a bill of 35 on leaf 28, and
 * fifty dollars of Dial covers with the cheque that answered them on leaf 38.
 * The gloss does say which date the pencil sits above. Reading a year out of
 * the transcriber's prose would buy those two entries at the price of a reader
 * that breaks the first time a sentence is worded differently, and both
 * entries are inside a fortnight of the turn of their year in any case.
 *
 * Before this, no year after 1917 was found anywhere, and eight leaves of
 * 1918, 1919 and 1920 — some five thousand dollars of it — were filed under
 * 1917.
 *
 * The receipts are kept as their own stream rather than attached to
 * individual charges. A cheque settles a run of work and not a line of it, and
 * the runs overlap — leaf 6 bills 90 « to date » and receives 80, because ten
 * of it had already been paid two weeks earlier. Allocating that across lines
 * would be inventing a precision the book does not have, and the year totals
 * do not need it.
 */

/**
 * Where the writer puts the decimal point, which is three places and not one.
 *
 * The two cells at the end of a Book IV row are the stationer's dollars and
 * cents columns, divided by a printed red rule. The writer respects that rule
 * about half the time. She also writes « 1200. » with the point at the end of
 * the dollars and nothing beyond it, « 350. | 00 » with the point at the end
 * of the dollars and the cents in their own cell anyway, and — from leaf 111 —
 * « 3959.84 » entire, the point sitting *on* the rule, which the edition sets
 * in the dollars cell so that the leaf's own arrangement survives.
 *
 * All three are hers, none is a transcription mistake, and a reader that
 * admits only the first is not reading the volume. Requiring `^\d+$` of the
 * dollars cell dropped 144 figures without a word — 108 written whole, 36 with
 * a terminal point — and dropping a figure in this volume does not merely lose
 * it. A row whose amount is null never closes the settlement phrase above it,
 * so the next row that does carry money inherits « rec'd by check » and is
 * counted as money received; and because the dropped row is usually the last
 * line of an entry, what inherits it is usually a charge in the next one.
 * Leaves 145, 149, 153 and 155 contributed no receipts at all, while Girlie
 * Show and People in the Sun were counted as cheques.
 *
 * So the dollars cell is read as digits with an optional point and an optional
 * one or two figures after it, and the volume's three arrangements come to the
 * same number. What is refused is refused loudly: a cell carrying its own
 * cents *and* a cents cell beside it states the fraction twice and is not
 * guessed at, and every cell the reader turns down is reported by the caller
 * rather than passed over.
 */
const IV_DOLLARS = /^(\d+)(?:\.(\d{0,2}))?$/;
const bookIVAmount = (cells) => {
  const d = (cells[cells.length - 2] ?? '').replace(/[$,\s]/g, '');
  const c = (cells[cells.length - 1] ?? '').replace(/[$,\s]/g, '');
  const cents = /^\d{1,2}$/.test(c);
  // A sum under a dollar leaves the dollars column empty and writes the point
  // on the ruled division itself: leaf 138's « 11 Folios sold | | 23 » is
  // twenty-three cents. Read as nothing at all, it took the Artex subtotal of
  // 2.13 with it, which then no longer summed its own two lines and was
  // counted a second time as a charge.
  if (d === '') return cents ? Number(c) / 100 : null;
  const written = IV_DOLLARS.exec(d);
  if (!written) return null;
  const fraction = written[2] ?? '';
  // The fraction stated twice. It does not happen anywhere in the volume as
  // transcribed, and if it ever does the two statements have to be reconciled
  // by someone looking at the leaf, not by preferring one of them here.
  if (fraction !== '')
    return c === '' ? Number(written[1]) + Number(fraction.padEnd(2, '0')) / 100 : null;
  return Number(written[1]) + (cents ? Number(c) : 0) / 100;
};

/**
 * Whether the money columns of a row carry any writing at all.
 *
 * The test that turns a refusal into a report. A row `bookIVAmount` declines
 * while this is true is a figure standing on the leaf that no total in this
 * file contains, and the whole of this script's method is that such a thing is
 * said out loud. Nine rows are in that state as the volume stands: two in
 * pounds sterling on leaf 80, a ditto standing for the sum above it on leaf
 * 49, and six expense lines on leaves 132 and 138 that the writer sets with a
 * minus sign in front of them, which is a sign this reader does not yet know
 * how to spend.
 */
const ivMoneyWritten = (cells) =>
  [cells[cells.length - 2] ?? '', cells[cells.length - 1] ?? ''].some((c) => /\S/.test(c));
// Anchored at the head of the cell, and that is not fussiness: « bill » loose
// in the line matched « Wild Bill in Deadwood Gulch » and took a fifteen-dollar
// drawing out of the 1915 total by calling it an invoice.
// « rec'd by check », and not « Rec'd from Frank Rehn Inc ». From leaf 139 the
// volume writes its *charge* line that way too — « Rec'd from Rehn Gallery /
// check No 6388 date Feb 14 / Empire Trust Co », with the red « rec'd by
// check » repeating the figure underneath — so the two have to be told apart
// by the word that follows, which is the only thing on the page that does it
// once the colours are gone.
// One row in the volume puts the commission in front of the phrase instead of
// deducting it in the column above: leaf 106's « commission 600, rec'd by
// check » against 1800, where 600 is a third of the 1800 answered and the
// whole is 2400. Unanchoring the phrase is what `IV_BILL` shows must not be
// done, so the one prefix the volume actually writes is admitted and nothing
// else is — a word, a figure, a comma. Left out, that row was counted as a
// second charge of 1800 for a picture already priced on the line above, and
// the pencil sub-sum below it, having nothing settled behind it, was counted
// as a third.
const IV_RECEIPT =
  /^["'”\s]*(commission\s+[\d,.\s]+,\s*)?(rec['’]?d|received)\b(?!\s+from\b)/i;
const IV_BILL = /^["'”\s]*(bill|billed)\b/i;
// A receipt that does not say « rec'd »: leaf 76 answers five monthly bills
// with « July number by check 65 » and then « August " " " », the dittos
// standing for « number by check ». « by check » at the end of the line is
// the cheque, and a month followed by nothing but ditto marks, directly under
// a receipt, is the same again.
const IV_BY_CHECK = /\bby check\s*$/i;
const IV_DITTO_TAILED = /^[A-Za-z.]+\s+["'”″][\s"'”″]*$/;
// The monthly bills of the same leaf, « July bill », for the jobs pass.
const IV_MONTH_BILL = /^[A-Za-z.]+\s+bill\s*$/i;
// A subtraction, and a restatement of what one leaves. Anchored at the head
// for the reason `IV_BILL` is: « less » loose in the line would match a title.
const IV_DEDUCTION = /^["'”\s]*less\b/i;
// The one place the volume puts a name in front of the word: leaf 131's
// « John Clancey less 33 1/3 % | 1166.66 », where the commission is a third
// of the 3500.00 on the line above and the cheque below is what is left. It
// cannot be reached by unanchoring « less », because « less » loose in a line
// is how the volume prices a print sold at a discount — « 2 East Side Interior
// less 50% | 18 », « 1 canvas at 400. less 15% », « @ 12 less 33 1/2 % » —
// and every one of those is a charge at the figure written. What tells the
// two apart is that a discounted print carries a count or a price before the
// word and a commission does not: nothing but letters may stand in front of
// « less », and only the two things the volume actually writes after it,
// « commission » or the third, are admitted behind.
const IV_DEDUCTION_NAMED = /^[^\d@]*\bless\s+(commission\b|33\s*1\/3)/i;
// A row that continues the deduction above it. « less commission 1016.66 »
// is followed on leaves 115, 118, 119 and 145 by « " photos 29.10 » — the
// ditto standing for « less » — and on leaf 145 by « " frames 48.00 » under
// that; leaf 131 writes « and $10.00 for cleaning | 10. » under its
// commission. Each is a cost taken off the net, and each was counted as a
// charge, which put the photographs down as income and the net ruled off
// under them down as a charge on top of that. The ditto wants a space after
// it: a title opens with quote marks too, and « "Excursion into Philosophy" »
// is not a ditto for anything.
const IV_DITTO_HEADED = /^["'”″]+\s+\S/;
const IV_AND = /^and\b/i;
const IV_RESTATED = /^["'”\s]*total\b/i;
// A sum carried to the head of the next leaf. Leaf 126 opens « from
// preceeding page total | 4790.00 », which is leaf 125's three ruled-off sums
// — 140, 1950 and 2700 — added, and then takes the commission off it. The
// figure restates what was itemised on the leaf before and is not a charge;
// and the bare sum standing directly above it, the last of the three, is a
// subtotal for the same reason a bare sum above a « less » line is: nothing
// else can stand where a page total is about to be carried.
const IV_CARRIED_FORWARD = /^["'”\s]*from\s+prece+ding\s+page\b/i;
// A sum being worked in pencil across the columns. Leaf 121 adds the year up
// on the leaf itself — « 1800 + 560 | 53 » over « 2360.53 » — and the 53 in
// the dollars cell is the cents of that addition, not a figure of its own.
// Read as dollars it was a charge of fifty-three, and the year total under
// it, having something unsettled above it, was a charge too.
const IV_WORKING = /\d\s*\+\s*\d/;
// « Total », alone or with the year it totals, and nothing else. A « total »
// that says what it totals is a different thing and is a charge: leaf 124's
// « total etchings 300 » gathers six etchings listed without prices, and it is
// the only line that states their money.
const IV_YEAR_TOTAL = /^["'”\s]*total\s*(19[0-6]\d)?\s*$/i;

// A ditto that carries a date. `isDitto` wants a cell that is nothing but
// quote marks, and leaf 159's last row is « " " Mar 16 » — the marks saying
// « the same again » and the date saying when. Read as an item that row became
// a second royalty of 28.23 on top of the 28.83 it repeats, and the black
// charge line above it was taken for the receipt, so the entry came out
// backwards. Only a date may follow the marks: anything else is words, and
// words are the row speaking for itself.
const IV_DITTO_DATED =
  /^["'”″\s.]*["'”″][\s"'”″.]*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?\d{1,2}(st|nd|rd|th)?\.?\s*$/i;
const isDittoDated = (cell) => IV_DITTO_DATED.test(cell) && /["'”″]/.test(cell);

// Money going the other way. Leaf 156 is the first leaf in the volume to take
// a cost off a sale rather than a commission: it rules off at 21000.00, heads
// a block « Expenses », lists a relining and two frames, and pays the
// difference. Left alone the three costs were counted as income and the
// volume was credited with 372.00 for money it spent.
//
// The block is closed by the cheque that answers it, which is how every other
// run in this volume ends. Its own rows are folded into the deductions rather
// than counted separately: they are subtractions, which is what that stream
// is, and telling a frame from a commission is a question for the leaf and not
// for the total.
const IV_EXPENSES = /^["'”\s]*expenses?\b/i;

// Two shapes that keep a settlement going where every other described row
// ends it, and both are on leaf 158. « Payment on acct » is money already had,
// subtracted from the net like a commission; « check --- » is what the
// subtraction leaves, the same restatement `IV_RESTATED` reads under the word
// « total ». Read as items they were a charge of 6000.00 for nothing and a
// charge of 10666.67 for the cheque that answers them, on top of the 25000.00
// the leaf actually asks for.
//
// Both are admitted only while a « less » line is already working a subtotal
// down, which is the whole of what stops « payment on account » heading the
// two priced entries of leaf 157 from being read this way. The cheque row is
// the bare word and its rule and nothing else, so leaf 139's « check No 6388
// date Feb 14 » — a description, and carrying no figure — stays what it is.
const IV_PAID_ON_ACCOUNT = /^["'”\s]*payment\s+on\s+acc(t|ount)?\b/i;
const IV_NET_CHECK = /^["'”\s]*check\s*[-–—\s]*$/i;

/**
 * Whether a row's figure is wholly struck out.
 *
 * Tested on the *raw* cells, because `plainOf` keeps the reading inside
 * `\struck{}` — which is right, since a struck word was read and is worth
 * showing — and so a struck figure reaches the totals looking exactly like a
 * live one. Wholly is the whole of the test: a cell that is `\struck{20}` and
 * nothing else is a figure somebody cancelled, and a cell that merely contains
 * a struck fragment beside a live figure is a correction, which is money.
 */
const IV_STRUCK_CELL = /^\\struck\s*\{[^{}]*\}$/;
const ivStruck = (raw) => {
  const money = [raw[raw.length - 2] ?? '', raw[raw.length - 1] ?? ''].map((c) => c.trim());
  return money.some((c) => c !== '') && money.every((c) => c === '' || IV_STRUCK_CELL.test(c));
};

/**
 * Whether a row's figure is wholly a doubtful reading.
 *
 * The same test on `\uncertain{}`, for a different reason. A figure the
 * transcriber could only offer is still read — a doubtful reading is a
 * reading — unless the row below it on the same leaf carries the same figure
 * plainly, in which case the doubtful one is the draft of it. Leaf 130 writes
 * the Artex dividend across the client's own row, rubs it out, and writes it
 * again on the line below; the edition gives the rubbed line as
 * `\uncertain{7} | \uncertain{75}` and says in its note that it was written
 * again. Read as two rows it was two dividends.
 */
const IV_UNCERTAIN_CELL = /^\\uncertain\s*\{[^{}]*\}$/;
const ivUncertainFigure = (raw) => {
  const money = [raw[raw.length - 2] ?? '', raw[raw.length - 1] ?? ''].map((c) => c.trim());
  return money.some((c) => c !== '') && money.every((c) => c === '' || IV_UNCERTAIN_CELL.test(c));
};

/**
 * Whether a bare figure is the sum of the lines ruled off above it.
 *
 * She draws the rule and the transcription does not record it, so the rule
 * has to be recovered from the arithmetic — which is what the leaves' own
 * notes do: « thirteen titles at 15 make that figure exactly ». Read upwards
 * from the line above the figure and stop at the last settlement, because a
 * bill or a cheque closes a run and nothing beyond it is being gathered.
 * Description lines that carry no figure are transparent: « 2 line drawings »
 * stands between a client and its titles all through the volume.
 *
 * Any leading part of that run will do, not the whole of it. Leaf 21's 65 is
 * the 50 and the 15 of the 7 March commission and does not reach back to the
 * 25 of the 3rd, and leaf 23's 80 is two McCann half-pages across a leaf-turn
 * with a third entry above them.
 */
const sumsTheRunAbove = (rows, i, target, least = 1) => {
  let acc = 0;
  let lines = 0;
  for (let j = i - 1; j >= 0; j--) {
    const p = rows[j];
    if (p.kind !== 'item') break;
    if (p.amount === null) continue;
    acc += p.amount;
    lines++;
    if (lines >= least && Math.abs(acc - target) < 0.005) return true;
  }
  return false;
};

/**
 * The year a `\marginal{}` states, where it states one and nothing else.
 *
 * The body of a marginal is what stands beside the rows and then, after an
 * em-dash, the transcriber's gloss of where on the leaf it stands. Only the
 * first part is the book's own writing, and only a first part that is a
 * four-figure year and nothing besides is read: leaf 28 writes the year in two
 * halves with a gap between them, « 19 18 », so the spaces are closed up, but
 * a marginal that carries a subtotal (« 160 \\ 35 \\ 195 »), a date
 * (« Dec 4th »), a carried figure (« 70 ») or a sentence yields nothing at
 * all.
 */
const ivMarginalYear = (plain) => {
  const said = plain.split(/\s*---\s*/)[0] ?? '';
  const digits = said.replace(/\s+/g, '');
  return /^(19[0-6]\d)$/.test(digits) && /^[\d\s]+$/.test(said) ? Number(digits) : null;
};

const receipts = [];
const ivSubtotals = [];
const ivDeductions = [];
const ivNets = [];
const ivCarried = [];
let ivBlankDescription = 0;
let ivStruckRows = 0;
// Receipts recognised by repetition alone, because the row carries no word.
let ivWordless = 0;
// Rows that are the rubbed-out draft of the row below them: a doubtful figure
// the next row repeats, or a receipt standing on the net's own row.
let ivRubbed = 0;
let ivRubbedReceipts = 0;
// Rows the ink decided — red money read as a receipt, pencil money as a sum —
// where the words alone would have said otherwise, and rows where the ink and
// the words contradict each other and the words were kept.
let ivByInk = 0;
let ivInkConflicts = 0;
const ivPencil = [];
// The ten best-paid illustration jobs, 1913–1925.
const ivJobs = [];
// And all of them counted: how many jobs, for whom, for how much.
const ivJobCensus = { count: 0, charged: 0, received: 0, years: [0, 0], byClient: [] };
// Rows whose money columns carry writing the reader would not read as dollars.
let ivUnreadMoney = 0;
{
  const ivFiles = files.filter((f) => activityOf(f.ledger) === 'illustration');
  const rows = [];
  let year = null;
  let previousBatch = null;
  for (const file of ivFiles) {
    // The year carries across a batch boundary only where the batches abut.
    if (previousBatch !== null && file.batch !== previousBatch + 1) year = null;
    previousBatch = file.batch;
    // The pencil years, by the sheet they stand on. Taken as that sheet's rows
    // run out, which is where the edition puts the marginal.
    const pencil = new Map();
    for (const m of file.marginals) {
      const y = ivMarginalYear(m.plain);
      if (y !== null && m.ref !== null) pencil.set(m.ref, y);
    }
    let sheet = null;
    // A settlement phrase still waiting for its figure, or null.
    let openPhrase = null;
    // Whether a « less » line has been written since the last cheque.
    let deductedSinceReceipt = false;
    // Whether an « Expenses » heading is open on this sheet.
    let expensing = false;
    const closeSheet = () => {
      if (sheet !== null && pencil.has(sheet)) year = pencil.get(sheet);
    };
    for (let k = 0; k < file.looseRows.length; k++) {
      const row = file.looseRows[k];
      if (row.ref !== sheet) {
        closeSheet();
        sheet = row.ref;
        expensing = false;
      }
      const cells = row.plain;
      const body = cells
        .slice(1, cells.length - 2)
        .join(' ')
        .trim();
      const read = bookIVAmount(cells);
      // A sum being worked across the columns is not a figure in the money
      // column, whatever stands there: the cell holds the cents of the
      // addition written to its left. Said out loud, like every other cell the
      // reader turns down, and read as nothing.
      const working = read !== null && IV_WORKING.test(body) && !/[A-Za-z]/.test(body);
      if (working) {
        unparsed.push({
          reason:
            'a Book IV row that works a sum in pencil across the columns — « 1800 + 560 | 53 » — ' +
            'so the money cell holds the cents of the addition and not a figure of its own',
          ledger: row.ledger,
          batch: row.batch,
          leaf: row.leaf,
          ref: row.ref,
          section: row.section,
          work: null,
          row: cells,
        });
      }
      const amount = working ? null : read;
      // A cancelled entry is not a charge, not a receipt, and not something
      // the rows around it can be read against. Dropped here rather than
      // skipped below, so that it does not stand between a ruled-off sum and
      // the figure it sums.
      if (amount !== null && ivStruck(row.cells)) {
        ivStruckRows++;
        continue;
      }
      // A figure the reader turned down. Said out loud, because the money
      // columns of this volume are the whole of what it records and a cell
      // with writing in it that reaches no total is the one thing here that
      // must never pass in silence: `^\d+$` on the dollars cell refused a
      // hundred and forty-four of them for years, and nothing on the page or
      // in the output showed it.
      const unread = amount === null && !working && ivMoneyWritten(cells) && !ivStruck(row.cells);
      if (unread) {
        ivUnreadMoney++;
        unparsed.push({
          reason:
            'a Book IV row whose money columns carry writing that is not a figure in dollars — ' +
            'a sum in pounds sterling, a ditto standing for the sum above, or an expense the ' +
            'leaf writes with a minus sign in front of it',
          ledger: row.ledger,
          batch: row.batch,
          leaf: row.leaf,
          ref: row.ref,
          section: row.section,
          work: null,
          row: cells,
        });
      }
      // A year in the date cell. On a line of its own it is only a year; on a
      // row that carries a description as well — leaf 44's « 1920 | 1 rough
      // sketch » — it dates that row too, and the row goes on to be read.
      const stated = /^(19[0-6]\d)\.?$/.exec((cells[0] ?? '').trim());
      if (stated) {
        year = Number(stated[1]);
        if (!body && amount === null) continue;
      }
      // A description that is nothing but ditto marks repeats the row above it
      // and is whatever that row was. Leaf 28 pays the Webb Publishing Co in
      // two cheques and writes the second « " 27 | " " " | 9 »: without this
      // the nine has no letters in it, which is to say it is a bare figure,
      // and it was counted as a fresh charge for a drawing nobody made.
      const previous = rows[rows.length - 1];
      const underDeduction =
        previous !== undefined && previous.kind === 'deduction' && previous.where.ref === row.ref;
      // « Payment on Account » on a line of its own, with the payer and the
      // figure on the line below — leaf 153's « Jan 22, 62 Payment on Account
      // / Hackett — 6666.67 » — is a deduction whose words do not fit on one
      // line, and the figure inherits the phrase the way a cheque's does. But
      // only under a commission already taken: at the head of a statement,
      // leaf 157's « payment on account / Chair Car 10,000 », the same words
      // introduce the instalment itself, which is the charge.
      const paidOnAccount = IV_PAID_ON_ACCOUNT.test(body) && deductedSinceReceipt;
      const own = IV_RECEIPT.test(body) ||
        IV_BY_CHECK.test(body) ||
        (IV_DITTO_TAILED.test(body) && previous?.kind === 'receipt' && previous.where.ref === row.ref)
        ? 'receipt'
        : IV_BILL.test(body)
          ? 'bill'
          : IV_DEDUCTION.test(body) || IV_DEDUCTION_NAMED.test(body) || paidOnAccount
            ? 'deduction'
            : IV_CARRIED_FORWARD.test(body)
              ? 'carry'
              : (isDitto(body) || isDittoDated(body)) && previous !== undefined
                ? previous.kind
                : underDeduction && (IV_DITTO_HEADED.test(body) || IV_AND.test(body))
                  ? 'deduction'
                  : /[A-Za-z]/.test(body)
                    ? 'item'
                    : 'bare';
      // The price on the line below its title. All through the volume an item
      // whose words fill the description column carries its figure on the
      // next line, in a row that says nothing: leaf 39's « The House that
      // Patty built | | » and then « | | 100 », leaf 152's « "Excursion into
      // Philosophy" | | » and then « | | $14500.00 ». That row is the item's
      // own price and not an undescribed figure, and the difference is not
      // what it is charged at — a bare figure is charged too — but what the
      // rows below it can be read against: leaf 152's 24500.00 is the sum of
      // that 14500 and the 10000 under it, and a run of items that is broken
      // by a bare row does not add. Leaf 133's 5500.00 under « First Row
      // Orchestra » and « Eleven A. M. » was worse — the only price the
      // entry has, and it was taken for a subtotal of nothing and dropped.
      //
      // Only a title with nothing at all in its money columns is continued —
      // leaf 132's « payment on acct. | -2000 » is a figure the reader turns
      // down, not a title waiting for one — only on the same sheet, and a row
      // with no letters and no money between the two, leaf 81's « ? » for a
      // third water colour, is looked through. The numbered water colours of
      // leaves 71 to 73, « 1 | 100 » under « 5 Water colors at 33 1/3 % »,
      // take the heading as their words the same way, and are charged as they
      // were.
      //
      // And it is the entry's *first* figure. Where something priced already
      // stands unsettled above, a bare figure under a name is the sum ruled
      // off: leaf 153 prices « A Woman in the Sun » at 15000.00, names the
      // Hacketts under it, prices « New York Office » at 16500.00, names
      // Fleischman, and rules off 31500.00 — a subtotal, under a buyer. Nor
      // is it the last figure on the leaf. Leaf 82's entry of 23 April lists
      // its titles and runs on to leaf 83 for the rest of them, its deduction
      // and its cheque; the 726.34 at the foot under « Andersons House » is
      // the leaf's three receipts added in pencil, and leaf 101's 2423.34
      // under « commission to Rehn 250. » is the same figure for 1934. A price
      // has something after it on the leaf that answers it.
      const titled = (() => {
        if (own !== 'bare' || amount === null || openPhrase !== null) return null;
        const later = file.looseRows
          .slice(k + 1)
          .some((r) => r.ref === row.ref && bookIVAmount(r.plain) !== null);
        if (!later) return null;
        let title = null;
        for (let j = rows.length - 1; j >= 0; j--) {
          const p = rows[j];
          if (p.where.ref !== row.ref || p.kind === 'receipt' || p.kind === 'bill') break;
          if (p.amount !== null) return null;
          if (title === null && !(p.kind === 'bare' && !ivMoneyWritten(p.cells))) {
            if (p.kind !== 'item' || ivMoneyWritten(p.cells)) return null;
            title = p;
          }
        }
        return title;
      })();
      // A settlement whose words do not fit on one ruled line finishes on the
      // next, and the figure goes with the end of the phrase rather than with
      // the beginning: leaf 134 writes « Rec'd by check from | John Clancy
      // Special 3666.67 » across two lines, and leaves 80, 102 and 108 write
      // « rec'd by check » with the money alone on the line below. The second
      // line says nothing about itself, so it inherits the phrase it completes
      // — which is open only while no figure has been reached, so a client's
      // name over its items never reaches them.
      // An « Expenses » heading turns the described rows under it into
      // subtractions until a cheque closes the block. The bare rows are left
      // alone: the sum of the costs and the net below it are read by the
      // `deducting` pass, which is already looking for exactly that shape.
      // A « less » line that carries no figure of its own opens the same
      // block: leaf 126's « less expenses » heads a frame and a photograph,
      // each priced on its own line, and the first of them inherited the
      // phrase while the second was counted as a charge.
      if ((IV_EXPENSES.test(body) || own === 'deduction') && amount === null) expensing = true;
      else if (own === 'receipt') expensing = false;
      if (own === 'receipt') deductedSinceReceipt = false;
      else if (own === 'deduction') deductedSinceReceipt = true;
      // What the block leaves is not one of its costs: leaf 144 takes two
      // photographs off under « less photo » and then writes « check |
      // 8490.40 », which is the net, and the `deducting` pass reads it there.
      const restates = IV_NET_CHECK.test(body) || IV_RESTATED.test(body);
      const byWords = expensing && amount !== null && !restates && (own === 'item' || titled !== null)
        ? 'deduction'
        : amount !== null && (own === 'item' || own === 'bare') && openPhrase !== null
          ? openPhrase
          : titled !== null
            ? 'item'
            : own;
      // The ink, where the transcription records it (#19). Book IV's colour
      // is its status field — receipts red, sums pencil, charges black — and
      // a leaf that says so in `\ink{}` is read by that before it is read by
      // its words: a red figure is money received whatever the words beside
      // it, which from leaf 157 are nothing at all, and a pencil figure is a
      // sum and never a charge. The words keep every other distinction — a
      // bill from an item, a deduction from a charge — and where the two
      // flatly contradict, a red « bill » or a pencil « rec'd », the words are
      // kept and the contradiction counted, because one of the two readings
      // is wrong and this file is not the place to decide which.
      const moneyInk = row.inks?.[2] ?? row.inks?.[3] ?? null;
      const byInk =
        amount === null ? null : moneyInk === 'red' ? 'receipt' : moneyInk === 'pencil' ? 'pencil' : null;
      const contradicts =
        byInk !== null &&
        ((byInk === 'receipt' && (own === 'bill' || own === 'deduction')) ||
          (byInk === 'pencil' && own === 'receipt'));
      if (contradicts) ivInkConflicts++;
      const kind = byInk !== null && !contradicts ? byInk : byWords;
      if (byInk !== null && !contradicts && kind !== byWords) ivByInk++;
      // A row whose money the reader turned down does *not* close the phrase
      // above it, and leaf 80 is why: « rec'd by cash | £1 » is answered by
      // « 5 | 00 » on the line below, the pounds converted, and the cheque is
      // that five dollars. The phrase has to reach it. Closing the phrase on
      // any writing in the money columns would be the tidier rule and would
      // lose the only receipt in the volume paid in another currency.
      openPhrase = amount !== null ? null : own === 'item' || own === 'bare' ? openPhrase : own;
      rows.push({
        amount,
        body: titled !== null ? `${titled.body}${body ? ` ${body}` : ''}` : body,
        year,
        date: (cells[0] ?? '').trim(),
        kind,
        rubbed: amount !== null && ivUncertainFigure(row.cells),
        // A rule she drew above this row's figure, where the transcription
        // records it: the whole of what says a bare figure is a sum.
        ruled: row.ruled === true,
        where: {
          ledger: row.ledger,
          batch: row.batch,
          leaf: row.leaf,
          ref: row.ref,
          section: row.section,
        },
        cells,
      });
    }
    closeSheet();
  }

  // A doubtful figure that the row below repeats plainly is the rubbed-out
  // draft of that row, and goes. Plainly: leaf 156 writes its net of 20628.00
  // twice into a blot, in black and then in red, and the edition marks both
  // doubtful — two readings of two figures, and neither the draft of the
  // other. Taken out before the passes below so that it stands between
  // nothing and nothing.
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    const n = rows[i + 1];
    if (
      r.rubbed &&
      n !== undefined &&
      !n.rubbed &&
      n.where.ref === r.where.ref &&
      n.amount !== null &&
      Math.abs(n.amount - r.amount) < 0.005
    ) {
      rows.splice(i, 1);
      ivRubbed++;
    }
  }

  // How much has been itemised since the last bill or cheque closed a run,
  // whether a « less » line is currently working a subtotal down to a cheque,
  // and whether the net it leaves has been written yet.
  let sinceSettlement = 0;
  let deducting = false;
  let netRestated = false;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.amount === null) continue;
    if (r.year === null) {
      unparsed.push({
        reason:
          'a money row in Book IV standing after a gap in the transcribed batches, so no year ' +
          'can be carried to it — the volume states a year once and lets it run',
        ...r.where,
        work: null,
        row: r.cells,
      });
      continue;
    }
    // A figure in pencil is a sum — the leaf's, the year's, a subtotal — and
    // is money already counted line by line, never a charge. Read off the
    // ink and not the arithmetic, so it holds where the arithmetic does not:
    // leaf 89's foot sum counts an unreceipted fifteen dollars in with the
    // cheques, and no test on the run above it could reach that.
    if (r.kind === 'pencil') {
      ivPencil.push({ year: r.year, amount: r.amount, ...r.where });
      continue;
    }
    if (r.kind === 'receipt') {
      // A receipt written across the row that already carried the net, rubbed
      // out, and written again on the line below. Leaf 111 does it and says
      // so: « the 380 standing on that row is the black subtotal it was
      // written over, not part of the receipt », and leaves 115, 121 and 122
      // do it again. What survives of the rubbed line is its words — a date
      // and « rec'd by check » in pale red, or `\uncertain{rec'd} \ill{}` —
      // so the row reads as a receipt, and the figure under it, which is the
      // net in black, was counted a second time: 1947 came to 2860.53
      // against the 2360.53 the leaf adds up to. The shape is the receipt
      // standing where the net would be written and none is — directly under
      // the « less » line — repeated to the cent by the receipt on the line
      // below. Leaf 134's two Clancy cheques of 3666.67 on consecutive days
      // are the same figure twice too, and stand under no deduction.
      const next = rows[i + 1];
      if (
        deducting &&
        !netRestated &&
        next !== undefined &&
        next.kind === 'receipt' &&
        next.where.ref === r.where.ref &&
        next.amount !== null &&
        Math.abs(next.amount - r.amount) < 0.005
      ) {
        ivNets.push({ year: r.year, amount: r.amount, ...r.where });
        ivRubbedReceipts++;
        netRestated = true;
        continue;
      }
      r.receiptObj = { year: r.year, amount: r.amount, date: r.date, ...r.where };
      receipts.push(r.receiptObj);
      sinceSettlement = 0;
      deducting = false;
      continue;
    }
    // A subtraction, and never money the book is owed — under either reading
    // of the line. « less commission 1983.33 » takes a third off; « less
    // commission 3433.00 », which is the same words for the figure that is
    // left, states a net, and this volume writes it both ways. Both are the
    // settlement working itself out down the leaf, and neither is a charge.
    if (r.kind === 'deduction') {
      ivDeductions.push({ year: r.year, amount: r.amount, ...r.where });
      deducting = true;
      netRestated = false;
      continue;
    }
    // A page total carried forward restates the sums ruled off on the leaf
    // before it, which were read there.
    if (r.kind === 'carry') {
      ivCarried.push({ year: r.year, amount: r.amount, ...r.where });
      continue;
    }
    // And what a subtraction leaves. Between a « less » line and the cheque
    // that closes the block the figures are the running net, restated after
    // each deduction — bare, or under the word « total ». A described row that
    // is neither ends the run: leaf 137 takes a commission and then frames off
    // one group of watercolours and starts pricing the next.
    if (deducting) {
      if ((r.kind === 'bare' && r.body === '') || IV_RESTATED.test(r.body)) {
        ivNets.push({ year: r.year, amount: r.amount, ...r.where });
        netRestated = true;
        continue;
      }
      if (IV_PAID_ON_ACCOUNT.test(r.body)) {
        ivDeductions.push({ year: r.year, amount: r.amount, ...r.where });
        continue;
      }
      if (IV_NET_CHECK.test(r.body)) {
        ivNets.push({ year: r.year, amount: r.amount, ...r.where });
        netRestated = true;
        continue;
      }
      deducting = false;
    }
    // A sum ruled off. What answers it is on the line below — the bill, or,
    // where she drew none, the cheque. Where that answer is a cheque the
    // arithmetic has to say so too, because an undescribed *charge* is
    // answered by a cheque in exactly the same way: leaf 14's 30 and leaf
    // 39's 100 both are.
    //
    // A « less » line below it needs no such test. Nothing but a subtotal can
    // stand where a commission is about to be taken, and asking the arithmetic
    // there would count the leaves whose subtotal disagrees with their own
    // items — leaf 137's 2350 against three watercolours making 2850 — as a
    // second charge on top of the first.
    //
    // And a sum ruled off part-way down an entry is answered by nothing at
    // all: the volume prices its oils, rules off their total, goes on to the
    // water colours, rules off *that* total, and only then takes its
    // commission. Leaf 153's 31500.00 and leaf 125's 140 and 1950 are that
    // shape, and what follows each of them is another item. The arithmetic is
    // then the only thing that speaks, so it is asked on its own — which is
    // safe for the same reason it is safe above: leaf 14's 30 follows a 25
    // that does not make it, and leaf 39's 100 has nothing priced above it
    // since the last cheque, so neither sums the run it stands under and
    // neither is taken for a subtotal.
    //
    // Two priced lines at least, where the cheque case wants only one. A bare
    // figure repeating the single item above it is not a subtotal of anything;
    // it is the red receipt with its words gone, read as such at the foot of
    // this loop. Asking for one line took leaf 159's 8000.00 of 1 January and
    // its 100.00 of 11 February for sums of the charges they repeat, and lost
    // both cheques.
    //
    // Where the leaf disagrees with itself the arithmetic cannot speak, and
    // the cheque has to. Leaf 122 rules off 305.49 over items of 42.40 and
    // 236.09, which make 278.49, and the cheque below it is 305.49: the
    // subtotal is wrong and it is what was paid. A bare figure that the
    // cheque on the next line repeats to the cent, standing directly under a
    // priced item, is that sum — because the volume never pays an
    // undescribed figure alone and leaves the item over it unsettled.
    // Directly: leaf 76's 175 stands under three unpriced titles and a cheque
    // of 175 answers it, with an entry of 65 out of order above the titles,
    // and it is the price of those titles and a charge. Leaf 39's 100, the
    // undescribed charge a cheque of 100 answers, has nothing priced above
    // it at all, and is charged as before.
    //
    // A page total carried forward on the leaf after — leaf 126's « from
    // preceeding page total » — answers a bare sum the way a « less » line
    // does: leaf 125's 2700.00 stands over two oils of 1200.00 each, three
    // hundred out by the leaf's own note, and is the last of the three sums
    // the carry adds up.
    const next = rows[i + 1];
    const answer = next?.kind;
    const repeatedByCheque =
      answer === 'receipt' && next.amount !== null && Math.abs(next.amount - r.amount) < 0.005;
    const underPricedItem = rows[i - 1]?.kind === 'item' && rows[i - 1].amount !== null;
    // And where the transcription records the rule she drew above the
    // figure, the arithmetic is not asked at all.
    if (
      r.kind === 'bare' &&
      (r.ruled ||
        answer === 'bill' ||
        answer === 'deduction' ||
        answer === 'carry' ||
        (answer === 'receipt' && sumsTheRunAbove(rows, i, r.amount)) ||
        (r.body === '' && repeatedByCheque && underPricedItem) ||
        (r.body === '' && answer === 'item' && sumsTheRunAbove(rows, i, r.amount, 2)))
    ) {
      ivSubtotals.push({ year: r.year, amount: r.amount, ...r.where });
      continue;
    }
    // A sum carried at the foot of a leaf. From leaf 66 the volume rules off
    // the leaf, and later the year, under the last cheque on it — leaf 128's
    // 7245.26, leaf 129's 4115.77 — and those figures restate money already
    // counted line by line above. What distinguishes one from an undescribed
    // charge is that nothing stands unsettled: every item since the last
    // cheque has been paid for, so there is nothing left for the figure to be
    // owed on. Leaf 14's 30 and leaf 39's 100 are undescribed charges, and
    // each is answered by a cheque of its own, which is the test kept above.
    //
    // The description column must be *empty*, and not merely wordless. Leaf 73
    // bills « 6 water colors at 33 1/3 » and then numbers them 9 to 14 down
    // that column, one to a line at a hundred each: six charges whose
    // description is a numeral, and the cheque of 600 below them confirms it.
    // Without the test they read as six sums carried, and five hundred dollars
    // leaves the year. « Total », alone or with its year, is the same figure
    // with the word written in front of it and is admitted here.
    //
    // And the settlement that would answer it has to be on the *same sheet*.
    // A cheque at the head of the next leaf is answering that leaf and not
    // this one: leaf 133's 20799.82 and leaf 140's 24498.43 both stand at the
    // foot of a leaf whose successor opens « Rec'd from », and both were
    // counted as charges because a receipt three lines further on happened to
    // be the next row in the volume.
    const answersHere = rows[i + 1]?.where.ref === r.where.ref ? answer : undefined;
    if (
      (r.kind === 'bare' ? r.body === '' : IV_YEAR_TOTAL.test(r.body)) &&
      sinceSettlement === 0 &&
      answersHere !== 'bill' &&
      answersHere !== 'receipt'
    ) {
      ivCarried.push({ year: r.year, amount: r.amount, ...r.where });
      continue;
    }
    // A bill restates what was itemised above it; only an unitemised one is a
    // charge in its own right.
    if (r.kind === 'bill' && sinceSettlement > 0) {
      sinceSettlement = 0;
      continue;
    }
    // The red receipt with its words gone. From leaf 157 the volume stops
    // writing « rec'd by check » over the repeat and simply sets the figure
    // again on the line below, in red, with nothing in the date column and
    // nothing in the description: leaf 159 does it twice, to the 8000.00 of 1
    // January and the 100.00 of 11 February. The colour is the whole of what
    // says so, and the colour does not survive into the transcription, so what
    // is left to read is the repetition itself — same sheet, same figure to
    // the cent, immediately under the charge it answers, and no word of its
    // own anywhere on the line.
    //
    // Kept last, after the subtotal and the carried sum have had their turn,
    // so that a run of one item ruled off and then deducted from stays what
    // those tests already make of it.
    const above = (() => {
      for (let j = i - 1; j >= 0; j--) if (rows[j].amount !== null) return rows[j];
      return null;
    })();
    if (
      r.kind === 'bare' &&
      r.body === '' &&
      r.date === '' &&
      above !== null &&
      above.where.ref === r.where.ref &&
      (above.kind === 'item' || above.kind === 'bare') &&
      Math.abs(above.amount - r.amount) < 0.005
    ) {
      r.receiptObj = { year: r.year, amount: r.amount, date: r.date, ...r.where };
      receipts.push(r.receiptObj);
      ivWordless++;
      sinceSettlement = 0;
      deducting = false;
      continue;
    }
    if (r.kind === 'bare') ivBlankDescription++;
    entries.push({
      year: r.year,
      yearFrom: 'the year the volume last stated, carried forward',
      gross: r.amount,
      rateWritten: null,
      commission: 0,
      net: r.amount,
      receiptWritten: null,
      receiptYear: null,
      check: null,
      activity: 'illustration',
      charge:
        r.kind === 'bill'
          ? 'a bill, with nothing itemised since the last settlement'
          : r.kind === 'bare'
            ? 'an itemised charge whose description column is blank'
            : 'an itemised charge',
      // The line as written, which is what was drawn and not who paid for it.
      // Book IV names the client once, on its own line above the items, and
      // that line is not attached here: a client header is not reliably
      // distinguishable from an item that happens to carry a date and no
      // price — « May 25th Initial Letters » is the case that settles it — and
      // a client guessed wrong would be worse than none.
      // A row that says only « on acct. » under a title with no figure —
      // leaf 150's « Excursion into Philosophy / on acct. 5000 » — is that
      // title's instalment, and takes the title as its words. Only under an
      // undated line: a dated line above is the client, and leaf 127's two
      // payments on account under « May 10 Frank K. M. Rehn » are on account
      // of nothing the book names.
      description:
        /^(on acc(t|ount)?\.?|balance|payment)$/i.test(r.body) &&
        rows[i - 1]?.kind === 'item' &&
        rows[i - 1].amount === null &&
        rows[i - 1].date === ''
          ? `${rows[i - 1].body} ${r.body}`
          : r.body || null,
      ...r.where,
      work: null,
      // The words of the whole entry — from the cheque before to the cheque
      // after — for the instalment pass below, which needs to know whether
      // a picture was paid for in parts.
      entryWords: entryWordsAround(rows, i),
    });
    r.charged = true;
    r.entry = entries[entries.length - 1];
    if (r.kind === 'bill') sinceSettlement = 0;
    else sinceSettlement++;
  }

  /* ------------------------------------- the best-paid illustration jobs */

  // An entry is what stands between two cheques: the client's line, the
  // items, the bill, the receipt. In the illustration years — Book IV to the
  // last Hotel Management cover of November 1925 — a job is one such entry,
  // and its price is the charges in it. Prints and pictures already stand
  // among the jobs from 1920, in the same book and the same shape, and are
  // told apart by their words: an etching, a water colour, a dealer, a
  // museum, a prize. What is left is what a magazine or an agency paid for a
  // drawing, ranked, so the page can show what the trade was worth.
  const NOT_A_JOB =
    // Not « oil » and not « week »: « A Case of Oils » is a line drawing for the
    // Associated Sunday Magazines and Every Week was a magazine.
    /\b(etching|etchings|print|prints|plate|water ?colou?rs?|w\.?\s?c\.?|canvas|prize|royalt|instruction)\b|Rehn|Keppel|Kennedy|Weyhe|Museum|Phillips|Whitney|Print ?Makers|Society of Etchers|Smalley|Halpert|Sterner|Randolph|Milch|Babcock|Whitins/i;
  // A bill closes a job as a cheque does — the Hotel Management covers of
  // 1925 are billed month by month and paid month by month, and a run that
  // waited for the cheque would fold three covers into one. A cheque that
  // follows a bill with nothing itemised between pays that bill.
  let run = [];
  let pending = null;
  const jobs = [];
  // Every row of the run takes the entry's trade: the charges through the
  // entry they became, the cheques through the receipt they became, so the
  // two streams split the same way and a trade's card balances on its own.
  const assign = (activity) => {
    for (const r of run) {
      if (r.entry) r.entry.activity = activity;
      if (r.receiptObj) r.receiptObj.activity = activity;
    }
  };
  const closeRun = (settlement) => {
    const charged = run.filter((r) => r.charged);
    if (!charged.length) {
      if (pending && settlement?.kind === 'receipt' && pending.received === null) {
        pending.received = settlement.amount;
      }
      // A cheque with nothing itemised before it pays the bill before it.
      assign(pending?.activity ?? (run[0]?.year <= 1925 ? 'illustration' : 'cashbook'));
      run = [];
      return;
    }
    pending = null;
    let activity = 'cashbook';
    if (charged[0].year !== null && charged[0].year <= 1925) {
      const words = run.map((r) => r.body).join(' ');
      if (!NOT_A_JOB.test(words)) {
        activity = 'illustration';
        const client = run.find((r) => r.kind === 'item' && r.amount === null && r.body);
        // What was drawn: the titles — the described rows after the client's
        // line that are neither the bill nor the cheque, priced or not.
        const drawn = run
          .filter((r) => r !== client && r.kind === 'item' && r.body && !/^bill/i.test(r.body))
          .map((r) => r.body);
        const job = {
          year: charged[0].year,
          client: client?.body ?? null,
          drawn,
          charged: Number(charged.reduce((s, r) => s + r.amount, 0).toFixed(2)),
          received: settlement?.kind === 'receipt' ? settlement.amount : null,
          leaf: charged[0].where.leaf,
          ref: charged[0].where.ref,
          activity,
        };
        jobs.push(job);
        if (job.received === null) pending = job;
      }
    }
    assign(activity);
    run = [];
  };
  for (const r of rows) {
    if (r.year === null) continue;
    run.push(r);
    if (r.kind === 'receipt' || r.kind === 'bill' || (r.charged && IV_MONTH_BILL.test(r.body))) closeRun(r);
  }
  closeRun(null);
  ivJobs.push(...jobs.sort((a, b) => b.charged - a.charged || a.year - b.year).slice(0, 10));
  ivJobCensus.count = jobs.length;
  ivJobCensus.charged = Number(jobs.reduce((n, j) => n + j.charged, 0).toFixed(2));
  ivJobCensus.received = Number(jobs.reduce((n, j) => n + (j.received ?? 0), 0).toFixed(2));
  ivJobCensus.years = [Math.min(...jobs.map((j) => j.year)), Math.max(...jobs.map((j) => j.year))];
  const byClient = new Map();
  for (const j of jobs) {
    const k = (j.client ?? "—").replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
    const c = byClient.get(k) ?? { client: k, jobs: 0, charged: 0 };
    c.jobs++;
    c.charged = Number((c.charged + j.charged).toFixed(2));
    byClient.set(k, c);
  }
  ivJobCensus.byClient = [...byClient.values()].sort((a, b) => b.charged - a.charged);
}

/**
 * The words written in the same entry as row `i`: from the receipt before
 * it to the receipt after it, either end exclusive of the far receipt.
 */
function entryWordsAround(rows, i) {
  const parts = [];
  for (let j = i - 1; j >= 0 && rows[j].kind !== 'receipt'; j--) parts.unshift(rows[j].body);
  for (let j = i; j < rows.length; j++) {
    parts.push(rows[j].body);
    if (rows[j].kind === 'receipt') break;
  }
  return parts.join(' ');
}

/* -------------------------------------- one picture, paid in instalments */

/**
 * A picture paid for in parts is charged once, at its price.
 *
 * From 1961 the volume writes each instalment as an entry of its own: leaf
 * 150 lists « Excursion into Philosophy on acct. 5000 » among a statement's
 * items, and leaf 152 charges the picture at 14500 and takes « payment on
 * acount 3333.34 » — the 5000 less a third — off the net. Leaf 152 lists
 * « A Woman in the Sun 10000 » and leaf 153 charges it at 15000 and deducts
 * « Payment on Account Hackett 6666.67 »; leaf 154 charges « Road and Trees »
 * at 15000 twice, once with 7500 received on account and once with 2500 as
 * the balance; leaf 157 takes 6000 on account for « Intermission » and leaf
 * 158 charges 25000 as the balance and deducts the 6000. Read row by row
 * each of those pictures was charged twice, and 1962 and 1963 were the years
 * that read highest.
 *
 * So within Book IV a title charged more than once, where any of its entries
 * says « on account », « balance » or « part payment », is one picture: the
 * largest figure is its price and stands, and the others are collapsed and
 * reported. The words are required, because a print sells at thirty dollars
 * many times over and is not one picture. Only Book IV: the work books never
 * write a price in parts.
 */
const instalments = [];
{
  const INSTALMENT = /\bon acc(t|ount)?\b|\bbalance\b|\bpart payment\b|\bpayment on\b/i;
  // The title with the instalment's own words taken off — « balance on
  // Intermission » and « Intermission » are one picture — and the medium.
  const titleKey = (s) =>
    (s ?? '')
      .toLowerCase()
      .replace(/``|''|["“”«»]/g, '')
      .replace(/\b(balance|payment|part payment)\s+(on|for|of)\b/g, '')
      .replace(/\bon acc(t|ount)?\b\.?/g, '')
      .replace(/\b(1|one)\s+(oil|w\.?\s?c\.?|water\s*colou?r|drawing|etching)\b/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const byTitle = new Map();
  for (const e of entries) {
    if (e.ledger !== 'book-iv' || !e.description) continue;
    const k = titleKey(e.description);
    // A row that says only « on account » names no picture, and two such rows
    // — leaf 127's 3500 and 1000, on account of nothing the book says — are
    // not one.
    // One word is a title where it is a word — « Intermission », « Solitude »
    // — and not where it is a count or an initial.
    if (k.length < 5 || /^(on acc|payment|balance)/.test(k)) continue;
    if (!byTitle.has(k)) byTitle.set(k, []);
    byTitle.get(k).push(e);
  }
  for (const [title, group] of byTitle) {
    if (group.length < 2) continue;
    const keep = group.reduce((a, b) => (b.gross > a.gross ? b : a));
    for (const e of group) {
      if (e === keep) continue;
      // The collapsed entry must itself be written as an instalment, or the
      // entry that carries the price must deduct one: a picture's title
      // recurring with neither — a reproduction fee under the same name a
      // year later — is another charge and stands.
      if (!INSTALMENT.test(e.entryWords) && !/\bpayment on acc/i.test(keep.entryWords)) continue;
      e.instalmentOf = { leaf: keep.leaf, ref: keep.ref, year: keep.year };
      instalments.push({
        title,
        gross: e.gross,
        year: e.year,
        leaf: e.leaf,
        ref: e.ref,
        price: keep.gross,
        chargedOn: { leaf: keep.leaf, ref: keep.ref, year: keep.year },
      });
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
  // Art only. Book IV names no work and sells nothing twice — its rows are
  // aggregated by activity further down, and putting them through a pass built
  // to collapse the same painting written into two volumes would be answering
  // a question the pocket book never asks.
  for (const e of entries.filter((e) => e.activity === 'art')) {
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
 * The two trades, side by side, and the three states money can be in.
 *
 * `years` and `receivable` above are the art alone and keep the meaning they
 * have always had; this is the split the pocket book made possible.
 *
 * Three buckets rather than two, and the third is the honest one. Book IV
 * records a cheque for very nearly every charge in it, so what it does not
 * discharge is genuinely still owed at the point the transcription stops.
 * Books I to III mostly do not: a leaf there often writes one date to a sale
 * and does not separate the day the work went out from the day the cheque
 * came, so a sale sits undischarged because the book is silent, not because
 * nobody paid. Folding those two into one « outstanding » figure would put
 * tens of thousands of dollars of silence beside a few hundred of real debt
 * and invite the reader to compare them. So:
 *
 * — **collected**, where a receipt names a year;
 * — **outstanding**, accrued in a year and not yet discharged in it;
 * — **not recorded**, where the row states no receipt at all.
 *
 * The last is a fact about the volume, and it is reported per activity so that
 * the difference between the two books is visible rather than absorbed.
 */
// Book IV is one cash book for two trades, and the page had called all of it
// « Illustrator » — six hundred thousand dollars under the name of a trade
// that came to fourteen thousand. The book's entries are told apart by their
// words and their years (see the jobs pass): what a magazine or an agency
// paid for a drawing to November 1925 is the illustration; everything else
// in the volume — prints from 1920, Rehn from 1924, the gallery statements
// to 1967 — is the same cash book keeping account of his own work, and is
// counted apart from the work books because they record the same sales.
const ACTIVITIES = [
  { key: 'art', label: 'Painter and etcher' },
  { key: 'illustration', label: 'Illustrator' },
  { key: 'cashbook', label: 'His own work, by the cash book' },
];

const activities = ACTIVITIES.map(({ key, label }) => {
  const mine =
    key === 'art' ? deduped : entries.filter((e) => e.activity === key && !e.instalmentOf);
  const cashRows = key === 'art' ? null : receipts.filter((r) => r.activity === key);

  // Accrual is split at source into the part whose fate the book states and
  // the part it does not, so that the running debt below is a debt and not a
  // silence. Book IV states a receipt for its charges as a matter of course,
  // so all of it is followable; Book II mostly does not, and two thirds of the
  // art falls on the other side of this line.
  const accruedBy = new Map();
  const silentBy = new Map();
  const receivedBy = new Map();
  let notRecorded = 0;
  if (cashRows) {
    for (const e of mine) accruedBy.set(e.year, (accruedBy.get(e.year) ?? 0) + e.net);
    for (const r of cashRows) receivedBy.set(r.year, (receivedBy.get(r.year) ?? 0) + r.amount);
  } else {
    for (const e of mine) {
      if (e.receiptYear === null) {
        notRecorded += e.net;
        silentBy.set(e.year, (silentBy.get(e.year) ?? 0) + e.net);
        continue;
      }
      accruedBy.set(e.year, (accruedBy.get(e.year) ?? 0) + e.net);
      receivedBy.set(e.receiptYear, (receivedBy.get(e.receiptYear) ?? 0) + e.net);
    }
  }

  const span = [
    ...new Set([...accruedBy.keys(), ...receivedBy.keys(), ...silentBy.keys()]),
  ].sort((a, b) => a - b);
  let running = 0;
  const byYear = span.map((year) => {
    const accrued = accruedBy.get(year) ?? 0;
    const received = receivedBy.get(year) ?? 0;
    const silent = silentBy.get(year) ?? 0;
    running += accrued - received;
    return {
      year,
      // Accrued in this year on rows the book follows to a cheque.
      accrued: Number(accrued.toFixed(2)),
      received: Number(received.toFixed(2)),
      // Accrued in this year on rows that state no receipt at all. Never
      // enters `outstanding`: it is not a debt, it is an absence.
      notRecorded: Number(silent.toFixed(2)),
      outstanding: Number(running.toFixed(2)),
    };
  });

  const accrued = [...accruedBy.values()].reduce((a, b) => a + b, 0);
  const collected = [...receivedBy.values()].reduce((a, b) => a + b, 0);
  return {
    key,
    label,
    ledgers: [...new Set(mine.map((e) => e.ledger))].sort(),
    // Distinct batches the counted rows come from, so a page can say how much
    // of the volume this is without the fraction being typed into its prose.
    batches: new Set(mine.map((e) => `${e.ledger}#${e.batch}`)).size,
    rows: mine.length,
    years: byYear,
    totals: {
      // Everything the rows state, followable or not — so that
      // accrued = collected + outstanding + notRecorded, at every level.
      accrued: Number((accrued + notRecorded).toFixed(2)),
      collected: Number(collected.toFixed(2)),
      outstanding: Number((accrued - collected).toFixed(2)),
      notRecorded: Number(notRecorded.toFixed(2)),
    },
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
  activities,
  activitiesNote:
    'The same money split by which trade earned it: Books I, II, III, V and the dealers\' book ' +
    'record Edward Hopper selling his own work, Book IV records him being paid for magazine and ' +
    'advertising drawings. Through the years transcribed the two barely overlap, which is the ' +
    'point of separating them — the illustration income is the part the paintings books do not ' +
    'mention at all. Three buckets and not two: « not recorded » is money whose row states no ' +
    'receipt of any kind, and it is nearly all art, because the pocket book dates its cheques ' +
    'and the work books often do not. Reading it as debt would compare a silence with a sum.',
  illustration: {
    charges: entries.filter((e) => e.ledger === 'book-iv' && !e.instalmentOf).length,
    // The batches of Book IV the counted rows come from, both trades together.
    batches: new Set(entries.filter((e) => e.ledger === 'book-iv').map((e) => e.batch)).size,
    // Pictures paid for in parts, charged once at their price: the entries
    // collapsed into that charge, each saying where the price stands.
    instalmentsCollapsed: instalments.length,
    instalments,
    // The ten best-paid illustration jobs of 1913–1925: one entry each,
    // the client's line, what was drawn, what was charged and what the
    // cheque paid. Prints and pictures in the same years are left out by
    // their words, so this is the trade and not the book.
    topJobs: ivJobs,
    jobs: ivJobCensus,
    receipts: receipts.length,
    subtotalsExcluded: ivSubtotals.length,
    deductionsExcluded: ivDeductions.length,
    netsExcluded: ivNets.length,
    carriedSumsExcluded: ivCarried.length,
    struckExcluded: ivStruckRows,
    // Receipts read off the repetition rather than off a word, because from
    // leaf 157 the volume stops writing « rec'd by check » over the repeat.
    wordlessReceipts: ivWordless,
    // Rows that are the rubbed-out draft of the row below them, and go.
    rubbedExcluded: ivRubbed + ivRubbedReceipts,
    // Where the transcription records the ink (#19): sums in pencil set
    // aside, rows the colour decided against the words, and rows where the
    // two contradict and the words were kept.
    pencilSumsExcluded: ivPencil.length,
    readByInk: ivByInk,
    inkConflicts: ivInkConflicts,
    blankDescription: ivBlankDescription,
    note:
      'Book IV states a client, then its items one to a line, then « Bill rendered » with their ' +
      'total, then « Rec\'d by check » in red. The items are the charge; a bill is counted only ' +
      'where nothing was itemised since the last settlement, or every commission in the volume ' +
      'would be counted twice. A bare figure directly under a title that carries no figure of ' +
      'its own, where nothing priced stands unsettled above and something on the leaf answers ' +
      'it below, is that title\'s price and is charged as such. Any other bare figure is a ' +
      'subtotal where a bill, a « less » line or a page total carried forward follows it; where ' +
      'a cheque follows it and the priced lines directly above add to it, or repeats it to the ' +
      'cent under a priced item when they do not; or where another item follows it and two or ' +
      'more priced lines above add to it, ' +
      'which is the sum ruled off part-way down an entry — the oils totalled, then the water ' +
      'colours, and only then the commission. The leaf rules a line above every one of these and ' +
      'the transcription does not record the rule, so the rule is recovered from the arithmetic. ' +
      'A receipt standing directly under a « less » line, where the net would be written and ' +
      'none is, and repeated to the cent by the receipt on the line below, is that net with a ' +
      'rubbed-out draft of the receipt written across it, and is counted once; a doubtful ' +
      'figure the line below repeats plainly is the draft of that line and is not counted. ' +
      'From the 1930s the volume ' +
      'is a gallery account rather than an invoice book, and one sale is written down the leaf ' +
      'four or five times over: the items, their subtotal, « less commission », the net, « less ' +
      'photographs », the net again. Only the items are counted. A « less » line is a ' +
      'subtraction and never a charge — this volume writes those words for the deduction and ' +
      'for the figure it leaves indifferently — and what stands between it and the cheque is ' +
      'that running net restated. A sum ruled off under the last cheque on a leaf, with nothing ' +
      'unsettled above it, is the leaf or the year carried and not a fresh debt. A figure ' +
      'written wholly inside a struck-out ' +
      'entry is neither charge nor receipt. Receipts are kept as their own stream: a cheque ' +
      'settles a run of work, not a line of it, and the runs overlap. The year is carried from ' +
      'the last one the volume states — on a line of its own, in the date cell of a described ' +
      'row, or in pencil in the margin, which the edition records after the table.',
  },
  years,
  receivable,
  yearsNote:
    'The art alone — Books I, II and the dealers\' book. The illustration income is in ' +
    '`activities`, and is deliberately not added in here: these figures have meant the sale of ' +
    "Edward Hopper's own work since this file was first written, and quietly widening them " +
    'would change every total on the page without changing its label.',
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
  // `rowText` is carried on every entry so the party tally could look for a
  // name in it, and dropped here: it is the whole row repeated 326 times, and
  // nothing downstream reads it.
  entries: entries.map(({ rowText: _rowText, ...e }) => e),
  receipts,
  unparsed: {
    count: unparsed.length,
    // Taken a reason at a time and not off the top of the pile. The first
    // twenty-five rows of this list are all one kind — the exhibition dates of
    // Book II — so a straight slice showed that kind and nothing else, and the
    // nine Book IV money cells this file learned to refuse would have been
    // counted here and seen by nobody. A sample that cannot show a new reason
    // is a report only in name.
    sample: byReason(unparsed, 25),
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
    `          ${works.length} work(s) named, ${duplicates.length} cross-volume duplicate(s) collapsed, ` +
    `${instalments.length} Book IV instalment(s) collapsed into the price\n` +
    `          ${unparsed.length} row(s) the reader could not settle, reported not dropped ` +
    `(${ivUnreadMoney} of them a Book IV money cell that is not a figure in dollars)\n` +
    `          ${dealersRanked.length} dealer(s) and ${buyersRanked.length} named buyer(s) ranked; ` +
    `${namedNobody} row(s) name nobody tagged, ${ambiguous} ambiguous by surname\n` +
    activities
      .map(
        (a) =>
          `          ${a.label.padEnd(18)} ${a.rows} row(s), accrued ${a.totals.accrued.toFixed(2)}, ` +
          `collected ${a.totals.collected.toFixed(2)}, outstanding ${a.totals.outstanding.toFixed(2)}, ` +
          `not recorded ${a.totals.notRecorded.toFixed(2)}\n`,
      )
      .join('') +
    `          Book IV: ${receipts.length} receipt(s); excluded ${ivSubtotals.length} subtotal(s), ` +
    `${ivDeductions.length} deduction(s), ${ivNets.length} restated net(s), ` +
    `${ivCarried.length} carried sum(s), ${ivStruckRows} struck row(s); ` +
    `${ivWordless} wordless receipt(s); ${ivRubbed + ivRubbedReceipts} rubbed draft(s) dropped; ` +
    `${ivPencil.length} pencil sum(s) set aside, ${ivByInk} row(s) the ink decided against the words, ` +
    `${ivInkConflicts} contradiction(s) kept to the words; ` +
    `${ivBlankDescription} charge(s) with no description written\n`,
);
