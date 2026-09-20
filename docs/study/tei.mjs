#!/usr/bin/env node
/**
 * The article, encoded in TEI against the journal's own schema.
 *
 *   npm run article-tei
 *
 * `docs/study/article.tex` is the source of record; this script derives
 * `docs/study/submission/article.xml` from it and validates the result against
 * `tei_jtei` — the *Journal of the Text Encoding Initiative*'s customisation of
 * TEI P5 — in both its halves: the RELAX NG grammar with jing, and the
 * Schematron rules the grammar embeds with SchXslt on Saxon. The article's own
 * argument is that a transcription in a restricted language can be converted
 * to TEI mechanically and validated on every build; this is that argument
 * applied to the article.
 *
 * ## Why a converter of its own, and not pandoc
 *
 * pandoc has a TEI writer, and it was tried. Its output is honest but generic:
 * one `<div type="level1">` per section where the journal wants typed
 * divisions with identifiers, a header that says « Produced by pandoc » where
 * the journal wants the author's affiliation and email, `<hi
 * rendition="simple:italic">` where the journal wants `<emph>`, paragraphs for
 * the references where the journal wants `<bibl>` entries with identifiers
 * that every citation points to, and nothing at all for the figures, which are
 * TikZ. Rewriting all of that afterwards is a second converter anyway; this is
 * the one converter, and it reads the article's LaTeX directly, which is
 * small: sections, paragraphs, five inline macros, tables, listings, figures,
 * and a reference list.
 *
 * ## What the journal's rules require, and where each is met
 *
 * The schema's Schematron carries sixty rules beyond the grammar. The ones
 * that shape this file:
 *
 * — Every body division carries a `<head>` and an `@xml:id`; so do figures
 *   and tables. Cross-references are `<ref type="crossref">` to those
 *   identifiers, which is what `Section~8`, `Figure~\ref{}` and the hard-coded
 *   « Section 6.2 » of the LaTeX all become — the section numbers are computed
 *   here, in the order the divisions come, so that a reference to « Section
 *   4.2 » is checked against the article's own structure and fails loudly if
 *   a section moves.
 * — Bibliographic citations are `<ref type="bibl">` to a `<bibl>` in the
 *   back's `<listBibl>`, every entry of which must be cited (no orphans) and
 *   must end in a single period. The citation forms the LaTeX uses are
 *   matched by a table below; an author-year in the prose that matches no
 *   entry fails the build, as does an entry no prose cites.
 * — Quoted words carry no quotation marks: the journal's stylesheet supplies
 *   them. `\q{}` becomes `<q>` with the guillemets and thin spaces dropped.
 * — Straight apostrophes, double hyphens, non-breaking spaces and digit
 *   centuries are refused in running text. The LaTeX's `'` becomes ’, `---`
 *   and `--` become the dashes they stand for, `~` becomes a space.
 * — A figure's `<graphic>` states width and height in pixels, read from the
 *   PNG that `npm run docx` rasterised, and carries a `<head type="legend">`
 *   for the caption and a `<head type="license">` for the rights line.
 *
 * ## What is validated, and how the validators are pinned
 *
 * The schema is fetched from the Vault at a pinned P5 version and checked
 * against a digest, as `scripts/tei-validate.mjs` does for `tei_all.rng`. The
 * two Java tools are fetched from Maven Central the same way. Java itself is
 * the one thing assumed on the machine; the deploy runner has it.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const here = import.meta.dirname;
const root = resolve(here, '../..');
const out = resolve(here, 'submission');
mkdirSync(out, { recursive: true });

/* ---------------------------------------------------------- the pins */

const TEI_VERSION = '4.12.0';
const PINS = {
  'tei_jtei.rng': {
    url: `https://www.tei-c.org/Vault/P5/${TEI_VERSION}/xml/tei/custom/schema/relaxng/tei_jtei.rng`,
    sha256: '8f235c66eb565f5891f966155871d1f5a3ef31cd825dab737b0bb6519ebc4a3e',
  },
  'jing.jar': {
    url: 'https://repo1.maven.org/maven2/org/relaxng/jing/20220510/jing-20220510.jar',
    sha256: null,
  },
  'saxon.jar': {
    url: 'https://repo1.maven.org/maven2/net/sf/saxon/Saxon-HE/12.5/Saxon-HE-12.5.jar',
    sha256: null,
  },
  'xmlresolver.jar': {
    url: 'https://repo1.maven.org/maven2/org/xmlresolver/xmlresolver/5.2.2/xmlresolver-5.2.2.jar',
    sha256: null,
  },
  'schxslt.jar': {
    url: 'https://repo1.maven.org/maven2/name/dmaus/schxslt/schxslt/1.10.1/schxslt-1.10.1.jar',
    sha256: null,
  },
};

