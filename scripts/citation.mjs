#!/usr/bin/env node
/**
 * Writes `CITATION.cff`, `codemeta.json` and `.zenodo.json` — how to cite this
 * corpus, and what a machine should know about it.
 *
 * ## Why these are generated and not typed
 *
 * Every figure in them is a count of something in the repository: how many
 * sheets are transcribed, how many batches, which volumes, when the last pass
 * ran. A hand-written citation file states those once and is wrong from the
 * next batch onward, and a metadata record that says 499 sheets when 511 are
 * read is worse than none — it is a number somebody will quote.
 *
 * So the counts are read off `public/transcripts/manifest.json`, which is
 * itself read off the files, and the release date is the latest `Pass:` line
 * in the corpus rather than the clock. That last part matters more than it
 * looks: it makes this build **deterministic**, so CI can rebuild these three
 * files and fail if they have drifted, the way it already does for
 * `src/content/catalogue.ts`. A generator that stamped today's date could
 * never be checked that way.
 *
 * ## Three files because there are three questions
 *
 * `CITATION.cff` cites **the corpus** — a dataset, which is what a reader
 * quoting a reading is citing, and what GitHub's « Cite this repository »
 * button and every reference manager will read. `codemeta.json` describes
 * **the software** that produced it. `.zenodo.json` is what Zenodo reads when
 * a release is archived, and it exists so the deposit's metadata is this
 * repository's own rather than whatever Zenodo infers from a tarball.
 *
 * ## What is deliberately not in them
 *
 * The Hoppers are not listed as authors. They wrote the ledgers; they did not
 * make this corpus, and a citation file that named them would be claiming
 * their endorsement of an unauthorised transcription. They appear where they
 * belong — in `references`, as the authors of the source object, with the
 * Whitney's accession numbers — and the rights position is in `RIGHTS.md`.
 *
 *   npm run citation
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

/**
 * The concept DOI Zenodo mints when the repository is first archived.
 *
 * Null until that happens, and null rather than a placeholder on purpose: a
 * citation file carrying a DOI that resolves to nothing is a worse failure
 * than one carrying none, because the reader has no way to tell. When Zenodo
 * is linked and the first release is archived, put the **concept** DOI here —
 * the one that always resolves to the newest version — not a version DOI.
 * `docs/preservation.md` says what to do and in what order.
 */
const CONCEPT_DOI = null;

const manifest = read('public/transcripts/manifest.json');

/* ------------------------------------------------------ what is here now */

const passes = Object.values(manifest.transcripts)
  .map((t) => t.pass)
  .filter(Boolean);
const dates = passes.map((p) => p.date).filter(Boolean).sort();
const released = dates[dates.length - 1];
if (!released) throw new Error('citation: no Pass: date anywhere — run npm run manifest first');

const models = [...new Set(passes.map((p) => p.model).filter(Boolean))].sort();
const batches = Object.keys(manifest.transcripts).length;
const sheetsRead = Object.values(manifest.read).reduce((a, b) => a + b, 0);
const volumes = Object.keys(manifest.read).length;

