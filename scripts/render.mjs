#!/usr/bin/env node
/**
 * `transcripts/**.tex` -> the reading views the site's left pane shows.
 *
 * The converter accepts a **restricted subset** of LaTeX, deliberately. A
 * converter that accepted everything would silently mangle what it did not
 * understand, and a silently mangled ledger is a table of numbers that look
 * right. Stepping outside the subset makes rendering fail loudly, naming the
 * file, the line and the construct - which is the wanted behaviour.
 *
 * Two checks run beyond parsing, and both exist because the failure they catch
 * is invisible in the output:
 *
 * - every `\sheet{ref}{leaf}` must name a resource ref that is in the archive
 *   **and belongs to the ledger the file declares**. A ref from another book
 *   renders perfectly and shows the wrong photograph;
 * - the leaf number must match what `scripts/catalogue.mjs` parsed from the
 *   Whitney's own descriptor. A mistyped leaf moves an entry to another year,
 *   and nothing downstream would notice.
 *
 * Usage: `npm run render` - all files; `npm run render -- book-i` - one ledger.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { keywordTerms, parseKeyword, workKey } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');

/* ------------------------------------------------------------------ archive */

/**
 * The archive, read straight out of the generated catalogue.
 *
 * Parsed with a regexp rather than imported because this is a plain Node
 * script and `catalogue.ts` is TypeScript. The shape it parses is written by
 * `catalogue.mjs` one line per sheet, so the coupling is between two files in
 * this directory and breaks loudly if either changes.
 */
