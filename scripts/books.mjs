#!/usr/bin/env node
/**
 * Writes `src/content/books.json` — the six reading books.
 *
 * Only the *membership* is computed here, from spans of the digitised
 * sequence; the prose is written by hand below and is the interpretive part of
 * this repository. The reason membership is generated at all is that a section
 * of Book IV is 64 resource refs long, and a hand-kept list of 64 five-digit
 * numbers goes wrong silently — a transposed digit yields a sheet from another
 * book, and the page renders it without complaint.
 *
 * Re-run after `npm run catalogue`. The output is committed: what a book
 * contains is an editorial decision and belongs in a diff.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = readFileSync(resolve(root, 'src/content/catalogue.ts'), 'utf8');

const SHEETS = [
  ...src.matchAll(/\{ ref: (\d+), ledger: '([^']+)', seq: (\d+),/g),
].map((m) => ({ ref: Number(m[1]), ledger: m[2], seq: Number(m[3]) }));

if (SHEETS.length !== 504) throw new Error(`Expected 504 sheets, parsed ${SHEETS.length}`);

/** Refs of one ledger's sheets between two positions, inclusive. */
function span(ledger, first, last = Infinity) {
  const got = SHEETS.filter((s) => s.ledger === ledger && s.seq >= first && s.seq <= last);
  if (!got.length) throw new Error(`Empty span: ${ledger} ${first}–${last}`);
  return got.map((s) => s.ref);
}

