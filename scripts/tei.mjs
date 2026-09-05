#!/usr/bin/env node
/**
 * A TEI P5 file per transcription, produced from the `.tex` alone.
 *
 * It re-reads no sheet, and it must not: the apparatus macros map one to one
 * onto TEI's own elements, so the conversion is mechanical and a difference
 * between the two files is a bug rather than a judgement.
 *
 * | LaTeX | TEI |
 * |---|---|
 * | `\ill{}` | `<gap reason="illegible"/>` |
 * | `\uncertain{…}` | `<unclear>` |
 * | `\add{…}` | `<supplied>` |
 * | `\struck{…}` | `<del>` |
 * | `\note{…}` | an editorial `<note>` |
 * | `\marginal{…}` | an authorial `<note place="margin">` |
 * | `\hand{jo}{…}` | `<seg hand="#jo">` |
 * | `\sketch{…}` | `<figure type="record-sketch">` |
 * | `\clipping{…}` | `<figure type="clipping">` |
 * | `\sheet{ref}{leaf}` | `<pb facs="…" n="…"/>` |
 * | `ledgertable` | `<table>` with `<row>`/`<cell>` |
 *
 * The `<handNote>` declarations in the header are the reason a TEI export is
 * worth making for *these* documents in particular. `\hand{}` is the one macro
 * with no counterpart in the Grothendieck preamble, and TEI has carried the
 * notion of a hand since P3: a deposit keeps the distinction between Edward's
 * writing and Josephine's without this site, which is the only part of the
 * transcription that could not be reconstructed from the photographs by
 * somebody else.
 *
 * The header also carries what the file's own comment carries — the model that
 * read the sheets, the date, the demonstration-edition status, the accession
 * number — as structured statements, so provenance stays a fact about the file.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const dir = resolve(root, 'public/transcripts');

/**
 * XML-escape, and apply the same text conventions the reading view applies.
 *
 * `---` is an em dash in the transcription's source and must be one in the
 * TEI too: a deposited file where half the punctuation is TeX shorthand is a
 * file whose consumer has to know TeX.
 */
/**
 * The escapes LaTeX spells with a non-letter, and the only ones permitted.
 *
 * `\%` `\$` `\&` `\#` `\_` print the character; `\\` is a line break;
 * `\ ` is a space. Everything else spelt `\<punctuation>` — `\,` `\;` `\!`
 * and the rest of TeX's spacing commands — is **refused**, and that is the
 * point of listing them.
 *
 * They were being let through silently. The subset check matches
 * `\[a-zA-Z]+`, so `\,` never looked like a command at all and fell to the
 * plain-text path, which printed it: a plate measured `7"x8\,3/8"` reached the
 * site reading `7"x8\,3/8"`. A converter that accepted everything would
 * silently mangle what it did not understand — the whole reason for having a
 * subset — and this was that failure, in the one place nobody was looking.
 */
const ESCAPES = new Set(['%', '$', '&', '#', '_', '\\', ' ', '{', '}']);

const xml = (s) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/---/g, '\u2014')
    .replace(/--/g, '\u2013')
    .replace(/``/g, '\u201c')
    .replace(/''/g, '\u201d')
    .replace(/~/g, ' ');

function group(s, i) {
  while (s[i] === ' ' || s[i] === '\n') i++;
  if (s[i] !== '{') return ['', i];
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '\\') {
      j++;
      continue;
    }
    if (s[j] === '{') d++;
    else if (s[j] === '}') {
      d--;
      if (!d) return [s.slice(i + 1, j), j + 1];
    }
  }
  return ['', s.length];
}

const HANDS = {
  edward: 'Edward Hopper',
  jo: 'Josephine Nivison Hopper',
  later: 'A later hand, after 1967',
  unidentified: 'Unidentified',
};

