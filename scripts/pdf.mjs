#!/usr/bin/env node
/**
 * Compiles each transcription to the PDF the download row offers, and binds
 * the notes on its works in behind it.
 *
 * Needs a LaTeX engine with `fontspec` — XeLaTeX, LuaLaTeX or Tectonic — and
 * exits quietly if there is none. Nothing else in the project depends on this:
 * browsing the archive, reading a transcript beside its photograph, and
 * extracting records all work without a TeX installation, and requiring one to
 * run the site would be a needless barrier to the people most likely to spot a
 * misreading.
 *
 *   brew install --cask mactex-no-gui     # or: brew install tectonic
 *   npm run pdf
 */
import {
  readdirSync,
  existsSync,
  mkdtempSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, execSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'transcripts');
const out = resolve(root, 'public/transcripts');

/* ------------------------------------------------- the notes appendix */

/**
 * The notes are bound into the PDF here rather than written into the `.tex`.
 *
 * `src/content/work-notes.json` is the single source of them: the site reads
 * it, `npm run notes` refuses a claim in it whose source does not resolve, and
 * this reads the same file so that a note cannot say one thing on screen and
 * another on paper. Writing them into the transcriptions instead would put a
 * sentence somebody inferred inside the document whose whole authority is that
 * nothing in it was inferred — and would need the `.tex` re-edited every time a
 * museum record was retrieved.
 *
 * What the batch gets is the notes on the works *its own leaves name*, which
 * `works.json` already knows: `namedIn` carries the ledger and batch of every
 * leaf a work appears on. So a note on Sailing is bound into both Book I batch
 * 5 and Book II batch 5, because the canvas is on a leaf of each, and a batch
 * whose works have earned no notes gets no appendix.
 */
const json = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const works = json('src/content/works.json');
const notesFile = json('src/content/work-notes.json');
const NOTES = notesFile.notes ?? {};
const SOURCES = notesFile.sources ?? {};

/** Where the leaves live, for the `ledger:` claims. Same host as the sitemap. */
const SITE = 'https://hopper.commutator.io';

/**
 * `book-ii` → `Book II`, read out of the generated catalogue rather than
 * transformed from the directory name, because the transform that gets the
 * first five right turns `dealers` into « Dealers » where the volume is called
 * « Dealers/Etchings ». Falls back to the directory name if the shape of the
 * generated file ever changes, which is a worse label and not a wrong one.
 */
const LEDGER_SHORT = (() => {
  const m = new Map();
  const ts = resolve(root, 'src/content/catalogue.ts');
  if (existsSync(ts)) {
    const s = readFileSync(ts, 'utf8');
    for (const [, id, short] of s.matchAll(/id: '([^']+)',[\s\S]{0,600}?short: '([^']+)'/g)) {
      if (!m.has(id)) m.set(id, short);
    }
  }
  return m;
})();

/**
 * Every transcribed leaf, indexed by `<ledger>/<leaf>`, so a `ledger:` claim
 * becomes an address a reader can type. The lookup is global on purpose: the
 * strongest notes are the ones that join two sheets, so a note on Night Hawks
 * cites leaf 25, which is Compartment C's leaf. `scripts/notes.mjs` validates
 * them against the same set.
 */
const LEAVES = new Map();
for (const w of works.index) {
  for (const n of w.namedIn) {
    if (n.leaf === null) continue;
    const k = `${n.ledger}/${n.leaf}`;
    if (!LEAVES.has(k)) LEAVES.set(k, n);
  }
}

/** Prose into TeX. The notes quote her figures, so `$`, `&` and `%` are all in. */
const tex = (s) =>
  String(s)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}');

