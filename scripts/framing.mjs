#!/usr/bin/env node
/**
 * Builds `src/content/framing.json` — what the black notebook says about
 * frames, finishes, papers and supports.
 *
 * ## The specification the ledgers stop short of
 *
 * Under a work's title the ledgers give its size and its paint formula, and
 * `scripts/formats.mjs` and `scripts/materials.mjs` count those. Nothing in
 * six volumes says what a picture was framed in or what a water colour was
 * painted on. Josephine Hopper's black notebook does — it is a studio
 * memorandum book, and between 1948 and 1961 she wrote down frame makers
 * and their bills, the frames in the rack by size and by the picture they
 * fitted, what a frame shows of a canvas, the sheet sizes and prices of
 * water colour paper and mat board, and how to finish a plain wood frame.
 *
 * ## Declared by hand, checked against the page
 *
 * `src/content/frames.json` is the glossary's design applied to the notebook:
 * each entry is written by a person and carries a pattern, and this script
 * finds the pattern on the notebook's transcribed pages. An entry that
 * matches nothing **fails the build** — a register of frame makers nobody has
 * read would be worse than none. What it writes back is where each entry
 * occurs: the page, the ref, and the line as she wrote it, so the site can
 * open the reader at that sheet.
 *
 * It reads the black notebook only. The other three notebooks are diaries
 * and a campaign, and a frame named in a diary entry is a remark, not a
 * memorandum. The sizes here are of frames and mats and are **not** added to
 * the formats census, which stays Edward Hopper's hand.
 *
 *   npm run framing
 *   npm run spending
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { leafPassages, readTranscripts } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');

/**
 * The registers this runs, by name. `framing` is the frames and papers;
 * `spending` is every sum the notebook states — the costs the ledgers never
 * record, for the Accounts page. Same design, same check, different file.
 */
const REGISTERS = {
  framing: { decl: 'src/content/frames.json', out: 'src/content/framing.json' },
  spending: { decl: 'src/content/spending.json', out: 'src/content/spent.json' },
};
const NAME = process.argv[2] ?? 'framing';
const REG = REGISTERS[NAME];
if (!REG) {
  process.stderr.write(`usage: node scripts/framing.mjs <${Object.keys(REGISTERS).join('|')}>\n`);
  process.exit(1);
}
const decl = JSON.parse(readFileSync(resolve(root, REG.decl), 'utf8'));
const NOTEBOOK = 'black-notebook';

const passages = leafPassages(readTranscripts(root)).filter((p) => p.notebook === NOTEBOOK);

const problems = [];
const entries = [];
const pages = new Set();

for (const e of decl.entries) {
  for (const field of ['term', 'kind', 'written', 'means', 'match']) {
    if (!e[field]) problems.push(`${e.term ?? '(unnamed)'}: no ${field}`);
  }
  if (!decl.kinds[e.kind]) problems.push(`${e.term}: kind "${e.kind}" is not declared`);
  let re;
  try {
    re = new RegExp(e.match, 'g');
  } catch (err) {
    problems.push(`${e.term}: ${err.message}`);
    continue;
  }

  const bySheet = new Map();
  let total = 0;
  for (const p of passages) {
    re.lastIndex = 0;
    const n = (p.text.match(re) ?? []).length;
    if (!n) continue;
    total += n;
    const seen = bySheet.get(p.ref);
    if (seen) seen.count += n;
    else
      bySheet.set(p.ref, {
        page: p.leaf,
        ref: p.ref,
        count: n,
        // The line as the page has it — evidence, so quoted. A recipe is
        // quoted whole; a line of a list is cut to what a reader takes in.
        shows: p.text
          .replace(/\\\\/g, ' ')
          .replace(/``/g, '“')
          .replace(/''/g, '”')
          .replace(/---/g, '—')
          .replace(/--/g, '–')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, e.kind === 'recipe' ? 400 : 160),
      });
  }

  if (total === 0) {
    problems.push(
      `${e.term}: /${e.match}/ matches nothing on any transcribed page of the ${NOTEBOOK}. ` +
        'Either the pattern is wrong, or this is a term nobody has read.',
    );
    continue;
  }

  const sheets = [...bySheet.values()].sort(
    (a, b) => b.count - a.count || Number(a.ref) - Number(b.ref),
  );
  for (const s of sheets) pages.add(s.ref);
  entries.push({ ...e, count: total, sheets: sheets.length, seen: sheets.slice(0, 4) });
}

if (problems.length) {
  process.stderr.write(`${NAME}: ${problems.length} problem(s)\n`);
  for (const p of problems) process.stderr.write(`  ${p}\n`);
  process.exit(1);
}

const order = Object.keys(decl.kinds);
entries.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

const out = {
  note: decl.note,
  notebook: NOTEBOOK,
  kinds: decl.kinds,
  // Observed, never typed in: how many pages of the notebook carry at least
  // one of these lines, and how many it has been read.
  pages: pages.size,
  pagesRead: new Set(passages.map((p) => p.ref)).size,
  entries,
};
writeFileSync(resolve(root, REG.out), `${JSON.stringify(out, null, 2)}\n`);

const kinds = entries.reduce((m, e) => ({ ...m, [e.kind]: (m[e.kind] ?? 0) + 1 }), {});
process.stdout.write(
  `${NAME}: ${entries.length} entr(ies) on ${pages.size} page(s) of the ${NOTEBOOK} — ` +
    Object.entries(kinds)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ') +
    `; every one found on a transcribed page\n`,
);
