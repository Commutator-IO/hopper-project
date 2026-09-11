#!/usr/bin/env node
/**
 * The six ledgers, read back out of `harvest/` into typed data.
 *
 * `src/content/catalogue.ts` is generated and never hand-edited. The point of
 * generating it is that the Whitney's own descriptors survive unaltered: the
 * temptation, once a listing is in TypeScript, is to tidy « Page 62
 * [horizontal orientation, "Fall 1927..."] » into something shorter, and the
 * tidying would quietly delete the fact that the sheet is turned on its side.
 *
 * What this script *does* infer is one thing, and it is inferred out loud: the
 * leaf number the Hoppers themselves wrote on the paper, parsed out of the
 * descriptor. `Page 2 ["Evening Wind"]` yields leaf 2; `Front cover` yields
 * none, and none is the honest answer. See `leaf` below for the whole of it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

/**
 * The six ledgers, in the Whitney's own order, with the accession record for
 * each read off ResourceSpace's resource view on 5 September 2026.
 *
 * `collection` is ResourceSpace's featured-collection id, which is what the
 * harvest file is named after and the only durable handle on a book: the
 * resource refs inside are per-sheet and the Whitney's own object number
 * (96.208 …) names the physical volume rather than the digitisation.
 */
const LEDGERS = [
  {
    id: 'book-i',
    about:
      "The etchings, one plate to a leaf, and then the running lists that grew behind them. Leaves 2 to 44 record the prints — a halftone of the plate hinged at the head, Edward Hopper's title and plate size in drawn lettering, and beneath them thirty or forty ruled lines in Jo Hopper's hand running from the first jury of 1921 into the 1960s. From leaf 45 the book changes character: notes and explanations, one-man shows, the oils and Paris watercolours by year, six leaves of current exhibitions, reviews and reproductions cross-referenced in both directions, photographs, prizes, gifts, and a chronology on the back flyleaf.",
    whitneyWork: 11014,
    collection: 1052,
    title: 'Artist’s ledger — Book I',
    short: 'Book I',
    objectNumber: '96.208',
    date: '1913–1963',
    medium: 'Pen and ink, graphite pencil, and colored pencil on paper',
    extendedMedium:
      'Pen and brown, blue and black inks, graphite pencil and colored pencil on paper',
    dimensions: 'Book: 12 1/4 × 7 1/2 × 1/2 in. (31.1 × 19.1 × 1.3 cm)',
    credit: 'Gift of Lloyd Goodrich',
  },
  {
    id: 'book-ii',
    about:
      "The paintings, one to an opening: Edward Hopper's ink record sketch of the finished canvas, and opposite it Jo Hopper's description — often several sentences of anecdote about people he would not discuss — with the size, the date, the price and the buyer. The Whitney's descriptors for this volume name the work without quotation marks, which is why its sheet captions carry no quoted line.",
    whitneyWork: 11015,
    collection: 1064,
    title: 'Artist’s ledger — Book II',
    short: 'Book II',
    objectNumber: '96.209',
    date: '1907–1962',
    medium: 'Ledger book with pen and ink and graphite pencil on paper',
    extendedMedium: 'Pen, blue and black ink, graphite pencil and collage on paper',
    dimensions:
      'Overall (closed): 11 13/16 × 7 1/2 × 1/2 in. (30 × 19.1 × 1.3 cm)',
    credit: 'Gift of Lloyd Goodrich',
    // Its descriptors name the work bare — `Cape Cod Evening [p. 31]` — where
    // every other book quotes it. Nothing here parses that, so this book
    // yields no `quoted` at all, and the pages say so rather than showing 72
    // blank fields as though the sheets were untitled.
    quotedBare: true,
  },
  {
    id: 'book-iii',
    about:
      "The last of the three work books, and the one that runs to Hopper's death. Fifteen leaves of running lists stand at the front rather than the back — Whereabouts, Prizes and Museum Purchases, eight leaves of Reviews and Reproductions, Gifts, One Man Shows — then the works from Hotel Lobby to Sun in an Empty Room, then watercolours from Mexico, Wyoming and Cape Cod, and at the tail two more Whereabouts leaves and five of Memoranda. This is the latest hand in the archive.",
    whitneyWork: 9022,
    collection: 1085,
    title: 'Artist’s ledger — Book III',
    short: 'Book III',
    objectNumber: '96.210',
    date: '1924–1967',
    medium: 'Pen and ink, graphite pencil, and colored pencil on paper',
    extendedMedium:
      'Pen and black ink, graphite pencil, colored pencil and collage on paper',
    dimensions: 'Book: 12 3/16 × 7 5/8 × 3/4 in. (31 × 19.4 × 1.9 cm)',
    credit: 'Gift of Lloyd Goodrich',
    // Like Book II: `Hotel Lobby [p. 1]`, the work named without quotation
    // marks. What this book *does* quote is its running heads — « Wherebouts »,
    // « Prizes and Museum Purchases » — so `quoted` is not empty here, and is
    // all the more misleading if read as a list of works.
    quotedBare: true,
  },
  {
    id: 'book-iv',
    about:
      "A pocket book, 7½ by 4¾ inches, the smallest of the six and by some distance the most continuous. No sketches and no anecdote: one column of dates, one of payers and one of sums, kept without a gap from 15 November 1913 to 23 March 1967. The early leaves are all illustration work — Adventure, Everybody's, the Wells Fargo Messenger, Morse Dry Dock — which is the part of Hopper's working life the paintings books do not record at all. It is the only volume the Whitney dated leaf by leaf, so its sheets carry years.",
    whitneyWork: 11016,
    collection: 1097,
    title: 'Artist’s ledger — Book IV',
    short: 'Book IV',
    objectNumber: '96.211',
    date: '1913–1967',
    medium: 'Pen and ink and graphite pencil on paper',
    extendedMedium: 'Pen and colored ink and graphite pencil on paper',
    dimensions: 'Book: 7 1/2 × 4 3/4 × 3/4 in. (19.1 × 12.1 × 1.9 cm)',
    credit: 'Purchase',
  },
  {
    id: 'book-v',
    about:
      "Sixteen sheets, the smallest set in the archive and among the latest: an index by letter, a page of loans, a dozen leaves of drawings, and three leaves of receipts from the Rehn Gallery for the etchings sold in October 1953.",
    whitneyWork: 11017,
    collection: 1111,
    title: 'Artist’s ledger — Book V',
    short: 'Book V',
    objectNumber: '96.212',
    date: '1953–1963',
    medium: 'Pen and ink and graphite pencil on paper',
    extendedMedium: 'Pen and black ink and graphite pencil on paper',
    dimensions: 'Book: 12 3/16 × 7 1/2 × 3/8 in. (31 × 19.1 × 1 cm)',
    credit: 'Gift of Lloyd Goodrich',
  },
  {
    id: 'dealers',
    about:
      "Indexed by whose hands the work was in, not by which work it was. Keppel, Kraushaar, Kennedy, the Downtown Gallery, the Weyhe Book Shop, Vickery Atkins & Torrey each get a leaf, and the prints move down it. Its leaves are numbered from 51 — the volume was begun in the middle of a book already partly used — and two of them are written across the page rather than down it, and were photographed turned.",
    whitneyWork: 11018,
    collection: 1112,
    title: 'Artist’s ledger — Dealers/Etchings',
    short: 'Dealers/Etchings',
    objectNumber: '96.213',
    date: '1921–1951',
    medium: 'Pen and ink and graphite pencil on paper',
    extendedMedium: 'Pen and black ink and graphite pencil on paper',
    dimensions: 'Book: 11 3/4 × 7 1/2 × 1/4 in. (29.8 × 19.1 × 0.6 cm)',
    credit: 'Purchase, with funds from an anonymous donor',
  },
];

