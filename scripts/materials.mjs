#!/usr/bin/env node
/**
 * Builds `src/content/materials.json` — what the pictures were made of.
 *
 * ## The one field of the record that is neither a measurement nor an event
 *
 * `formats.mjs` counts the size, which is Edward Hopper's hand and measures an
 * object. `accounts.mjs` counts the money, which is Jo Hopper's hand and
 * reports an event. The paint formula is a third thing: it is **her hand
 * recording his practice**, written as consistently as the price and about
 * something no receipt could establish afterwards.
 *
 * That consistency is the whole reason this table can exist. From Book II
 * onward nearly every work leaf carries the formula in a short block of its
 * own, immediately under the title and above the description — the colourman,
 * the canvas and its priming, the white, the oil, the thinner — in the same
 * order, leaf after leaf, for thirty years. It is not prose about the picture
 * and it is not a note; it is a standing field of the record, and it is the
 * only surviving statement of what was on the palette on a given day.
 *
 * ## Read from `\hand{}` bodies and from nowhere else
 *
 * This is the single most important rule here and it is not a nicety.
 *
 * A transcription file is not all transcription. It carries `\note{}` — the
 * transcriber's own prose — and `\marginal{}`, whose body is a marginal
 * followed by an editorial gloss of where on the leaf it sits. Both discuss
 * materials constantly, because that is what a note about a paint block is
 * for: « the white changes under her hand as the batch goes on », « she writes
 * Windsor here for the colourman », « the only Winton canvas in the volume ».
 *
 * A word count that read the whole file would count all of those, and would
 * report that Winton is commoner than it is because a transcriber remarked on
 * how rare it was. So only the argument of `\hand{}` is scanned — the words
 * somebody actually wrote on the leaf — and nothing else in the file is looked
 * at at all. `\marginal{}` is excluded with the rest, which loses a handful of
 * interlined colours and is the right trade: a rule that admits an editorial
 * gloss cannot be defended anywhere.
 *
 * ## The vocabulary is closed, and its variants are hers
 *
 * A term is listed below with every spelling the leaves give it, and the
 * spellings are folded to one name for counting while the variants stay on the
 * record. `Chremnitz`, `Cremnitz` and `Crimnitz` are one white written three
 * ways; `Winsor` and `Windsor` are one colourman; `turpentine`, `tarpentine`
 * and `terpentine` are one bottle. Nothing here corrects the leaf — the
 * variants are published beside the count, so a reader can see that the fold
 * was made and what it folded.
 *
 * Words that mean a material in one sentence and something else in another are
 * **left out entirely** rather than disambiguated. « canvas » is the clearest
 * case: « single prime canvas » is a support and « One remembers this Canvas
 * as opalescent » is a judgement of a picture, and no pattern separates them
 * that would survive the next batch. The priming and the canvas maker are
 * unambiguous, so those are counted and the bare word is not.
 *
 * ## Counted per work, not per occurrence
 *
 * A leaf that writes « W \& N. » three times in four lines used one colourman,
 * not three. So the unit is the work: for each `\work{}` block, the set of
 * materials named anywhere in its `\hand{}` prose. That set is also the
 * leaf's **formula**, and the commonest complete formulae are the most direct
 * answer this archive can give to what he habitually painted with.
 *
 * ## Dating, and how little of it there is
 *
 * A material's date matters — the white and the canvas both change across the
 * 1950s, and the change is the interesting fact. But a work block states its
 * year only where she wrote « Painted in Truro studio in October 1950 », which
 * is a Book II and Book III habit and not a Book I one, or where Edward put
 * the year in the title line himself.
 *
 * So a mention is dated where one of those two says so and is **undated
 * otherwise**, and the count of each is published. The chronology below is
 * drawn from the dated ones alone and says on its face what fraction that is.
 * Guessing the rest from the sale dates on the same leaf would date a canvas by
 * the year somebody bought it.
 *
 *   npm run materials
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readTranscripts } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');

/**
 * The closed vocabulary.
 *
 * `name` is what the table calls it; `match` is a regular expression tested
 * against the plain text of a `\hand{}` body, case-insensitively. Every
 * alternative in a `match` is a spelling that is actually on a leaf — none of
 * them is a guess at one she might have used.
 *
 * The groups are the order of the formula as she writes it: who made the
 * colours, what they were laid on, which white, which oil, what thinned it.
 */
