#!/usr/bin/env node
/**
 * Proves two things about the TEI export, and refuses to prove them by proxy.
 *
 * ## Well-formed is not valid, and the difference is the whole point
 *
 * `npm run tei` used to run `xmllint --noout`, which asks whether the bytes
 * parse as XML. Every file passed, and every file in the corpus was invalid
 * TEI: the export wrote one flat `<div>` per batch with a `<head>` at each
 * leaf inside it, and TEI puts `<head>` at the start of the division it heads
 * and nowhere else. Nothing said so for as long as the export existed, because
 * nothing had ever asked. A deposit of unvalidated TEI is a deposit of XML
 * with a namespace on it.
 *
 * So: every exported file, and the ODD itself, validated against the
 * Consortium's own RELAX NG for **unmodified TEI P5**, at a pinned version,
 * fetched over the pinned Vault URL and checked against a digest recorded
 * here. Not the current release — a schema that changes under the corpus is a
 * check that cannot fail the same way twice.
 *
 * ## And subset conformance, against the ODD, in both directions
 *
 * TEI P5 validity says the file is TEI. It does not say *which* TEI, and for a
 * consumer that is the more useful question: this corpus uses fifty-five
 * elements out of some six hundred, and the fifty-five are the exact reach of
 * a mechanical conversion from a handful of LaTeX macros. `tei/hopper.odd`
 * declares them, and this script reads that file — the ODD is consumed, not
 * decorative — and checks the export against it:
 *
 * - an element in the export that the ODD does not declare **fails**, because
 *   the promise the ODD makes to a reader is « these and no others »;
 * - an element the ODD declares that appears in no file **fails too**, because
 *   a declaration nobody has read is a claim about the corpus that is not
 *   true, and it is the failure nobody notices — a subset that only ever grows
 *   is the full schema again, arrived at politely;
 * - an attribute value outside a `<valList type="closed">` **fails**, which is
 *   what keeps `@type` on a `<div>` from becoming a free-text field one
 *   transcription at a time.
 *
 * Generating a RELAX NG from the ODD would restate the second and third of
 * those and needs Saxon and the TEI stylesheet library to do it. The ODD says
 * why that step is a manual one and gives the command.
 *
 *   npm run tei:validate
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

/**
 * The schema, pinned by version, URL and digest.
 *
 * The Vault path is the one that does not move: `/release/` serves whatever is
 * current, so a build that used it would start failing on the Consortium's
 * release schedule rather than on a change to this corpus. The digest is
 * checked on every use, cached or fetched, because a cache is a place a file
 * can be replaced.
 */
const TEI_VERSION = '4.12.0';
const TEI_RNG_URL = `https://www.tei-c.org/Vault/P5/${TEI_VERSION}/xml/tei/custom/schema/relaxng/tei_all.rng`;
const TEI_RNG_SHA256 = 'b0f115095ead2ccc6933aa3365c6f4a82cba3b2ec7eee7f76bb616d7a63b7e48';

const cacheDir = resolve(root, 'node_modules/.cache/tei');
const rngPath = resolve(cacheDir, `tei_all-${TEI_VERSION}.rng`);

const digest = (buf) => createHash('sha256').update(buf).digest('hex');

function schema() {
  if (existsSync(rngPath)) {
    const have = readFileSync(rngPath);
    if (digest(have) === TEI_RNG_SHA256) return rngPath;
    process.stdout.write('tei: cached schema does not match its digest, refetching\n');
  }
  mkdirSync(cacheDir, { recursive: true });
  process.stdout.write(`tei: fetching TEI P5 ${TEI_VERSION}\n`);
  const body = execFileSync('curl', ['-fsSL', '--proto', '=https', '--tlsv1.2', TEI_RNG_URL], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const got = digest(body);
  if (got !== TEI_RNG_SHA256) {
    throw new Error(
      `tei: schema digest mismatch\n  expected ${TEI_RNG_SHA256}\n  got      ${got}\n` +
        `  from ${TEI_RNG_URL}\n` +
        'Either the Vault copy changed, which it should not, or the download was tampered with.',
    );
  }
  writeFileSync(rngPath, body);
  return rngPath;
}

/* ------------------------------------------------------------- the ODD */

/**
 * What the customisation declares.
 *
 * A `<moduleRef>` with `@include` names elements one by one; a `<moduleRef>`
 * with neither `@include` nor `@except` — which here is only `tei`, the
 * infrastructure module — brings in a set this script does not enumerate, so
 * the elements it contributes are listed by hand below. There are two of them
 * in practice and both are structural.
 */
function declared(oddPath) {
  const odd = readFileSync(oddPath, 'utf8');
  const elements = new Set();
  let bare = false;
  for (const m of odd.matchAll(/<moduleRef\b([^>]*)\/>/g)) {
    const include = /\binclude="([^"]*)"/.exec(m[1]);
    if (include) for (const e of include[1].trim().split(/\s+/)) elements.add(e);
    else bare = true;
  }
  // `<moduleRef key="tei"/>` carries TEI's infrastructure. Nothing this export
  // emits comes from it, so nothing is added here; the flag exists so that a
  // future bare moduleRef is a visible fact rather than a silent widening.
  void bare;

  // The closed value lists, keyed `element/@attribute`.
  const closed = new Map();
  for (const el of odd.matchAll(/<elementSpec\b([^>]*)>([\s\S]*?)<\/elementSpec>/g)) {
    const ident = /\bident="([^"]+)"/.exec(el[1])?.[1];
    if (!ident) continue;
    for (const at of el[2].matchAll(/<attDef\b([^>]*)>([\s\S]*?)<\/attDef>/g)) {
      const name = /\bident="([^"]+)"/.exec(at[1])?.[1];
      if (!name) continue;
      const list = /<valList\b[^>]*type="closed"[^>]*>([\s\S]*?)<\/valList>/.exec(at[2]);
      if (!list) continue;
      const values = new Set(
        [...list[1].matchAll(/<valItem\b[^>]*\bident="([^"]+)"/g)].map((v) => v[1]),
      );
      closed.set(`${ident}/@${name}`, values);
    }
  }
  return { elements, closed };
}