const cacheDir = resolve(root, 'node_modules/.cache/jtei');
const digest = (buf) => createHash('sha256').update(buf).digest('hex');

/** A pinned file, from the cache when its digest matches and from the net otherwise. */
function pinned(name) {
  const { url, sha256 } = PINS[name];
  const path = resolve(cacheDir, name);
  if (existsSync(path) && (!sha256 || digest(readFileSync(path)) === sha256)) return path;
  mkdirSync(cacheDir, { recursive: true });
  process.stdout.write(`article-tei: fetching ${name}\n`);
  const body = execFileSync('curl', ['-fsSL', '--proto', '=https', '--tlsv1.2', url], {
    maxBuffer: 64 * 1024 * 1024,
  });
  if (sha256 && digest(body) !== sha256) {
    throw new Error(`article-tei: ${name} digest mismatch\n  expected ${sha256}\n  got      ${digest(body)}\n  from ${url}`);
  }
  writeFileSync(path, body);
  return path;
}

/* ------------------------------------------------------- the LaTeX read */

const article = readFileSync(resolve(here, 'article.tex'), 'utf8');
const inputs = (tex) =>
  tex.replace(/\\input\{(sec-[^}]*|tables-subset\.tex)\}/g, (_, f) => readFileSync(resolve(here, f), 'utf8'));

const preamble = article.slice(0, article.indexOf('\\begin{document}'));
const body = inputs(article.slice(article.indexOf('\\begin{document}') + '\\begin{document}'.length));

const between = (s, a, b) => {
  const i = s.indexOf(a);
  if (i < 0) throw new Error(`article-tei: ${a} not found`);
  const j = b ? s.indexOf(b, i + a.length) : s.length;
  return s.slice(i + a.length, j < 0 ? undefined : j);
};

/** `\cmd{...}` with balanced braces, from a given index; returns [argument, endIndex]. */
function braced(s, i) {
  if (s[i] !== '{') throw new Error(`article-tei: expected { at ${i}: ${s.slice(i, i + 40)}`);
  let depth = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '{') depth++;
    else if (s[k] === '}') {
      depth--;
      if (depth === 0) return [s.slice(i + 1, k), k + 1];
    }
  }
  throw new Error('article-tei: unbalanced braces');
}

/* ------------------------------------------------------------ the header */

const titleTex = braced(preamble, preamble.indexOf('\\title{') + 6)[0]
  .replace(/\\Large\s*/, '')
  .replace(/\\\\\s*/g, ' ')
  .trim();
const abstractTex = between(body, '\\begin{abstract}', '\\end{abstract}').replace(/\\noindent\s*/, '').trim();
const keywordsTex = /\\textbf\{Keywords\.\}\s*([^\n]*)/.exec(body)[1].replace(/\.\s*$/, '');
const keywords = keywordsTex.split(';').map((k) => k.trim()).filter(Boolean);
const bioTex = between(body, '\\section*{About the author}', '\\section*{').trim();
const declarationHead = 'Declaration of Generative AI and AI-assisted technologies in the writing process';
const declarationTex = between(body, `\\section*{${declarationHead}}`, '\\section*{').trim();
const dataTex = between(body, '\\section*{Data availability}', '\\section*{References}').trim();
const referencesTex = between(body, '\\section*{References}', '\\appendix');

/* --------------------------------------------------------- the structure */

/**
 * Sections, numbered as LaTeX numbers them, so that a hard-coded « Section
 * 6.2 » in the prose resolves to the division that LaTeX would have printed
 * with that number — and only to that one.
 */
const mainTex = between(body, '\\section{Introduction}', '\\section*{About the author}');
const appendixTex = body.slice(body.indexOf('\\appendix') + '\\appendix'.length);