/**
 * The leaf number the Hoppers wrote on the paper, where the descriptor gives
 * one.
 *
 * Three shapes occur across the six books and all three are the Whitney's, not
 * ours: `Page 2 [...]`, `Hotel Lobby [p. 1]`, and the odd `[p/ 46]` where the
 * cataloguer's finger slipped. A sheet with no leaf number — a cover, a
 * flyleaf, a loose sheet tucked between two leaves — gets `null`, which is the
 * true answer and the one the reading view prints as « unnumbered ».
 *
 * A descriptor naming two leaves (`Page 58, Page 59 [...]`) is an opening
 * photographed whole; the first number is taken, and `spread` records that
 * there was a second. Taking the average, or inventing `58.5`, would produce a
 * number that is on no page of the book.
 */
function leaf(descriptor) {
  const spread = /^Pages?\s+(\d+),\s*Pages?\s+(\d+)/i.exec(descriptor);
  if (spread) return { leaf: Number(spread[1]), spread: Number(spread[2]) };
  // The notebooks' shape for an opening: « Pages 2-3 ».
  const opening = /^Pages\s+(\d+)\s*-\s*(\d+)\s*$/i.exec(descriptor);
  if (opening) return { leaf: Number(opening[1]), spread: Number(opening[2]) };
  const plain = /^Pages?\s+(\d+)/i.exec(descriptor);
  if (plain) return { leaf: Number(plain[1]), spread: null };
  const bracketed = /\[\s*p[./]\s*(\d+)/i.exec(descriptor);
  if (bracketed) return { leaf: Number(bracketed[1]), spread: null };
  const bracketedLate = /\[[^\]]*,\s*p\.\s*(\d+)\s*\]/i.exec(descriptor);
  if (bracketedLate) return { leaf: Number(bracketedLate[1]), spread: null };
  return { leaf: null, spread: null };
}

