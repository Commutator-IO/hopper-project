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
      const m = /^batch-(\d+)\.(html|tex|pdf|xml)$/.exec(f);
      if (!m) continue;
      const key = `${ledger}#${Number(m[1])}`;
      const e = (transcripts[key] ??= { html: false, tex: false, pdf: false, xml: false });
      e[m[2]] = true;
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
for (const [ledger, set] of seen) readCount[ledger] = set.size;

/**
 * Tags, from the `\keywords{}` line each transcription carries.
 *
 * The single source, and there is deliberately no tags file: a tag can only
 * exist because somebody wrote it after reading the sheets, so no tag can
 * describe material nobody has read.
 */
for (const dir of existsSync(out) ? readdirSync(out, { withFileTypes: true }) : []) {
  if (!dir.isDirectory() || dir.name.startsWith('_')) continue;
  for (const f of readdirSync(resolve(out, dir.name))) {
    if (!f.endsWith('.tex')) continue;
    const src = readFileSync(resolve(out, dir.name, f), 'utf8');
    for (const m of src.matchAll(/\\keywords\{([^}]*)\}/g)) {
      const set = new Set(tags[dir.name] ?? []);
      // The line wraps in the source, and a keyword split across two lines
      // arrived as « E.\nWeyhe » and sorted under E rather than beside the
      // other dealers.
      const line = m[1].replace(/\s+/g, ' ');
      for (const t of line.split(',').map((s) => s.trim()).filter(Boolean)) set.add(t);
      tags[dir.name] = [...set].sort();
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
};

writeFileSync(resolve(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

process.stdout.write(
  `manifest: ${Object.keys(transcripts).length} batch(es), ` +
    `${Object.values(readCount).reduce((a, b) => a + b, 0)} sheets transcribed, ` +
    `${Object.keys(tags).length} ledger(s) tagged\n`,
);