const CATALOGUE = (() => {
  const src = readFileSync(resolve(root, 'src/content/catalogue.ts'), 'utf8');
  const rows = [
    ...src.matchAll(
      /\{ ref: (\d+), ledger: '([^']+)', seq: (\d+), leaf: (null|\d+), spread: (null|\d+), kind: '([^']+)',/g,
    ),
  ].map((m) => ({
    ref: Number(m[1]),
    ledger: m[2],
    seq: Number(m[3]),
    leaf: m[4] === 'null' ? null : Number(m[4]),
  }));
  if (!rows.length) throw new Error('render: could not read src/content/catalogue.ts');
  return new Map(rows.map((r) => [r.ref, r]));
})();

/* -------------------------------------------------------------- where to look */

/**
 * Where a work named on a leaf can be looked at, from `npm run works`.
 *
 * This is the answer to the one thing the site cannot do. The right pane shows
 * the sheet, and on the sheet is Edward Hopper's ink memorandum of the work,
 * an inch across; what it is a memorandum *of* is not here and cannot be —
 * the works are in copyright, and holding an image would break the only
 * promise the project makes. So a title that a museum with a public API holds
 * gets a link to that museum's own record, which serves its own picture.
 *
 * Absent when `works.json` has not been built, and then nothing links and
 * nothing breaks: this is an enrichment, and a transcription is not less true
 * without it.
 */
const WORKS = (() => {
  try {
    const w = JSON.parse(readFileSync(resolve(root, 'src/content/works.json'), 'utf8'));
    return { byKey: new Map(w.works.map((x) => [x.key, x])), aliases: w.aliases ?? {} };
  } catch {
    return null;
  }
})();

/**
 * The work a title names, if any museum here holds one under it.
 *
 * The title arrives as the leaf writes it, apparatus and all, so the marks are
 * stripped first — but only the marks. A title that was read doubtfully still
 * looks itself up, because `\uncertain{Aux Fortifications}` is a reading of
 * « Aux Fortifications », and refusing to link it would hide the very
 * identification a reader wants to check.
 */
function findWork(rawTitle) {
  if (!WORKS) return null;
  const plainTitle = rawTitle
    .replace(/\\ill\{\}|\\ill\b/g, '')
    .replace(/\\(uncertain|add|struck|emph|textit|textbf|texttt)\{/g, '{')
    .replace(/\\hand\{[a-z]+\}\{/g, '{')
    .replace(/\\quad|\\qquad/g, ' ')
    .replace(/[{}]/g, '')
    .trim();
  // A leaf writes the title and then the size on one line. Only the part
  // before a measurement is the title.
  const cut = plainTitle.split(/\s{2,}|\s\d+\s*[x\u00d7]\s*\d/)[0].trim();
  let k = workKey(cut);
  const alias = WORKS.aliases[k];
  if (alias) k = alias.to;
  const work = WORKS.byKey.get(k);
  if (!work) return null;
  return { work, via: alias ?? null };
}

/**
 * The link cluster shown beside a work's heading.
 *
 * Small, and it says what it is: these are places the work can be seen, not a
 * claim that the impression the row concerns is the one held there. An entry
 * assembled across two house titles, or reached through a judged alias, says
 * so — those are the joins a reader would otherwise cite as facts.
 */
function workLinks(found) {
  if (!found) return '';
  const { work, via } = found;
  const soft =
    via?.mapping === 'likely' ||
    work.mapping === 'likely' ||
    (work.alsoTitled ?? []).some((a) => a.mapping === 'likely');
  const why = [
    via ? `identified with “${work.title}” — ${via.mapping}: ${via.why}` : null,
    ...(work.alsoTitled ?? []).map((a) => `also catalogued as “${a.title}” — ${a.mapping}: ${a.why}`),
  ].filter(Boolean).join(' · ');
  return (
    `<span class="works"${why ? ` title="${esc(why)}"` : ''}>` +
    `<span class="works-tag">see the work${soft ? ' *' : ''}</span>` +
    work.holdings
      .map(
        (h) =>
          `<a href="${esc(h.url)}" target="_blank" rel="noreferrer" ` +
          `title="${esc(h.institution)}">${esc(h.short)}</a>`,
      )
      .join('') +
    '</span>'
  );
}

/* -------------------------------------------------------------------- parse */

class TexError extends Error {
  constructor(file, line, msg) {
    super(`${file}:${line}  ${msg}`);
    this.name = 'TexError';
  }
}

/** Balanced `{...}` starting at `i` (which must be the `{`). Returns [body, next]. */
function group(src, i, file, line) {
  while (src[i] === ' ' || src[i] === '\n') i++;
  if (src[i] !== '{') throw new TexError(file, line, 'expected an opening brace');
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '\\') {
      j++;
      continue;
    }
    if (src[j] === '{') depth++;
    else if (src[j] === '}') {
      depth--;
      if (depth === 0) return [src.slice(i + 1, j), j + 1];
    }
  }
  throw new TexError(file, line, 'unclosed brace');
}

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** LaTeX text conventions that survive into the reading view. */
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

function plain(s) {
  return esc(s)
    .replace(/\\%/g, '%')
    .replace(/\\\$/g, '$')
    .replace(/\\&amp;/g, '&amp;')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/``/g, '“')
    .replace(/''/g, '”')
    .replace(/~/g, ' ')
    .replace(/\\ /g, ' ');
}

/**
 * The hands this archive distinguishes.
 *
 * `unidentified` is here because it is the honest answer far more often than a
 * transcriber's confidence suggests, and a vocabulary without it pushes every
 * doubtful attribution onto `jo`, who wrote most of the words and would
 * therefore absorb every mistake.
 */
const HANDS = new Set(['edward', 'jo', 'later', 'unidentified']);

const ILL = '<span class="ill" title="illegible - not guessed">[&hellip;]</span>';