/** A URL as `\href` takes its target: only `#` and `%` need saying. */
const target = (u) => u.replace(/([#%])/g, '\\$1');

/** A URL as it is shown, breakable after the punctuation TeX may break on. */
const shown = (u) => tex(u).replace(/([/.?&=])/g, '$1\\allowbreak{}');

const link = (url, label) => `\\href{${target(url)}}{${label}, \\texttt{${shown(url)}}}`;

/** What a claim's `source` resolves to, printed. */
function cite(source) {
  if (source.startsWith('ledger:')) {
    const ref = source.slice('ledger:'.length);
    const [ledger, leaf] = ref.split('/');
    const at = LEAVES.get(ref);
    const label = `${tex(LEDGER_SHORT.get(ledger) ?? ledger)} leaf ${tex(leaf)}`;
    if (!at) return label;
    return link(`${SITE}/${ledger}/#${ledger}/${at.batch}/${at.ref}`, label);
  }
  const s = SOURCES[source];
  if (!s) return tex(source);
  return link(s.url, tex(s.name));
}

/**
 * The appendix for one batch, or the empty string where it has earned none.
 */
function appendix(ledger, batch) {
  const rows = works.index
    .filter((w) => NOTES[w.key])
    .filter((w) => w.namedIn.some((n) => n.ledger === ledger && n.batch === batch));
  if (!rows.length) return '';

  const out = ['', '\\notesappendix'];
  for (const w of rows) {
    const note = NOTES[w.key];
    out.push('', `\\worknote{${tex(w.title)}}{${tex(note.note)}}`);
    for (const c of note.claims ?? []) {
      out.push(`\\workclaim{${tex(c.says)}}{${cite(c.source)}}`);
    }
    if (note.written || note.model) {
      out.push(`\\worknoteby{${tex(note.written ?? 'an unrecorded day')}}{${tex(note.model ?? 'an unrecorded model')}}`);
    }
  }
  return out.join('\n') + '\n';
}

const has = (cmd) => {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const engine = ['tectonic', 'xelatex', 'lualatex'].find(has);
if (!engine) {
  process.stdout.write(
    'pdf: no LaTeX engine found — skipping.\n' +
      '     brew install tectonic   (or: brew install --cask mactex-no-gui)\n',
  );
  process.exit(0);
}

if (!existsSync(src)) process.exit(0);

let n = 0;
for (const d of readdirSync(src, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name === 'preamble') continue;
  for (const f of readdirSync(resolve(src, d.name))) {
    if (!f.endsWith('.tex')) continue;

    // Compiled in a scratch directory with the preamble copied in beside it,
    // so `\input{../preamble/hopper}` resolves and no `.aux` litter lands in
    // the repository. The watermark needs the aux-file round trip that
    // `remember picture` requires, which is why the engine runs twice where it
    // does not manage its own passes.
    const work = mkdtempSync(resolve(tmpdir(), 'hopper-pdf-'));
    mkdirSync(resolve(work, 'preamble'), { recursive: true });
    copyFileSync(
      resolve(src, 'preamble/hopper.sty'),
      resolve(work, 'preamble/hopper.sty'),
    );
    mkdirSync(resolve(work, d.name), { recursive: true });

    // The scratch copy is where the notes are bound in, so `transcripts/` is
    // never written to: the transcription on disk stays the transcription, and
    // `git status` after a compile says nothing has changed, which is how a
    // reader can tell the appendix is derived and not edited in.
    const source = readFileSync(resolve(src, d.name, f), 'utf8');
    const notes = appendix(d.name, Number(/batch-(\d+)/.exec(f)?.[1]));
    const end = source.lastIndexOf('\\end{document}');
    if (notes && end === -1) {
      process.stderr.write(
        `  ${d.name}/${f}: no \\end{document} to bind the notes in front of; ` +
          `compiled without its appendix\n`,
      );
      process.exitCode = 1;
    }
    writeFileSync(
      resolve(work, d.name, f),
      notes && end !== -1
        ? source.slice(0, end) + notes + source.slice(end)
        : source,
    );

    const args =
      engine === 'tectonic'
        ? ['--keep-logs', '--outdir', work, resolve(work, d.name, f)]
        : ['-interaction=nonstopmode', '-halt-on-error', '-output-directory', work, resolve(work, d.name, f)];

    try {
      execFileSync(engine, args, { cwd: work, stdio: 'pipe' });
      if (engine !== 'tectonic') execFileSync(engine, args, { cwd: work, stdio: 'pipe' });
    } catch (e) {
      process.stderr.write(`  ${d.name}/${f}: ${engine} failed\n`);
      const log = (e.stdout ?? Buffer.from('')).toString();
      // The last twenty lines are where the error is; the first two thousand
      // are the font cache.
      process.stderr.write(log.split('\n').slice(-20).join('\n') + '\n');
      process.exitCode = 1;
      continue;
    }

    const pdf = resolve(work, basename(f).replace(/\.tex$/, '.pdf'));
    if (!existsSync(pdf)) {
      process.stderr.write(`  ${d.name}/${f}: no PDF produced\n`);
      continue;
    }
    // An overfull box in a transcription hides content, so it is a failure and
    // not a cosmetic complaint. Reported here rather than left in a log nobody
    // opens — and the reason `ledgertable` uses `X` columns is that a table of
    // natural-width `l` columns overflows the page while TeX stays *silent*,
    // because nothing ever asked the row to fit.
    const log = resolve(work, basename(f).replace(/\.tex$/, '.log'));
    const boxes = existsSync(log)
      ? readFileSync(log, 'utf8')
          .split('\n')
          .filter((l) => l.startsWith('Overfull \\hbox'))
      : [];
    if (boxes.length) {
      process.stderr.write(
        `  ${d.name}/${f}: ${boxes.length} overfull box(es) — a line runs past the ` +
          `right margin, which in a transcription hides content:\n` +
          boxes.slice(0, 5).map((b) => `      ${b}\n`).join(''),
      );
      process.exitCode = 1;
    }

    const dest = resolve(out, d.name);
    mkdirSync(dest, { recursive: true });
    copyFileSync(pdf, resolve(dest, basename(pdf)));
    n++;
    process.stdout.write(`  ${d.name}/${basename(pdf)}\n`);
  }
}
process.stdout.write(`pdf: ${n} file(s), engine ${engine}\n`);
