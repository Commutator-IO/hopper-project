/**
 * A *ledger* — one of the six books the Hoppers kept, as the Whitney holds it.
 *
 * Edward Hopper drew every finished work he meant to sell into an ordinary
 * ledger book from Woolworth's; Josephine Nivison Hopper wrote the rest — the
 * date of completion, the description, the price, the buyer, the exhibitions
 * it went to and what came back. Six such books survive, accessioned 96.208 to
 * 96.213, and this is the archive's own unit of classification.
 */
export interface Ledger {
  /** `book-i` … `dealers` — this site's slug, and the URL. */
  id: LedgerKey;
  /** ResourceSpace's featured-collection id, which the harvest file is named after. */
  collection: number;
  title: string;
  /** For the header and the cards, where the full title will not fit. */
  short: string;
  /** The Whitney's accession number for the physical volume. */
  objectNumber: string;
  /** The span the Whitney records for the book, verbatim. */
  date: string;
  medium: string;
  extendedMedium: string;
  dimensions: string;
  credit: string;
  /**
   * Its descriptors name works **without quotation marks**, so `Sheet.quoted`
   * is empty or misleading for this book. See `scripts/catalogue.mjs`.
   */
  quotedBare?: boolean;
  sheets: number;
}

export type LedgerKey = 'book-i' | 'book-ii' | 'book-iii' | 'book-iv' | 'book-v' | 'dealers';

/**
 * A *sheet* — one digitised image, which is the smallest thing the archive
 * names and therefore the smallest thing this site can point at.
 *
 * A sheet is not a leaf and not an opening. The Whitney photographed rectos,
 * versos, the odd opening whole, the loose sheets tucked between leaves and
 * the envelope Book IV arrived in; each got its own resource. So the sequence
 * of sheets is the sequence of photographs, and it is the only numbering every
 * item in the book possesses.
 */
export interface Sheet {
  /** ResourceSpace's resource id. Stable, and the whole address of the image. */
  ref: number;
  ledger: LedgerKey;
  /** Position in the digitised book, 1-based. Every sheet has one. */
  seq: number;
  /**
   * The number written on the paper, where the Whitney's descriptor gives one.
   *
   * `null` for a cover, a flyleaf, an index, a loose insertion — about one
   * sheet in nine. That is not a defect in the record: those leaves carry no
   * number because nobody wrote one on them.
   */
  leaf: number | null;
  /** The second leaf, when one photograph caught an opening (`Page 58, Page 59`). */
  spread: number | null;
  kind: SheetKind;
  /**
   * The words the Whitney's descriptor puts in quotation marks — taken from
   * the sheet itself.
   *
   * A work's title, a column heading, or the first line of an account entry,
   * and **the listing does not say which**. Never render these as titles.
   */
  quoted: string[];
  /** The Whitney's File or Component Descriptor, verbatim and unshortened. */
  descriptor: string;
}

export type SheetKind = 'cover' | 'front-matter' | 'leaf' | 'verso' | 'inserted';

/**
 * A *book* — this site's unit of reading, which is not the archive's.
 *
 * The archive files by volume, and a volume is not a subject. What a reader
 * wants is a run: the etchings and their exhibition histories, the oils of the
 * late thirties, the money coming in month by month from 1913 to 1967. Some of
 * those runs are a whole ledger and some cut across one. A book names the run
 * and says where the grouping came from — `archiveUnit` points at the ledger
 * when the two coincide, and is `null` when the grouping is ours.
 *
 * Saying which is not politeness. Citing "the Etchings notebook" does not
 * commit you to the same thing as citing 96.208, and a reader must be able to
 * tell the two apart without opening the code.
 */