/** Inline commands: name -> [arity, render]. */
const INLINE = {
  emph: [1, (a) => `<em>${a[0]}</em>`],
  textit: [1, (a) => `<em>${a[0]}</em>`],
  textbf: [1, (a) => `<strong>${a[0]}</strong>`],
  texttt: [1, (a) => `<code>${a[0]}</code>`],
  // Horizontal space, which a ledger transcription needs more than a prose one:
  // Edward Hopper wrote a title and its dimensions on one line separated by a
  // gap, and a single space would present them as a sentence.
  quad: [0, () => '<span class="quad"></span>'],
  qquad: [0, () => '<span class="quad quad2"></span>'],
  // The apparatus. Each carries a class the stylesheet colours and the legend
  // at the head of every reading view explains, so a reader meeting the mark
  // for the first time is one glance from knowing that it means "illegible,
  // and not guessed".
  uncertain: [1, (a) => `<span class="uncertain" title="doubtful reading">${a[0]}</span>`],
  add: [1, (a) => `<span class="add" title="editorial addition">[${a[0]}]</span>`],
  struck: [1, (a) => `<del title="struck out in the book">${a[0]}</del>`],
  hand: [
    2,
    (a, ctx) => {
      const who = a[0].replace(/<[^>]*>/g, '').trim();
      if (!HANDS.has(who)) {
        throw new TexError(
          ctx.file,
          ctx.line,
          `\\hand{${who}} - must be one of ${[...HANDS].join(', ')}`,
        );
      }
      return `<span class="hand hand-${who}"><span class="hand-tag">${who}</span>${a[1]}</span>`;
    },
  ],
};

const BLOCK_CMD = new Set([
  'sheet',
  'note',
  'marginal',
  'sketch',
  'clipping',
  'work',
  'keywords',
  'section',
  'subsection',
  'item',
]);

const ENVIRONMENTS = new Set(['itemize', 'enumerate', 'quote', 'ledgertable']);

const OPEN = { itemize: '<ul>', enumerate: '<ol>', quote: '<blockquote>' };
const CLOSE = { itemize: '</ul>', enumerate: '</ol>', quote: '</blockquote>' };


