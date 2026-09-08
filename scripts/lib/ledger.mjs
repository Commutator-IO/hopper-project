/**
 * Reads the transcriptions back as structured records.
 *
 * ## Why this exists
 *
 * Three things now want to know what is in the `.tex` files — which works the
 * ledgers name (`works.mjs`), what is known about each of them
 * (`work-notes.json`, written by `/modernize-hopper`), and what the sales came
 * to in a year (`accounts.mjs`). Before this module each would have grown its
 * own reader, and three readers of one format drift apart in the way that
 * `render.mjs` and `works.mjs` had already begun to: both carried a copy of
 * the title normalisation, with a comment saying « kept in step by hand ».
 * They now both import it from here.
 *
 * ## What it does and does not do
 *
 * It reads. It derives nothing that is not on the page, and it resolves
 * nothing that the transcription left open: an `\ill{}` stays a hole, an
 * `\uncertain{}` stays flagged, and a row this module cannot parse is
 * **returned as unparsed rather than dropped**. A parser that silently skips
 * what it does not understand produces a total that looks complete, and a
 * total that looks complete is exactly the thing nobody re-checks.
 *
 * The transcriptions are the only source. Nothing here consults an API, a
 * catalogue raisonné or anybody's memory of Hopper.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The comparison key for a title — the single copy.
 *
 * Institutions and the ledger differ on three things and only three, each a
 * matter of house style rather than of identity: a leading article, an
 * ampersand, and case or punctuation. Everything beyond those three is left to
 * fail and to be declared by hand in `work-aliases.json` if it is real.
 */
export const workKey = (title) =>
  title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Strip the apparatus, keeping the reading.
 *
 * `\uncertain{Aux Fortifications}` is a reading of « Aux Fortifications » and
 * becomes it; `\ill{}` is not a reading of anything and becomes nothing. The
 * difference matters downstream: a title that was read doubtfully should still
 * find its museum, and a title that was never read should find none.
 */