/** Inline conversion, applied to a run of text and recursively to arguments. */
function inline(s) {
  let o = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] !== '\\') {
      const n = s.indexOf('\\', i);
      o += xml(s.slice(i, n < 0 ? s.length : n));
      i = n < 0 ? s.length : n;
      continue;
    }
    if (s[i + 1] === '\\') {
      o += '<lb/>';
      i += 2;
      continue;
    }
    const m = /^\\([a-zA-Z]+)/.exec(s.slice(i));
    if (!m) {
      const c = s[i + 1] ?? '';
      if (!ESCAPES.has(c)) {
        throw new Error(`tei: \\${c} is outside the permitted subset`);
      }
      o += xml(s.slice(i + 1, i + 2));
      i += 2;
      continue;
    }
    const name = m[1];
    i += m[0].length;
    if (name === 'ill') {
      if (s.slice(i, i + 2) === '{}') i += 2;
      o += '<gap reason="illegible"/>';
      continue;
    }
    if (name === 'quad' || name === 'qquad') {
      o += ' ';
      continue;
    }
    if (name === 'hand') {
      const [who, a] = group(s, i);
      const [body, b] = group(s, a);
      i = b;
      o += `<seg hand="#${who.trim()}">${inline(body)}</seg>`;
      continue;
    }
    const WRAP = {
      uncertain: ['<unclear>', '</unclear>'],
      add: ['<supplied resp="#editor">', '</supplied>'],
      struck: ['<del>', '</del>'],
      emph: ['<hi rend="italic">', '</hi>'],
      textit: ['<hi rend="italic">', '</hi>'],
      textbf: ['<hi rend="bold">', '</hi>'],
      texttt: ['<hi rend="mono">', '</hi>'],
    };
    if (WRAP[name]) {
      const [body, a] = group(s, i);
      i = a;
      o += WRAP[name][0] + inline(body) + WRAP[name][1];
      continue;
    }
    // Anything unknown reaching here means render.mjs and this file have
    // drifted. Fail rather than drop it: a TEI file missing an apparatus mark
    // asserts a certainty the transcription did not.
    throw new Error(`tei: \\${name} has no TEI mapping — add one, or remove it from the subset`);
  }
  return o;
}


/**
 * Split a table row into cells at `&`, respecting escapes and braces --- the
 * same rule as `render.mjs`, and here for the same reason: `\&` inside a
 * transcribed dealer's name (« Vickery, Atkins & Torrey ») would otherwise cut
 * the cell in half.
 */
function cells(row) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < row.length; i++) {
    const c = row[i];
    if (c === '\\') {
      cur += row.slice(i, i + 2);
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '&' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

/** Split a table body into rows at `\\`, respecting braces. */
function texRows(body) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\' && body[i + 1] === '\\' && depth === 0) {
      out.push(cur);
      cur = '';
      i++;
      continue;
    }
    if (body[i] === '\\') {
      cur += body.slice(i, i + 2);
      i++;
      continue;
    }
    if (body[i] === '{') depth++;
    else if (body[i] === '}') depth--;
    cur += body[i];
  }
  out.push(cur);
  return out;
}

