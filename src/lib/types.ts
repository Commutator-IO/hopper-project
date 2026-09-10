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
  /** The Whitney's own catalogue record for the volume, on whitney.org. */
  whitneyWork: number;
  /** What this volume is, in a paragraph — written from its own sheets. */
  about: string;
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
  /**
   * The years the sheet's own descriptor names, before its first bracket.
   *
   * Almost always empty, and Book IV is why it is not always: that volume is a
   * running account, so the Whitney dated its leaves. Nothing else in the
   * archive is dated at the sheet, and an empty list is the honest answer
   * rather than the volume's range copied onto every leaf of it.
   */
  years: number[];
  /** The Whitney's File or Component Descriptor, verbatim and unshortened. */
  descriptor: string;
}

export type SheetKind = 'cover' | 'front-matter' | 'leaf' | 'verso' | 'inserted';

/**
 * A *notebook* of Josephine Nivison Hopper's — one of the ninety in the
 * Sanborn Hopper Archive at the Whitney, of which four are digitised so far,
 * as Subseries A of Series IV of that archive.
 *
 * Not a ledger and not filed as one: the title is hers, as written on the
 * cover or the first page, the date is the Whitney's « recorded date », and
 * the scope note is the Whitney's. Nothing in it has been transcribed here.
 */
export interface Notebook {
  /** This site's slug, under `/diaries/`. */
  id: NotebookKey;
  /** ResourceSpace's featured-collection id, which the harvest file is named after. */
  collection: number;
  /** Her title, as the Whitney gives it; brackets are the cataloguer's. */
  title: string;
  /** For the header tab. */
  short: string;
  /** The Whitney's recorded date, verbatim. */
  date: string;
  /** The years that date spans, for the coverage mark. */
  years: [number, number];
  /** The Sanborn Hopper Archive number, where the Whitney's caption gives it. */
  archiveNumber: string | null;
  /** The Whitney's scope and contents note, verbatim. */
  scope: string;
  sheets: number;
}

export type NotebookKey = 'garrulities' | 'three-wash-sq' | 'battle-of-wash-sq' | 'black-notebook';

/** One digitised image of a notebook — the same unit as a ledger's `Sheet`. */
export interface NotebookSheet {
  ref: number;
  notebook: NotebookKey;
  seq: number;
  /** The first page the descriptor names, or null for a cover. */
  leaf: number | null;
  /** The second page, where the photograph took an opening (« Pages 2-3 »). */
  spread: number | null;
  kind: SheetKind;
  descriptor: string;
}

/**
 * There is **one** edition here, and that is the interesting difference.
 *
 * The Grothendieck workbench this method comes from carries two: the
 * transcription, and a modernised reading that restates the mathematics in
 * current notation. The second exists because a page of 1962 mathematics is
 * genuinely hard to read in 1962's notation, and the restatement is real work.
 *
 * A ledger needs no such pass. Jo Hopper's English is plain, her columns are
 * already a table, and « 30 - 1/3 » means today exactly what it meant in 1927.
 * A second edition here would have been a second artifact to keep in step,
 * paying for itself in nothing. So the transcription is the edition, the
 * `\keywords{}` line that tags a ledger lives in it, and a file is
 * `batch-NN.tex` with no register in its name.
 */
export const EDITIONS_NOTE =
  'One edition. See the comment above; there is no type here because there is ' +
  'nothing to choose between.';

/** Everything present locally, written by `npm run manifest`. */
/** One subject tag, with the facet it declared and the batches it came from. */
export interface Tag {
  tag: string;
  facet: Facet | null;
  batches: number[];
}

/**
 * The facets a keyword may declare, in the order the ledger page shows them:
 * what the work is, where it was made, who handled it, who bought it, where it
 * ended up, and what the leaves do as documents.
 *
 * Kept in step with `FACETS` in `scripts/lib/ledger.mjs`, which is what the
 * manifest is built against.
 */