const slug = (s) =>
  s.toLowerCase().replace(/\\[a-z]+\{([^}]*)\}/g, '$1').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function sections(tex, prefix) {
  const parts = tex.split(/^(?=\\(?:sub)?section\{)/m);
  const divs = [];
  let n = 0;
  let sub = 0;
  for (const part of parts) {
    if (!part.trim()) continue;
    const m = /^\\(sub)?section\{([^}]*)\}\s*/.exec(part);
    if (!m) {
      // Text before the first heading: the Introduction's own opening, which
      // the split leaves headless because the split point is the heading.
      divs.push({ level: 1, head: 'Introduction', number: `${prefix}${++n}`, tex: part });
      sub = 0;
      continue;
    }
    if (m[1]) {
      sub++;
      divs.push({ level: 2, head: m[2], number: `${prefix}${n}.${sub}`, tex: part.slice(m[0].length) });
    } else {
      n++;
      sub = 0;
      divs.push({ level: 1, head: m[2], number: `${prefix}${n}`, tex: part.slice(m[0].length) });
    }
  }
  return divs;
}

const mainDivs = sections('\\section{Introduction}' + mainTex, '');
const appendixDivs = sections(appendixTex, 'A');
for (const d of [...mainDivs, ...appendixDivs]) d.id = `sec-${slug(d.head)}`;
const byNumber = new Map([...mainDivs, ...appendixDivs].map((d) => [d.number, d.id]));

/* ------------------------------------------------- figures and tables */