/**
 * Split a table row into cells at `&`, respecting escapes and braces.
 *
 * `String.split('&')` is wrong here and was wrong in a way that took a real
 * leaf to notice: Jo Hopper writes « Hopper & Pop Hart Ex. at Sidney
 * Phillips », the transcription escapes it `\&`, and a naive split cut the
 * cell in half inside a `\struck{}` — which then failed as an unclosed brace
 * rather than as a wrong table, so at least it failed. A `&` inside a braced
 * argument would have split silently.
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

/** Split a table body into rows at `\\`, respecting braces for the same reason. */
function rows(body) {
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

/**
 * Parse one document body into HTML.
 *
 * A single left-to-right scan with an explicit output buffer rather than a
 * tree, because the subset has no construct that nests a block inside an
 * inline one. Where that stops being true the parser has to be rewritten - and
 * it should be, rather than extended by one more special case.
 */
function render(src, file, meta) {
  const out = [];
  const sheets = [];
  const envs = [];
  let i = 0;
  let line = 1;
  let para = [];

  /** True while the innermost open environment is a list. */
  const inList = () => {
    const top = envs[envs.length - 1];
    return top && (top.env === 'itemize' || top.env === 'enumerate');
  };

  const flush = () => {
    const t = para.join('').trim();
    para = [];
    if (!t) return;
    // Inside a list the text belongs to the open `<li>`; wrapping it in a `<p>`
    // would put a paragraph break inside every bullet.
    out.push(inList() ? t : `<p>${t}</p>`);
  };

  /** Close an open `<li>`, if the innermost environment is a list holding one. */
  const closeItem = () => {
    if (inList() && envs[envs.length - 1].item) {
      out.push('</li>');
      envs[envs.length - 1].item = false;
    }
  };

  /** Inline-only rendering, for a command's argument or a table cell. */
  function inline(s) {
    let o = '';
    let j = 0;
    while (j < s.length) {
      if (s[j] !== '\\') {
        const next = s.indexOf('\\', j);
        o += plain(s.slice(j, next < 0 ? s.length : next));
        j = next < 0 ? s.length : next;
        continue;
      }
      // `\\` is a line break. In a table row it is the row separator and has
      // already been consumed by `rows()`, so anywhere `inline` meets it, it is
      // a break inside a cell or inside a macro's argument — which is where
      // Jo Hopper's five-line inscriptions live.
      if (s[j + 1] === '\\') {
        o += '<br>';
        j += 2;
        continue;
      }
      const m = /^\\([a-zA-Z]+)\*?/.exec(s.slice(j));
      if (!m) {
        const c = s[j + 1] ?? '';
        if (!ESCAPES.has(c)) {
          throw new TexError(file, line, `\\${c} is outside the permitted subset`);
        }
        o += plain(s.slice(j, j + 2));
        j += 2;
        continue;
      }
      const name = m[1];
      j += m[0].length;
      if (name === 'ill') {
        // Written `\ill{}` by every transcriber, because that is how it looks
        // in every other apparatus macro. The macro takes no argument, so the
        // empty group is swallowed here rather than left to render as `{}`.
        if (s.slice(j, j + 2) === '{}') j += 2;
        o += ILL;
        continue;
      }
      const spec = INLINE[name];
      if (!spec) throw new TexError(file, line, `\\${name} is outside the permitted subset`);
      const got = [];
      for (let k = 0; k < spec[0]; k++) {
        while (s[j] === ' ') j++;
        if (s[j] !== '{') throw new TexError(file, line, `\\${name} takes ${spec[0]} argument(s)`);
        const [g, next] = group(s, j, file, line);
        got.push(inline(g));
        j = next;
      }
      o += spec[1](got, { file, line });
    }
    return o;
  }

  /** N brace groups from the main scan, rendered inline. */
  const args = (n) => {
    const got = [];
    for (let k = 0; k < n; k++) {
      const [g, next] = group(src, i, file, line);
      got.push(inline(g));
      i = next;
    }
    return got;
  };

  /** N brace groups read without consuming, for a lookup that needs the source. */
  const peek = (n) => {
    const got = [];
    let j = i;
    for (let k = 0; k < n; k++) {
      const [g, next] = group(src, j, file, line);
      got.push(g);
      j = next;
    }
    return got;
  };

  /** N brace groups from the main scan, raw. */
  const raw = (n) => {
    const got = [];
    for (let k = 0; k < n; k++) {
      const [g, next] = group(src, i, file, line);
      got.push(g);
      i = next;
    }
    return got;
  };

  while (i < src.length) {
    const c = src[i];

    if (c === '\n') {
      line++;
      i++;
      // A blank line ends a paragraph - the one piece of LaTeX syntax that is
      // whitespace and cannot be tokenised away.
      if (/^[ \t]*\n/.test(src.slice(i))) {
        flush();
        while (/[ \t\n]/.test(src[i] ?? '')) {
          if (src[i] === '\n') line++;
          i++;
        }
        continue;
      }
      para.push(' ');
      continue;
    }

    if (c === '%') {
      const nl = src.indexOf('\n', i);
      i = nl < 0 ? src.length : nl;
      continue;
    }

    if (c !== '\\') {
      const rest = src.slice(i + 1);
      const next = rest.search(/[\\\n%]/);
      const chunk = src.slice(i, next < 0 ? src.length : i + 1 + next);
      para.push(plain(chunk));
      i += chunk.length;
      continue;
    }

    const m = /^\\([a-zA-Z]+)(\*?)/.exec(src.slice(i));
    if (!m) {
      const c = src[i + 1] ?? '';
      if (!ESCAPES.has(c)) {
        throw new TexError(file, line, `\\${c} is outside the permitted subset`);
      }
      para.push(plain(src.slice(i, i + 2)));
      i += 2;
      continue;
    }
    const name = m[1];
    i += m[0].length;

    if (name === 'begin' || name === 'end') {
      const [env] = raw(1);
      if (!ENVIRONMENTS.has(env)) {
        throw new TexError(file, line, `environment "${env}" is outside the permitted subset`);
      }
      flush();
      if (name === 'end') {
        closeItem();
        const open = envs.pop();
        if (!open || open.env !== env) {
          throw new TexError(
            file,
            line,
            `\\end{${env}} does not match \\begin{${open ? open.env : '-'}}`,
          );
        }
        out.push(CLOSE[env]);
        continue;
      }
      if (env === 'ledgertable') {
        // Rows are `&`-separated and `\\`-terminated: a line-level construct
        // the character scan is the wrong shape to see. Lift the body out
        // whole, split it, and emit finished HTML.
        const [, head] = raw(2);
        const end = src.indexOf('\\end{ledgertable}', i);
        if (end < 0) throw new TexError(file, line, '\\begin{ledgertable} is never closed');
        const bodyText = src.slice(i, end);
        line += (bodyText.match(/\n/g) || []).length;
        i = end + '\\end{ledgertable}'.length;
        const cols = cells(head).map((h) => `<th>${inline(h.trim())}</th>`);
        const body = rows(bodyText)
          .map((r) => r.trim())
          .filter(Boolean)
          .map(
            (r) =>
              `<tr>${cells(r)
                .map((cell) => `<td>${inline(cell.trim())}</td>`)
                .join('')}</tr>`,
          );
        out.push(
          `<table class="ledger"><thead><tr>${cols.join('')}</tr></thead>` +
            `<tbody>${body.join('')}</tbody></table>`,
        );
        continue;
      }
      envs.push({ env, line });
      out.push(OPEN[env]);
      continue;
    }

    if (name === 'ill') {
      if (src.slice(i, i + 2) === '{}') i += 2;
      para.push(ILL);
      continue;
    }

    if (INLINE[name]) {
      const spec = INLINE[name];
      para.push(spec[1](args(spec[0]), { file, line }));
      continue;
    }

    if (!BLOCK_CMD.has(name)) {
      throw new TexError(file, line, `\\${name} is outside the permitted subset`);
    }

    switch (name) {
      case 'sheet': {
        const [refRaw, leafRaw] = raw(2);
        flush();
        const ref = Number(refRaw.trim());
        const rec = CATALOGUE.get(ref);
        if (!rec) throw new TexError(file, line, `\\sheet{${refRaw}} - no such resource ref`);
        if (rec.ledger !== meta.ledger) {
          throw new TexError(
            file,
            line,
            `\\sheet{${ref}} belongs to ${rec.ledger}, but this file declares \\ledger{${meta.ledger}}`,
          );
        }
        const leaf = leafRaw.trim() === '' ? null : Number(leafRaw.trim());
        if (leaf !== rec.leaf) {
          throw new TexError(
            file,
            line,
            `\\sheet{${ref}}{${leafRaw}} - the Whitney's descriptor gives leaf ` +
              `${rec.leaf === null ? '(none)' : rec.leaf}. Fix the transcription, or fix ` +
              `harvest/ and re-run npm run catalogue.`,
          );
        }
        sheets.push({ ref, leaf, seq: rec.seq });
        out.push(
          `<div class="sheet" id="sheet-${ref}" data-ref="${ref}" data-seq="${rec.seq}">` +
            `<span class="sheet-leaf">${leaf === null ? 'unnumbered' : `leaf ${leaf}`}</span>` +
            `<span class="sheet-ref">ref ${ref}</span></div>`,
        );
        break;
      }
      case 'section':
      case 'subsection': {
        const [t] = args(1);
        flush();
        const tag = name === 'section' ? 'h2' : 'h3';
        out.push(`<${tag}>${t}</${tag}>`);
        break;
      }
      case 'note': {
        const [t] = args(1);
        flush();
        out.push(`<div class="note" title="the transcriber's note">${t}</div>`);
        break;
      }
      case 'marginal': {
        const [t] = args(1);
        flush();
        out.push(`<div class="marginal" title="a marginal note in the book">${t}</div>`);
        break;
      }
      case 'sketch': {
        const [t] = args(1);
        flush();
        out.push(
          `<div class="sketch"><span class="sketch-tag">ink sketch</span>${t ? ` ${t}` : ''}</div>`,
        );
        break;
      }
      case 'clipping': {
        const [t] = args(1);
        flush();
        out.push(`<div class="clipping"><span class="clip-tag">clipping</span> ${t}</div>`);
        break;
      }
      case 'work': {
        const [raw] = peek(1);
        const [t] = args(1);
        flush();
        out.push(`<h4 class="work">${t}${workLinks(findWork(raw))}</h4>`);
        break;
      }
      case 'keywords': {
        const [t] = args(1);
        flush();
        // The facet is an index device, not part of the reading: a reader of
        // the transcription wants « Cape Cod », not « place:Cape Cod ». It is
        // kept in the source, where the person who read the sheets declared
        // it, and shown on the ledger page where it does some work.
        const terms = keywordTerms(t)
          .map((k) => parseKeyword(k).label)
          .join(', ');
        out.push(`<p class="keywords"><span>Keywords</span> ${terms}</p>`);
        break;
      }
      case 'item': {
        flush();
        closeItem();
        if (!inList()) {
          throw new TexError(file, line, '\\item outside itemize or enumerate');
        }
        envs[envs.length - 1].item = true;
        out.push('<li>');
        break;
      }
    }
  }
  flush();
  if (envs.length) {
    throw new TexError(file, envs[0].line, `\\begin{${envs[0].env}} is never closed`);
  }
  return { html: out.join('\n'), sheets };
}

/* --------------------------------------------------------------------- page */

const CSS = `
:root {
  --ink: #1a1a19; --dim: #6b6a66; --rule: #d9d6cf; --paper: #fbfaf7;
  --uncertain: #8a6d1f; --ill: #a2352b; --add: #2f5d8a; --accent: #7a2f2a;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 2rem 2.25rem 6rem; background: var(--paper); color: var(--ink);
  font: 16px/1.62 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
  max-width: 46rem;
}
h1 { font-size: 1.24rem; margin: 0 0 .2rem; }
h2 { font-size: 1.06rem; margin: 2.1rem 0 .55rem; }
h3 { font-size: .97rem; margin: 1.5rem 0 .4rem; }
h4.work { font-size: 1rem; margin: 1.6rem 0 .3rem; color: var(--accent); }
p { margin: 0 0 .85rem; }
.head { border-bottom: 1px solid var(--rule); padding-bottom: 1rem; margin-bottom: 1.6rem; }
.head .meta, .head .rights { font-size: .78rem; color: var(--dim); line-height: 1.5; }
.head .watermark { font-size: .78rem; color: var(--ill); font-weight: 600; letter-spacing: .04em; }
.legend { font-size: .74rem; color: var(--dim); margin-top: .7rem; }
.sheet {
  display: flex; gap: .6rem; align-items: baseline; margin: 2rem 0 .7rem;
  border-top: 1px solid var(--rule); padding-top: .45rem;
  font: 500 .72rem/1 ui-sans-serif, system-ui, sans-serif; color: var(--dim);
  letter-spacing: .06em; text-transform: uppercase; scroll-margin-top: 1rem;
}
.sheet-ref { margin-left: auto; opacity: .6; }
.uncertain { border-bottom: 1px solid var(--uncertain); color: var(--uncertain); }
.ill { color: var(--ill); }
.add { color: var(--add); }
del { color: var(--dim); }
.note, .marginal {
  font-size: .87rem; color: var(--dim); margin: .8rem 0; padding-left: .9rem;
  border-left: 2px solid var(--rule);
}
.note { font-style: italic; }
.sketch, .clipping { font-size: .87rem; color: var(--dim); margin: .8rem 0; }
.sketch-tag, .clip-tag, .hand-tag {
  font: 600 .68rem/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .07em;
  text-transform: uppercase;
}
.sketch-tag::before { content: "\\25FB\\FE0E  "; }
.hand-tag { margin-right: .35rem; opacity: .75; }
.hand-edward .hand-tag { color: #2f5d8a; }
.hand-jo .hand-tag { color: #7a2f2a; }
.hand-later .hand-tag, .hand-unidentified .hand-tag { color: var(--dim); }
table.ledger { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: .84rem; }
table.ledger th { text-align: left; border-bottom: 1.5px solid var(--ink);
  padding: .3rem .5rem .3rem 0;
  font: 600 .72rem/1.3 ui-sans-serif, system-ui, sans-serif;
  letter-spacing: .05em; text-transform: uppercase; }
.quad { display: inline-block; width: 1.4em; }
.quad2 { width: 2.6em; }
table.ledger td { border-bottom: 1px solid var(--rule); padding: .3rem .5rem .3rem 0;
  vertical-align: top; }
.keywords { font-size: .8rem; color: var(--dim); font-style: italic; }
.keywords span { font-style: normal; font-weight: 600; letter-spacing: .07em;
  text-transform: uppercase; font-size: .68rem; }
.works { margin-left: .55rem; white-space: nowrap; font-weight: 400; }
.works-tag {
  font: 600 .62rem/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: .08em;
  text-transform: uppercase; color: var(--dim); margin-right: .35rem;
}
.works a {
  font: 500 .7rem/1 ui-sans-serif, system-ui, sans-serif; color: var(--add);
  text-decoration: none; border: 1px solid var(--rule); border-radius: 999px;
  padding: .12rem .4rem; margin-right: .25rem;
}
.works a:hover { border-color: var(--add); }
blockquote { margin: .8rem 0 .8rem 1.2rem; color: var(--dim); }
ul, ol { margin: 0 0 .85rem; padding-left: 1.3rem; }
@media (prefers-color-scheme: dark) {
  :root { --ink: #e8e6e0; --dim: #9a978f; --rule: #3a3833; --paper: #171614;
          --uncertain: #d9b558; --ill: #e0796d; --add: #7fb2e0; --accent: #d99b93; }
}
`;

/**
 * The reading view is a complete document, framed by the site.
 *
 * A frame rather than a component, for the reason the Grothendieck workbench
 * uses one: the stylesheet above claims `body` and a dozen generic element
 * selectors, and dropped into the site's own page it would fight everything. A
 * same-origin frame keeps it whole and still lets the parent watch it scroll -
 * which is the entire mechanism by which reading the transcript turns the
 * facsimile.
 */
function page(meta, html) {
  // The metadata goes through the same conversions as the body: a title
  // written with an em-dash as `---` must not reach the header as three
  // hyphens.
  const title = plain(meta.ledgertitle || meta.ledger);
  const dating = meta.dating ? plain(meta.dating) : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/<[^>]*>/g, '')} - sheets ${meta.first}-${meta.last}</title>
