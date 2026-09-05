#!/usr/bin/env node
/**
 * Compiles each transcription to the PDF the download row offers.
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
} from 'node:fs';
import { resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, execSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const src = resolve(root, 'transcripts');
const out = resolve(root, 'public/transcripts');

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
    copyFileSync(resolve(src, d.name, f), resolve(work, d.name, f));

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