export const plainOf = (tex) =>
  tex
    .replace(/\\ill\{\}|\\ill\b/g, '')
    .replace(/\\(uncertain|add|struck|emph|textit|textbf|texttt)\{/g, '{')
    .replace(/\\hand\{[a-z]+\}\{/g, '{')
    .replace(/\\quad|\\qquad/g, '  ')
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\&/g, '&')
    .replace(/\\\$/g, '$')
    .replace(/\\%/g, '%')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The title part of a `\work{}` argument.
 *
 * A leaf writes the title and then the plate or canvas size on one line, so
 * only the part before a measurement is the title. Two spaces stand for the
 * `\quad` that separated them.
 */
export const titleOf = (rawWorkArg) => {
  // `plainOf` collapses runs of whitespace, which would erase the very gap
  // that separates the title from the size, so the \quad is carried through
  // as a sentinel and split on afterwards.
  const SEP = '\u0000';
  const marked = rawWorkArg.replace(/\\qquad|\\quad/g, SEP);
  return plainOf(marked)
    .split(new RegExp(`${SEP}|\\s\\d+\\s*["\u2033]?\\s*[x\u00d7]\\s*\\d`))[0]
    .replace(new RegExp(SEP, 'g'), ' ')
    // A leaf that sets the size off with a plain dash rather than a \quad \u2014
    // \u00ab Blackwell's Island - 35 x 60 \u00bb \u2014 leaves the dash behind when the size
    // is cut. Trailing punctuation is never part of a title. `workKey` would
    // discard it anyway; this is so the title *shown* is not \u00ab Night Windows - \u00bb.
    .replace(/[\s\-\u2013\u2014.,:;]+$/, '')
    .trim();
};

/**
 * Whether a `\work{}` argument names a work, or is a hole with a letter beside it.
 *
 * Two ways to fail. `\work{B\ill{}}` on Book I leaf 56 is an initial under a
 * clipping and names nothing. `\work{Night in \ill{}}` on leaf 4 reads three
 * letters and then stops, and *looks* like a title — « Night in » — which is
 * worse, because a lookup would run on it and could match something. Both are
 * refused: a title interrupted by `\ill{}` is not a title.
 */
export const isReadTitle = (rawWorkArg) =>
  !/\\ill\b/.test(rawWorkArg) && titleOf(rawWorkArg).length > 1;

/**
 * The year a `\work{}` heading states, if it states one.
 *
 * Edward wrote the plate's date into the title line on nine of Book I's
 * leaves — « The Lonely House.\qquad 8"x10"\qquad 1922. » — and `titleOf`
 * cuts it away with the size. It is the artist's own date for his own work and
 * belongs in the index beside the museums', including where the two differ.
 */
export const statedYearOf = (rawWorkArg) => {
  const m = /\b(19[0-6]\d)\b/.exec(plainOf(rawWorkArg));
  return m ? Number(m[1]) : null;
};

/**
 * A cell that shows, by a month, a season or a four-figure year, that the
 * column it stands in is dates. Tested against a whole column, never one cell.
 */
const DATEISH =
  /\b(Jan|Feb|Mar|Ap|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec|Spring|Summer|Fall|Winter)\b|\b1[89]\d\d\b/i;

/**
 * Whether a table's first column is a date column at all.
 *
 * `yearInCell`'s two-digit branch reads a lone « 21 » as 1921, which is right
 * for a date cell and wrong for every other kind of number. Book I leaf 92 is
 * where that first mattered: the leaf lists William McKillop's negatives by
 * number, so its first column runs 10, 12, 11, 19, 20., 21, 22, 17, 29, 31 —
 * and the works index read them as ten years of activity and published five.
 *
 * So the branch is allowed only where the column says somewhere that it holds
 * dates. A column that never does is a column of something else, and its
 * numbers are left alone. The four-figure branch is unaffected: it needs no
 * such licence, because « 1931 » in any column is a year.
 */
export const isDateColumn = (cells) => cells.some((c) => DATEISH.test(String(c ?? '')));

/**
 * The year a date cell states — the permissive rule, for the date column only.
 *
 * `bareTwoDigit` is that permission: pass the column's own verdict from
 * `isDateColumn`, so a lone two-figure number is read as a year where the
 * column is dates and left as a number where it is not.
 */
export const yearInCell = (cell, bareTwoDigit = true) => {
  const s = String(cell ?? '').trim();
  if (!s) return null;
  const four = /\b(1[89]\d\d|20\d\d)\b/.exec(s);
  if (four) {
    const y = Number(four[1]);
    return y >= 1900 && y <= 1970 ? y : null;
  }
  const two = (bareTwoDigit ? /^'?(\d{2})\.?$/.exec(s) : null) ?? /[,']\s*'?(\d{2})\b/.exec(s);
  if (!two) return null;
  const y = 1900 + Number(two[1]);
  return y >= 1900 && y <= 1970 ? y : null;
};

/**
 * Every year a passage of her prose states, in the order it states them.
 *
 * ## Why this exists at all
 *
 * `yearInCell` reads a date column, and three of the six volumes have none.
 * Books II, III and V rule nothing: a sale on one of their leaves is a
 * sentence — « Jos. H. Hirshhorn - Sept. 30, 1954. 3500 - 1/3 » — and a reader
 * that looks only at `ledgertable` rows sees a transcribed volume with no
 * dates in it. That is a fact about the ruling, not about the archive, and
 * anything built on it (the timeline's green leaves, above all) reports the
 * absence as though the leaves were silent.
 *
 * ## The four shapes, and nothing else
 *
 * Deliberately narrow. A bare two-figure number in prose is a price, a size, a
 * street number or a leaf reference far more often than it is a year, so a
 * two-figure year is read **only where a date is already being written**:
 *
 * - `1954` — four figures, anywhere. « Painted in Truro studio in August 1959 ».
 * - `Sept. 30, 54` — a month, a day, then two figures. Her ordinal mark comes
 *   between them as often as not: « July 8", 57 ».
 * - `Sept. '54` — a month and an apostrophised pair, with no day.
 * - `6.3.59` — the all-figure form Book V uses for a receipt.
 *
 * Everything else is left alone. « 3500 - 1/3 » yields nothing, « 12 x 18 »
 * yields nothing, and « 165 B'way » yields nothing, which are three ways this
 * would have gone wrong if the rule were « any two figures near a comma ».
 *
 * Bounded to 1900–1970 like `yearInCell`: the Hoppers' own span, either side
 * of which a match is a misreading rather than a date.
 */
const MONTH = "(?:Jan|Feb|Mar|Ap|Apr|May|Jun|June|Jul|July|Aug|Sept|Sep|Oct|Nov|Dec)";
const PROSE_YEARS = new RegExp(
  [
    // 1954
    "\\b(1[89]\\d\\d)\\b",
    // Sept. 30, 54  ·  July 8", 57  ·  Jan 11 '58
    //
    // The day is `\d{1,2}(?!\d)` and the lookahead is load-bearing: without it
    // « Mar. 1950 » is read as day 19 of year 50, which happens to give 1950
    // and so hides the bug for as long as every year in the archive begins
    // 19. The day must be a day, and a four-figure year is left to the
    // alternative above.
    `\\b${MONTH}\\.?\\s+\\d{1,2}(?!\\d)\\s*["”']?\\s*,?\\s*'?(\\d{2})(?!\\d)`,
    // Sept. '54  ·  Fall '46
    `\\b(?:${MONTH}|Spring|Summer|Fall|Winter)\\.?\\s*'(\\d{2})(?!\\d)`,
    // 6.3.59
    "\\b\\d{1,2}\\.\\d{1,2}\\.\\s*'?(\\d{2})(?!\\d)",
  ].join('|'),
  'gi',
);

export function yearsInProse(text) {
  const out = [];
  for (const m of String(text ?? '').matchAll(PROSE_YEARS)) {
    const four = m[1];
    const two = m[2] ?? m[3] ?? m[4];
    const y = four ? Number(four) : 1900 + Number(two);
    if (y >= 1900 && y <= 1970 && !out.includes(y)) out.push(y);
  }
  return out;
}

/* ------------------------------------------------------------ brace matching */

/**
 * Read one brace-balanced macro argument beginning at `open`, across newlines.
 *
 * `\work{Night in \ill{}` runs onto the next line on Book I leaf 4, so a
 * line-at-a-time regex loses it. Returns null on an unbalanced argument rather
 * than guessing where it should have ended.
 */
function braced(text, open) {
  if (text[open] !== '{') return null;
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { body: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

/** Split a table row into cells at `&`, respecting escapes and braces. */
export function cellsOf(row) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '\\') {
      cur += row.slice(i, i + 2);
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '&' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Split a table body into rows at `\\`, respecting braces for the same reason. */
function rowsOf(body) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && body[i + 1] === '\\' && depth === 0) {
      out.push(cur);
      cur = '';
      i++;
      continue;
    }
    if (body[i] === '\\') {
      cur += body.slice(i, i + 2);
      i++;
      continue;
    }
    if (body[i] === '{') depth++;
    else if (body[i] === '}') depth--;
    cur += body[i];
  }
  if (cur.trim()) out.push(cur);
  return out.filter((r) => r.trim());
}