<style>${CSS}</style>
</head>
<body>
<header class="head">
  <h1>${title}</h1>
  <div class="meta">
    ${meta.objectnumber ? `Whitney Museum of American Art, ${esc(meta.objectnumber)} &middot; ` : ''}
    sheets ${meta.first}&ndash;${meta.last}${meta.batch ? ` (batch ${meta.batch})` : ''}
    ${dating ? `&middot; the Whitney's dating: ${dating}` : ''}
  </div>
  ${meta.watermark ? `<div class="watermark">${plain(meta.watermark)}</div>` : ''}
  <div class="rights">&copy; Heirs of Josephine N. Hopper, licensed by Artists Rights Society
    (ARS), New York. Transcribed from the digitised sheets published by the Whitney Museum of
    American Art.</div>
  <div class="legend">
    <span class="uncertain">underlined</span> a doubtful reading &middot;
    <span class="ill">[&hellip;]</span> illegible, and never guessed &middot;
    <span class="add">[bracketed]</span> supplied by the editor &middot;
    <del>struck</del> crossed out in the book
  </div>
  <div class="legend">
    <span class="works-tag" style="margin:0">see the work</span> links to a museum record for a
    work of that title, checked by <code>npm run works</code> against the museum's own API. It
    does not claim that the impression a row concerns is the one held there &mdash; these are
    editions of a hundred, and the rows are the record of their dispersal. A
    <strong>*</strong> marks an identification that is a judgement rather than a spelling:
    hover it for the reason.
  </div>
