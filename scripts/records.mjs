#!/usr/bin/env node
/**
 * The record edition's `record` blocks -> CSV and JSON-LD, one file per ledger.
 *
 * This is what a ledger repays that a manuscript does not. Grothendieck's
 * pages become a modernised reading and stop there, because prose does not
 * become a table. Jo Hopper ruled her columns herself: the text is *already* a
 * table, and a table can be sorted, summed, and joined to a catalogue
 * raisonné.
 *
 * ## Where the rows come from, and where they may not come from
 *
 * Only from `\begin{record}{…}` blocks in a `.rec.tex`. Never from the
 * transcription, and never from prose. Parsing a price out of a sentence would
 * produce a figure nobody wrote down, and a figure nobody wrote down is
 * indistinguishable six months later from one that was read off the page.
 *
 * A field the leaf does not carry is **absent**, and absent means an empty
 * cell — not a zero, not a guess, not the value from the entry above. The
 * `certainty` column says which rows contain a doubtful reading, so that
 * anyone building on this can sort the shaky ones to the top.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'public/transcripts');
const out = resolve(root, 'public/records');

/** The columns, in the order a reader wants them. */
const FIELDS = [
  'title',
  'medium',
  'size',
  'date',
  'price',
  'buyer',
  'dealer',
  'exhibition',
  'note',
];

/** Balanced `{…}` from `i`. A field's value may itself contain braced macros. */
function group(s, i) {
  while (s[i] === ' ' || s[i] === '\n') i++;
  if (s[i] !== '{') return ['', i];
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '\\') {
      j++;
      continue;
    }
    if (s[j] === '{') d++;
    else if (s[j] === '}') {
      d--;
      if (!d) return [s.slice(i + 1, j), j + 1];
    }
  }
  return ['', s.length];
}

/**
 * A field's value as data: the apparatus stripped, its meaning kept.
 *
 * `\uncertain{16.66}` becomes `16.66` and sets the row's certainty to
 * `uncertain`; `\ill{}` becomes the empty string and sets it to `partial`.
 * Keeping the marks in the CSV would make every consumer parse LaTeX; dropping
 * the *information* they carry would let a doubtful figure travel as a certain
 * one. So the marks go into the column that says how much to trust the row.
 */