/**
 * The leaf number stamped on the paper, where a transcriber has read it off
 * the photograph and it disagrees with the Whitney's descriptor.
 *
 * This is the second thing inferred here, and like `leaf` it is inferred out
 * loud. Garrulities is why it exists. Its descriptors run `Pages 2-3`,
 * `Pages 4-5` … `Pages 76-77`, `Page 78` — an unbroken arithmetic sequence —
 * but the opening 66-67 was never photographed, so from ref 96247 on every
 * descriptor names two pages fewer than the leaf it shows. The last sheet
 * settles it: the descriptor says `Page 78` and the leaf is stamped **108**,
 * which no off-by-one could produce. The numbers were assigned by position in
 * the collection, not read off the paper.
 *
 * So the descriptor stays exactly as the Whitney wrote it — it is still what
 * the site prints beside the sheet — and `leaf` becomes the number a citation
 * can use, which is the one on the page. `spread` follows it.
 *
 * **A ref goes in here only when somebody has read the stamped number off the
 * photograph and said so in the transcription.** Nothing is extrapolated: the
 * seven refs below were each checked against the blue stamped numerals on
 * 11 September 2026, and the unphotographed opening is recorded in a
 * `\note{}` at page 68 of `transcripts/notebooks/garrulities.tex`.
 */
const STAMPED = new Map([
  // ref      leaf  spread   descriptor says
  [96247, { leaf: 68, spread: 69 }], //  Pages 66-67
  [96268, { leaf: 70, spread: 71 }], //  Pages 68-69
  [96115, { leaf: 72, spread: 73 }], //  Pages 70-71
  [97142, { leaf: 74, spread: 75 }], //  Pages 72-73
  [97417, { leaf: 76, spread: 77 }], //  Pages 74-75
  [96074, { leaf: 78, spread: 79 }], //  Pages 76-77
  [97182, { leaf: 108, spread: null }], //  Page 78
]);

/**
 * `leaf()`, then the stamped number where one has been read.
 *
 * `restamped` travels with the sheet so the reading view can say why the
 * number on its strip and the descriptor under the photograph disagree. A
 * reader who sees « leaf 68 » beside « Pages 66-67 » and is told nothing will
 * read it as a bug in the site, which is the one outcome worse than the
 * Whitney's own slip.
 */
