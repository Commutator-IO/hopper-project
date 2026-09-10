#!/usr/bin/env node
/**
 * Cuts a mirrored sheet into overlapping tiles, so a doubtful figure can be
 * looked at closely without choosing crop rectangles by hand.
 *
 * This exists because choosing crop rectangles is not reading. A ledger leaf
 * is 1292 × 2000 and carries forty ruled lines; the difference between 16.66
 * and 16.60 is a few dozen pixels, and a transcription pass that spends its
 * attention on coordinates has less of it left for the hand.
 *
 * Writes `archives/tiles/<ledger>/<seq>/` — the sheet whole, then a grid of
 * overlapping tiles, plus `tiles.json` carrying the rectangles so a tighter
 * crop can be asked for by number.
 *
 *   npm run tiles -- book-i 9          # by position in the book
 *   npm run tiles -- book-i 9 --grid 3x4
 *   npm run tiles -- garrulities 3     # a notebook's opening, by its id
 *
 * Needs ImageMagick (`brew install imagemagick`). Not needed to read the site —
 * only to transcribe. There is deliberately no fallback; see below.
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync, execSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const [ledger, seqRaw] = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const grid = (() => {
  const i = process.argv.indexOf('--grid');
  const m = i < 0 ? null : /^(\d+)x(\d+)$/.exec(process.argv[i + 1] ?? '');
  return m ? { cols: Number(m[1]), rows: Number(m[2]) } : { cols: 2, rows: 3 };
})();

if (!ledger || !seqRaw) {
  process.stderr.write('usage: npm run tiles -- <ledger|notebook> <sheet position> [--grid 2x3]\n');
  process.exit(1);
}

const seq = Number(seqRaw);
const dir = resolve(root, 'archives', ledger);
if (!existsSync(dir)) {
  process.stderr.write(`tiles: nothing mirrored for ${ledger} — run npm run mirror first\n`);
  process.exit(1);
}
const file = readdirSync(dir).find((f) => f.startsWith(String(seq).padStart(3, '0') + '-'));
if (!file) {
  process.stderr.write(`tiles: sheet ${seq} of ${ledger} is not mirrored\n`);
  process.exit(1);
}
const srcPath = resolve(dir, file);

const has = (c) => {
  try {
    execSync(`command -v ${c}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};
/**
 * ImageMagick, and **only** ImageMagick.
 *
 * This used to fall back to macOS `sips`, and the fallback was worse than
 * nothing: `sips -c h w --cropOffset y x` silently ignores the offset and
 * crops from the *centre* of the image. Every tile it produced was the middle
 * of the sheet under a filename claiming otherwise, and `tiles.json` recorded
 * rectangles that described nothing. Verified by probe: with and without
 * `--cropOffset 0 0` the two outputs are byte-identical.
 *
 * A transcriber magnifying « the top left of leaf 6 » and getting the middle of
 * leaf 6 has been handed a false document, and nothing on screen says so. That
 * is the one failure this project refuses everywhere else, so the fallback is
 * gone rather than fixed: better no tool than a tool that lies about which part
 * of the sheet you are looking at.
 */
const tool = has('magick') ? 'magick' : null;
if (!tool) {
  process.stderr.write(
    'tiles: needs ImageMagick.\n' +
      '  brew install imagemagick     (macOS)\n' +
      '  apt install imagemagick      (Debian/Ubuntu)\n' +
      '\n' +
      'macOS sips is deliberately NOT used as a fallback: it ignores\n' +
      '--cropOffset and crops from the centre, so every tile would be the\n' +
      'middle of the sheet under a filename claiming otherwise.\n',
  );
  process.exit(1);
}

const size = (() => {
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', srcPath])
    .toString()
    .split(' ')
    .map(Number);
  return { w, h };
})();

const out = resolve(root, 'archives/tiles', ledger, String(seq));
mkdirSync(out, { recursive: true });

/**
 * Tiles overlap by a fifth.
 *
 * A ruled line that falls on a seam is a line read twice at its two halves and
 * understood as neither. Overlap costs a little duplication and removes the
 * one failure that a transcriber cannot see happening.
 */
const OVERLAP = 0.2;
const tw = Math.ceil(size.w / (grid.cols - (grid.cols - 1) * OVERLAP));
const th = Math.ceil(size.h / (grid.rows - (grid.rows - 1) * OVERLAP));

const rects = [];
for (let r = 0; r < grid.rows; r++) {
  for (let c = 0; c < grid.cols; c++) {
    const x = Math.min(Math.round(c * tw * (1 - OVERLAP)), Math.max(0, size.w - tw));
    const y = Math.min(Math.round(r * th * (1 - OVERLAP)), Math.max(0, size.h - th));
    const name = `r${r + 1}c${c + 1}.jpg`;
    rects.push({ name, x, y, w: tw, h: th });
    execFileSync('magick', [
      srcPath,
      '-crop',
      `${tw}x${th}+${x}+${y}`,
      '+repage',
      // Upscaled on the way out: the tile is the thing being read, and a
      // 646-pixel-wide crop shown at its own size is no easier to read than
      // the whole sheet was.
      '-resize',
      '200%',
      resolve(out, name),
    ]);
  }
}

writeFileSync(
  resolve(out, 'tiles.json'),
  JSON.stringify({ source: file, width: size.w, height: size.h, grid, tiles: rects }, null, 2) +
    '\n',
);

process.stdout.write(
  `tiles: ${rects.length} tiles of ${file} (${size.w}x${size.h}) -> archives/tiles/${ledger}/${seq}/\n`,
);
