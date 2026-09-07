#!/usr/bin/env node
/**
 * Builds `src/content/formats.json` — the sizes the works were made at.
 *
 * ## Whose figure this is, and why it is the one worth counting
 *
 * The size is the one thing on these leaves that **Edward Hopper wrote
 * himself**. The inside cover of Book I says so: Jo Hopper recorded each work
 * as it was finished, and « Drawings in the 3 books done by Edward Hopper » —
 * the record drawing, and beside it the title and the dimensions in his drawn
 * lettering. Every other column here is hers. So a table of formats is the
 * only table in this repository built out of his hand rather than hers.
 *
 * It is also the only quantity in the archive that is not a claim about the
 * world. A price can be misremembered and a buyer can be written two ways, but
 * « 28 x 40 » is a measurement of an object that was standing in the room.
 *
 * ## Read from the `\work{}` heading, and from nowhere else
 *
 * The heading is where the artist put it. Sizes also turn up in the prose —
 * « plate 7 x 8 3/8 as before », « same size as the Truro one » — and those are
 * remarks about a size rather than statements of one, so they are not read. A
 * heading that carries no size is **reported, not skipped**: the count of them
 * is the denominator of everything below, and it is on the page.
 *
 * ## Nothing is normalised, and that is the whole design
 *
 * `23 1/2 x 28` and `23 1/2 x 28 3/4` are two formats here, because they are
 * two things she wrote. Rounding them together would be inventing a standard
 * size that the leaves do not record, and the interesting question — how much
 * Hopper worked to a small set of repeated formats — is exactly the question
 * that rounding would answer in advance.
 *
 * The fractions are parsed to numbers so the shapes can be plotted, and the
 * label always keeps the figures as written. The number is for the picture;
 * the string is the record.
 *
 * The first figure is not swapped with the second. She writes height then
 * width throughout, so `28 x 40` is a landscape canvas and `35 x 60` a very
 * wide one, and a table that sorted the pair would lose the orientation, which
 * is half of what a format is.
 *
 *   npm run formats
 */
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readTranscripts, plainOf, titleOf, isReadTitle } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');

/**
 * A dimension as the leaves write it: a whole number, optionally with a
 * vulgar fraction after a space. `10 1/2`, `8 3/8`, `28`.
 */
const DIM = '(\\d{1,3})(?:\\s+(\\d)\\s*/\\s*(\\d))?';
const SIZE = new RegExp(`(±\\s*)?${DIM}\\s*["″”']?\\s*[x×]\\s*${DIM}\\s*["″”']?`);

const valueOf = (whole, num, den) =>
  Number(whole) + (num && den ? Number(num) / Number(den) : 0);

/** The figures as written, so the label is the leaf's own string. */
const written = (whole, num, den) => (num && den ? `${whole} ${num}/${den}` : `${whole}`);

const files = readTranscripts(root);