const BOOKS = [
  {
    key: 'etchings',
    path: '/etchings/',
    title: 'The Etchings',
    subtitle:
      'Book I opened plate by plate — the sketch, then every exhibition the print went to and what it fetched',
    period: '1915 – 1928',
    archiveUnit: null,
    rationale:
      'The Whitney catalogues Book I as one object, 96.208, and it is two things: the first forty-odd leaves record the etchings one to a page, and everything after leaf 48 is a set of running lists that happen to be bound behind them. This book takes the first part only, and is therefore a grouping of ours. It is the place to start reading, for a reason that is about the object and not about Hopper: the etchings entries are the most completely filled-in pages in all six volumes. Hopper drew the plate at the head of the leaf; Jo Hopper then ruled the page and kept it for twenty years, so leaf 2 carries “Evening Wind” at 7 × 8⅜ inches and, beneath it, thirty-one lines running from the Los Angeles Print Makers in January 1921 to Keppel in 1927 — every jury that accepted or refused it, every price, every commission, every date the cheque cleared. Nothing else in the archive is that dense.',
    sections: [
      {
        title: 'The book itself',
        intro:
          'Covers, the clipping hinged inside the front board, the title page and its verso, and Jo Hopper’s index on leaf 1. The index is worth reading first: it is her own map of what follows, and the order she put things in is not the order they were made.',
        sheets: span('book-i', 1, 8),
      },
      {
        title: 'The etchings, plate by plate',
        intro:
          'Leaves 2 to 44, one work to a leaf, with the two loose sheets that were found between 44 and 45. The numbering skips — 19, 21, 23, 25 and others were never photographed because nothing was written on them — and the gaps are left as gaps.',
        sheets: span('book-i', 9, 48),
      },
      {
        title: 'What the etchings did next',
        intro:
          'Leaves 45 to 48: the “Notes, Explanations” Jo Hopper wrote to make her own system legible, and the record of the set of eleven bought by the Carnegie Institute. These are about the etchings rather than about one etching, which is why they stop here and the lists that follow belong to another book.',
        sheets: span('book-i', 49, 52),
      },
    ],
    inProgress: true,
  },
  {
    key: 'paintings',
    path: '/paintings/',
    title: 'The Paintings',
    navTitle: 'Paintings',
    subtitle:
      'Book II entire — the oils and watercolours, one to an opening, from the Nyack canvases to Night Hawks',
    period: '1907 – 1962',
    archiveUnit: 'book-ii',
    rationale:
      'This book reproduces one archive unit exactly — Book II, 96.209 — adding nothing and removing nothing. It is the simplest and most valuable case, because the grouping is the Hoppers’ own: they kept the paintings in a book of their own, in the order they were finished. The Whitney’s descriptors for this volume name the work bare, without quotation marks — “Cape Cod Evening [p. 31]” — which is why the sheet cards here carry no quoted line: see the note on the archive page.',
    sections: [
      {
        title: 'The book',
        intro: 'Covers and Jo Hopper’s index on leaf 1.',
        sheets: span('book-ii', 1, 3),
      },
      {
        title: 'The works, one to an opening',
        intro:
          'Leaves 2 to 97. Each carries Edward Hopper’s ink sketch of the finished canvas and, opposite, Jo Hopper’s description — often several sentences of anecdote about people he never discussed, and always the size, the date, the price and the buyer.',
        sheets: span('book-ii', 4, 70),
      },
      {
        title: 'Photographs',
        intro: 'The last written leaf, and the back cover.',
        sheets: span('book-ii', 71, 72),
      },
    ],
  },
  {
    key: 'late-work',
    path: '/late-work/',
    title: 'The Late Work',
    navTitle: 'Late work',
    subtitle:
      'Book III entire — Hotel Lobby to Sun in an Empty Room, and the running lists Jo Hopper kept in front of them',
    period: '1924 – 1967',
    archiveUnit: 'book-iii',
    rationale:
      'One archive unit exactly: Book III, 96.210. It is the last of the three work books and the one that runs to Hopper’s death, so it is also where the record thins — the entries after 1960 are shorter, and the lists at the front were still being added to after the paintings stopped. Its front matter is unlike the other books’: fifteen leaves of Whereabouts, Prizes and Museum Purchases, Reviews and Reproductions, Gifts and One Man Shows, kept before the first work rather than behind the last. Those leaves are read again, differently, in Jo Hopper’s Apparatus.',
    sections: [
      {
        title: 'The book and its running lists',
        intro:
          'Cover, title page, the photograph of Hopper bound in at the front, the index, and then fifteen leaves of lists — where each work was, what it had won, what had been written about it, what had been given away.',
        sheets: span('book-iii', 1, 19),
      },
      {
        title: 'The works, 1924 – 1965',
        intro:
          'Leaves 1 to 125, the paintings and then a run of watercolours from Mexico, Wyoming and Cape Cod. The odd-numbered leaves carry the entries; the evens were left for continuations and mostly stayed empty.',
        sheets: span('book-iii', 20, 81),
      },
      {
        title: 'Whereabouts and memoranda',
        intro:
          'The tail of the book: two more Whereabouts leaves at 170 and 171, a note on 187, and five leaves of Memoranda. This is the latest hand in the archive.',
        sheets: span('book-iii', 82, 90),
      },
    ],
    inProgress: true,
  },
  {
    key: 'accounts',
    path: '/accounts/',
    title: 'The Account Book',
    navTitle: 'Accounts',
    subtitle:
      'Book IV entire — every payment received, 15 November 1913 to 23 March 1967, in one running column',
    period: '1913 – 1967',
    archiveUnit: 'book-iv',
    rationale:
      'One archive unit exactly: Book IV, 96.211 — a pocket book, 7½ by 4¾ inches, the smallest of the six and by some distance the most continuous. It has no sketches and no anecdote. It has one column of dates, one of payers and one of sums, kept without a gap for fifty-four years, and it is the only document here that can answer a question of the form “what did this actually pay”. The early leaves are all illustration work — Adventure, Everybody’s, the Wells Fargo Messenger, Morse Dry Dock — which is the part of Hopper’s working life the paintings books do not record at all.',
    sections: [
      {
        title: 'How it arrived',
        intro:
          'The envelope with Hopper’s address, the chipboard folded round the book, and the front cover. Photographed because they came with it.',
        sheets: span('book-iv', 1, 3),
      },
      {
        title: 'Illustration, 1913 – 1923',
        intro:
          'Leaves 3 to 66. Magazines, printers and shipyards, in sums of ten and twenty dollars. Hopper was earning his living this way for the whole decade in which he sold almost no paintings.',
        sheets: span('book-iv', 4, 67),
      },
      {
        title: 'The Rehn years, 1924 – 1934',
        intro:
          'Leaves 67 to 102, beginning with the first entries for Frank K. M. Rehn, who took him on in 1924, and running through the years in which the etchings and then the oils began to sell.',
        sheets: span('book-iv', 68, 103),
      },
      {
        title: 'The long middle, 1935 – 1949',
        intro:
          'Leaves 103 to 124. Fewer entries and larger ones; the annual rhythm of a painter with a dealer.',
        sheets: span('book-iv', 104, 125),
      },
      {
        title: 'The last years, 1950 – 1967',
        intro:
          'Leaves 125 to 159, and the back cover. Reproduction fees from Artex Prints appear beside gallery cheques, and the final entry is dated three months before Hopper died.',
        sheets: span('book-iv', 126, 161),
      },
    ],
  },
  {
    key: 'dealers',
    path: '/dealers/',
    title: 'Dealers and Prints',
    navTitle: 'Dealers',
    subtitle:
      'The two thin books kept by dealer rather than by work — who was holding what, and on what terms',
    period: '1921 – 1963',
    archiveUnit: null,
    rationale:
      'Two archive units under one tab, and the grouping is ours: Dealers/Etchings (96.213) and Book V (96.212). What holds them together is a filing decision the Hoppers made and then abandoned — these two are indexed by *whose hands the work was in*, not by which work it was. Keppel, Kraushaar, Kennedy, the Downtown Gallery, the Weyhe Book Shop, Vickery Atkins & Torrey each get a leaf, and the prints move down it. Read against the etchings book, which files the same transactions by plate, the pair is the closest thing in the archive to a double-entry system, and the two sides do not always agree.',
    sections: [
      {
        title: 'Dealers/Etchings, 1921 – 1951',
        intro:
          'Forty-eight sheets, leaves numbered from 51 — the book was begun in the middle, in a volume already partly used. Two of its leaves are written across the page rather than down it, and the Whitney photographed them turned.',
        sheets: span('dealers', 1, 48),
      },
      {
        title: 'Book V, 1953 – 1963',
        intro:
          'Sixteen sheets, the smallest set in the archive and the latest: an index by letter, a page of loans, a dozen leaves of drawings, and three leaves of receipts from the Rehn Gallery for the etchings sold in October 1953.',
        sheets: span('book-v', 1, 16),
      },
    ],
  },
  {
    key: 'apparatus',
    path: '/apparatus/',
    title: 'Jo Hopper’s Apparatus',
    navTitle: 'Apparatus',
    subtitle:
      'The leaves that record no work at all — the indexes, the whereabouts, the prizes, the reviews, the gifts',
    period: '1924 – 1967',
    archiveUnit: null,
    rationale:
      'Gathering these is entirely our doing, and the only thing they have in common is that no work is their subject. They are the machinery Josephine Hopper built to keep the other leaves usable: an index at the front of each book, a Whereabouts list saying which collection now held what, running tallies of prizes and museum purchases, eight leaves of reviews and reproductions, a Gifts page, a One Man Shows page, and at the back of Book I a chronology. Scattered through three volumes, they read as clerical residue. Taken together they are the most interesting document in the archive, because they are the part of it that is not a record of Edward Hopper’s work but of Josephine Hopper’s: she is the one who decided what about a painting was worth writing down, and these leaves are where that decision is visible.',
    sections: [
      {
        title: 'Book I: the lists behind the etchings',
        intro:
          'Leaves 49 to 100 and the back flyleaf — one-man shows, the oils and Paris watercolours listed by year, six leaves of current exhibitions, reviews and reproductions cross-referenced in both directions, photographs, prizes, gifts, the monograph, and a chronology on the flyleaf.',
        sheets: span('book-i', 53, 117),
      },
      {
        title: 'Book III: the lists in front of the paintings',
        intro:
          'The same apparatus, moved to the front of the book and kept in a later hand: Whereabouts, Prizes and Museum Purchases, eight leaves of Reviews and Reproductions, Gifts, One Man Shows.',
        sheets: span('book-iii', 5, 19),
      },
      {
        title: 'Book III: whereabouts and memoranda at the back',
        intro:
          'Two further Whereabouts leaves at 170 and 171, and five leaves of Memoranda at 190 to 194 — the last of it, and the only part where she writes at length without a column to fill.',
        sheets: span('book-iii', 82, 89),
      },
    ],
  },
];

writeFileSync(resolve(root, 'src/content/books.json'), JSON.stringify(BOOKS, null, 2) + '\n');

for (const b of BOOKS) {
  const n = b.sections.reduce((s, x) => s + x.sheets.length, 0);
  process.stdout.write(
    `${b.key.padEnd(11)} ${String(n).padStart(3)} sheets  ${
      b.archiveUnit ? `= ${b.archiveUnit}` : '(our grouping)'
    }\n`,
  );
}
