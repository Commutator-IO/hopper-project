#!/usr/bin/env node
/**
 * Builds the submission file the journal asks for.
 *
 * jTEI takes « a word-processor file format (OpenOffice, Microsoft Word, RTF,
 * etc.) or an XML format » and does not take PDF, so the article — written in
 * LaTeX, like everything else here — has to be converted. This does it in one
 * command rather than by hand, for the same reason every other derived file in
 * this repository is generated: a conversion made once by hand is wrong the
 * next time the article changes, and nobody notices.
 *
 * ## What it does
 *
 * The prose, the tables and the listings survive pandoc unaided. The figures do
 * not: they are TikZ and pgfplots, which Word has no notion of. So each figure
 * is compiled on its own into a PDF, rasterised to PNG at 300 dpi — the journal
 * asks for « 72 DPI or greater » in tif, jpg or png — and the `\input` that
 * pulled it in is replaced by an `\includegraphics` pointing at the PNG. The
 * caption and the label survive as they are, so the numbering and the
 * cross-references still hold.
 *
 * ## What it does not do
 *
 * Check the result. A converted file has to be read: the guillemets, the em
 * dashes, the struck words in the comparison table and the significant
 * whitespace of the listings all survive here today and may not survive the
 * next version of anything. The rights line each image needs under the
 * journal's checklist is not written here either, because it is a claim about
 * an image and not a fact about a file.
 *
 *   node docs/study/jtei/docx.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const here = import.meta.dirname;
const out = resolve(here, 'submission');
mkdirSync(out, { recursive: true });

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });

/** The article's preamble, so a figure compiled alone looks as it does in the article. */
const article = readFileSync(resolve(here, 'article.tex'), 'utf8');
const preamble = article.slice(0, article.indexOf('\\begin{document}'));

const figures = readdirSync(here).filter((f) => /^fig-.*\.tex$/.test(f)).sort();
if (!figures.length) throw new Error('docx: no fig-*.tex beside article.tex');

for (const fig of figures) {
  const name = fig.replace(/\.tex$/, '');
  const body = readFileSync(resolve(here, fig), 'utf8');
  // The figure with its caption removed and its float kept. `preview` is told
  // to cut at the float, which crops the page to the drawing — the caption
  // belongs in the document, where pandoc can carry it as text, and not baked
  // into a picture nobody can search.
  const inner = body
    .replace(/\\begin\{figure\}\[[^\]]*\]\\centering/, '')
    .replace(/\\caption\{[\s\S]*?\}\\label\{[^}]*\}/, '')
    .replace(/\\end\{figure\}/, '')
    .replace(/^%.*$/gm, '');
  writeFileSync(
    resolve(out, `${name}.standalone.tex`),
    `${preamble}\\pagestyle{empty}\n` +
      `\\begin{document}\n\\noindent ${inner}\n\\end{document}\n`,
  );
  for (const f of readdirSync(here)) if (/\.(tex|json)$/.test(f)) {
    writeFileSync(resolve(out, f), readFileSync(resolve(here, f)));
  }
  run('tectonic', ['-X', 'compile', `${name}.standalone.tex`, '--outdir', '.'], out);
  // pdftoppm rather than ImageMagick: magick shells out to Ghostscript for a
  // PDF and fails without it, and poppler is already a dependency of this
  // repository's other PDF work.
  run('pdftoppm', ['-png', '-r', '300', '-singlefile', `${name}.standalone.pdf`, `${name}.page`], out);
  // The page is mostly margin; ImageMagick trims it. It reads a PNG without
  // Ghostscript, which is why the PDF was rasterised first.
  run('magick', [`${name}.page.png`, '-bordercolor', 'white', '-border', '20',
    '-trim', '+repage', `${name}.png`], out);
  // The whole-page rasterisation and the standalone sources are scaffolding;
  // only the trimmed PNG is part of the submission.
  for (const junk of [`${name}.page.png`, `${name}.standalone.tex`, `${name}.standalone.pdf`])
    rmSync(resolve(out, junk), { force: true });
  process.stdout.write(`  ${name}.png\n`);
}

// The article, with every figure replaced by its image.
let tex = article;
for (const fig of figures) {
  const name = fig.replace(/\.tex$/, '');
  const body = readFileSync(resolve(here, fig), 'utf8');
  const caption = /\\caption\{([\s\S]*?)\}\\label\{([^}]*)\}/.exec(body);
  if (!caption) throw new Error(`docx: ${fig} has no caption and label`);
  tex = tex.replace(
    `\\input{${fig}}`,
    `\\begin{figure}[htbp]\\centering\n\\includegraphics[width=\\textwidth]{${name}.png}\n` +
      `\\caption{${caption[1]}}\\label{${caption[2]}}\n\\end{figure}`,
  );
}
tex = tex.replace('\\usepackage{fontspec}', '\\usepackage{graphicx}\\usepackage{fontspec}');
writeFileSync(resolve(out, 'article.submission.tex'), tex);

run('pandoc', ['article.submission.tex', '-o', 'article.docx', '--standalone',
  '--extract-media', '.'], out);

const words = run('pandoc', ['article.docx', '-t', 'plain'], out).split(/\s+/).length;
const media = readdirSync(out).filter((f) => f.endsWith('.png')).length;
process.stdout.write(
  `docx: ${words} words, ${figures.length} figure(s) as PNG at 300 dpi -> ` +
    `docs/study/jtei/submission/article.docx\n` +
    `      ${media} image file(s); the journal wants tif, jpg or png at 72 dpi or better,\n` +
    `      each captioned with its rights holder — that line is yours to write.\n`,
);