// The sheets the archive holds, counted the same way the catalogue counts
// them: one line per sheet in the generated inventory.
const catalogue = readFileSync(resolve(root, 'src/content/catalogue.ts'), 'utf8');
// The ledgers only: the notebooks catalogued after them are another document,
// not transcribed and not what this citation describes.
const ledgerPart = catalogue.split('export const NOTEBOOKS')[0];
const sheetsAll = (ledgerPart.match(/^\s*\{ ref:/gm) ?? []).length;
if (sheetsAll === 0) throw new Error('citation: no sheets in catalogue.ts — run npm run catalogue');

/**
 * The version, as a date rather than a number.
 *
 * There is no software release here to number. What changes is how much of the
 * archive has been read, and that advances a batch at a time on no schedule at
 * all, so a semantic version would be three digits of theatre. The date of the
 * most recent pass says the one true thing: this is the corpus as it stood on
 * that day. A second pass on the same day makes the same version, which is
 * correct — the corpus is the same size and was read by the same model.
 */
const version = released.replace(/-/g, '.');

const TITLE = 'The Edward and Josephine Hopper artist’s ledgers: a reading and transcription';
const SITE = 'https://hopper.commutator.io';
const REPO = 'https://github.com/Commutator-IO/hopper-project';

const ABSTRACT =
  `A machine transcription of the six artist's ledgers kept by Edward and Josephine ` +
  `Hopper, Whitney Museum of American Art 96.208 to 96.213, published beside the ` +
  `museum's own photograph of each sheet so that any reading can be checked against ` +
  `the hand it came from. ${sheetsRead} of ${sheetsAll} digitised sheets are ` +
  `transcribed, in ${batches} batches across ${volumes} volumes, as of ${released}. ` +
  `Each transcription records the model and date of the pass that produced it, marks ` +
  `what was illegible rather than conjecturing it, and attributes each passage to a ` +
  `hand. No transcription here is an edition, and the text transcribed is not the ` +
  `maintainers' to license: see RIGHTS.md.`;

const KEYWORDS = [
  'Edward Hopper',
  'Josephine Nivison Hopper',
  'artists’ ledgers',
  'art market',
  'provenance',
  'manuscript transcription',
  'palaeography',
  'TEI',
  'digital humanities',
  'Whitney Museum of American Art',
];

const AUTHORS = [
  {
    family: 'Hua',
    given: 'Michel',
    email: 'michel@commutator.io',
    affiliation: 'Commutator',
  },
];

/* ------------------------------------------------------------ CITATION.cff */

const yamlString = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
// CFF is YAML, and an abstract of several sentences is the one field long
// enough to want folding. Folded scalars re-wrap on read and would eat the
// spacing, so it is written as one quoted line: ugly in the file, identical
// after parsing, which is the property that matters for a metadata record.
const cff = [
  '# Generated by `npm run citation`. Do not edit: the counts in it are read',
  '# off public/transcripts/manifest.json and would drift the next time a batch',
  '# lands. CI rebuilds this file and fails if it differs.',
  'cff-version: 1.2.0',
  `message: ${yamlString('If you cite a reading from this corpus, cite the corpus and the sheet both — the object clause is the Whitney’s and stays true, the reading clause is ours and is dated.')}`,
  'type: dataset',
  `title: ${yamlString(TITLE)}`,
  `abstract: ${yamlString(ABSTRACT)}`,
  'authors:',
  ...AUTHORS.flatMap((a) => [
    `  - family-names: ${yamlString(a.family)}`,
    `    given-names: ${yamlString(a.given)}`,
    `    email: ${yamlString(a.email)}`,
    `    affiliation: ${yamlString(a.affiliation)}`,
  ]),
  `version: ${yamlString(version)}`,
  // A CFF date is a date and not a string, so it goes in bare. `version` is a
  // string in the schema and is quoted, or « 2026.09.09 » reads as a float.
  `date-released: ${released}`,
  'license: CC0-1.0',
  `license-url: ${yamlString(`${REPO}/blob/main/RIGHTS.md`)}`,
  `url: ${yamlString(SITE)}`,
  `repository-code: ${yamlString(REPO)}`,
  'keywords:',
  ...KEYWORDS.map((k) => `  - ${yamlString(k)}`),
  ...(CONCEPT_DOI
    ? ['identifiers:', '  - type: doi', `    value: ${yamlString(CONCEPT_DOI)}`, `    description: ${yamlString('The concept DOI, which resolves to the most recent archived version.')}`]
    : []),
  // The source object, cited as the museum would have it. This is the clause
  // that stays true whatever happens to this repository.
  'references:',
  // `historical-work` is CFF's own term for a document of this kind, and the
  // nearest thing in its closed list to « a stationer's ledger written by hand
  // over fifty-four years ». There is no `manuscript`.
  '  - type: historical-work',
  `    title: ${yamlString('Artist’s ledgers, Books I–V and Dealers/Etchings')}`,
  '    authors:',
  `      - family-names: ${yamlString('Hopper')}`,
  `        given-names: ${yamlString('Josephine Nivison')}`,
  `      - family-names: ${yamlString('Hopper')}`,
  `        given-names: ${yamlString('Edward')}`,
  // The year the first entry was made. CFF wants an integer here, and the
  // books run 1907 to 1967 — the earliest work recorded predates the earliest
  // entry, which is why this is the ledger's year and not the art's.
  '    year: 1913',
  `    institution:`,
  `      name: ${yamlString('Whitney Museum of American Art')}`,
  '    identifiers:',
  '      - type: other',
  `        value: ${yamlString('96.208, 96.209, 96.210, 96.211, 96.212, 96.213')}`,
  `        description: ${yamlString('Accession numbers. Gifts of Lloyd Goodrich and museum purchases.')}`,
  `    notes: ${yamlString('© Heirs of Josephine N. Hopper, licensed by Artists Rights Society (ARS), New York. The transcriptions are unauthorised working documents; no permission to reproduce the text has been sought or granted.')}`,
  '',
].join('\n');

writeFileSync(resolve(root, 'CITATION.cff'), cff);

/* ------------------------------------------------------------ codemeta.json */

const codemeta = {
  '@context': 'https://w3id.org/codemeta/3.0',
  '@type': 'SoftwareSourceCode',
  name: 'hopper-project',
  description:
    'The reading and transcription workbench behind the Hopper ledgers corpus: the ' +
    'harvester for the museum’s listing, the LaTeX renderer, the TEI P5 exporter and ' +
    'its validator, the accounts and catalogue readers, and the static site that puts ' +
    'a transcription beside the museum’s photograph of the sheet it came from.',
  codeRepository: REPO,
  url: SITE,
  license: 'https://spdx.org/licenses/CC0-1.0',
  version,
  dateModified: released,
  programmingLanguage: ['JavaScript', 'TypeScript'],
  runtimePlatform: 'Node.js',
  developmentStatus: 'active',
  keywords: KEYWORDS,
  author: AUTHORS.map((a) => ({
    '@type': 'Person',
    givenName: a.given,
    familyName: a.family,
    email: a.email,
    affiliation: { '@type': 'Organization', name: a.affiliation },
  })),
  // The corpus this software produces, as a separate thing with its own
  // citation. Conflating the two is the commonest failure in this kind of
  // metadata: a reader wanting to cite a reading gets handed a build tool.
  isSourceCodeOf: {
    '@type': 'Dataset',
    name: TITLE,
    url: SITE,
    ...(CONCEPT_DOI ? { identifier: `https://doi.org/${CONCEPT_DOI}` } : {}),
  },
  readme: `${REPO}/blob/main/README.md`,
  contIntegration: `${REPO}/actions`,
  issueTracker: `${REPO}/issues`,
};

writeFileSync(resolve(root, 'codemeta.json'), `${JSON.stringify(codemeta, null, 2)}\n`);

/* ------------------------------------------------------------ .zenodo.json */

const zenodo = {
  title: TITLE,
  description:
    `<p>${ABSTRACT}</p>` +
    `<p>Read the corpus at <a href="${SITE}">${SITE}</a>. ` +
    `The source of record is the LaTeX under <code>transcripts/</code>; every other ` +
    `form in this deposit is derived from it and rebuilt.</p>` +
    `<p><strong>Rights.</strong> The software and the generated data are CC0. The ` +
    `transcribed text is not: © Heirs of Josephine N. Hopper, licensed by Artists ` +
    `Rights Society (ARS), New York, and no permission to reproduce it has been ` +
    `sought or granted. See RIGHTS.md in the deposit.</p>`,
  upload_type: 'dataset',
  access_right: 'open',
  // The CC0 here covers what the deposit is free to give: Zenodo takes one
  // licence per record, and the carve-out cannot be expressed in that field.
  // It is expressed in the description above and in RIGHTS.md, which travels
  // in the archive itself.
  license: 'cc-zero',
  publication_date: released,
  version,
  creators: AUTHORS.map((a) => ({
    name: `${a.family}, ${a.given}`,
    affiliation: a.affiliation,
  })),
  keywords: KEYWORDS,
  language: 'eng',
  related_identifiers: [
    { relation: 'isDerivedFrom', identifier: 'https://whitney.org/collection/works/11014', resource_type: 'other' },
    { relation: 'isSupplementTo', identifier: SITE, resource_type: 'dataset' },
  ],
  notes:
    `Transcribed by ${models.join(', ') || 'an unrecorded model'}; every file records ` +
    `the model and the date of the pass that produced it. ${sheetsRead} of ${sheetsAll} ` +
    `sheets read as of ${released}. No transcription here is an edition.`,
};

writeFileSync(resolve(root, '.zenodo.json'), `${JSON.stringify(zenodo, null, 2)}\n`);

process.stdout.write(
  `citation: version ${version} — ${sheetsRead}/${sheetsAll} sheet(s), ${batches} batch(es), ` +
    `${volumes} volume(s)\n` +
    `          CITATION.cff, codemeta.json, .zenodo.json` +
    `${CONCEPT_DOI ? '' : ' (no DOI yet — see docs/preservation.md)'}\n`,
);