function value(raw) {
  let certainty = 'read';
  let v = raw;
  if (/\\ill\b/.test(v)) certainty = 'partial';
  if (/\\uncertain\b/.test(v)) certainty = 'uncertain';
  v = v
    .replace(/\\ill\{\}|\\ill\b/g, '')
    // The escapes LaTeX needs and a CSV does not. A cell reading
    // "\$22 less 15\%" makes every consumer of this file strip TeX.
    .replace(/\\([$&%#_])/g, '$1')
    .replace(/---/g, '\u2014')
    .replace(/--/g, '\u2013')
    .replace(/\\(uncertain|add|struck|emph|textit|textbf|texttt)\{/g, '{')
    .replace(/\\hand\{[a-z]+\}\{/g, '{')
    .replace(/[{}]/g, '')
    .replace(/\\quad|\\qquad/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { v, certainty };
}

const RANK = { read: 0, partial: 1, uncertain: 2 };

/**
 * Where a work of this title can be looked at, from `npm run works`.
 *
 * Carried into the JSON-LD as `sameAs`, which is the field a consumer of this
 * dataset would follow, and it is worth being exact about what it asserts: a
 * museum holds a work under this title, not that the row's transaction
 * concerns that copy. The `description` on each record says so in words,
 * because `sameAs` alone would invite the stronger reading.
 */
const WORKS = (() => {
  try {
    const w = JSON.parse(
      readFileSync(resolve(root, 'src/content/works.json'), 'utf8'),
    );
    return { byKey: new Map(w.works.map((x) => [x.key, x])), aliases: w.aliases ?? {} };
  } catch {
    return null;
  }
})();

const workKey = (t) =>
  t
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function sameAs(title) {
  if (!WORKS || !title) return undefined;
  let k = workKey(title);
  if (WORKS.aliases[k]) k = WORKS.aliases[k].to;
  const w = WORKS.byKey.get(k);
  return w ? w.holdings.map((h) => h.url) : undefined;
}

function parse(text, ledger) {
  const rows = [];
  let sheet = null;
  let leaf = null;
  let i = 0;
  let n = 0;

  while (i < text.length) {
    const nextSheet = text.indexOf('\\sheet{', i);
    const nextRec = text.indexOf('\\begin{record}', i);
    if (nextRec < 0 && nextSheet < 0 && text.indexOf('\\sheetrange{', i) < 0) break;

    const nextRange = text.indexOf('\\sheetrange{', i);
    if (nextRange >= 0 && (nextRec < 0 || nextRange < nextRec) && (nextSheet < 0 || nextRange < nextSheet)) {
      // The record edition anchors on a run of sheets rather than on one. The
      // run's first ref is what a record read from it is based on, and it is
      // what the JSON-LD points at.
      const [ref, a] = group(text, nextRange + '\\sheetrange'.length);
      const [, b] = group(text, a);
      sheet = Number(ref.trim()) || null;
      leaf = null;
      i = b;
      continue;
    }

    if (nextSheet >= 0 && (nextRec < 0 || nextSheet < nextRec)) {
      const [ref, a] = group(text, nextSheet + '\\sheet'.length);
      const [lf, b] = group(text, a);
      sheet = Number(ref.trim()) || null;
      leaf = lf.trim() === '' ? null : Number(lf.trim());
      i = b;
      continue;
    }

    const [title, afterTitle] = group(text, nextRec + '\\begin{record}'.length);
    const end = text.indexOf('\\end{record}', afterTitle);
    const body = text.slice(afterTitle, end < 0 ? text.length : end);
    i = end < 0 ? text.length : end + '\\end{record}'.length;

    const t = value(title);
    const row = {
      id: `${ledger}#${leaf ?? 'x'}#${++n}`,
      ledger,
      ref: sheet ?? '',
      leaf: leaf ?? '',
      title: t.v,
      sketch: /\\sketch\b/.test(body) ? 'yes' : '',
      certainty: t.certainty,
    };
    for (const f of FIELDS) row[f] ??= '';
    row.title = t.v;

    for (const m of body.matchAll(/\\field\{/g)) {
      const [name, a] = group(body, m.index + '\\field'.length);
      const [raw] = group(body, a);
      const key = name.trim().toLowerCase();
      if (!FIELDS.includes(key)) {
        process.stderr.write(
          `  ${ledger}: \\field{${name}} is not one of ${FIELDS.join(', ')} — skipped\n`,
        );
        continue;
      }
      const { v, certainty } = value(raw);
      row[key] = v;
      if (RANK[certainty] > RANK[row.certainty]) row.certainty = certainty;
    }
    rows.push(row);
  }
  return rows;
}

const COLUMNS = ['id', 'ledger', 'ref', 'leaf', ...FIELDS, 'sketch', 'certainty'];

const csvCell = (s) => {
  const v = String(s ?? '');
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
};

if (!existsSync(src)) {
  process.stdout.write('records: nothing rendered yet — run npm run render first\n');
  process.exit(0);
}
mkdirSync(out, { recursive: true });

let total = 0;
for (const dir of readdirSync(src, { withFileTypes: true })) {
  if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
  const rows = readdirSync(resolve(src, dir.name))
    .filter((f) => f.endsWith('.rec.tex'))
    .flatMap((f) => parse(readFileSync(resolve(src, dir.name, f), 'utf8'), dir.name));
  if (!rows.length) continue;

  writeFileSync(
    resolve(out, `${dir.name}.csv`),
    [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => csvCell(r[c])).join(','))].join(
      '\n',
    ) + '\n',
  );

  /**
   * JSON-LD beside the CSV, so a row can be resolved rather than only read.
   *
   * `schema.org/CreativeWork` because it is the vocabulary a museum or an
   * aggregator already consumes, and `isBasedOn` points at the Whitney's own
   * record for the sheet the row was read from — which is the whole point: a
   * consumer of this data must be one click from the photograph that produced
   * it.
   */
  writeFileSync(
    resolve(out, `${dir.name}.jsonld`),
    JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: `Records extracted from the Hopper artist's ledger: ${dir.name}`,
        creator: { '@type': 'Person', name: 'Josephine Nivison Hopper' },
        isBasedOn: 'https://resourcespace.whitney.org/pages/collections_featured.php?parent=1116',
        license: 'https://rightsstatements.org/page/InC/1.0/',
        description:
          'First-pass machine transcription, unchecked against the sheets by a person. ' +
          'Empty fields are fields the leaf does not carry, never defaults. ' +
          'Prices and dates are as written and are never normalised. ' +
          'sameAs links a museum record for a work of the same title, verified against that ' +
          "museum's API; it does not assert that this row's transaction concerns that copy.",
        hasPart: rows.map((r) => ({
          '@type': 'CreativeWork',
          identifier: r.id,
          name: r.title || undefined,
          artMedium: r.medium || undefined,
          size: r.size || undefined,
          dateCreated: r.date || undefined,
          isBasedOn: `https://resourcespace.whitney.org/pages/view.php?ref=${r.ref}`,
          // A museum holds a work of this title and serves a picture of it.
          // Not a claim about which impression the ledger's row concerns.
          sameAs: sameAs(r.title),
          // Not `offers`: these are not offers, they are what a ledger records
          // about a past transaction, in the words the ledger uses.
          disambiguatingDescription: [
            r.price && `price as written: ${r.price}`,
            r.buyer && `buyer as named: ${r.buyer}`,
            r.dealer && `dealer as named: ${r.dealer}`,
            `reading certainty: ${r.certainty}`,
          ]
            .filter(Boolean)
            .join('; '),
        })),
      },
      null,
      2,
    ) + '\n',
  );

  total += rows.length;
  const shaky = rows.filter((r) => r.certainty !== 'read').length;
  process.stdout.write(
    `  ${dir.name}: ${rows.length} records (${shaky} with a doubtful or illegible field)\n`,
  );
}
process.stdout.write(`records: ${total} in all\n`);