export type Facet =
  | 'medium'
  | 'place'
  | 'work'
  | 'person'
  | 'dealer'
  | 'collection'
  | 'society'
  | 'publication'
  | 'prize'
  | 'feature';

export interface Manifest {
  /** Sheets per batch. Twelve — see `src/lib/batches.ts` for why that number. */
  batchSize: number;
  generated: string;
  /** Transcript artifacts under `public/transcripts/`, keyed `<ledger>#<batch>`. */
  transcripts: Record<string, TranscriptEntry>;
  /**
   * States no file can prove, from `transcripts/status.json`.
   *
   * Keyed `<ledger>#<batch>`. Only the two: `checked`, `skipped`.
   * Everything else is read off the files themselves.
   */
  declared: Record<string, 'checked' | 'skipped'>;
  /**
   * Subject tags per ledger, from the `\keywords{}` line each transcription
   * carries.
   *
   * There is deliberately no tags file. A tag has exactly one source — a line
   * somebody wrote after reading the sheets — so no tag can ever describe
   * material nobody has read.
   *
   * Each tag names the batches it was written in, which is what makes it
   * usable: without them a tag asserts only that it applies somewhere in a
   * volume of seventy-two sheets, of which twelve may be read, and a reader
   * clicking it has nowhere to go. `facet` is declared in the transcription
   * and is `null` where the reading did not settle what a name was.
   */
  tags?: Record<string, Tag[]>;
  /**
   * Sheets actually transcribed per ledger, counted from the `\sheet{}` marks.
   *
   * At most the ledger's sheet count and usually below it: a blank leaf, or a
   * cover, is skipped, and the gap in the sequence is the only record that it
   * was.
   */
  read?: Record<string, number>;
  /**
   * A census of the apparatus per ledger, counted from the `.tex` sources.
   *
   * Here so that the schema page can argue from figures rather than assert
   * them. A count typed into prose is wrong the day the next batch lands and
   * goes on looking authoritative; this one moves with the corpus.
   */
  apparatus?: Record<string, Apparatus>;
}

/** What one ledger's transcriptions are made of. Counts exclude comment lines. */
export interface Apparatus {
  /** Occurrences of each editorial macro — `ill`, `uncertain`, `struck`, … */
  macros: Record<string, number>;
  /** Passages attributed to each hand. */
  hands: Record<string, number>;
  /** `ledgertable` environments — one per ruled block on a leaf. */
  tables: number;
  /** Rows inside those tables, and only inside them. */
  rows: number;
}

/** Which artifacts exist for a batch. Keyed `<ledger>#<batch>`. */
export interface TranscriptEntry {
  html: boolean;
  /** The LaTeX source — the only thing versioned; everything else is derived. */
  tex: boolean;
  pdf: boolean;
  /** The TEI P5 export, derived from the `.tex` by `npm run tei`. */
  xml: boolean;
  /**
   * Which model read the sheets, and when — off the `.tex` header's own
   * `% Pass:` line, the same line the TEI `<respStmt>` carries.
   *
   * It is in the manifest so that a citation can name it. A citation of this
   * site cites a reading rather than a fact, and a reading that cannot be
   * dated cannot be superseded: « the site says X » stays true forever and is
   * therefore worth nothing. `null` where the header does not parse, which the
   * citation reports rather than papers over.
   */
  pass?: Pass | null;
}

/** The model that read a batch's sheets, and the day it did. */
export interface Pass {
  /** The model's public name — « Opus 5 ». */
  model: string;
  /** Its exact identifier — « claude-opus-5 ». */
  id: string;
  /** ISO `YYYY-MM-DD`. */
  date: string;
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
 * `ours` is the field that keeps the edition honest. A transcription joins
 * what the leaves keep apart — an entry continued three leaves on, a title
 * taken from an index — and where it did, the finding is partly ours and not
 * the ledger's. Hiding that would be claiming a finding for a line nobody
 * wrote.
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
