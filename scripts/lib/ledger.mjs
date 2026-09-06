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
 * The year a date cell states — the permissive rule, for the date column only.
 */
export const yearInCell = (cell) => {
  const s = String(cell ?? '').trim();
  if (!s) return null;
  const four = /\b(1[89]\d\d|20\d\d)\b/.exec(s);
  if (four) {
    const y = Number(four[1]);
    return y >= 1900 && y <= 1970 ? y : null;
  }
  const two = /^'?(\d{2})\.?$/.exec(s) ?? /[,']\s*'?(\d{2})\b/.exec(s);
  if (!two) return null;
  const y = 1900 + Number(two[1]);
  return y >= 1900 && y <= 1970 ? y : null;
};

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

  let sheet = null; // { ref, leaf }
  let section = null;
  let work = null; // the work declared on this leaf, if any
  let carried = null; // the last work declared anywhere, for rows that follow one

  const pushRows = (spec, header, tableBody) => {
    const target = work ? work.rows : looseRows;
    for (const raw of rowsOf(tableBody)) {
      const cells = cellsOf(raw);
      if (!cells.some((c) => c.trim())) continue;
      target.push({
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
      };
      works.push(work);
      carried = work.title;
      i = a.end - 1;
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

  return { ledger, batch, path, sheets, works, looseRows };
}