function convert(tex, meta) {
  const body = /\\begin\{document\}([\s\S]*)\\end\{document\}/.exec(tex);
  if (!body) throw new Error('tei: no document body');
  let s = body[1];
  const out = [];
  let i = 0;
  let para = [];

  /** Open `<item>`s, so a list closes its last one. */
  const lists = [];

  const flush = () => {
    const t = para.join('').trim();
    para = [];
    if (!t) return;
    out.push(lists.length ? t : `<p>${t}</p>`);
  };

  const closeItem = () => {
    if (lists.length && lists[lists.length - 1]) {
      out.push('</item>');
      lists[lists.length - 1] = false;
    }
  };

  while (i < s.length) {
    if (s[i] === '%') {
      const n = s.indexOf('\n', i);
      i = n < 0 ? s.length : n;
      continue;
    }
    if (s[i] !== '\\') {
      const n = s.slice(i + 1).search(/[\\%]/);
      const chunk = s.slice(i, n < 0 ? s.length : i + 1 + n);
      if (/\n[ \t]*\n/.test(chunk)) {
        const parts = chunk.split(/\n[ \t]*\n/);
        para.push(xml(parts[0]));
        for (const p of parts.slice(1)) {
          flush();
          para.push(xml(p));
        }
      } else {
        para.push(xml(chunk));
      }
      i += chunk.length;
      continue;
    }
    const m = /^\\([a-zA-Z]+)\*?/.exec(s.slice(i));
    if (!m) {
      const c = s[i + 1] ?? '';
      if (!ESCAPES.has(c)) {
        throw new Error(`tei: \\${c} is outside the permitted subset`);
      }
      para.push(xml(s.slice(i + 1, i + 2)));
      i += 2;
      continue;
    }
    const name = m[1];
    const at = i;
    i += m[0].length;

    if (name === 'sheet') {
      const [ref, a] = group(s, i);
      const [leaf, b] = group(s, a);
      i = b;
      flush();
      out.push(
        `<pb n="${leaf.trim() || 'unnumbered'}" facs="https://resourcespace.whitney.org/pages/view.php?ref=${ref.trim()}" xml:id="sheet-${ref.trim()}"/>`,
      );
      continue;
    }
    if (name === 'note' || name === 'marginal') {
      const [t, a] = group(s, i);
      i = a;
      flush();
      out.push(
        name === 'note'
          ? `<note type="editorial" resp="#editor">${inline(t)}</note>`
          : `<note place="margin">${inline(t)}</note>`,
      );
      continue;
    }
    if (name === 'sketch' || name === 'clipping') {
      const [t, a] = group(s, i);
      i = a;
      flush();
      const type = name === 'sketch' ? 'record-sketch' : 'clipping';
      out.push(
        `<figure type="${type}">` +
          (name === 'sketch' ? '<head>Ink record sketch by Edward Hopper</head>' : '') +
          (t.trim() ? `<p>${inline(t)}</p>` : '') +
          '</figure>',
      );
      continue;
    }
    if (name === 'work') {
      const [t, a] = group(s, i);
      i = a;
      flush();
      out.push(`<head type="work">${inline(t)}</head>`);
      continue;
    }
    if (name === 'section' || name === 'subsection') {
      const [t, a] = group(s, i);
      i = a;
      flush();
      out.push(`<head>${inline(t)}</head>`);
      continue;
    }
    if (name === 'keywords') {
      const [t, a] = group(s, i);
      i = a;
      flush();
      out.push(
        `<list type="keywords">${t
          .split(',')
          .map((k) => `<item>${xml(k.trim())}</item>`)
          .join('')}</list>`,
      );
      continue;
    }
    if (name === 'begin' || name === 'end') {
      const [env, a] = group(s, i);
      i = a;
      flush();
      if (env === 'ledgertable') {
        // `\end{ledgertable}` is consumed by the `\begin` branch below, which
        // reads the whole table in one go: rows are line-level and the scan is
        // character-level.
        if (name === 'end') continue;
        // Two arguments: the column specification, which TEI has no use for,
        // and the header row.
        const [, afterSpec] = group(s, i);
        const [head, afterHead] = group(s, afterSpec);
        i = afterHead;
        const stop = s.indexOf('\\end{ledgertable}', i);
        const raw = s.slice(i, stop < 0 ? s.length : stop);
        i = stop < 0 ? s.length : stop;
        const body = texRows(raw)
          .map((r) => r.trim())
          .filter(Boolean)
          .map(
            (r) =>
              `<row>${cells(r)
                .map((cl) => `<cell>${inline(cl.trim())}</cell>`)
                .join('')}</row>`,
          );
        out.push(
          `<table><row role="label">${cells(head)
            .map((h) => `<cell>${inline(h.trim())}</cell>`)
            .join('')}</row>${body.join('')}</table>`,
        );
        continue;
      }
      const LIST = { itemize: 'list', enumerate: 'list', quote: 'quote' };
      if (LIST[env]) {
        if (name === 'begin') {
          if (LIST[env] === 'list') lists.push(false);
          out.push(`<${LIST[env]}>`);
        } else {
          if (LIST[env] === 'list') {
            closeItem();
            lists.pop();
          }
          out.push(`</${LIST[env]}>`);
        }
        continue;
      }
      continue;
    }
    if (name === 'item') {
      flush();
      closeItem();
      if (lists.length) lists[lists.length - 1] = true;
      out.push('<item>');
      continue;
    }
    // Inline macro: hand it back to the inline converter with its arguments.
    const rest = s.slice(at);
    const consumed = /^\\[a-zA-Z]+(\{(?:[^{}]|\{[^{}]*\})*\})*/.exec(rest);
    para.push(inline(consumed ? consumed[0] : rest.slice(0, 2)));
    i = at + (consumed ? consumed[0].length : 2);
  }
  flush();

  const meta_ = meta;
  return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:lang="en">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${xml(meta_.ledgertitle ?? meta_.ledger)}${
          meta_.batch ? `, batch ${xml(meta_.batch)}` : ''
        }</title>
        <author>Josephine Nivison Hopper</author>
        <author>Edward Hopper</author>
        <respStmt>
          <resp>Transcription (first machine pass, unchecked against the sheets by a person)</resp>
          <name>${xml(meta_.pass ?? 'unrecorded')}</name>
        </respStmt>
      </titleStmt>
      <editionStmt>
        <edition>${xml(meta_.watermark ?? '')}</edition>
      </editionStmt>
      <publicationStmt>
        <publisher>hopper.commutator.io</publisher>
        <availability status="restricted">
          <p>© Heirs of Josephine N. Hopper, licensed by Artists Rights Society (ARS),
             New York. Object rights transferred to the Whitney Museum of American Art.
             This transcription is an unauthorised working document.</p>
        </availability>
      </publicationStmt>
      <sourceDesc>
        <msDesc>
          <msIdentifier>
            <institution>Whitney Museum of American Art</institution>
            <idno type="accession">${xml(meta_.objectnumber ?? '')}</idno>
          </msIdentifier>
          <history><origin><origDate>${xml(meta_.dating ?? '')}</origDate></origin></history>
        </msDesc>
      </sourceDesc>
    </fileDesc>
    <profileDesc>
      <handNotes>
${Object.entries(HANDS)
  .map(([id, who]) => `        <handNote xml:id="${id}"><p>${who}</p></handNote>`)
  .join('\n')}
      </handNotes>
    </profileDesc>
    <encodingDesc>
      <editorialDecl>
        <p>Illegible passages are marked with <gap/> and are never conjectured.
           Doubtful readings are <unclear/>. Prices, dates and names are given as written
           and are not normalised.</p>
      </editorialDecl>
    </encodingDesc>
  </teiHeader>
  <text><body><div>
${out.join('\n')}
  </div></body></text>
</TEI>
`;
}

const META = ['ledger', 'ledgertitle', 'objectnumber', 'batch', 'dating', 'watermark'];

if (!existsSync(dir)) {
  process.stdout.write('tei: nothing rendered yet — run npm run render first\n');
  process.exit(0);
}

let n = 0;
for (const d of readdirSync(dir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of readdirSync(resolve(dir, d.name))) {
    if (!f.endsWith('.tex')) continue;
    const tex = readFileSync(resolve(dir, d.name, f), 'utf8');
    const meta = {};
    for (const k of META) {
      const m = new RegExp(`\\\\${k}\\{`).exec(tex);
      if (m) meta[k] = group(tex, m.index + m[0].length - 1)[0];
    }
    // The pass line is the file's own header comment, which names the model
    // that read the sheets and the date. It travels into the TEI header so a
    // deposited file keeps its provenance without this site.
    const pass = /^%\s*Pass:\s*(.+)$/m.exec(tex);
    meta.pass = pass ? pass[1].trim() : undefined;

    const target = resolve(dir, d.name, f.replace(/\.tex$/, '.xml'));
    writeFileSync(target, convert(tex, meta));
    n++;
    try {
      execFileSync('xmllint', ['--noout', target], { stdio: 'pipe' });
    } catch (e) {
      if (e.code !== 'ENOENT') {
        process.stderr.write(`  ${target}: not well-formed\n${e.stderr ?? ''}\n`);
        process.exitCode = 1;
      }
    }
  }
}
process.stdout.write(`tei: ${n} file(s)\n`);
