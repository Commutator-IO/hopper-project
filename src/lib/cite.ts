import type { Ledger, Pass, Sheet } from './types.ts';
import type { State } from './progress.ts';
import { batchName, batchRange } from './batches.ts';

/**
 * The citation, in one place, because three numbering systems overlap here and
 * a reader left to choose between them will choose wrong.
 *
 * The books carry the Hoppers' own leaf numbers, written on the paper. The
 * Whitney's digitisation carries a sequence of photographs, which counts the
 * covers, the versos, the flyleaves and the loose insertions and therefore
 * agrees with the leaf numbers nowhere. ResourceSpace carries a resource ref,
 * which is in no order at all and is the only unique address in the archive.
 * « Leaf 58 » names six different things across six volumes, and three inside
 * Book I alone — refs 18297, 17062 and 17411. Ref 18297 names one thing.
 *
 * So a citation from this site prints **both**: the leaf, because it is what
 * the book itself says and the only number a reader of the photograph can see,
 * and the ref, because it is the one the museum can be asked about. Neither
 * alone is enough — the leaf is ambiguous, and the ref is invisible on the
 * object.
 *
 * ## What a citation is made of
 *
 * Two clauses, and the division is the point.
 *
 * — **The object.** Authors, volume, leaf, ref, holding institution,
 *   accession. Every word of it is the Whitney's, and it stays true whatever
 *   happens to this site.
 * — **The reading.** This site, the batch, and the pass that produced the
 *   transcription. It is a claim of ours, it is dated, and it may be wrong.
 *
 * Keeping them apart is what lets an untranscribed sheet be cited at all: it
 * has an object clause and no reading clause, and saying `not transcribed` is
 * an answer rather than a gap.
 *
 * ## It agrees with the TEI, deliberately
 *
 * Nothing here is invented. Every field is one the TEI export already emits,
 * so a citation and a deposited file cannot disagree:
 *
 * | Citation | TEI |
 * |---|---|
 * | Josephine Nivison Hopper and Edward Hopper | `<author>` × 2, in that order |
 * | *Artist's ledger — Book I* | `<title>` |
 * | batch-06 | the file, `batch-06.tex`; `<title>` spells it « batch 6 » |
 * | leaf 58 | `<pb n="58"/>` |
 * | unnumbered leaf | `<pb n="unnumbered"/>` |
 * | ref 18297 | `<pb facs="…view.php?ref=18297" xml:id="sheet-18297"/>` |
 * | Whitney Museum of American Art, 96.208 | `<msIdentifier>` |
 * | first machine pass by Opus 5, 6 September 2026 | `<respStmt>` |
 *
 * ## The URL is always the canonical one
 *
 * `SITE` is hard-coded rather than taken from `location.origin`, and that is
 * not an oversight. This build also answers at `commutator-io.github.io`
 * whenever no custom domain is configured — see `base.ts` — and a citation
 * copied from that preview would name a URL that exists only until the DNS
 * record does. A citation gets the address the site intends to keep.
 */
export const SITE = 'https://hopper.commutator.io';

/** The site's own title, as a citation names it. */
export const SITE_TITLE = 'Hopper Ledgers';

/**
 * Both hands, in the order the TEI header lists them — and that order is not
 * the one the site's own prose uses.
 *
 * The books are Edward Hopper's record of his work, and the front page names
 * him first because that is what they are *for*. But the writing in them is
 * overwhelmingly hers: he drew the record sketch and lettered the title, and
 * Josephine Hopper ruled the columns and kept the dates, the prices, the
 * buyers and the exhibitions for fifty years. A transcription is a
 * transcription of her hand, so the file that carries it names her first, and
 * a citation of that file follows it rather than quietly re-ordering.
 */
export const AUTHORS = 'Josephine Nivison Hopper and Edward Hopper';

export const HOLDER = 'Whitney Museum of American Art';

/**
 * The pass that produced a transcription, as `types.ts` defines it — the model
 * that read the sheets and the day it read them.
 *
 * Taken from the `% Pass:` line every `.tex` opens with, which is also what
 * travels into the TEI `<respStmt>`. It is in the citation because a citation
 * of this site cites *a reading*, not a fact, and a reading has a date.
 */
