#!/usr/bin/env node
/**
 * Checks `src/content/work-notes.json` — the per-work notes `/modernize-hopper`
 * writes.
 *
 * ## Why a note needs checking and a transcription does not
 *
 * A transcription is checkable by looking: the photograph is in the other
 * pane, and `npm run render` can verify the things that are mechanical — that
 * the sheets are in order, that a leaf number matches the catalogue. The
 * reader does the rest with their eyes.
 *
 * A note has no photograph. It is the only prose on this site that a reader
 * cannot check by looking at the sheet, so the whole of its trustworthiness
 * sits in the sources it names — and a source key that does not resolve is
 * therefore not a cosmetic problem. It is a sentence with the archive's
 * authority behind it and nothing underneath. This script fails on one.
 *
 * Four things must hold:
 *
 * 1. every key in `notes` is a work the transcriptions actually name, so a
 *    note can never annotate a leaf nobody has read;
 * 2. every claim's `source` resolves — either to an entry in `sources`, or to
 *    a `ledger:<ledger>/<leaf>` that the catalogue really contains;
 * 3. every note has at least one claim, because an unsourced note is the thing
 *    this whole arrangement exists to prevent;
 * 4. no source is declared and left unused, which is usually the trace of a
 *    claim that was edited away.
 *
 *   npm run notes
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const notesFile = read('src/content/work-notes.json');
const works = read('src/content/works.json');

const named = new Set(works.index.map((w) => w.key));
const sources = notesFile.sources ?? {};
const notes = notesFile.notes ?? {};

// The leaves the transcriptions actually carry, for `ledger:` references.
const leaves = new Set();
for (const w of works.index) for (const n of w.namedIn) leaves.add(`${n.ledger}/${n.leaf}`);

const problems = [];
const usedSources = new Set();

for (const [key, note] of Object.entries(notes)) {
  if (!named.has(key)) {
    problems.push(
      `note "${key}" names no work in the index — the transcriptions do not mention it, ` +
        `so there is no leaf for a reader to check it against`,
    );
  }
  const claims = note.claims ?? [];
  if (!claims.length) {
    problems.push(`note "${key}" has no claims; a note with no source is not a note`);
  }
  if (!note.note || !String(note.note).trim()) {
    problems.push(`note "${key}" has no text`);
  }
  for (const c of claims) {
    const s = c.source;
    if (!s) {
      problems.push(`note "${key}" has a claim with no source: ${JSON.stringify(c.says ?? c)}`);
      continue;
    }
    if (s.startsWith('ledger:')) {
      const ref = s.slice('ledger:'.length);
      if (!leaves.has(ref)) {
        problems.push(
          `note "${key}" cites ${s}, but no transcribed leaf of that name names this work`,
        );
      }
      continue;
    }
    if (!sources[s]) {
      problems.push(`note "${key}" cites source "${s}", which is not declared in sources`);
      continue;
    }
    if (!sources[s].url || !sources[s].name) {
      problems.push(`source "${s}" needs both a name and a url`);
    }
    usedSources.add(s);
  }
}

for (const s of Object.keys(sources)) {
  if (!usedSources.has(s)) problems.push(`source "${s}" is declared but no claim cites it`);
}

if (problems.length) {
  process.stderr.write('notes: refusing to pass\n');
  for (const p of problems) process.stderr.write(`  - ${p}\n`);
  process.exit(1);
}

const claims = Object.values(notes).reduce((n, x) => n + (x.claims?.length ?? 0), 0);
process.stdout.write(
  `notes: ${Object.keys(notes).length} note(s), ${claims} claim(s), ` +
    `${Object.keys(sources).length} source(s), all resolving\n`,
);
