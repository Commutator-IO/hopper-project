#!/usr/bin/env node
/**
 * Tells the site which files exist.
 *
 * Everything here is **observed**, with one exception that is loudly marked as
 * declared. What can be read off the filesystem is read off the filesystem, so
 * that a progress figure can never claim work that was not done — the whole
 * failure mode of a hand-kept status table is that it drifts optimistic and
 * nobody notices.
 *
 * The exception is `transcripts/status.json`: whether a person has gone sheet
 * by sheet against the photograph, and whether a batch holds nothing to
 * transcribe, are two things no file can show. They are declared there, where
 * a change is a diff somebody can review.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { keywordTerms, parseKeyword } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/transcripts');
mkdirSync(out, { recursive: true });

const BATCH_SIZE = 12;

const read = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};

const declared = read(resolve(root, 'transcripts/status.json'), {});

/**
 * Every notebook sheet's position in its notebook, by resource ref.
 *
 * Read out of the generated catalogue rather than recomputed, so that the
 * sitting a sheet falls in is the same number here and in the browser. The
 * regex is the one `scripts/render.mjs` uses on the same file for the same
 * reason: the catalogue is TypeScript and this is a build script, and a
 * one-line parse is cheaper than making it importable from both.
 */
const notebookSeq = new Map();
for (const m of readFileSync(resolve(root, 'src/content/catalogue.ts'), 'utf8').matchAll(
  /\{ ref: (\d+), notebook: '[^']+', seq: (\d+),/g,
)) {
  notebookSeq.set(Number(m[1]), Number(m[2]));
}

/**
 * Every pass that produced a transcription, off the file's own header.
 *
 * Every `.tex` opens with `% Pass: Opus 5 (claude-opus-5), 2026-09-09 - …`,
 * and `scripts/tei.mjs` already lifts that line into the TEI `<respStmt>`. It
 * is lifted here too, for the same reason and from the same place: a citation
 * of this site cites a *reading*, and a reading has a model and a date. One
 * source, so the deposited file and the copied citation cannot disagree.
 *
 * **A file can carry more than one.** A ledger batch is read in a single pass
 * and has exactly one line. A notebook is one file read in sittings of twelve
 * sheets, and gets a `Pass:` line per sitting, so the provenance of every
 * stretch of it is on its face. Reading only the first was a real defect: the
 * corpus release date is cut from the most recent pass anywhere, and with
 * `.exec()` on a `/m` regex it froze at a notebook's *first* sitting, so
 * Garrulities read to the end on 12 September still dated the corpus to the
 * 10th — and the gap would have widened with every sitting after it.
 *
 * Returned oldest first, by date rather than by position, so that a header
 * whose lines were ever appended out of order still yields the first pass
 * first. Callers want different ends of this: the site's citation names the
 * *first* machine pass, and `scripts/citation.mjs` cuts the corpus version
 * from the *last*. Both are right, which is why the list is what is published
 * and neither end is privileged here.
 *
 * A file whose header does not match returns `[]` rather than a guess, and the
 * citation then says the date is unrecorded — which is true, and better than a
 * plausible date nobody wrote.
 */