export interface Book {
  key: BookKey;
  path: string;
  title: string;
  /** A shorter label for the header row, which is tight at `lg`. Falls back to `title`. */
  navTitle?: string;
  /** One line: what this book holds, and why these sheets. */
  subtitle: string;
  period: string;
  /** The ledger this book reproduces exactly, or `null` where the grouping is ours. */
  archiveUnit: LedgerKey | null;
  /** What was kept and on whose authority — printed at the head of the page. */
  rationale: string;
  /**
   * This book is the one being worked through now.
   *
   * Not a claim that any sheet of it is transcribed — that is read off the
   * files. The weaker and still useful fact that it is spoken for, so the
   * whole-archive figure does not paint it the colour of the four hundred
   * sheets nobody has opened.
   */
  inProgress?: boolean;
  sections: BookSection[];
}

export interface BookSection {
  title: string;
  /** What this section holds, and what to know before entering it. */
  intro: string;
  /** Resource refs, in reading order. */
  sheets: number[];
}

export type BookKey =
  | 'etchings'
  | 'paintings'
  | 'late-work'
  | 'accounts'
  | 'dealers'
  | 'apparatus';

/**
 * Which register a transcript is written in.
 *
 * Two, and the order is the order of distance from the sheet.
 *
 * `en` is what is on the paper — Jo Hopper's words, her spelling, her columns,
 * with the critical apparatus saying what was read and what was not.
 *
 * `rec` is the *record edition*: the same sheet restated as the thing a ledger
 * exists to be, a set of records — one per work, per payment, per exhibition —
 * in current cataloguing vocabulary, opening with a summary for someone who
 * has not met the material. It works from the transcription and never from the
 * photograph, because two independent readings of the same hand would diverge
 * and nothing would say which was right.
 *
 * Both are in English. The Hoppers wrote English; there is no second language
 * here to keep in step, which is one fewer artifact than the Grothendieck
 * project this method comes from has to maintain.
 */
export type Edition = 'en' | 'rec';

/** Everything present locally, written by `npm run manifest`. */
export interface Manifest {
  /** Sheets per batch. Twelve — see `src/lib/batches.ts` for why that number. */
  batchSize: number;
  generated: string;
  /** Transcript artifacts under `public/transcripts/`, keyed `<ledger>#<batch>`. */
  transcripts: Record<string, TranscriptEntry>;
  /**
   * Artifacts whose unit is the ledger rather than the batch, keyed by ledger.
   *
   * The record edition sometimes takes a whole book: Book IV is one continuous
   * account from 1913 to 1967 and its running totals cross every batch
   * boundary, so a record edition cut at sheet 12 would report balances that
   * are true of nothing.
   */
  ledgers?: Record<string, TranscriptEntry>;
  /**
   * States no file can prove, from `transcripts/status.json`.
   *
   * Keyed `<ledger>#<batch>`. Only the three: `running`, `checked`, `skipped`.
   * Everything else is read off the files themselves.
   */
  declared: Record<string, 'running' | 'checked' | 'skipped'>;
  /**
   * Subject tags per ledger, extracted from the `\keywords{}` line closing each
   * record edition's summary.
   *
   * There is deliberately no tags file. A tag has exactly one source — a
   * summary somebody wrote after reading the sheets — so no tag can ever
   * describe material nobody has read.
   */
  tags?: Record<string, string[]>;
  /**
   * Sheets actually transcribed per ledger, counted from the `\sheet{}` marks.
   *
   * At most the ledger's sheet count and usually below it: a blank leaf, or a
   * cover, is skipped, and the gap in the sequence is the only record that it
   * was.
   */
  read?: Record<string, number>;
  /**
   * Work records extracted from the transcriptions by `npm run records`, per
   * ledger. The count, not the records — the records themselves are the CSV
   * and the JSON-LD, which are large and are downloads rather than page data.
   */
  records?: Record<string, number>;
}

/** Keyed by `<ledger>#<batch>`. */
export interface TranscriptEntry {
  /** Editions with a rendered HTML reading view. */
  html: Edition[];
  /** Editions with a downloadable LaTeX source. */
  tex: Edition[];
  /** Editions with a compiled PDF. */
  pdf: Edition[];
  /** Editions with a TEI P5 export, derived from the `.tex` by `npm run tei`. */
  xml?: Edition[];
}