export type { Pass };

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `2026-09-09` → `9 September 2026`.
 *
 * Formatted from the string's own parts rather than through a `Date`, because
 * `new Date('2026-09-09')` is UTC midnight and reports the 8th to anybody west
 * of Greenwich. A citation that shifts by a day depending on who copies it is
 * not a citation.
 */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** Today, in the same form, for the access date. */
export function today(d = new Date()): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * How this sheet's leaf is named.
 *
 * About one sheet in nine carries no number: a cover, a flyleaf, an index
 * leaf, a loose insertion. It is named `unnumbered leaf`, which is the same
 * answer the TEI gives as `n="unnumbered"`, and it is an answer rather than an
 * omission — nobody wrote a number on that leaf, and inventing one for the
 * sake of a tidy citation would be inventing a fact about the object.
 */
export const leafName = (leaf: number | null) =>
  leaf === null ? 'unnumbered leaf' : `leaf ${leaf}`;

/** The object clause: everything the museum can answer for. */
function object(ledger: Ledger, tail: string): string {
  return `${AUTHORS}, ${ledger.title}, ${tail}. ${HOLDER}, ${ledger.objectNumber}.`;
}

/**
 * The reading clause: whose reading it is, and how far it has been taken.
 *
 * It turns on whether a transcription **exists**, not on the batch's state,
 * because those are two different questions and only the first one decides
 * whether there is a reading to cite. `checked` is a declaration on top of an
 * existing reading, and it is added to the clause because it is the one thing
 * no file can prove and only a person may claim.
 *
 * `null` means there is nothing of ours to cite, and the caller says so in
 * words rather than leaving a gap — see `noReading`.
 */
function reading(state: State, pass: Pass | null | undefined, transcribed: boolean): string | null {
  if (!transcribed) return null;
  const made = pass
    ? `first machine pass by ${pass.model}, ${longDate(pass.date)}`
    : 'first machine pass, date unrecorded';
  return state === 'checked' ? `${made}; checked against the sheets by a person` : made;
}

/**
 * What stands where the reading clause would be, when there is no reading.
 *
 * Two different silences, and collapsing them would lose the difference. A
 * batch nobody has reached is *not transcribed*; a batch somebody looked at
 * and declared empty — blank leaves, a cover, a sheet with nothing written on
 * it — held nothing to transcribe, which is a decision and not a gap.
 */
function noReading(state: State, what: string): string {
  return state === 'skipped'
    ? `No transcription: this batch is declared to hold nothing to transcribe. ${what} listed in ${SITE_TITLE}`
    : `Not transcribed; ${what.toLowerCase()} listed in ${SITE_TITLE}`;
}

export interface Access {
  /** Overridable so a test, or a rebuild, is not at the mercy of the clock. */
  accessed?: string;
}

export interface SheetCite extends Access {
  ledger: Ledger;
  sheet: Sheet;
  batch: number;
  state: State;
  pass?: Pass | null;
  /**
   * Whether a transcription exists for the batch — the same fact `batchState`
   * reads off the manifest. Kept separate from `state`, because a batch may be
   * declared `skipped` and a sheet may be listed with nothing read.
   */
  transcribed: boolean;
}

/** `#book-iv/2/18297` — the batch, scrolled to the sheet. */
export const sheetHref = (ledger: string, batch: number, ref: number) =>
  `${SITE}/${ledger}/#${ledger}/${batch}/${ref}`;

/** `#book-ii/leaf-33` — the leaf, wherever it falls, resolved on arrival. */
export const leafHref = (ledger: string, leaf: number) =>
  `${SITE}/${ledger}/#${ledger}/leaf-${leaf}`;

/** `#book-iv/2` — the batch as a whole. */
export const batchHref = (ledger: string, batch: number) =>
  `${SITE}/${ledger}/#${ledger}/${batch}`;

/**
 * One sheet — one photograph, and the smallest thing the archive names.
 *
 * This is the form to use by default. A sheet is the only unit that is
 * unambiguous in every direction: a leaf may be two photographs, a batch is
 * this project's unit of work and not the book's, and only the ref addresses
 * exactly one image at the museum.
 */