function stamped(ref, descriptor) {
  const s = STAMPED.get(ref);
  return s ? { ...s, restamped: true } : { ...leaf(descriptor), restamped: false };
}

/**
 * Whether the sheet is the back of a leaf, or something loose laid inside it.
 *
 * Both are the Whitney's own words — `- Verso`, `Loose sheet between pages
 * 44-45`, `[Detached]`, `[hinged to p. 58]`, `[adhered to p. 69]`. They matter
 * because they are the one part of the material description that changes what
 * a reader is looking at: a verso carries the continuation of the entry
 * opposite, and a loose sheet is not part of the book's sequence at all.
 */
function kind(d) {
  if (/^(Front|Back) cover$/i.test(d) || /^Inside (front|back) cover$/i.test(d)) return 'cover';
  if (/-\s*Verso$/i.test(d) || /^Verso of/i.test(d)) return 'verso';
  if (/^Loose|^\[Detached\]|hinged to|adhered to|Envelope|chipboard/i.test(d)) return 'inserted';
  if (/^Title page|flyleaf|^Index|^Photograph Portrait/i.test(d)) return 'front-matter';
  return 'leaf';
}

/**
 * The words the Whitney's descriptor puts in quotation marks.
 *
 * They are quotation marks because they are quotations: the cataloguer is
 * reporting what the sheet itself says. What *kind* of thing it says varies,
 * and no listing can tell you which — `Page 2 ["Evening Wind"]` quotes a work's
 * title, `Page 49 ["One Man Shows or small groups..."]` quotes a column
 * heading, and Book IV's `[p. 127, "May 10 Frank K.M. Rehn..."]` quotes the
 * first line of an account entry. So the field is called `quoted` and means
 * only that. Calling it `titles` would have put « May 10 Frank K.M. Rehn… » on
 * a card as the name of a painting, and nothing downstream would have caught
 * it.
 *
 * Book II is why there is no cleverer rule. Its descriptors give work titles
 * **bare** — `Cape Cod Evening [p. 31]` — with no quotation marks at all, so
 * this yields nothing for 72 sheets. Extending the rule to catch them would
 * mean deciding, unaided, where a title ends and a cataloguer's note begins;
 * `quotedBare` on the ledger records the situation instead, and the pages say
 * so where it shows.
 */