</header>
${html}
<script>
/* Report the sheet nearest the top of the frame, so the facsimile pane can
   follow. Throttled to one animation frame: this fires on every scroll tick
   and the parent turns a photograph on each message it accepts. */
(function () {
  var marks = [].slice.call(document.querySelectorAll('.sheet'));
  if (!marks.length) return;
  var last = null, queued = false;
  function report() {
    queued = false;
    var best = null, bestD = Infinity;
    for (var i = 0; i < marks.length; i++) {
      var top = marks[i].getBoundingClientRect().top;
      var d = Math.abs(top - 8);
      if (top < window.innerHeight && d < bestD) { bestD = d; best = marks[i]; }
    }
    if (!best) return;
    var ref = best.getAttribute('data-ref');
    if (ref !== last) { last = ref; parent.postMessage({ hopperSheet: Number(ref) }, '*'); }
  }
  addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(report); }
  }, { passive: true });
  /* The other direction: the pane asks the transcript to jump to a sheet. */
  addEventListener('message', function (e) {
    if (!e.data || !e.data.hopperGoto) return;
    var el = document.getElementById('sheet-' + e.data.hopperGoto);
    if (el) el.scrollIntoView({ block: 'start' });
  });
  report();
})();
</script>
</body>
</html>
`;
}

/* --------------------------------------------------------------------- main */

const META = ['ledger', 'ledgertitle', 'objectnumber', 'batch', 'dating', 'watermark'];

function one(file) {
  const src = readFileSync(file, 'utf8');
  const meta = {};
  for (const k of META) {
    const m = new RegExp(`\\\\${k}\\{`).exec(src);
    if (m) meta[k] = group(src, m.index + m[0].length - 1, file, 1)[0];
  }
  const sh = /\\sheets\{(\d+)\}\{(\d+)\}/.exec(src);
  meta.first = sh ? sh[1] : '?';
  meta.last = sh ? sh[2] : '?';
  if (!meta.ledger) throw new TexError(file, 1, 'no \\ledger{} in the preamble');
  if (!meta.watermark) {
    throw new TexError(
      file,
      1,
      'no \\watermark{} - every file must declare its legal status on its own face. ' +
        'See transcripts/preamble/hopper.sty.',
    );
  }
  const b = /\\begin\{document\}([\s\S]*)\\end\{document\}/.exec(src);
  if (!b) throw new TexError(file, 1, 'no \\begin{document} ... \\end{document}');

  const { html, sheets } = render(b[1], file, meta);

  // Sheets must be transcribed in the order the book is bound in. A file that
  // jumps back turns the facsimile backwards while the reader scrolls forward,
  // which reads as a bug in the site rather than as a defect in the file.
  for (let k = 1; k < sheets.length; k++) {
    if (sheets[k].seq <= sheets[k - 1].seq) {
      throw new TexError(
        file,
        1,
        `\\sheet{${sheets[k].ref}} (position ${sheets[k].seq}) follows ` +
          `\\sheet{${sheets[k - 1].ref}} (position ${sheets[k - 1].seq}) - sheets must be in order`,
      );
    }
  }

  const name = basename(file).replace(/\.tex$/, '');
  // The output mirrors the source layout, and the directory name must be the
  // ledger the file declares. Two files can then never write over each other,
  // and a transcription filed under the wrong book is caught here rather than
  // by a reader who notices the photograph does not match the words. A
  // directory beginning with an underscore is exempt: that is the specimen,
  // which declares a real ledger so the archive checks have something to check
  // and must not be published under it.
  const dirName = basename(dirname(file));
  if (!dirName.startsWith('_') && dirName !== meta.ledger) {
    throw new TexError(file, 1, `filed under transcripts/${dirName}/ but declares \\ledger{${meta.ledger}}`);
  }
  const dir = resolve(root, 'public/transcripts', dirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${name}.html`), page(meta, html));
  // The source travels with the rendering: the download row offers it, and a
  // correction is made in the `.tex` and nowhere else.
  writeFileSync(resolve(dir, `${name}.tex`), src);
  return { sheets: sheets.length };
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const base = resolve(root, 'transcripts');
const ledgers = existsSync(base)
  ? readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== 'preamble')
      .map((d) => d.name)
      .filter((n) => !only.length || only.includes(n))
  : [];

let n = 0;
let sheets = 0;
for (const l of ledgers) {
  for (const f of readdirSync(resolve(base, l)).filter((f) => f.endsWith('.tex'))) {
    const r = one(resolve(base, l, f));
    n++;
    sheets += r.sheets;
    process.stdout.write(`  ${l}/${f}  ${r.sheets} sheets\n`);
  }
}
process.stdout.write(`render: ${n} file(s), ${sheets} sheets\n`);
if (!n) process.stdout.write('  (nothing under transcripts/ yet)\n');