export function citeSheet({
  ledger,
  sheet,
  batch,
  state,
  pass,
  transcribed,
  accessed,
}: SheetCite): string {
  const head = object(ledger, `${leafName(sheet.leaf)} (ref ${sheet.ref})`);
  const read = reading(state, pass, transcribed);
  const tail = read
    ? `${SITE_TITLE}, ${batchName(batch)}, ${read}`
    : noReading(state, 'Sheet');
  return `${head} ${tail}, ${sheetHref(ledger.id, batch, sheet.ref)} (accessed ${
    accessed ?? today()
  }).`;
}

export interface LeafCite extends Access {
  ledger: Ledger;
  leaf: number;
  /** Every photograph of this leaf, in binding order. Usually one. */
  refs: number[];
  batch: number;
  state: State;
  pass?: Pass | null;
  /**
   * Whether a transcription exists for the batch — the same fact `batchState`
   * reads off the manifest. Kept separate from `state`, because a batch may be
   * declared `skipped` and a sheet may be listed with nothing read.
   */
  transcribed: boolean;
}

/**
 * One leaf — the page of the book, as the Hoppers numbered it.
 *
 * Worth a form of its own because a leaf is what a reader of the *book* saw,
 * and because the Whitney photographed several hinged leaves twice: Book II's
 * leaf 33 is two sheets, and a citation of « leaf 33 » that named one of them
 * would be quietly choosing. Both refs are printed, in binding order, and the
 * link is the `leaf-` form, which resolves on arrival and keeps working if the
 * batching ever changes.
 *
 * A sheet nobody numbered cannot be cited this way — there is nothing to name
 * it by — and `citeSheet` is the form for it.
 */
export function citeLeaf({
  ledger,
  leaf,
  refs,
  batch,
  state,
  pass,
  transcribed,
  accessed,
}: LeafCite): string {
  const which = refs.length > 1 ? `refs ${refs.join(', ')}` : `ref ${refs[0]}`;
  const head = object(ledger, `leaf ${leaf} (${which})`);
  const read = reading(state, pass, transcribed);
  const tail = read
    ? `${SITE_TITLE}, ${batchName(batch)}, ${read}`
    : noReading(state, 'Leaf');
  return `${head} ${tail}, ${leafHref(ledger.id, leaf)} (accessed ${accessed ?? today()}).`;
}

export interface BatchCite extends Access {
  ledger: Ledger;
  batch: number;
  /** The whole ledger, for the batch's extent. */
  all: Sheet[];
  state: State;
  pass?: Pass | null;
  /**
   * Whether a transcription exists for the batch — the same fact `batchState`
   * reads off the manifest. Kept separate from `state`, because a batch may be
   * declared `skipped` and a sheet may be listed with nothing read.
   */
  transcribed: boolean;
}

/**
 * One batch — twelve sheets, and the unit in which this site does its work.
 *
 * The form to cite when what is being cited is the *transcription*: a file, an
 * apparatus, a header note, a decision about how something was read. It names
 * the sheets and the leaves it covers, because a batch number is ours and
 * means nothing to anyone holding the book.
 */
export function citeBatch({ ledger, batch, all, state, pass, transcribed, accessed }: BatchCite): string {
  const { first, last } = batchRange(batch, all.length);
  const ls = all
    .slice(first - 1, last)
    .map((s) => s.leaf)
    .filter((n): n is number => n !== null);
  const leaves = ls.length
    ? `, ${
        Math.min(...ls) === Math.max(...ls)
          ? `leaf ${Math.min(...ls)}`
          : `leaves ${Math.min(...ls)}–${Math.max(...ls)}`
      }`
    : '';
  const head = object(ledger, `${batchName(batch)} (sheets ${first}–${last}${leaves})`);
  const read = reading(state, pass, transcribed);
  const tail = read ? `${SITE_TITLE}, ${read}` : noReading(state, 'Batch');
  return `${head} ${tail}, ${batchHref(ledger.id, batch)} (accessed ${accessed ?? today()}).`;
}