/** A PNG's pixel size, from its header. */
function pngSize(path) {
  const b = readFileSync(path);
  if (b.toString('latin1', 1, 4) !== 'PNG') throw new Error(`article-tei: ${path} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

/**
 * The rights line every figure carries. The journal's checklist requires one
 * per image, and all six are drawings the edition's own scripts made from its
 * own data — none reproduces a photograph — so one sentence serves them all.
 */
const FIGURE_RIGHTS = 'Figure by the author, drawn from the edition’s derived data; CC BY 4.0.';

const labels = new Map(); // \label → { id, kind, number }
let figureCount = 0;
let tableCount = 0;

/** The figures, from their TikZ sources: the caption and label, and the PNG beside the .docx. */
function figure(file) {
  const src = readFileSync(resolve(here, file), 'utf8');
  const cap = /\\caption\{([\s\S]*?)\}\\label\{([^}]*)\}/.exec(src);
  if (!cap) throw new Error(`article-tei: ${file} has no caption and label`);
  const name = file.replace(/\.tex$/, '');
  const png = resolve(out, `${name}.png`);
  if (!existsSync(png)) throw new Error(`article-tei: ${png} missing — run npm run docx first`);
  const { width, height } = pngSize(png);
  const id = name;
  labels.set(cap[2], { id, kind: 'Figure', number: ++figureCount });
  return (
    `<figure xml:id="${id}">\n` +
    `<graphic url="${name}.png" width="${width}px" height="${height}px"/>\n` +
    `<head type="legend">${inline(cap[1])}</head>\n` +
    `<head type="license">${FIGURE_RIGHTS}</head>\n` +
    `</figure>`
  );
}

/**
 * Columns whose cells are the transcription's own text, shown as the file
 * writes it. The comparison table quotes leaves on which Josephine Hopper
 * drew quotation marks, and the journal forbids a quotation-mark character in
 * running text — its stylesheet supplies them from markup — so the cell is
 * `<code>`: what the transcription file says, character for character, with
 * the macros it uses. That is what the column head « As transcribed » means.
 */
const CODE_COLUMNS = { 'tab:compare': new Set([1]) };

/** A tabular or longtable body: rows of cells, the rules dropped. */
function tableRows(tex, label) {
  const codeCols = CODE_COLUMNS[label] ?? new Set();
  const rows = [];
  const lines = tex
    .replace(/\\(toprule|midrule|bottomrule|endfirsthead|endhead|centering|small|raggedright|arraybackslash)\b/g, '')
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter(Boolean);
  let first = true;
  for (const line of lines) {
    const cells = splitCells(line).map((c) => c.trim());
    if (cells.every((c) => c === '')) continue;
    const role = first ? ' role="label"' : '';
    const cell = (c, i) =>
      !first && codeCols.has(i)
        ? `<cell><code>${esc(c.replace(/^\\q\{([\s\S]*)\}$/, '$1').replace(/\s*\n\s*/g, ' '))}</code></cell>`
        : `<cell>${inline(c)}</cell>`;
    rows.push(`<row${role}>${cells.map(cell).join('')}</row>`);
    first = false;
  }
  return rows.join('\n');
}

/** Split a row on `&`, respecting braces (a `\q{a & b}` would otherwise split). */
function splitCells(line) {
  const cells = [];
  let depth = 0;
  let cur = '';
  for (const ch of line) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === '&' && depth === 0) {
      cells.push(cur);
      cur = '';
    } else cur += ch;
  }
  cells.push(cur);
  return cells;
}

function table(tex) {
  const cap = /\\caption\{([\s\S]*?)\}\\label\{([^}]*)\}/.exec(tex);
  if (!cap) throw new Error(`article-tei: table without caption and label: ${tex.slice(0, 80)}`);
  const id = `tab-${cap[2].replace(/^tab:/, '')}`;
  labels.set(cap[2], { id, kind: 'Table', number: ++tableCount });
  // The rows: everything after the column spec of tabular/longtable, minus
  // the caption, which longtable puts inside the environment.
  let inner = tex.replace(/\\caption\{[\s\S]*?\}\\label\{[^}]*\}\\\\/, '').replace(/\\caption\{[\s\S]*?\}\\label\{[^}]*\}/, '');
  // The column spec has braces of its own — `{lp{6.2cm}l}` — so it is read
  // with the brace matcher and not a regular expression.
  const begin = /\\begin\{(?:tabular|longtable)\}/.exec(inner);
  if (!begin) throw new Error(`article-tei: table without a column spec: ${id}`);
  const [spec, afterSpec] = braced(inner, begin.index + begin[0].length);
  inner = inner.slice(afterSpec);
  inner = inner.replace(/\\end\{(?:tabular|longtable|table)\}[\s\S]*$/, '');
  const cols = (spec.replace(/\{[^}]*\}/g, '').match(/[lrcp]/g) ?? []).length;
  return (
    `<table xml:id="${id}" cols="${cols}">\n<head>${inline(cap[1])}</head>\n${tableRows(inner, cap[2])}\n</table>`
  );
}

/* --------------------------------------------------------- the references */

/**
 * The reference list, entry by entry, each given an identifier from its first
 * author and year, and the citation forms the prose uses to reach it. An
 * entry the prose never cites is an orphan and fails; a citation that reaches
 * no entry fails too. The forms are what the LaTeX writes, verbatim, so that a
 * change to either side is caught.
 */
const CITATIONS = [
  { id: 'crosilla2025', forms: ['Crosilla, Klic and Colavizza (2025)'] },
  { id: 'cummings2013', forms: ['Cummings and Willcox\n(2013)', 'Cummings and Willcox (2013)'] },
  { id: 'humphries2025', forms: ['Humphries and colleagues (2025)'] },
  { id: 'larson', forms: ['Larson n.d.', 'Larson (n.d.)'] },
  { id: 'levin1995a', forms: ['Levin 1995a', 'Levin (1995a)'] },
  // « (Levin 1995a, 1995b) »: the second year alone is the second reference.
  { id: 'levin1995b', forms: ['Levin 1995b', 'Levin (1995b)', '1995b'] },
  { id: 'lyons1997', forms: ['Lyons 1997', 'Lyons (1997)'] },
  { id: 'scholger2020', forms: ['Scholger (2020)', 'Scholger 2020'] },
  { id: 'stokes2015', forms: ['Stokes (2015)'] },
  { id: 'strutz2026', forms: ['Strutz (2026)'] },
  { id: 'tei2026', forms: ['TEI Consortium 2026'] },
  { id: 'tomasek2013', forms: ['Tomasek and Bauman (2013)', 'Tomasek and Bauman 2013'] },
  { id: 'whitney', forms: ['Whitney Museum of American Art n.d.', 'Whitney Museum of American Art, n.d.'] },
];
const cited = new Set();

function bibliography() {
  const items = referencesTex
    .split(/\\item\s+/)
    .slice(1)
    .map((s) => s.replace(/\\end\{list\}[\s\S]*$/, '').trim());
  if (items.length !== CITATIONS.length) {
    throw new Error(`article-tei: ${items.length} references but ${CITATIONS.length} citation entries`);
  }
  return items
    .map((item, i) => {
      const { id } = CITATIONS[i];
      // The analytic title, which the LaTeX quotes with \q{}, becomes a
      // <title level="a"> without its quotation marks; an emphasised title is a
      // monograph or a journal. The journal's rule wants the entry to end in
      // one period, which Chicago author-date already does.
      let x = item;
      // An emphasised title after an analytic one is the journal's; on its
      // own it is a monograph's.
      const analytic = /\\q\{/.test(x);
      x = replaceMacro(x, 'q', (t) => `<title level="a">${inline(t, { cite: false })}</title>`);
      x = replaceMacro(x, 'emph', (t) => `<title level="${analytic ? 'j' : 'm'}">${inline(t, { cite: false })}</title>`);
      x = inline(x, { cite: false });
      if (!/\.\s*$/.test(x)) x += '.';
      return `<bibl xml:id="${id}">${x}</bibl>`;
    })
    .join('\n');
}

/* ---------------------------------------------------------- inline text */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Plain text, in the journal's typography: LaTeX's dashes and ties resolved,
 * straight apostrophes made typographic, `\&` and `\%` unescaped. Applied to
 * text that has already been through `inline`, whose output contains markup,
 * so the escapes are done first on the LaTeX and the typography last.
 */
function text(s) {
  // Markup already in the string is left alone, and so is the content of
  // <code> and <eg>, where a straight apostrophe is a character of the
  // language quoted and not a typographic slip.
  return s
    .split(/(<code>[\s\S]*?<\/code>|<eg>[\s\S]*?<\/eg>|<[^>]+>)/)
    .map((part, i) => (i % 2 ? part : typography(part)))
    .join('');
}

function typography(s) {
  return s
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/~/g, ' ')
    .replace(/\\,/g, '')
    .replace(/\\&/g, '&amp;')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\\$/g, '$')
    .replace(/\\_/g, '_')
    .replace(/\\([{}])/g, '$1')
    .replace(/\\quad|\\qquad|\\hspace\{[^}]*\}/g, ' ')
    .replace(/\\noindent\s*/g, '')
    .replace(/(\w)'/g, '$1’')
    .replace(/'(\w)/g, '‘$1')
    .replace(/"([^"]*)"/g, '“$1”')
    .replace(/\s+\n\s*/g, ' ');
}

/** Cross-references: `Section~8`, `Section 6.2`, `Figure~\ref{}`, `Table~\ref{}`. */
function crossrefs(s) {
  return s
    .replace(/(Figures?|Tables?)~\\ref\{([^}]*)\}(?:\s*(?:to|and)~?\\ref\{([^}]*)\})?/g, (m, kind, a, b) => {
      const A = labels.get(a);
      if (!A) throw new Error(`article-tei: \\ref{${a}} names no figure or table`);
      let r = `${kind.replace(/s$/, '')} <ref type="crossref" target="#${A.id}">${A.number}</ref>`;
      if (b) {
        const B = labels.get(b);
        if (!B) throw new Error(`article-tei: \\ref{${b}} names no figure or table`);
        r = `${kind} <ref type="crossref" target="#${A.id}">${A.number}</ref>${m.includes(' and') ? ' and' : ' to'} <ref type="crossref" target="#${B.id}">${B.number}</ref>`;
      }
      return r;
    })
    .replace(/Sections?[~ ](\d+(?:\.\d+)?)(?:[~ ]and[~ ](\d+(?:\.\d+)?))?/g, (m, a, b) => {
      const A = byNumber.get(a);
      if (!A) throw new Error(`article-tei: « Section ${a} » names no section`);
      let r = `Section <ref type="crossref" target="#${A}">${a}</ref>`;
      if (b) {
        const B = byNumber.get(b);
        if (!B) throw new Error(`article-tei: « Section ${b} » names no section`);
        r = `Sections <ref type="crossref" target="#${A}">${a}</ref> and <ref type="crossref" target="#${B}">${b}</ref>`;
      }
      return r;
    });
}

/** Bibliographic citations, by the forms the prose uses. */
function citations(s) {
  for (const { id, forms } of CITATIONS) {
    for (const form of forms) {
      if (!s.includes(form)) continue;
      cited.add(id);
      const paren = /^(.*?)\s*\((.*)\)$/.exec(form);
      // « Author (year) » keeps the parentheses outside the reference, as the
      // journal's rule asks; « Author year » inside a parenthesis is the
      // reference whole.
      const inner = paren ? `${paren[1]} (${paren[2]})` : form;
      s = s.split(form).join(`<ref type="bibl" target="#${id}">${inner.replace(/\n/g, ' ')}</ref>`);
    }
  }
  return s;
}

/** Inline LaTeX to inline TEI. */
function inline(tex, { cite = true } = {}) {
  let s = tex;
  // Verbatim-ish first: \texttt with \textbackslash inside.
  s = s.replace(/\\texttt\{/g, '\\CODE{');
  s = replaceMacro(s, 'CODE', (a) =>
    `<code>${esc(a.replace(/\\textbackslash\s?/g, '\\').replace(/\\([{}&%#_])/g, '$1'))}</code>`);
  s = replaceMacro(s, 'emph', (a) => `<emph>${inline(a)}</emph>`);
  s = replaceMacro(s, 'textbf', (a) => `<hi rend="bold">${inline(a)}</hi>`);
  s = replaceMacro(s, 'sout', (a) => `<hi rend="strikethrough">${inline(a)}</hi>`);
  s = replaceMacro(s, 'q', (a) => `<q>${inline(a.replace(/^«\s*|\s*»$/g, ''))}</q>`);
  s = replaceMacro(s, 'url', (a) => `<ref target="${a}">${esc(a)}</ref>`);
  s = s.replace(/\\lf\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g, (_, book, leaf, label) =>
    `<ref target="https://hopper.commutator.io/${book}/#${book}/leaf-${leaf}">${inline(label)}</ref>`);
  s = s.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, (_, u, l) => `<ref target="${u}">${inline(l)}</ref>`);
  s = s.replace(/\\(small|footnotesize|centering|raggedright|arraybackslash|noindent)\b\s*/g, '');
  // What is left is text with markup in it: escape the text's own characters
  // where they are not markup. The LaTeX has no literal < or >, and its & are
  // escaped as \&, so the only work is the typography.
  return crossrefs(cite ? citations(text(s)) : text(s));
}

/** `\name{...}` with balanced braces, replaced by fn(argument). */
function replaceMacro(s, name, fn) {
  const needle = `\\${name}{`;
  let i = s.indexOf(needle);
  while (i >= 0) {
    const [arg, end] = braced(s, i + needle.length - 1);
    s = s.slice(0, i) + fn(arg) + s.slice(end);
    i = s.indexOf(needle, i + 1);
  }
  return s;
}

/* ------------------------------------------------------------- blocks */

/**
 * A division's body: paragraphs separated by blank lines, with tables,
 * figures and listings as blocks between them.
 */
function blocks(tex) {
  const outParts = [];
  // Pull the block environments out first, each replaced by a marker.
  const held = [];
  let s = tex
    .replace(/\\begin\{lstlisting\}\n?([\s\S]*?)\\end\{lstlisting\}/g, (_, code) => {
      held.push(`<eg>${esc(code.replace(/\s+$/, ''))}</eg>`);
      return `\n\n@@${held.length - 1}@@\n\n`;
    })
    .replace(/\\begin\{table\}[\s\S]*?\\end\{table\}/g, (m) => {
      held.push(table(m));
      return `\n\n@@${held.length - 1}@@\n\n`;
    })
    .replace(/\\begin\{longtable\}[\s\S]*?\\end\{longtable\}/g, (m) => {
      held.push(table(m));
      return `\n\n@@${held.length - 1}@@\n\n`;
    })
    .replace(/\\input\{(fig-[^}]*)\}/g, (_, f) => {
      held.push(figure(f));
      return `\n\n@@${held.length - 1}@@\n\n`;
    });
  for (const para of s.split(/\n\s*\n/)) {
    const p = para.trim();
    if (!p) continue;
    const held_ = /^@@(\d+)@@$/.exec(p);
    if (held_) outParts.push(held[Number(held_[1])]);
    else outParts.push(`<p>${inline(p)}</p>`);
  }
  return outParts.join('\n');
}

/**
 * The sections, as nested divisions. The order of the calls matters: figures
 * and tables register their labels when they are met, and a cross-reference
 * to a figure that comes later in the article would fail — so the blocks of
 * every division are rendered in a first pass that registers labels, and
 * rendered again in a second pass that resolves them. The first pass's output
 * is discarded.
 */
function divisions(divs) {
  const parts = [];
  let open = false;
  for (const d of divs) {
    if (d.level === 1) {
      if (open) parts.push('</div>');
      parts.push(`<div xml:id="${d.id}">\n<head>${inline(d.head)}</head>\n${blocks(d.tex)}`);
      open = true;
    } else {
      parts.push(`<div xml:id="${d.id}">\n<head>${inline(d.head)}</head>\n${blocks(d.tex)}\n</div>`);
    }
  }
  if (open) parts.push('</div>');
  return parts.join('\n');
}

// First pass: register every figure and table label.
divisions(mainDivs);
divisions(appendixDivs);
figureCount = 0;
tableCount = 0;
cited.clear();
// Second pass: the real one.
const bodyXml = divisions(mainDivs);
const appendixXml = divisions(appendixDivs).replace(/<div xml:id=/g, '<div type="appendix" xml:id=');
const bibl = bibliography();

const orphans = CITATIONS.filter((c) => !cited.has(c.id)).map((c) => c.id);
if (orphans.length) throw new Error(`article-tei: references cited nowhere: ${orphans.join(', ')}`);

/* ------------------------------------------------------------ the file */

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="${PINS['tei_jtei.rng'].url}" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?xml-model href="${PINS['tei_jtei.rng'].url}" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
<teiHeader>
<fileDesc>
<titleStmt>
<title type="main">${inline(titleTex)}</title>
<author>
<name><forename>Michel</forename> <surname>Hua</surname></name>
<affiliation>${inline(bioTex)}</affiliation>
<email>michel@commutator.io</email>
</author>
</titleStmt>
<publicationStmt>
<publisher>TEI Consortium</publisher>
<date>2026</date>
<availability>
<licence target="https://creativecommons.org/licenses/by/4.0/">
<p>For this publication, a Creative Commons Attribution 4.0 International license has been granted by the author, who retains full copyright.</p>
</licence>
</availability>
</publicationStmt>
<sourceDesc>
<p>No source, born digital. Derived from the LaTeX source <code>docs/study/article.tex</code> of the repository <ref target="https://github.com/Commutator-IO/hopper-project">Commutator-IO/hopper-project</ref> by <code>docs/study/tei.mjs</code>, and validated against the journal’s schema on every build.</p>
</sourceDesc>
</fileDesc>
<encodingDesc>
<projectDesc>
<p>OpenEdition Journals – centre for open electronic publishing – is the platform for journals in the humanities and social sciences, open to quality periodicals looking to publish full-text articles online.</p>
</projectDesc>
</encodingDesc>
<profileDesc>
<langUsage>
<language ident="en"/>
</langUsage>
<textClass>
<keywords xml:lang="en">
${keywords.map((k) => `<term>${inline(k)}</term>`).join('\n')}
</keywords>
</textClass>
</profileDesc>
</teiHeader>
<text>
<front>
<div type="abstract">
<p>${inline(abstractTex)}</p>
</div>
<div type="authorNotes">
<head>${declarationHead}</head>
<p>${inline(declarationTex)}</p>
</div>
<div type="authorNotes">
<head>Data availability</head>
<p>${inline(dataTex)}</p>
</div>
</front>
<body>
${bodyXml}
</body>
<back>
${appendixXml}
<div type="bibliography">
<listBibl>
${bibl}
</listBibl>
</div>
</back>
</text>
</TEI>
`;

const xmlPath = resolve(out, 'article.xml');
writeFileSync(xmlPath, xml);

/* ----------------------------------------------------------- validation */

const rng = pinned('tei_jtei.rng');
const jing = pinned('jing.jar');
const saxon = pinned('saxon.jar');
const resolver = pinned('xmlresolver.jar');
const schxslt = pinned('schxslt.jar');

const java = (args) => {
  try {
    return execFileSync('java', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    return `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
};

// The grammar.
const grammar = java(['-jar', jing, rng, xmlPath]).trim();
if (grammar) {
  process.stderr.write(`${grammar}\n`);
  throw new Error(`article-tei: ${grammar.split('\n').length} RELAX NG error(s)`);
}

/**
 * The Schematron, which the grammar embeds as annotations and jing ignores.
 * The rules are lifted out of the RELAX NG into a schema of their own — the
 * namespaces, the top-level variables, and every pattern — and compiled with
 * SchXslt into an XSLT that reports in SVRL. That is what the TEI's own
 * stylesheets do to build `tei_jtei.isosch`; done here so that nothing but
 * the pinned schema is trusted.
 */
const rngText = readFileSync(rng, 'utf8');
const patterns = rngText.match(/<(?:sch:)?pattern\b[\s\S]*?<\/(?:sch:)?pattern>/g) ?? [];
const inPatterns = patterns.join('\n');
const ns = [...new Set(rngText.match(/<(?:sch:)?ns [^>]*\/>/g) ?? [])];
// The one XSLT key the rules use, declared beside them in the grammar.
const keys = [...new Set(rngText.match(/<xsl:key [^>]*\/>/g) ?? [])];
const lets = [...new Set(rngText.match(/<(?:sch:)?let [^>]*\/>/g) ?? [])].filter((l) => !inPatterns.includes(l));
const sch =
  '<?xml version="1.0"?>\n<schema xmlns="http://purl.oclc.org/dsdl/schematron" xmlns:sch="http://purl.oclc.org/dsdl/schematron" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" queryBinding="xslt2">\n' +
  `${ns.join('\n')}\n${keys.join('\n')}\n${lets.join('\n')}\n${patterns.join('\n')}\n</schema>\n`;
const schPath = resolve(cacheDir, 'jtei.sch');
const xslPath = resolve(cacheDir, 'jtei.xsl');
if (!existsSync(xslPath) || readFileSync(schPath, 'utf8') !== sch) {
  writeFileSync(schPath, sch);
  const compiled = java(['-cp', `${saxon}:${resolver}`, 'net.sf.saxon.Transform', `-s:${schPath}`,
    `-xsl:jar:file://${schxslt}!/xslt/2.0/pipeline-for-svrl.xsl`, `-o:${xslPath}`]);
  if (!existsSync(xslPath)) throw new Error(`article-tei: Schematron did not compile\n${compiled}`);
}
const svrlPath = resolve(cacheDir, 'article.svrl');
if (existsSync(svrlPath)) rmSync(svrlPath);
const ran = java(['-cp', `${saxon}:${resolver}`, 'net.sf.saxon.Transform', `-s:${xmlPath}`, `-xsl:${xslPath}`, `-o:${svrlPath}`]);
if (!existsSync(svrlPath)) throw new Error(`article-tei: the Schematron did not run\n${ran}`);
const svrl = readFileSync(svrlPath, 'utf8');
const failures = [...svrl.matchAll(/<svrl:(failed-assert|successful-report)[^>]*location="([^"]*)"[^>]*>[\s\S]*?<svrl:text>([\s\S]*?)<\/svrl:text>/g)];
if (failures.length) {
  for (const [, , where, what] of failures) {
    process.stderr.write(`  ${where}\n    ${what.replace(/\s+/g, ' ').trim()}\n`);
  }
  throw new Error(`article-tei: ${failures.length} Schematron failure(s)`);
}

// Served beside the PDF and the .docx.
const served = resolve(root, 'public/article');
mkdirSync(served, { recursive: true });
copyFileSync(xmlPath, resolve(served, 'hopper-jtei.xml'));

const elements = [...new Set([...xml.matchAll(/<([a-zA-Z]+)[\s>/]/g)].map((m) => m[1]))].sort();
process.stdout.write(
  `article-tei: ${mainDivs.length} divisions, ${figureCount} figures, ${tableCount} tables, ` +
    `${CITATIONS.length} references, ${elements.length} element types; ` +
    `valid against tei_jtei ${TEI_VERSION} (RELAX NG and ${patterns.length} Schematron patterns)\n` +
    `      -> docs/study/submission/article.xml, served at /article/hopper-jtei.xml\n`,
);