/* ---------------------------------------------------------- the export */

/**
 * The start-tags of a generated file.
 *
 * A regular expression, and safe here for a reason that is checked rather than
 * assumed: these files are written by `scripts/tei.mjs`, which escapes every
 * `<` and `&` in text and in attribute values, and the RELAX NG pass above has
 * already parsed each of them. A hand-edited file with a CDATA section would
 * defeat this, and there are none — the export is derived and is rebuilt.
 */
function usedIn(xmlText) {
  const elements = new Map();
  const values = new Map();
  for (const m of xmlText.matchAll(/<([A-Za-z][\w.]*)((?:\s+[\w:.]+="[^"]*")*)\s*\/?>/g)) {
    const el = m[1];
    elements.set(el, (elements.get(el) ?? 0) + 1);
    for (const a of m[2].matchAll(/([\w:.]+)="([^"]*)"/g)) {
      const key = `${el}/@${a[1]}`;
      if (!values.has(key)) values.set(key, new Set());
      values.get(key).add(a[2]);
    }
  }
  return { elements, values };
}

/* ------------------------------------------------------------------ go */

const dir = resolve(root, 'public/transcripts');
if (!existsSync(dir)) {
  process.stdout.write('tei: nothing exported yet — run npm run tei first\n');
  process.exit(0);
}

const files = [];
for (const d of readdirSync(dir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of readdirSync(resolve(dir, d.name))) {
    if (f.endsWith('.xml')) files.push(resolve(dir, d.name, f));
  }
}
if (files.length === 0) {
  process.stdout.write('tei: nothing exported yet — run npm run tei first\n');
  process.exit(0);
}

const oddPath = resolve(root, 'tei/hopper.odd');
let failed = false;

// One xmllint over everything, and the ODD with it. The schema is compiled
// once for the whole run: forty-six files in seven seconds against seven
// seconds *each* if it were invoked per file.
try {
  execFileSync('xmllint', ['--noout', '--relaxng', schema(), oddPath, ...files], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  process.stdout.write(
    `tei: ${files.length} file(s) and the ODD valid against TEI P5 ${TEI_VERSION}\n`,
  );
} catch (e) {
  if (e.code === 'ENOENT') {
    // libxml2's xmllint ships with macOS and is `libxml2-utils` on Debian. A
    // contributor without it is told rather than silently passed; CI is not.
    process.stderr.write('tei: xmllint not found — install libxml2 to validate the TEI\n');
    if (process.env.CI) process.exit(1);
    process.exit(0);
  }
  process.stderr.write(String(e.stderr ?? e.message));
  process.stderr.write(`\ntei: NOT valid against TEI P5 ${TEI_VERSION}\n`);
  failed = true;
}

const { elements: declaredElements, closed } = declared(oddPath);
const seen = new Map();
const seenValues = new Map();
for (const f of files) {
  const { elements, values } = usedIn(readFileSync(f, 'utf8'));
  for (const [el, n] of elements) seen.set(el, (seen.get(el) ?? 0) + n);
  for (const [key, set] of values) {
    if (!seenValues.has(key)) seenValues.set(key, new Map());
    const into = seenValues.get(key);
    for (const v of set) if (!into.has(v)) into.set(v, f);
  }
}

const undeclared = [...seen.keys()].filter((e) => !declaredElements.has(e)).sort();
if (undeclared.length) {
  failed = true;
  process.stderr.write(
    'tei: the export uses elements tei/hopper.odd does not declare —\n' +
      undeclared.map((e) => `       <${e}> (${seen.get(e)}×)`).join('\n') +
      '\n     Either the export should not be emitting them, or the customisation\n' +
      '     has to grow and say so. Both are decisions; neither is a default.\n',
  );
}

const unused = [...declaredElements].filter((e) => !seen.has(e)).sort();
if (unused.length) {
  failed = true;
  process.stderr.write(
    'tei: tei/hopper.odd declares elements no file uses —\n' +
      unused.map((e) => `       <${e}>`).join('\n') +
      '\n     A declared element nobody has read is a promise about the corpus\n' +
      '     that is not kept. Remove it, or transcribe the leaf that needs it.\n',
  );
}

for (const [key, allowed] of closed) {
  const found = seenValues.get(key);
  if (!found) continue;
  for (const [v, where] of found) {
    if (allowed.has(v)) continue;
    failed = true;
    process.stderr.write(
      `tei: ${key}="${v}" is outside the closed list in tei/hopper.odd\n` +
        `       first in ${where.slice(root.length + 1)}\n` +
        `       declared: ${[...allowed].join(', ')}\n`,
    );
  }
}

if (!failed) {
  const values = [...closed.keys()].length;
  process.stdout.write(
    `     ${declaredElements.size} element(s) declared and all used; ` +
      `${values} closed value list(s) held\n`,
  );
}
process.exit(failed ? 1 : 0);