/**
 * One work record, as `npm run records` extracts it from a transcription.
 *
 * This is the shape the ledger was always in — Jo Hopper ruled the columns
 * herself — and the whole reason a ledger repays transcription differently
 * from a manuscript: the text is already a table, and a table can be searched,
 * summed and joined to a catalogue raisonné, which prose cannot.
 *
 * Every field is **null when the sheet does not carry it**, and no field is
 * ever completed from knowledge of Hopper. A record whose price came from a
 * scholar's memory rather than from the page would be indistinguishable from
 * one that was read, which is the failure this whole apparatus exists to
 * prevent.
 */
export interface WorkRecord {
  /** `book-i#2#1` — ledger, leaf, and position on the leaf. */
  id: string;
  ledger: LedgerKey;
  /** The sheet the record was read from, so it can be checked in one click. */
  ref: number;
  /** The leaf number written on the paper, where there is one. */
  leaf: number | null;
  /** The work's title, exactly as the page gives it — spelling included. */
  title: string | null;
  /** The medium as the page words it: « Oils », « Watercolor », « Etching ». */
  medium: string | null;
  /** Dimensions as written — `7 × 8 3/8"`, unconverted. */
  size: string | null;
  /** The date the page gives, unnormalised. « Fall 1923 » stays « Fall 1923 ». */
  date: string | null;
  /** Price as written, dollar sign and all. Never converted, never adjusted. */
  price: string | null;
  /** Who bought it, as named on the page. */
  buyer: string | null;
  /** The dealer taking the commission, where the page separates the two. */
  dealer: string | null;
  /** Whether the sheet carries Edward Hopper's ink sketch of this work. */
  sketch: boolean;
  /** The transcriber's note, where the record needed one. */
  note: string | null;
  /**
   * Certainty of the whole record.
   *
   * `read` every field came off the page · `partial` at least one field was
   * illegible and is null · `uncertain` at least one field is a doubtful
   * reading. Sorting on this is how a user finds what needs a second pair of
   * eyes.
   */
  certainty: 'read' | 'partial' | 'uncertain';
}

/**
 * A candidate finding: something a sheet establishes that may not stand in the
 * published literature on Hopper.
 *
 * The shape's whole point is that a finding is a claim about **the
 * literature**, never about Hopper. The ledger can be read; the literature can
 * only be searched, and never exhausted. So every entry carries what was
 * searched and how far it got, and none of them may say who was first.
 *
 * Gail Levin's catalogue raisonné and her biography worked from these very
 * books, so the prior here is strong and stated: most of what a first pass
 * finds surprising is in Levin already, and an entry that has not been checked
 * against her says `unsearched` rather than implying otherwise.
 *
 * `ours` is the field that keeps the edition honest. The record edition
 * normalises what the page leaves loose and joins entries the page keeps
 * apart; where it did, the finding is partly ours and not the ledger's, and
 * hiding that would be claiming a finding for a line nobody wrote.
 */
export interface Finding {
  id: string;
  ledger: LedgerKey;
  /** The sheets the claim rests on, by resource ref. */
  refs: number[];
  /** The leaves as the Hoppers numbered them, for citation. */
  leaves: string;
  /**
   * `documentary` claims are about the literature and carry the real risk;
   * `codicological` ones are about these six objects — a leaf bound out of
   * order, an entry continued in another book — and can be settled by looking.
   */
  kind: 'documentary' | 'codicological';
  /** One sentence: what the sheets establish. */
  claim: string;
  /** What on the sheets supports it. */
  basis: string;
  /** What the edition supplied rather than the page — null when the page carries it alone. */
  ours: string | null;
  /** Sources actually consulted, by name and section. Empty means nobody looked. */
  literature: string[];
  /**
   * `unsearched` nobody looked it up · `candidate` searched, not found ·
   * `matched` found in the literature, kept as a killed candidate ·
   * `confirmed` a person checked it. Only a person may set the last.
   */
  status: 'unsearched' | 'candidate' | 'matched' | 'confirmed';
  /** The one check that would decide it. */
  settle: string;
}
