#!/usr/bin/env node
/**
 * Builds `src/content/glossary.json` — the key to the abbreviations, the price
 * notations and the recurring misspellings in the ledgers.
 *
 * ## Why this has to exist, and why it cannot be prose
 *
 * The transcription **does not expand anything**. `Inv.` stays `Inv.`, `Bklyn.`
 * stays `Bklyn.`, and `30 - 1/3` stays as written, because expanding them would
 * be normalisation and normalisation is the thing this edition refuses. The
 * fidelity that makes the reading trustworthy is exactly what makes it opaque:
 * `25 - 1/10` is unreadable to anybody who has not already been told.
 *
 * Until now the key was in one place — the transcribers' working notes under
 * `.claude/` — which is not published and is not linked from anywhere a reader
 * goes. So it is published, on `/method/`, beside the account of how the
 * reading is done.
 *
 * ## Declared by hand, checked against the leaves
 *
 * `src/content/notations.json` is written by a person: what a form means is a
 * judgement and no script is going to have it. But a glossary that is only
 * written by a person drifts into **claiming terms nobody has read** — an entry
 * for a gallery that appears in no transcribed leaf, a notation somebody
 * remembers from a different archive — and a key that lists forms the corpus
 * does not contain is worse than no key, because a reader cannot tell which
 * entries are real.
 *
 * So every entry declares a pattern, and this script finds it. An entry that
 * matches nothing **fails the build**. What it writes back is where each form
 * actually occurs — ledger, leaf and ref — so the page can point at the leaf
 * that spells it that way, which is the only evidence a reader can check.
 *
 * ## It searches the leaf and not the apparatus
 *
 * The distinction the whole file rests on is between « this is how she wrote
 * it » and « this is what it means », and it would collapse immediately if a
 * `\note{}` counted as an occurrence: the notes are where *we* discuss the
 * spellings, so « Kepple » appears in them by definition, and an entry could
 * cite as evidence the sentence that was written because of it.
 *
 * `readTranscripts` gives the leaf's own writing and nothing else — the ruled
 * rows, the table headings the leaf carries, the `\work{}` titles, the
 * `\hand{}` bodies, and the part of a `\marginal{}` before the em-dash, which
 * is what stands in the margin rather than the transcriber's account of where.
 * Notes are not in it at all.
 *
 *   npm run glossary
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { leafPassages, readTranscripts } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');
const decl = JSON.parse(readFileSync(resolve(root, 'src/content/notations.json'), 'utf8'));

/* --------------------------------------------- what stands on the leaves */

// `leafPassages` is the books' own writing and nothing else, shared with the
// framing register (`scripts/framing.mjs`), which checks its entries against
// the same passages for the same reason.

const files = readTranscripts(root);
const passages = leafPassages(files);

/* ------------------------------------------------------------- the check */

const problems = [];
const entries = [];

for (const e of decl.entries) {
  for (const field of ['term', 'kind', 'written', 'means', 'match']) {
    if (!e[field]) problems.push(`${e.term ?? '(unnamed)'}: no ${field}`);
  }
  if (!['abbreviation', 'notation', 'spelling'].includes(e.kind)) {
    problems.push(`${e.term}: kind "${e.kind}" is not one of abbreviation, notation, spelling`);
  }
  if (e.kind === 'spelling' && !e.standard) {
    problems.push(`${e.term}: a spelling entry must say what the standard form is`);
  }
  let re;
  try {
    re = new RegExp(e.match, 'g');
  } catch (err) {
    problems.push(`${e.term}: ${err.message}`);
    continue;
  }

  // Where it occurs, by sheet, with the passage that shows it. One line kept
  // per sheet: a term used forty times on one leaf is one piece of evidence
  // about that leaf, not forty.
  const bySheet = new Map();
  let total = 0;
  for (const p of passages) {
    re.lastIndex = 0;
    const n = (p.text.match(re) ?? []).length;
    if (!n) continue;
    total += n;
    const key = p.ref;
    const seen = bySheet.get(key);
    if (seen) seen.count += n;
    else
      bySheet.set(key, {
        ledger: p.ledger,
        // A notebook passage carries the notebook's id, so the Method page
        // can open the page under /diaries/ rather than a ledger path.
        ...(p.notebook ? { notebook: p.notebook } : {}),
        batch: p.batch,
        leaf: p.leaf,
        ref: p.ref,
        count: n,
        // The line as the leaf has it, trimmed to something a reader can take
        // in. It is evidence, so it is quoted rather than described — and the
        // few marks that are the transcription's rather than the leaf's are
        // resolved, because a reader meeting `\\` and `''` in a quotation
        // meant to show them what she wrote is being shown the wrong thing.
        shows: p.text
          .replace(/\\\\/g, ' ')
          .replace(/``/g, '\u201c')
          .replace(/''/g, '\u201d')
          .replace(/---/g, '\u2014')
          .replace(/--/g, '\u2013')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160),
      });
  }

  if (total === 0) {
    problems.push(
      `${e.term}: /${e.match}/ matches nothing on any transcribed leaf. ` +
        'Either the pattern is wrong, or this is a term nobody has read.',
    );
    continue;
  }

  const sheets = [...bySheet.values()].sort(
    (a, b) => b.count - a.count || Number(a.ref) - Number(b.ref),
  );
  entries.push({
    ...e,
    count: total,
    sheets: sheets.length,
    // Enough to point at, not the whole concordance: the site links the leaf
    // that shows it, and the corpus is searchable for the rest.
    seen: sheets.slice(0, 4),
  });
}

if (problems.length) {
  process.stderr.write(`glossary: ${problems.length} problem(s)\n`);
  for (const p of problems) process.stderr.write(`  ${p}\n`);
  process.exit(1);
}

const order = { abbreviation: 0, notation: 1, spelling: 2 };
entries.sort(
  (a, b) =>
    order[a.kind] - order[b.kind] ||
    (a.sort ?? a.term).localeCompare(b.sort ?? b.term, 'en', { sensitivity: 'base' }),
);

const out = {
  note: decl.note,
  means: decl.means,
  entries,
};
writeFileSync(resolve(root, 'src/content/glossary.json'), `${JSON.stringify(out, null, 2)}\n`);

const kinds = entries.reduce((m, e) => ({ ...m, [e.kind]: (m[e.kind] ?? 0) + 1 }), {});
process.stdout.write(
  `glossary: ${entries.length} entr(ies) — ` +
    Object.entries(kinds)
      .map(([k, n]) => `${n} ${k}`)
      .join(', ') +
    `; every one found on a transcribed leaf\n`,
);