const GROUPS = [
  {
    group: 'colourman',
    label: 'Colourmen',
    note: 'Who made the paint. She names the maker before the colours on nearly every leaf that carries a formula at all.',
    materials: [
      // « W & N. » is the abbreviation she uses once the name is established
      // on a leaf, and it is the same firm; both forms fold together. The
      // ampersand is written « & » and « + » about equally and the plus is
      // hers, not a transcription convenience.
      { name: 'Winsor & Newton', match: /\bwin[sd]or\s*(?:\\?[&+]|and)\s*newton\b|\bwin[sd]or\s+newton\b|\bw\s*\.?\s*(?:\\?[&+])\s*n\s*\./i },
      { name: 'Blockx', match: /\bblockx\b/i },
      { name: 'Rembrandt', match: /\brembrandt\b|\bR\.\s+colou?rs\b/i },
      { name: "Grumbacher", match: /\bgrumbacher/i },
    ],
  },
  {
    group: 'white',
    label: 'Whites',
    note: 'The pigment that changes most across the archive, and the one she is most careful to name.',
    materials: [
      { name: 'zinc white', match: /\bzinc\s+white\b/i },
      { name: 'flake white', match: /\bflake\s+white\b/i },
      // Kremnitz white, after the Slovak town, and she never spells it that
      // way. Three spellings on the leaves, all of them hers.
      { name: 'Chremnitz white', match: /\b(?:chremnitz|cremnitz|crimnitz|chremintz)\s+white\b/i },
      { name: 'silver white', match: /\bsilver\s+white\b/i },
      // Written both ways round on different leaves and it is one thing.
      { name: 'lead white', match: /\blead\s+white\b|\bwhite\s+lead\b/i },
    ],
  },
  {
    group: 'oil',
    label: 'Oils',
    note: 'The binder. Poppy oil belongs to the earlier volumes and linseed to the later ones, and the leaves never remark on the change.',
    materials: [
      { name: 'linseed oil', match: /\blinseed\s+oil\b/i },
      { name: 'poppy oil', match: /\bpoppy\s+oil\b/i },
    ],
  },
  {
    group: 'thinner',
    label: 'Thinners',
    note: 'One bottle, three spellings.',
    materials: [{ name: 'turpentine', match: /\b(?:tur|tar|ter)pentine\b/i }],
  },
  {
    group: 'canvas',
    label: 'Canvas makers and grades',
    note: 'The maker\'s own name for the cloth, in the parenthesis after the colourman. The bare word « canvas » is not counted: it means a support in the formula and a picture in the prose.',
    materials: [
      { name: 'Herga', match: /\bherga\b/i },
      { name: 'National', match: /\(\s*national\s*\)/i },
      { name: 'Winton', match: /\bwinton\b/i },
      // Read « Fornet » on Book II leaf 31 and « Foinet » on a later leaf; one
      // canvas maker, and neither reading has settled.
      { name: 'Fornet', match: /\bfo[ri]net\b/i },
    ],
  },
  {
    group: 'priming',
    label: 'Priming',
    note: 'How many coats of ground the cloth came with. The archive turns from double to single across the middle 1950s.',
    materials: [
      { name: 'double prime', match: /\bdouble\s+prime/i },
      { name: 'single prime', match: /\bsingle\s+prime/i },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.materials.map((m) => ({ ...m, group: g.group })));

/** The year a work block states about its own making, or null. */
const paintedYear = (text) => {
  // « Painted in Truro studio in October 1950 » and « Painted in New York
  // Studio, April & May 1962 ». The year has to be on the same statement as
  // the word, so a sale date three lines below cannot supply it.
  const m = /\bpainted\b[^\n]{0,120}?\b(19[0-6]\d)\b/i.exec(text);
  return m ? Number(m[1]) : null;
};

const files = readTranscripts(root);

/**
 * One entry per `\work{}` block: the materials its own `\hand{}` prose names.
 *
 * `readTranscripts` hangs each `\hand{}` on the work it stands under, exactly
 * as it hangs table rows, so there is no second reader of the `.tex` format
 * here — which is the whole reason `lib/ledger.mjs` exists. A `\hand{}` that
 * stands before the first `\work{}` of a leaf, or on a leaf that declares no
 * work at all, belongs to no work; those are counted and reported and never
 * folded into a neighbouring work's formula.
 */
const entries = [];
let handsRead = 0;
let looseHands = 0;

for (const file of files) {
  handsRead += file.hands.length;
  looseHands += file.hands.filter((h) => h.work === null).length;
  for (const w of file.works)
    entries.push({
      ledger: w.ledger,
      batch: w.batch,
      ref: w.ref,
      leaf: w.leaf,
      title: w.read ? w.title : null,
      statedYear: w.statedYear,
      text: w.hands.map((h) => h.plain).join('\n'),
    });
}

/* ------------------------------------------------------------ the counting */

for (const e of entries) {
  e.materials = ALL.filter((m) => m.match.test(e.text)).map((m) => m.name);
  e.year = paintedYear(e.text) ?? e.statedYear ?? null;
}

const withFormula = entries.filter((e) => e.materials.length > 0);

/** Per material: how many works name it, in which volumes, over what years. */
const stats = new Map(ALL.map((m) => [m.name, { ...m, works: 0, ledgers: new Set(), years: {}, examples: [] }]));
for (const e of withFormula)
  for (const name of e.materials) {
    const s = stats.get(name);
    s.works += 1;
    s.ledgers.add(e.ledger);
    if (e.year) s.years[e.year] = (s.years[e.year] ?? 0) + 1;
    if (e.title && s.examples.length < 4) s.examples.push(e.title);
  }

/**
 * The spellings actually on the leaves, for each material.
 *
 * Collected from the text rather than declared, so a variant that appears in a
 * future batch turns up here without anybody adding it to a list. This is what
 * makes the fold auditable: the count says « Chremnitz white, 14 works » and
 * this says the fourteen leaves spell it three ways.
 */
const variantsOf = (mat) => {
  const seen = new Map();
  for (const e of withFormula) {
    if (!e.materials.includes(mat.name)) continue;
    const g = new RegExp(mat.match.source, 'gi');
    for (const hit of e.text.matchAll(g)) {
      const v = hit[0].replace(/\s+/g, ' ').trim();
      seen.set(v, (seen.get(v) ?? 0) + 1);
    }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([spelling, count]) => ({ spelling, count }));
};

const groups = GROUPS.map((g) => ({
  group: g.group,
  label: g.label,
  note: g.note,
  materials: g.materials
    .map((m) => {
      const s = stats.get(m.name);
      const years = Object.keys(s.years).map(Number).sort((a, b) => a - b);
      return {
        name: m.name,
        group: g.group,
        works: s.works,
        ledgers: [...s.ledgers].sort(),
        firstYear: years[0] ?? null,
        lastYear: years[years.length - 1] ?? null,
        years: s.years,
        variants: variantsOf(m),
        examples: s.examples,
      };
    })
    .filter((m) => m.works > 0)
    .sort((a, b) => b.works - a.works),
})).filter((g) => g.materials.length > 0);

/**
 * The whole formulae, not the ingredients.
 *
 * A leaf's formula is the set of materials it names, and the commonest sets
 * are the nearest thing the archive has to a statement of habit. Sorted into
 * the vocabulary's own order rather than alphabetically, so a formula reads
 * the way she wrote it: colourman, white, oil, thinner, canvas, priming.
 */
const order = new Map(ALL.map((m, i) => [m.name, i]));
const formulae = new Map();
for (const e of withFormula) {
  const parts = [...e.materials].sort((a, b) => order.get(a) - order.get(b));
  const key = parts.join(' · ');
  const f = formulae.get(key) ?? { formula: parts, works: 0, ledgers: new Set(), years: [], examples: [] };
  f.works += 1;
  f.ledgers.add(e.ledger);
  if (e.year) f.years.push(e.year);
  if (e.title && f.examples.length < 5) f.examples.push(e.title);
  formulae.set(key, f);
}

const allFormulae = [...formulae.values()]
  .map((f) => ({
    formula: f.formula,
    works: f.works,
    ledgers: [...f.ledgers].sort(),
    firstYear: f.years.length ? Math.min(...f.years) : null,
    lastYear: f.years.length ? Math.max(...f.years) : null,
    examples: f.examples,
  }))
  .sort((a, b) => b.works - a.works || a.formula.length - b.formula.length);

/** Which volumes carry a formula at all. Books I and V mostly do not. */
const byLedger = {};
for (const e of entries) {
  const l = (byLedger[e.ledger] ??= { works: 0, withFormula: 0, materials: {} });
  l.works += 1;
  if (e.materials.length) {
    l.withFormula += 1;
    for (const n of e.materials) l.materials[n] = (l.materials[n] ?? 0) + 1;
  }
}

const dated = withFormula.filter((e) => e.year).length;

const out = {
  basis: 'the paint formula written on the leaf, read from \\hand{} bodies only',
  note:
    'What the pictures were made of, as the leaves state it. From Book II onward nearly every ' +
    'work leaf carries a short block under the title naming the colourman, the canvas and its ' +
    'priming, the white, the oil and the thinner, in that order and in the same words for ' +
    'thirty years. It is the only surviving statement of what was on the palette on a given ' +
    'day, and unlike the size and the price it is neither a measurement of an object nor a ' +
    'report of an event: it is her hand recording his practice.',
  method:
    'Only the argument of \\hand{} is read — the words somebody wrote on the leaf. A ' +
    'transcription file also carries \\note{}, which is the transcriber\'s own prose, and ' +
    '\\marginal{}, whose body ends in an editorial gloss; both discuss materials constantly, ' +
    'and a count that read them would report that Winton is common because somebody remarked ' +
    'on how rare it is. Counted once per work, not once per mention: a leaf that abbreviates ' +
    'the colourman three times used one colourman.',
  normalisation:
    'Spellings are folded to one name for counting and published beside it. Chremnitz, ' +
    'Cremnitz and Crimnitz are one white; Winsor and Windsor one colourman; turpentine, ' +
    'tarpentine and terpentine one bottle. Nothing corrects the leaf. Words that mean a ' +
    'material in one sentence and something else in another are left out rather than guessed ' +
    'at — « canvas » is a support in the formula and a picture in the prose, so the makers and ' +
    'the priming are counted and the bare word is not.',
  dating:
    'A work is dated where she wrote « Painted in … 1950 » in the same statement, or where ' +
    'Edward put the year in the title line. Everything else is undated and stays out of the ' +
    'chronology. Dating a canvas by a sale date on the same leaf would date the paint by the ' +
    'year somebody bought the picture.',
  works: entries.length,
  worksWithFormula: withFormula.length,
  handsRead,
  looseHands,
  dated,
  undated: withFormula.length - dated,
  groups,
  formulae: allFormulae,
  byLedger,
};

writeFileSync(resolve(root, 'src/content/materials.json'), JSON.stringify(out, null, 2) + '\n');

const top = groups.flatMap((g) => g.materials).sort((a, b) => b.works - a.works);
process.stdout.write(
  `materials: ${withFormula.length} work(s) of ${entries.length} name a material, ` +
    `${handsRead} \\hand{} block(s) read\n` +
    `           commonest: ${top
      .slice(0, 4)
      .map((m) => `${m.name} (${m.works})`)
      .join(', ')}\n` +
    `           ${allFormulae.length} distinct formula(e); commonest is ${allFormulae[0]?.works ?? 0} work(s)\n` +
    `           ${dated} dated, ${withFormula.length - dated} undated\n`,
);