function passesOf(tex) {
  const re = /^%\s*Pass:\s*(.+?)\s*\((\S+?)\)\s*,\s*(\d{4}-\d{2}-\d{2})\b/gm;
  return [...tex.matchAll(re)]
    .map((m) => ({ model: m[1], id: m[2], date: m[3] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const transcripts = {};
const tags = {};
const readCount = {};

if (existsSync(out)) {
  for (const dir of readdirSync(out, { withFileTypes: true })) {
    // A directory beginning with an underscore is the specimen, which
    // transcribes nothing. Counting it would put two imaginary sheets into
    // every progress figure on the site.
    if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
    const ledger = dir.name;
    for (const f of readdirSync(resolve(out, ledger))) {
      // The notebooks are one file each, named by the notebook: keyed
      // `notebook#<id>` beside the ledgers' `<ledger>#<batch>`.
      const m =
        ledger === 'notebooks'
          ? /^([\w-]+)\.(html|tex|pdf|xml)$/.exec(f)
          : /^batch-(\d+)\.(html|tex|pdf|xml)$/.exec(f);
      if (!m) continue;
      const key = ledger === 'notebooks' ? `notebook#${m[1]}` : `${ledger}#${Number(m[1])}`;
      const e = (transcripts[key] ??= { html: false, tex: false, pdf: false, xml: false });
      e[m[2]] = true;
      if (m[2] === 'tex') {
        const passes = passesOf(readFileSync(resolve(out, ledger, f), 'utf8'));
        // `pass` is the first of them and stays the name the site's citation
        // reads, because that clause says « first machine pass by … » and
        // means it. Both are written here from one list, so they cannot come
        // to disagree.
        e.passes = passes;
        e.pass = passes[0] ?? null;
      }
    }
  }
}

/**
 * Sheets actually transcribed, counted from the `\sheet{}` marks in the
 * source.
 *
 * Counted rather than assumed from the batch size, because a batch is twelve
 * sheets and a transcription of it is rarely twelve: a blank leaf, a cover, a
 * sheet photographed only to record that it came loose — none of those get a
 * `\sheet{}`, and the gap is the only record that they were passed over.
 *
 */
const seen = new Map();
for (const dir of existsSync(out) ? readdirSync(out, { withFileTypes: true }) : []) {
  if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
  for (const f of readdirSync(resolve(out, dir.name))) {
    if (!f.endsWith('.tex')) continue;
    const src = readFileSync(resolve(out, dir.name, f), 'utf8');
    if (!seen.has(dir.name)) seen.set(dir.name, new Set());
    const set = seen.get(dir.name);
    for (const m of src.matchAll(/\\sheet\{(\d+)\}/g)) set.add(m[1]);
  }
}
// The notebooks' sheets are counted apart: the site's « sheets transcribed »
// is the ledgers', 504 of them, and a notebook is another document.
const readNotebooks = {};
for (const [ledger, set] of seen) {
  if (ledger === 'notebooks') readNotebooks.all = set.size;
  else readCount[ledger] = set.size;
}
/**
 * The notebooks' transcribed sheets, and *which* they are.
 *
 * The count alone would let the page say « 36 of 42 read » and nothing more.
 * A notebook is read in sittings of twelve appended to one file, so a page
 * that offers a sitting to open has to know which sittings exist — and
 * inferring that from the count assumes the sittings were taken in order from
 * the first, which the skill asks for but no file proves. The refs are the
 * observed answer and cost one array.
 */
const readNotebookRefs = {};
if (existsSync(resolve(out, 'notebooks'))) {
  for (const f of readdirSync(resolve(out, 'notebooks'))) {
    if (!f.endsWith('.tex')) continue;
    const src = readFileSync(resolve(out, 'notebooks', f), 'utf8');
    const refs = [...new Set([...src.matchAll(/\\sheet\{(\d+)\}/g)].map((m) => Number(m[1])))];
    const id = f.replace(/\.tex$/, '');
    readNotebooks[id] = refs.length;
    readNotebookRefs[id] = refs;
  }
}
delete readNotebooks.all;

/**
 * Tags, from the `\keywords{}` line each transcription carries.
 *
 * The single source, and there is deliberately no tags file: a tag can only
 * exist because somebody wrote it after reading the sheets, so no tag can
 * describe material nobody has read.
 *
 * Two things are kept that an earlier version threw away, and both were the
 * reason the tags could not be used for anything.
 *
 * **The batch.** The terms used to be merged into one `Set` per volume, which
 * reduced « Fogg Art Museum » to the claim that it applies somewhere in the
 * seventy-two sheets of Book II — of which twelve are read. A tag has to name
 * the batches it came out of or it names nowhere, and a reader clicking it has
 * nowhere to be taken.
 *
 * **The facet.** `parseKeyword` splits `museum:Fogg Art Museum` into its two
 * halves. Twenty-four terms in one flat pile mixed places, museums, dealers,
 * people and features of the document with nothing to separate them; grouped,
 * the same twenty-four are a finding aid. A term that declares no facet keeps
 * `facet: null` and is grouped under its own heading rather than guessed at.
 */
for (const dir of existsSync(out) ? readdirSync(out, { withFileTypes: true }) : []) {
  if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
  for (const f of readdirSync(resolve(out, dir.name))) {
    const fm = /^batch-(\d+)\.tex$/.exec(f);
    if (!fm) continue;
    const batch = Number(fm[1]);
    const src = readFileSync(resolve(out, dir.name, f), 'utf8');
    const byLabel = (tags[dir.name] ??= new Map());
    for (const m of src.matchAll(/\\keywords\{([^}]*)\}/g)) {
      // The line wraps in the source, and a keyword split across two lines
      // arrived as « E.\nWeyhe » and sorted under E rather than beside the
      // other dealers. `keywordTerms` re-flattens the whitespace first.
      for (const term of keywordTerms(m[1])) {
        const { facet, label } = parseKeyword(term);
        const e = byLabel.get(label) ?? { tag: label, facet, batches: [] };
        // The first batch to declare a facet fixes it. A later batch leaving
        // the same term bare does not erase what an earlier reading knew.
        if (e.facet === null && facet !== null) e.facet = facet;
        if (!e.batches.includes(batch)) e.batches.push(batch);
        byLabel.set(label, e);
      }
    }
  }
}
/**
 * The notebooks' tags, keyed by the notebook's own id.
 *
 * A notebook is one file with one `\keywords{}` line at its end, so unlike a
 * ledger's the line cannot name a batch: it describes the notebook as far as
 * it has been read. `batches` therefore carries the **sittings the file's
 * sheets fall in**, which is the true scope of the line, and the page says so
 * rather than offering a filter that would return the same sheets for every
 * term.
 */
if (existsSync(resolve(out, 'notebooks'))) {
  for (const f of readdirSync(resolve(out, 'notebooks'))) {
    if (!f.endsWith('.tex')) continue;
    const id = f.replace(/\.tex$/, '');
    const src = readFileSync(resolve(out, 'notebooks', f), 'utf8');
    const sittings = [
      ...new Set(
        (readNotebookRefs[id] ?? []).map((ref) => {
          const seq = notebookSeq.get(ref);
          return seq ? Math.floor((seq - 1) / 12) + 1 : null;
        }).filter((k) => k !== null),
      ),
    ].sort((a, b) => a - b);
    const byLabel = (tags[id] ??= new Map());
    for (const m of src.matchAll(/\\keywords\{([^}]*)\}/g)) {
      for (const term of keywordTerms(m[1])) {
        const { facet, label } = parseKeyword(term);
        const e = byLabel.get(label) ?? { tag: label, facet, batches: sittings };
        if (e.facet === null && facet !== null) e.facet = facet;
        byLabel.set(label, e);
      }
    }
  }
}

for (const [ledger, byLabel] of Object.entries(tags)) {
  tags[ledger] = [...byLabel.values()]
    .map((e) => ({ ...e, batches: e.batches.sort((a, b) => a - b) }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

/**
 * A census of the apparatus itself, per ledger.
 *
 * The schema page argues that these books are a data model, and an argument
 * like that is worth nothing if its figures are typed into the prose by hand:
 * a page that said « 370 illegible readings » would be wrong the day after the
 * next batch landed, and would go on looking authoritative. So the counts are
 * read off the sources, the same way the progress figures are.
 *
 * Comment lines are dropped before counting. Every transcription opens with a
 * header explaining what its batch contains, and those headers name the macros
 * they discuss — counting them would report the prose about the reading as
 * part of the reading.
 */
const MACROS = [
  'ill',
  'uncertain',
  'struck',
  'add',
  'note',
  'marginal',
  'sketch',
  'clipping',
  'work',
];

const apparatus = {};
for (const dir of existsSync(out) ? readdirSync(out, { withFileTypes: true }) : []) {
  if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
  for (const f of readdirSync(resolve(out, dir.name))) {
    if (!/^batch-\d+\.tex$/.test(f)) continue;
    const src = readFileSync(resolve(out, dir.name, f), 'utf8')
      .split('\n')
      .filter((ln) => !ln.trimStart().startsWith('%'))
      .join('\n');
    const e = (apparatus[dir.name] ??= {
      macros: Object.fromEntries(MACROS.map((m) => [m, 0])),
      hands: {},
      tables: 0,
      rows: 0,
    });
    for (const m of MACROS) e.macros[m] += (src.match(new RegExp(`\\\\${m}\\{`, 'g')) ?? []).length;
    for (const m of src.matchAll(/\\hand\{(\w+)\}/g)) e.hands[m[1]] = (e.hands[m[1]] ?? 0) + 1;
    e.tables += (src.match(/\\begin\{ledgertable\}/g) ?? []).length;
    // A row ends at the `\\` that closes it. Counted inside the tables only,
    // so a line break in a paragraph of Jo Hopper's prose is not a ledger row.
    for (const t of src.matchAll(/\\begin\{ledgertable\}([\s\S]*?)\\end\{ledgertable\}/g)) {
      e.rows += (t[1].match(/\\\\/g) ?? []).length;
    }
  }
}

const manifest = {
  batchSize: BATCH_SIZE,
  generated: new Date().toISOString(),
  transcripts,
  declared,
  tags,
  read: readCount,
  readNotebooks,
  readNotebookRefs,
  apparatus,
};

writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

process.stdout.write(
  `manifest: ${Object.keys(transcripts).length} batch(es), ` +
    `${Object.values(readCount).reduce((a, b) => a + b, 0)} sheets transcribed, ` +
    `${Object.keys(tags).length} ledger(s) tagged\n`,
);