function quoted(d) {
  return [...d.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/**
 * The years a sheet's own descriptor names.
 *
 * Book IV is the reason this exists and is nearly the only book it applies to:
 * its descriptors open with the span the leaf covers — « 1924, January 18 -
 * March 4 [p. 67, …] » — because the volume is a running account and the
 * cataloguer had a date to give. Nothing else in the archive is dated at the
 * sheet, so for the other five books this is usually empty, and empty is the
 * honest answer rather than the volume's range copied down onto every leaf.
 *
 * Only years that appear **before the first bracket** are taken. A year inside
 * the quoted incipit is a date Jo Hopper wrote inside the entry, which is a
 * different claim from the leaf's own span, and mixing the two would put a
 * leaf under a year the cataloguer never assigned it.
 */
function years(descriptor) {
  const head = descriptor.split('[')[0];
  const span = /^(\d{4})\s*-\s*(\d{4})/.exec(head.trim());
  if (span) {
    const [a, b] = [Number(span[1]), Number(span[2])];
    return b >= a && b - a < 12 ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a, b];
  }
  const one = /^(\d{4})\b/.exec(head.trim());
  return one ? [Number(one[1])] : [];
}

const sheets = [];
for (const l of LEDGERS) {
  const file = resolve(root, 'harvest', `collection-${l.collection}.txt`);
  const lines = readFileSync(file, 'utf8').split('\n').filter((s) => s.trim());
  lines.forEach((line, i) => {
    const cut = line.indexOf('|');
    if (cut < 0) throw new Error(`${file}:${i + 1} — no “|” separator: ${line}`);
    const ref = Number(line.slice(0, cut));
    const descriptor = line.slice(cut + 1);
    if (!Number.isInteger(ref)) throw new Error(`${file}:${i + 1} — ref is not a number`);
    const { leaf: lf, spread, restamped } = stamped(ref, descriptor);
    sheets.push({
      ref,
      ledger: l.id,
      restamped,
      /** Position in the book, 1-based — the only numbering every sheet has. */
      seq: i + 1,
      descriptor,
      leaf: lf,
      spread,
      kind: kind(descriptor),
      quoted: quoted(descriptor),
      years: years(descriptor),
    });
  });
}

/**
 * Josephine Hopper's notebooks, as far as the Whitney has digitised them:
 * four of the ninety in the Sanborn Hopper Archive, Subseries A of Series IV,
 * each a ResourceSpace collection harvested exactly as a ledger is. The
 * title, the recorded date and the scope note are the Whitney's, verbatim;
 * the archive number is from the caption where the caption gives it.
 */
const NOTEBOOKS = [
  {
    id: 'garrulities',
    collection: 191099,
    title: 'Garrulities + Grouch',
    short: 'Garrulities',
    date: '1924-1950',
    years: [1924, 1950],
    archiveNumber: null,
    scope: 'Notebook subtitled "When artists meet." Journal notes by date.',
  },
  {
    id: 'three-wash-sq',
    collection: 191015,
    title: 'Re: 3 Wash Sq',
    short: '3 Wash Sq',
    date: '1947',
    years: [1947, 1947],
    archiveNumber: null,
    scope:
      'Notes and drafts of letters on the Washington Square and New York University issue. Sketch on back cover. Spiral bound at top of notebook. Inserts (lists of names) housed separately.',
  },
  {
    id: 'battle-of-wash-sq',
    collection: 153741,
    title: 'Battle of Wash Sq.',
    short: 'Battle of Wash Sq',
    date: '1947',
    years: [1947, 1947],
    archiveNumber: 'EJHA.1597',
    scope: 'Notes on Washington Square and New York University issue.',
  },
  {
    id: 'black-notebook',
    collection: 190654,
    title: '[Black two-ring notebook]',
    short: 'Black notebook',
    date: 'circa 1952-1961',
    years: [1952, 1961],
    archiveNumber: null,
    scope:
      'Various notes including works with dimensions, notes on travel and reading, lists of names. Inserts separated.',
  },
];

const notebookSheets = [];
for (const n of NOTEBOOKS) {
  const file = resolve(root, 'harvest', `collection-${n.collection}.txt`);
  const lines = readFileSync(file, 'utf8').split('\n').filter((s) => s.trim());
  lines.forEach((line, i) => {
    const cut = line.indexOf('|');
    if (cut < 0) throw new Error(`${file}:${i + 1} — no “|” separator: ${line}`);
    const ref = Number(line.slice(0, cut));
    const descriptor = line.slice(cut + 1).trim();
    if (!Number.isInteger(ref)) throw new Error(`${file}:${i + 1} — ref is not a number`);
    const { leaf: lf, spread, restamped } = stamped(ref, descriptor);
    notebookSheets.push({ ref, notebook: n.id, seq: i + 1, leaf: lf, spread, kind: kind(descriptor), descriptor, restamped });
  });
}

const dup = [...sheets, ...notebookSheets].map((s) => s.ref).filter((r, i, a) => a.indexOf(r) !== i);
if (dup.length) throw new Error(`Duplicate resource refs across the harvest: ${dup.join(', ')}`);

const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const out = `/**
 * GENERATED by \`npm run catalogue\` from \`harvest/\`. Do not edit.
 *
 * The Whitney's own listing of the six Hopper artist's ledgers — 504 digitised
 * sheets — with their descriptors verbatim. Everything derived from a
 * descriptor (the leaf number, the kind of sheet, the quoted words) is
 * computed in \`scripts/catalogue.mjs\`, where the rule that produced it can be
 * read and argued with.
 */
import type { Ledger, Notebook, NotebookSheet, Sheet } from '../lib/types.ts';

export const LEDGERS: Ledger[] = [
${LEDGERS.map(
  (l) => `  {
    id: ${q(l.id)},
    whitneyWork: ${l.whitneyWork},
    collection: ${l.collection},
    title: ${q(l.title)},
    short: ${q(l.short)},
    objectNumber: ${q(l.objectNumber)},
    date: ${q(l.date)},
    medium: ${q(l.medium)},
    extendedMedium: ${q(l.extendedMedium)},
    dimensions: ${q(l.dimensions)},
    credit: ${q(l.credit)},
    about: ${q(l.about)},${l.quotedBare ? '\n    quotedBare: true,' : ''}
    sheets: ${sheets.filter((s) => s.ledger === l.id).length},
  },`,
).join('\n')}
];

export const SHEETS: Sheet[] = [
${sheets
  .map(
    (s) =>
      `  { ref: ${s.ref}, ledger: ${q(s.ledger)}, seq: ${s.seq}, leaf: ${
        s.leaf === null ? 'null' : s.leaf
      }, spread: ${s.spread === null ? 'null' : s.spread}, kind: ${q(s.kind)}, quoted: [${s.quoted
        .map(q)
        .join(', ')}], years: [${s.years.join(', ')}], descriptor: ${q(s.descriptor)}${
        s.restamped ? ', restamped: true' : ''
      } },`,
  )
  .join('\n')}
];

export const BY_LEDGER = new Map<string, Sheet[]>(
  LEDGERS.map((l) => [l.id, SHEETS.filter((s) => s.ledger === l.id)]),
);

export const BY_REF = new Map<number, Sheet>(SHEETS.map((s) => [s.ref, s]));

export const LEDGER_BY_ID = new Map<string, Ledger>(LEDGERS.map((l) => [l.id, l]));

/** Josephine Hopper's notebooks, the four the Whitney has digitised. Not ledgers. */
export const NOTEBOOKS: Notebook[] = [
${NOTEBOOKS.map(
  (n) => `  {
    id: ${q(n.id)},
    collection: ${n.collection},
    title: ${q(n.title)},
    short: ${q(n.short)},
    date: ${q(n.date)},
    years: [${n.years.join(', ')}],
    archiveNumber: ${n.archiveNumber === null ? 'null' : q(n.archiveNumber)},
    scope: ${q(n.scope)},
    sheets: ${notebookSheets.filter((s) => s.notebook === n.id).length},
  },`,
).join('\n')}
];

export const NOTEBOOK_SHEETS: NotebookSheet[] = [
${notebookSheets
  .map(
    (s) =>
      `  { ref: ${s.ref}, notebook: ${q(s.notebook)}, seq: ${s.seq}, leaf: ${
        s.leaf === null ? 'null' : s.leaf
      }, spread: ${s.spread === null ? 'null' : s.spread}, kind: ${q(s.kind)}, descriptor: ${q(
        s.descriptor,
      )}${s.restamped ? ', restamped: true' : ''} },`,
  )
  .join('\n')}
];

export const BY_NOTEBOOK = new Map<string, NotebookSheet[]>(
  NOTEBOOKS.map((n) => [n.id, NOTEBOOK_SHEETS.filter((s) => s.notebook === n.id)]),
);

export const NOTEBOOK_BY_ID = new Map<string, Notebook>(NOTEBOOKS.map((n) => [n.id, n]));
`;

writeFileSync(resolve(root, 'src/content/catalogue.ts'), out);

const named = sheets.filter((s) => s.leaf !== null).length;
const dated = sheets.filter((s) => s.years.length).length;
process.stdout.write(
  `catalogue: ${LEDGERS.length} ledgers, ${sheets.length} sheets; ` +
    `${NOTEBOOKS.length} notebooks, ${notebookSheets.length} sheets\n` +
    `  with a leaf number written on the paper  ${named}\n` +
    `  unnumbered (covers, flyleaves, insertions) ${sheets.length - named}\n` +
    `  whose descriptor names a year             ${dated}\n`,
);