/* --------------------------------------------------------------- the reader */

/**
 * Every transcription in the repository, parsed.
 *
 * A record per `\work{}` block, carrying the sheet and leaf it stands on and
 * the table rows that follow it before the next work begins. Rows that belong
 * to no work — a leaf that is a running list rather than a work's record, as
 * Book I leaves 60 to 63 are — are attached to the leaf with `work: null`.
 */
export function readTranscripts(root) {
  const dir = resolve(root, 'transcripts');
  const out = [];
  for (const ledger of readdirSync(dir).sort()) {
    const d = resolve(dir, ledger);
    if (ledger.startsWith('_') || ledger === 'preamble' || !existsSync(d)) continue;
    let files;
    try {
      files = readdirSync(d).filter((f) => f.endsWith('.tex')).sort();
    } catch {
      continue;
    }
    for (const f of files) {
      const batch = Number(/batch-(\d+)/.exec(f)?.[1] ?? 0);
      out.push(parseFile(resolve(d, f), ledger, batch));
    }
  }
  return out;
}

function parseFile(path, ledger, batch) {
  const src = readFileSync(path, 'utf8');
  const body = src.slice(src.indexOf('\\begin{document}'));

  const sheets = [];
  const works = [];
  const looseRows = [];
  const hands = [];

  let sheet = null; // { ref, leaf }
  let section = null;
  let work = null; // the work declared on this leaf, if any
  let carried = null; // the last work declared anywhere, for rows that follow one

  const pushRows = (spec, header, tableBody) => {
    const target = work ? work.rows : looseRows;
    const rows = rowsOf(tableBody)
      .map((raw) => ({ raw, cells: cellsOf(raw) }))
      .filter((r) => r.cells.some((c) => c.trim()));
    // Decided once for the table, not once per row: whether the first column
    // is dates at all is a fact about the column, and a row in the middle of
    // it cannot tell on its own. See `isDateColumn`.
    const dateColumn = isDateColumn(rows.map((r) => plainOf(r.cells[0] ?? '')));
    for (const { raw, cells } of rows) {
      target.push({
        dateColumn,
        ledger,
        batch,
        section,
        ref: sheet?.ref ?? null,
        leaf: sheet?.leaf ?? null,
        work: work?.title ?? null,
        // The last work declared on an earlier leaf. Offered, never assumed:
        // a consumer that wants it must say so, because on a running-list leaf
        // it names a work the row has nothing to do with.
        carried: work ? null : carried,
        header,
        cells,
        plain: cells.map(plainOf),
        raw: raw.trim(),
      });
    }
    void spec;
  };

  for (let i = 0; i < body.length; i++) {
    if (body[i] !== '\\') continue;
    const rest = body.slice(i);

    let m = /^\\section\{/.exec(rest);
    if (m) {
      const a = braced(body, i + m[0].length - 1);
      if (a) {
        section = plainOf(a.body);
        // A section is a leaf, and a leaf that declares no work of its own owns
        // no work's rows. Without this reset, Book I leaves 60 to 63 — running
        // lists of watercolours, with no \work{} anywhere on them — would hang
        // their every row on Tables for Ladies, the last oil declared before
        // them, and the whole 1924 Gloucester summer would be booked against
        // one 1930 canvas. What is genuinely a continuation (leaf 3 carries on
        // leaf 2's Evening Wind without repeating the title) survives as a
        // loose row that still knows its leaf, and as `carried` below.
        work = null;
        i = a.end - 1;
      }
      continue;
    }

    m = /^\\sheet\{/.exec(rest);
    if (m) {
      const a = braced(body, i + m[0].length - 1);
      if (!a) continue;
      const b = braced(body, a.end);
      const ref = a.body.trim();
      const leaf = b ? b.body.trim() : '';
      sheet = { ref, leaf: leaf === '' ? null : leaf };
      sheets.push({ ref, leaf: sheet.leaf, section });
      // A new sheet does not end a work: on these leaves a work's record runs
      // across the fold, and leaf 3 of Book I continues leaf 2 without
      // repeating the title.
      i = (b ? b.end : a.end) - 1;
      continue;
    }

    m = /^\\work\{/.exec(rest);
    if (m) {
      const a = braced(body, i + m[0].length - 1);
      if (!a) continue;
      work = {
        ledger,
        batch,
        section,
        ref: sheet?.ref ?? null,
        leaf: sheet?.leaf ?? null,
        raw: a.body.trim(),
        title: titleOf(a.body),
        key: workKey(titleOf(a.body)),
        read: isReadTitle(a.body),
        statedYear: statedYearOf(a.body),
        rows: [],
        hands: [],
      };
      works.push(work);
      carried = work.title;
      i = a.end - 1;
      continue;
    }

    // The prose. Three of the six volumes rule no columns at all and write
    // every sale as a sentence, so a consumer that reads only `ledgertable`
    // rows sees Books I and Dealers and nothing else. `\hand{}` is the whole
    // of what somebody wrote on the leaf, and it is deliberately *only* that:
    // `\note{}` is the transcriber's own prose and `\marginal{}` ends in an
    // editorial gloss of where on the leaf a note sits, so neither is
    // collected here and a reader of `hands` never has to strip one out.
    m = /^\\hand\{/.exec(rest);
    if (m) {
      const who = braced(body, i + m[0].length - 1);
      if (!who) continue;
      const said = braced(body, who.end);
      if (!said) continue;
      const hand = {
        ledger,
        batch,
        section,
        ref: sheet?.ref ?? null,
        leaf: sheet?.leaf ?? null,
        work: work?.title ?? null,
        who: who.body.trim(),
        raw: said.body,
        plain: plainOf(said.body),
      };
      hands.push(hand);
      // Also hung on the work it stands under, the way rows are, so a consumer
      // asking « what does this work's own prose say » does not have to
      // reconstruct the grouping from titles — two leaves can carry the same
      // title, and matching on it would merge them.
      if (work) work.hands.push(hand);
      i = said.end - 1;
      continue;
    }

    m = /^\\begin\{ledgertable\}\{/.exec(rest);
    if (m) {
      const spec = braced(body, i + m[0].length - 1);
      if (!spec) continue;
      const header = braced(body, spec.end);
      if (!header) continue;
      const close = body.indexOf('\\end{ledgertable}', header.end);
      if (close < 0) continue;
      pushRows(spec.body, cellsOf(header.body).map(plainOf), body.slice(header.end, close));
      i = close;
      continue;
    }
  }

  // The `\keywords{}` line, parsed. It is the only place in the archive where
  // somebody who read the sheets says whether a name is a dealer or a buyer,
  // and `accounts.mjs` needs exactly that to rank the two apart. Read here so
  // that a second reader of the same `.tex` does not grow beside this one.
  const keywords = [];
  for (const m of src.matchAll(/\\keywords\{([^}]*)\}/g))
    for (const term of keywordTerms(m[1])) keywords.push(parseKeyword(term));

  return { ledger, batch, path, sheets, works, looseRows, hands, keywords };
}

/* ------------------------------------------------------------ keywords */

/**
 * The facets a `\keywords{}` term may declare, in the order a reader wants
 * them: what the work is, where it was made, who handled it, who bought it,
 * where it ended up, and what the leaves themselves do.
 *
 * A closed set, and deliberately small. The point of facetting is that a
 * reader can find the museums without reading past the places; a vocabulary
 * that grows a facet per term is the flat list again with extra punctuation.
 */
export const FACETS = [
  'medium',
  'place',
  'work',
  'person',
  'dealer',
  'collection',
  'society',
  'publication',
  'prize',
  'feature',
];

/**
 * One keyword, split into its facet and its label.
 *
 * The facet is declared in the transcription — `place:Cape Cod` — and never
 * guessed from the string, for the same reason the tag itself is not: only
 * somebody who read the sheets knows whether « Randolph » is a dealer or a
 * buyer, and « Corcoran Gallery » is a museum while « Downtown Gallery » is
 * not. A string test would get both wrong.
 *
 * `collection` rather than `museum` because the buyers here are not all
 * museums: the Library of Congress, the New York Public Library and Hamilton
 * College bought prints on the same leaves as the Metropolitan did, and a
 * facet that excluded them would push three real purchasers into the bare
 * group for no reason but their names.
 *
 * **A term may decline to declare one**, and that is a permitted answer rather
 * than a defect. Where the reading does not settle what a name was, the term
 * arrives with `facet: null` and the site groups it under a heading that says
 * so. Forcing a facet would put a guess into the index, which is the one thing
 * the index is for not doing.
 */
export function parseKeyword(term) {
  const m = /^([a-z]+):\s*(.+)$/.exec(term.trim());
  if (!m || !FACETS.includes(m[1])) return { facet: null, label: term.trim() };
  return { facet: m[1], label: m[2].trim() };
}

/** The terms of a `\keywords{}` argument, in source order. */
export function keywordTerms(arg) {
  return arg
    .replace(/\s+/g, ' ')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