const headings = [];
for (const file of files) {
  const src = readFileSync(file.path, 'utf8');
  // The leaf a heading stands on, so an unparsed one can be pointed at. The
  // `\sheet{}` before it in the source is the leaf it belongs to.
  let leaf = null;
  let ref = null;
  const body = src.slice(src.indexOf('\\begin{document}'));
  const marks = [...body.matchAll(/\\sheet\{(\d+)\}\{([^}]*)\}|\\work\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
  for (const m of marks) {
    if (m[1] !== undefined) {
      ref = Number(m[1]);
      leaf = m[2].trim() || null;
      continue;
    }
    headings.push({ ledger: file.ledger, batch: file.batch, ref, leaf, raw: m[3] });
  }
}

const sizes = new Map();
const unsized = [];

for (const h of headings) {
  const text = plainOf(h.raw);
  const m = SIZE.exec(text);
  if (!m) {
    unsized.push({
      ledger: h.ledger,
      leaf: h.leaf,
      ref: h.ref,
      title: isReadTitle(h.raw) ? titleOf(h.raw) : null,
      heading: text.slice(0, 90),
    });
    continue;
  }
  const approx = Boolean(m[1]);
  const height = valueOf(m[2], m[3], m[4]);
  const width = valueOf(m[5], m[6], m[7]);
  // A figure outside this range is not a picture. The smallest plate in the
  // archive is 4 x 5 and the widest canvas 35 x 60; anything beyond is a
  // catalogue number or a date that fell into the pattern, and it is reported
  // rather than plotted.
  if (height < 2 || width < 2 || height > 120 || width > 120) {
    unsized.push({
      ledger: h.ledger,
      leaf: h.leaf,
      ref: h.ref,
      title: isReadTitle(h.raw) ? titleOf(h.raw) : null,
      heading: text.slice(0, 90),
      reason: 'a pair of figures in the shape of a size, but not a plausible one',
    });
    continue;
  }
  // « ± 11 x 6 » on Book I leaf 45 heads a group of Paris watercolours rather
  // than one sheet, and the sign is hers. It is counted and flagged; dropping
  // the ± would turn an approximation into a measurement.
  const label =
    (approx ? '± ' : '') +
    `${written(m[2], m[3], m[4])} × ${written(m[5], m[6], m[7])}`;
  const s = sizes.get(label) ?? {
    label,
    height,
    width,
    count: 0,
    approx,
    ledgers: new Set(),
    works: [],
  };
  s.count += 1;
  s.ledgers.add(h.ledger);
  if (isReadTitle(h.raw)) {
    const t = titleOf(h.raw);
    if (!s.works.includes(t)) s.works.push(t);
  }
  sizes.set(label, s);
}

const all = [...sizes.values()]
  .map((s) => ({
    label: s.label,
    height: s.height,
    width: s.width,
    count: s.count,
    approx: s.approx,
    // Height against width, as she wrote them. Square is its own answer and
    // not a rounding of either neighbour.
    orientation: s.height === s.width ? 'square' : s.height < s.width ? 'landscape' : 'portrait',
    ratio: Number((s.width / s.height).toFixed(3)),
    ledgers: [...s.ledgers].sort(),
    works: s.works.sort(),
  }))
  .sort((a, b) => b.count - a.count || a.height * a.width - b.height * b.width);

const counted = all.reduce((n, s) => n + s.count, 0);
const repeated = all.filter((s) => s.count > 1);
const once = all.filter((s) => s.count === 1);

const byOrientation = ['landscape', 'portrait', 'square'].map((o) => ({
  orientation: o,
  formats: all.filter((s) => s.orientation === o).length,
  works: all.filter((s) => s.orientation === o).reduce((n, s) => n + s.count, 0),
}));

// Which volumes a format is written in. A volume is a medium, roughly — the
// etchings in Book I, the oils in Books II and III — and saying which book a
// size belongs to is observed, where saying which medium would be inferred.
const byLedger = {};
for (const s of all)
  for (const l of s.ledgers) (byLedger[l] ??= []).push({ label: s.label, count: s.count });
for (const l of Object.keys(byLedger)) byLedger[l].sort((a, b) => b.count - a.count);

const out = {
  basis: 'the size written in the \\work{} heading, in Edward Hopper\'s hand',
  note:
    'The size is the one figure on these leaves the artist wrote himself — the inside cover of ' +
    'Book I says the drawings and their lettering are his and everything else is hers — and it ' +
    'is the only quantity in the archive that measures an object rather than reporting an ' +
    'event. Read from the heading only: sizes mentioned in the prose are remarks about a size ' +
    'rather than statements of one.',
  normalisation:
    'Nothing is rounded and nothing is reordered. 23 1/2 × 28 and 23 1/2 × 28 3/4 are two ' +
    'formats because they are two things she wrote, and the first figure stays the first ' +
    'figure — she writes height then width, so 35 × 60 is a very wide canvas and not a tall ' +
    'one. The fractions are parsed to numbers so the shapes can be plotted; the label keeps ' +
    'the figures as written.',
  headings: headings.length,
  counted,
  formats: all.length,
  repeated: repeated.length,
  onceOnly: once.length,
  byOrientation,
  sizes: all,
  byLedger,
  unsized: {
    count: unsized.length,
    note:
      'Work headings that state no size. Most are running-list leaves where the title stands ' +
      'alone and the measurement is in a column of its own, and a few are titles read only in ' +
      'part. Reported because they are the denominator: a format table drawn from the headings ' +
      'that happen to carry a size says nothing until you know how many did not.',
    sample: unsized.slice(0, 25),
  },
};

writeFileSync(resolve(root, 'src/content/formats.json'), JSON.stringify(out, null, 2) + '\n');

process.stdout.write(
  `formats: ${counted} sized heading(s) of ${headings.length}, in ${all.length} distinct format(s)\n` +
    `         ${repeated.length} used more than once, ${once.length} used once\n` +
    `         commonest: ${all
      .slice(0, 3)
      .map((s) => `${s.label} (${s.count})`)
      .join(', ')}\n` +
    `         ${unsized.length} heading(s) state no size, reported not dropped\n`,
);
