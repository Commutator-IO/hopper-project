#!/usr/bin/env node
/**
 * Reads the ink off the photographs of Book IV and puts it into the
 * transcription.
 *
 * Book IV's colour is its status field — charges black, receipts red, sums
 * pencil — and the fourteen batches were transcribed without recording it
 * (#19). Reading it back by eye is a hundred and sixty leaves against the
 * photographs; reading it back from the photograph is what this does, because
 * the colour is the one thing on the leaf a machine can see better than the
 * hand it is written in. The transcription then says which row is which, and
 * the image says what colour it is.
 *
 * ## What it reads
 *
 * For each sheet, the Whitney's `pre` image in `archives/<ledger>/`, through
 * ImageMagick as raw bytes (the same dependency `tiles.mjs` has). Three masks:
 * red ink, dark ink and the grey of pencil. The stationer's red vertical rules
 * give the four columns; the projection of the written pixels down the page
 * gives the written lines; each line's cells are classed by which mask holds
 * them; and a thin dark run across the money columns in the gap above a line
 * is a rule she drew, which makes that line's figure a sum.
 *
 * ## What it refuses
 *
 * The alignment is ordinal — the rows of the leaf's table stand on the
 * written lines of the photograph in order — found as the best fit for the
 * whole leaf, with two allowances the leaves make necessary: two rows may
 * share a line where one has the words and the other the money, and a year
 * alone may stand above the ruling and have no line at all. A line with
 * writing on it that no row accounts for stops the leaf, and so does a row
 * that fits no line; the report says which row, and `--why` shows it beside
 * the line it faced. Then the words and the colour are held to each other:
 * a row that says « rec'd » must be red and a red line must say so, or carry
 * a bare figure, and a leaf where they contradict is stopped too. Nothing is
 * written into a `.tex` on a stopped leaf.
 *
 * What stops a leaf is as often the transcription as the photograph. Leaf 21
 * of batch 2 has fourteen rows for a leaf of twenty lines, and the six it
 * lacks are a whole entry; this pass is how that was found.
 *
 * A cell already marked (`\ink{}`) is compared with the reading and never
 * overwritten: a disagreement between the hand and the machine is a finding
 * and is printed, not resolved.
 *
 *   npm run ink -- book-iv            report every leaf, write nothing
 *   npm run ink -- book-iv 11         one batch
 *   npm run ink -- book-iv 11 --apply write the leaves that pass into the .tex
 *   npm run ink -- book-iv --why      each stopped leaf, with the row and line it stopped at
 *   npm run ink -- book-iv 11 --leaf 121 --dump [--counts]   the two sequences, side by side
 *   npm run ink -- book-iv 11 --diag <dir>        a picture of the reading per leaf
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { readTranscripts } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i < 0 ? null : argv[i + 1];
};
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'));
const [ledger, batchArg] = positional;
if (!ledger) {
  process.stderr.write('usage: npm run ink -- <ledger> [batch] [--apply] [--leaf N] [--dump]\n');
  process.exit(1);
}
const onlyBatch = batchArg ? Number(batchArg) : null;
const onlyLeaf = opt('--leaf') ? String(opt('--leaf')) : null;

/* ------------------------------------------------------------- the image */

/** The image for a resource ref, by the file name `tiles.mjs` downloads to. */
const imageFor = (() => {
  const dir = resolve(root, 'archives', ledger);
  const files = readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f));
  return (ref) => {
    const f = files.find((n) => new RegExp(`^\\d+-${ref}(-|\\.)`).test(n));
    return f ? resolve(dir, f) : null;
  };
})();

/** Width, height, and the RGB bytes of an image. */
function pixels(file) {
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', file])
    .toString()
    .trim()
    .split(' ')
    .map(Number);
  const rgb = execFileSync('magick', [file, '-depth', '8', 'rgb:-'], {
    maxBuffer: 256 * 1024 * 1024,
  });
  return { w, h, rgb };
}

/**
 * Three masks, one byte a pixel: 1 red ink, 2 dark ink, 3 pencil, 4 blue, 0
 * paper. The thresholds are the ones leaf 121 was measured with: the red of
 * her receipts is red by forty-five points over the other two channels; ink
 * strokes reach below 110 of 255; pencil sits between 110 and 185 with the
 * three channels within thirty of each other, which is what grey is.
 */
function classify({ w, h, rgb }) {
  const m = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 3) {
    const r = rgb[p];
    const g = rgb[p + 1];
    const b = rgb[p + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (r - Math.max(g, b) > 45 && r > 90) m[i] = 1;
    else if (b - Math.max(r, g) > 30 && b > 80) m[i] = 4;
    else if (max < 110) m[i] = 2;
    // Pencil is grey; a faded or brown ink is warm. The early leaves are in an
    // ink that has gone to sepia and reads as light as pencil by intensity,
    // and is told from it only by its red running ahead of its blue.
    else if (max < 185 && max - min < 30 && r - b < 12) m[i] = 3;
    else if (max < 185 && max - min < 45 && r - b >= 12) m[i] = 2;
  }
  return m;
}

/**
 * The stationer's vertical rules: a date column at the left, the description,
 * then dollars and cents. Read as the columns whose red-ish pixels run down
 * more than half the page; where the photograph does not give four of them,
 * the proportions of leaf 121 stand in, and the leaf says so in its report.
 */
function columns({ w, h, rgb }) {
  const cover = new Float64Array(w);
  for (let y = Math.floor(h * 0.1); y < h * 0.9; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 3;
      if (rgb[p] - Math.max(rgb[p + 1], rgb[p + 2]) > 18) cover[x]++;
    }
  }
  const span = h * 0.8;
  const found = [];
  for (let x = Math.floor(w * 0.08); x < w * 0.98; x++) {
    if (cover[x] / span > 0.45) {
      if (found.length && x - found[found.length - 1] < w * 0.02) continue;
      found.push(x);
    }
  }
  // Each expected rule takes the nearest measured one within three per cent
  // of the width, and stands at its usual place where none was seen.
  const expected = [0.19, 0.73, 0.85, 0.94].map((f) => Math.round(w * f));
  let measured = 0;
  const rules = expected.map((e) => {
    const near = found.filter((x) => Math.abs(x - e) < w * 0.03).sort((a, b) => Math.abs(a - e) - Math.abs(b - e))[0];
    if (near === undefined) return e;
    measured++;
    return near;
  });
  return { rules, measured: measured === 4 ? 'measured' : `${measured} of 4 rules measured` };
}

/**
 * The written lines, top to bottom.
 *
 * The written pixels are projected onto the vertical axis from just left of
 * the date rule to the fore-edge, so that the gutter and whatever shows
 * through from the verso are left out, and the top and bottom of the
 * photograph, which are the leaf's edges, are left out too. A written line
 * is a peak of that profile: the x-height of a line of cursive is where the
 * ink is densest, and a descender reaching into the line below is not a peak
 * of its own. Peaks closer than two thirds of the ruling's pitch are one
 * line, and each line takes the ruling's slot around its peak.
 */
function lines(mask, w, h, rules) {
  const x0 = rules[0] - Math.round(w * 0.07);
  // No further right than the last rule: the photograph often shows the
  // fore-edge and a strip of the facing leaf beyond it, with writing on it.
  const x1 = rules[3] + Math.round(w * 0.005);
  // The leaf's edges photograph as a dark band across the whole width, and
  // the writing stops short of them: the top edge is the last such band in
  // the top sixth of the frame, the bottom edge the first in the bottom sixth.
  const edge = (y) => {
    let n = 0;
    for (let x = x0; x < x1; x++) if (mask[y * w + x] === 2) n++;
    return n > (x1 - x0) * 0.5;
  };
  // Where no band is found the frame's own margin stands: a fourteenth at
  // the top, where the border is broad, a fortieth at the foot, where a year
  // total can sit within a line of the edge.
  let y0 = Math.round(h * 0.07);
  for (let y = Math.round(h * 0.02); y < h / 6; y++) if (edge(y)) y0 = Math.max(y0, y + 12);
  let y1 = Math.round(h * 0.975);
  for (let y = Math.round(h * 0.99); y > (h * 5) / 6; y--) if (edge(y)) y1 = Math.min(y1, y - 12);
  const pitch = h / 31;
  const k = Math.round(pitch / 4);
  /**
   * The peaks of one column's profile. Each column is read on its own,
   * because the figures sit level on the ruling and are short, while the
   * words to their left are tall, loose and, on the early leaves, faded — a
   * profile of the whole row puts its peak where the words are densest,
   * which on leaf 7 is half a line above the figures the row is there for.
   */
  const peaksOf = (xa, xb, skipRules) => {
    const prof = new Float64Array(h);
    for (let y = y0; y < y1; y++) {
      let n = 0;
      for (let x = xa; x < xb; x++) if (mask[y * w + x]) n++;
      // A rule she drew across the money columns is a row of ink where the
      // gap between two lines should be, and it fills the very valley that
      // tells a short line under it — the sum — from the line above.
      prof[y] = skipRules && n > (xb - xa) * 0.5 ? 0 : n;
    }
    const smooth = new Float64Array(h);
    for (let y = 0; y < h; y++) {
      let s = 0;
      let c = 0;
      for (let d = -k; d <= k; d++) {
        if (y + d < 0 || y + d >= h) continue;
        s += prof[y + d];
        c++;
      }
      smooth[y] = s / c;
    }
    // Low, because a year alone on its line — « 1947 » — is four small
    // figures and no more than a twentieth of what a line of cursive puts down.
    const top = Math.max(...smooth);
    const thr = Math.max(4, top * 0.04);
    const minGap = pitch * 0.6;
    const peaks = [];
    for (let y = 1; y < h - 1; y++) {
      if (smooth[y] < thr) continue;
      if (smooth[y] < smooth[y - 1] || smooth[y] < smooth[y + 1]) continue;
      const last = peaks[peaks.length - 1];
      if (last !== undefined && y - last.y < minGap) {
        if (smooth[y] > last.v) peaks[peaks.length - 1] = { y, v: smooth[y] };
        continue;
      }
      peaks.push({ y, v: smooth[y] });
    }
    // A cursive descender — the tail of « rec'd by check » — makes a small
    // peak of its own just under the line it belongs to. What tells it from a
    // short line of its own is not how little ink it has but that no gap of
    // paper separates it from the line above: the profile never falls away
    // between the two peaks. A shoulder, not a line. Measured on leaf 121: a
    // shoulder never dips below 0.97 of its peak, the shortest real line to 0.79.
    const kept = [];
    for (const p of peaks) {
      const last = kept[kept.length - 1];
      if (last !== undefined && p.y - last.y < pitch * 0.9) {
        let valley = Infinity;
        for (let y = last.y; y <= p.y; y++) valley = Math.min(valley, smooth[y]);
        if (valley > p.v * 0.9) continue;
      }
      kept.push(p);
    }
    return kept;
  };
  const date = peaksOf(x0, rules[0], false).map((p) => ({ ...p, col: 'date' }));
  const words = peaksOf(rules[0], rules[1], false).map((p) => ({ ...p, col: 'words' }));
  const figures = peaksOf(rules[1], x1, true).map((p) => ({ ...p, col: 'figures' }));
  // The words anchor the lines. A figure belongs to the words on its left,
  // and on the early leaves it hangs: the amount is written on the ruling
  // while the words' x-height sits above it, so a figure is taken by the
  // words line up to two thirds of a line *above* it and only a third below.
  // A date is written level with its words. What no words line claims — a
  // sum ruled off on a line of its own, a year alone — is a line of its own,
  // provided it is a firm peak and not a fleck or the verso showing through:
  // a year alone in the date column is about fifteen a row.
  const lines = words.map((p) => ({ words: p.y, figures: null, date: null }));
  // Where a column's peaks sit relative to the words is the leaf's own habit
  // — the early hand hangs its figures half a line under the words, the later
  // hand sets its digits, which are all cap-height, a third of a line above
  // the words' x-height — so the offset is measured on the leaf, as the
  // median distance from each of the column's peaks to the nearest words
  // peak, and a peak is claimed within four tenths of a line of it.
  const claim = (peaks, key) => {
    const nearestWords = (y) =>
      words.reduce((best, q) => (Math.abs(q.y - y) < Math.abs(best - y) ? q.y : best), Infinity);
    const ds = peaks
      .map((p) => p.y - nearestWords(p.y))
      .filter((d) => Math.abs(d) < pitch * 0.8)
      .sort((a, b) => a - b);
    const offset = ds.length ? ds[Math.floor(ds.length / 2)] : 0;
    for (const p of peaks) {
      const near = lines
        .filter((l) => l.words !== null && l[key] === null)
        .filter((l) => Math.abs(p.y - l.words - offset) <= pitch * 0.4)
        .sort((a, b) => Math.abs(p.y - a.words - offset) - Math.abs(p.y - b.words - offset))[0];
      if (near) near[key] = p.y;
      else if (p.v >= 10) lines.push({ words: null, figures: null, date: null, [key]: p.y });
    }
  };
  claim(figures, 'figures');
  claim(date, 'date');
  const at = (l) => l.words ?? l.figures ?? l.date;
  lines.sort((a, b) => at(a) - at(b));
  // A sum and a year on one line, neither with words — leaf 121's « 1948 »
  // beside its pencil « 2360 53 » — arrive as two lines and are one.
  for (let i = lines.length - 1; i > 0; i--) {
    const a = lines[i - 1];
    const b = lines[i];
    if (a.words === null && b.words === null && at(b) - at(a) < pitch * 0.35 && !(a.figures && b.figures) && !(a.date && b.date)) {
      a.figures ??= b.figures;
      a.date ??= b.date;
      lines.splice(i, 1);
    }
  }
  // Each column's slot is centred on that column's own peak, half a line
  // either way and no further than the neighbouring line's peak in the same
  // column. A column the line has no peak in takes the line's own place.
  const half = Math.round(pitch * 0.45);
  const slot = (key, i) => {
    const l = lines[i];
    const y = l[key] ?? at(l);
    const prev = lines[i - 1] ? (lines[i - 1][key] ?? at(lines[i - 1])) : undefined;
    const next = lines[i + 1] ? (lines[i + 1][key] ?? at(lines[i + 1])) : undefined;
    return {
      top: Math.max(0, prev === undefined ? y - half : Math.max(y - half, Math.round((prev + y) / 2))),
      bottom: Math.min(h, next === undefined ? y + half : Math.min(y + half, Math.round((y + next) / 2))),
    };
  };
  return lines.map((l, i) => ({
    peak: at(l),
    figures: l.figures,
    pitch,
    ...slot('words', i),
    slots: [slot('date', i), slot('words', i), slot('figures', i), slot('figures', i)],
  }));
}

/**
 * A picture of what was read, for a person to check the reading against:
 * the three masks in their colours, the rules in green, and each line's
 * slot in green too.
 */
function diagnostic(mask, w, h, rules, found, file) {
  const out = Buffer.alloc(w * h * 3, 255);
  const colour = { 1: [200, 30, 20], 2: [0, 0, 0], 3: [150, 150, 150], 4: [40, 80, 200] };
  for (let i = 0; i < w * h; i++) {
    const c = colour[mask[i]];
    if (c) out.set(c, i * 3);
  }
  const green = [0, 160, 60];
  for (const x of rules) for (let y = 0; y < h; y++) out.set(green, (y * w + x) * 3);
  for (const b of found) {
    for (let x = 0; x < w; x += 3) {
      out.set(green, (b.top * w + x) * 3);
      out.set([120, 200, 140], (b.peak * w + x) * 3);
    }
  }
  execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'rgb:-', '-resize', '50%', file], {
    input: out,
    maxBuffer: 256 * 1024 * 1024,
  });
}

const INK = { 1: 'red', 2: 'black', 3: 'pencil', 4: 'blue' };

/** The ink of one cell: which mask holds it, or '' where nothing is written. */
const MIN_WRITTEN = [40, 60, 25, 20];
function cellInk(mask, w, band, xa, xb, col) {
  const n = [0, 0, 0, 0, 0];
  // The middle of the slot: the outer fifth on either side is where the line
  // above reaches down and the line below reaches up.
  const inset = Math.round((band.bottom - band.top) * 0.2);
  for (let y = band.top + inset; y < band.bottom - inset; y++) {
    for (let x = xa; x < xb; x++) n[mask[y * w + x]]++;
  }
  const written = n[1] + n[2] + n[3] + n[4];
  // What counts as writing depends on the column: a ditto mark in the date
  // column is two strokes, the cents are two small figures at the fore-edge,
  // and the red that bleeds into the description slot from the descenders of
  // the line above is under a hundred pixels at this size.
  if (written < MIN_WRITTEN[col]) return { ink: '', n, written };
  // Red and blue are decided by presence: a red word over a black figure is
  // a mixed cell, and mixed is reported as such rather than picked between.
  const dominant = [1, 2, 3, 4].sort((a, b) => n[b] - n[a])[0];
  const share = n[dominant] / written;
  if (dominant === 3 && n[2] > n[3] * 0.5) return { ink: 'mixed', n, written };
  if (dominant === 2 && n[1] > 40) return { ink: 'mixed', n, written };
  if (share < 0.6) return { ink: 'mixed', n, written };
  return { ink: INK[dominant] ?? '', n, written };
}

/**
 * Whether a rule is drawn across the money columns above a line: a thin dark
 * run covering more than half their width somewhere in the gap between this
 * line and the one before it.
 */
function ruledAbove(mask, w, band, prev, rules) {
  const xa = rules[1] + 4;
  const xb = rules[3] - 2;
  // Between the figure above and this one, where the figures are; the words
  // may sit higher than either.
  const here = band.figures ?? band.peak;
  const pitch = band.pitch;
  // From under the figure above to over this one: the digits are about four
  // tenths of a line tall about their peak, and a rule lies in the gap.
  const from = prev ? Math.round((prev.figures ?? prev.peak) + pitch * 0.28) : Math.max(0, here - 40);
  const to = Math.round(here - pitch * 0.28);
  // Her rule is a hand-drawn line and seldom level, so three rows are read
  // together: a column counts as crossed if any of the three is inked there.
  // And a rule is thin: a run of crossed rows longer than eight is a figure
  // standing in the gap, not a line drawn across it.
  let best = 0;
  let run = 0;
  let ruled = false;
  for (let y = from + 1; y < to - 1; y++) {
    let n = 0;
    for (let x = xa; x < xb; x++) {
      const i = y * w + x;
      const inked = (j) => mask[j] === 2 || mask[j] === 3 || mask[j] === 1;
      if (inked(i) || inked(i - w) || inked(i + w)) n++;
    }
    const cover = n / (xb - xa);
    best = Math.max(best, cover);
    // Measured on leaf 121: her rules cover 50 to 70 per cent of the money
    // columns, a line with no rule above it 40 at most.
    if (cover > 0.45) run++;
    else {
      if (run > 0 && run <= 8) ruled = true;
      run = 0;
    }
  }
  if (run > 0 && run <= 8) ruled = true;
  return { ruled, coverage: best };
}

/**
 * Which written line each transcription row stands on.
 *
 * Ordinal, with one allowance the leaves make necessary: two consecutive
 * rows may share a line where their cells do not overlap — the year « 1948 »
 * in the date column beside the pencil sum « 2360 53 » in the money columns
 * on leaf 121, which the edition gives as two rows because they are two
 * registers. A row fits a line when every cell it writes in is inked there;
 * the date column is held to that only on a row that writes nothing else,
 * because a ditto mark is two strokes and is the first thing a mask loses.
 * Anything that does not fit is a leaf for a person, and says which row.
 */
function align(rows, read) {
  // Two features and not four cells: whether a row has words (a date or a
  // description) and whether it has money. Where the date rule falls on a
  // photograph is not always measured, and a year written a little to the
  // right of it is still words; the money columns are where they are. A cell
  // the transcription could only offer doubtfully, or gave up on, may be one
  // the photograph shows nothing of — leaf 130's rubbed « \\uncertain{7} |
  // \\uncertain{75} » — so it counts for nothing here.
  const firm = (r, c) => r.plain[c].trim() !== '' && !/\\(uncertain|ill)\b/.test(r.cells[c]);
  const occ = rows.map((r) => [firm(r, 0) || firm(r, 1), firm(r, 2) || firm(r, 3)]);
  // What a line has: faintly, which a row may claim; strongly, which some row
  // must. Four hundred pixels is a word or a figure of its own; what a tall
  // figure on the line below reaches up into a slot is under three hundred.
  const ink = read.map((l) => [l.written[0] + l.written[1], l.written[2] + l.written[3]]);
  const weak = ink.map(([w, m]) => [w >= 60, m >= 25]);
  const strong = ink.map(([w, m]) => [w >= 400, m >= 400]);
  const fits = (o, j) => o.every((v, f) => !v || weak[j][f]);
  const covers = (o, j) => strong[j].every((v, f) => !v || o[f]);
  const disjoint = (a, b) => a.every((v, f) => !v || !b[f]);
  const yearAlone = rows.map((r, i) => occ[i][0] && !occ[i][1] && /^\s*19\d\d\.?\s*$/.test(r.plain.join(' ')));
  // The best alignment of the whole leaf, not the first that fits at each
  // row: a year beside a pencil sum shares its line only if the rest of the
  // leaf comes out right with it shared, which a row cannot see from where it
  // stands. A row on a line that also carries writing the row does not — a
  // marginal, a rubbed draft — is a weaker match than a clean one, and a line
  // with no row at all costs more than either, so it is never chosen where a
  // match exists. A row skipped is only ever a year alone, which may stand in
  // the head margin above the ruling and have no line at all.
  const R = rows.length;
  const L = read.length;
  const NEG = -1e9;
  const best = Array.from({ length: R + 1 }, () => new Float64Array(L + 1).fill(NEG));
  const via = Array.from({ length: R + 1 }, () => Array.from({ length: L + 1 }, () => null));
  best[0][0] = 0;
  const matchScore = (o, j) => (!fits(o, j) ? null : covers(o, j) ? 2 : 1);
  for (let i = 0; i <= R; i++) {
    for (let j = 0; j <= L; j++) {
      const here = best[i][j];
      if (here === NEG) continue;
      const put = (ni, nj, score, move) => {
        if (here + score > best[ni][nj]) {
          best[ni][nj] = here + score;
          via[ni][nj] = move;
        }
      };
      if (i < R && j < L) {
        const s = matchScore(occ[i], j);
        if (s !== null) put(i + 1, j + 1, s, 'match');
        if (i + 1 < R && disjoint(occ[i], occ[i + 1])) {
          const union = occ[i].map((v, f) => v || occ[i + 1][f]);
          if (fits(union, j) && covers(union, j)) put(i + 2, j + 1, 3, 'share');
        }
      }
      if (i < R && yearAlone[i]) put(i + 1, j, 0, 'skip-row');
      // A line with no row: a fleck, an offset, a pencil tick, which are
      // faint and cost little; or writing the transcription does not have,
      // which is a finding and stops the leaf.
      if (j < L) put(i, j + 1, strong[j].some(Boolean) ? -3 : -1, 'skip-line');
    }
  }
  if (best[R][L] === NEG) {
    // Where it stopped fitting: the last row any alignment reached.
    let fi = 0;
    let fj = 0;
    for (let i = 0; i <= R; i++) for (let j = 0; j <= L; j++) if (best[i][j] !== NEG && i >= fi) [fi, fj] = [i, j];
    return { map: [], ok: false, reason: `row ${Math.min(fi + 1, R)} fits no line from line ${fj + 1}`, at: { i: Math.min(fi, R - 1), j: Math.min(fj, L - 1) } };
  }
  const map = Array.from({ length: R }, () => null);
  const skipped = [];
  for (let i = R, j = L; i > 0 || j > 0; ) {
    const move = via[i][j];
    if (move === 'match') map[--i] = --j;
    else if (move === 'share') {
      j--;
      map[--i] = j;
      map[--i] = j;
    } else if (move === 'skip-row') i--;
    else skipped.push(--j);
  }
  const unread = skipped.filter((j) => strong[j].some(Boolean));
  if (unread.length) {
    const j = Math.min(...unread);
    const i = map.findIndex((m) => m !== null && m > j);
    return {
      map,
      ok: false,
      reason: `${unread.length} written line(s) with no row, the first being line ${j + 1}`,
      at: { i: i < 0 ? R - 1 : i, j },
    };
  }
  return { map, ok: true, faint: skipped.length };
}

/* ------------------------------------------------------- the transcription */

const files = readTranscripts(root).filter(
  (f) => f.ledger === ledger && (onlyBatch === null || f.batch === onlyBatch),
);

/** The cell's own text, without any ink it already carries. */
const bare = (cell) => cell.replace(/^\s*\\ink\{[a-z]+\}\{([\s\S]*)\}\s*$/, '$1').trim();

const report = [];
for (const file of files) {
  const byRef = new Map();
  for (const row of file.looseRows) {
    if (!byRef.has(row.ref)) byRef.set(row.ref, []);
    byRef.get(row.ref).push(row);
  }
  let src = readFileSync(file.path, 'utf8');
  let changed = false;
  for (const [ref, rows] of byRef) {
    const leaf = rows[0].leaf ?? '';
    if (onlyLeaf !== null && String(leaf) !== onlyLeaf) continue;
    const image = imageFor(ref);
    const entry = { batch: file.batch, ref, leaf, rows: rows.length };
    report.push(entry);
    if (!image) {
      entry.status = 'no image';
      continue;
    }
    const img = pixels(image);
    const mask = classify(img);
    const { rules, measured } = columns(img);
    const found = lines(mask, img.w, img.h, rules);
    entry.lines = found.length;
    entry.columns = measured;
    if (opt('--diag')) diagnostic(mask, img.w, img.h, rules, found, resolve(opt('--diag'), `leaf-${leaf}.png`));
    const read = found.map((band, i) => {
      const bounds = [Math.round(img.w * 0.08), ...rules];
      const cells = [];
      const counts = [];
      const written = [];
      for (let c = 0; c < 4; c++) {
        const r = cellInk(mask, img.w, band.slots[c], bounds[c] + 3, bounds[c + 1] - 3, c);
        cells.push(r.ink);
        counts.push(r.n.slice(1).join('/'));
        written.push(r.written);
      }
      const rule = ruledAbove(mask, img.w, band, found[i - 1], rules);
      return { band, cells, counts, written, ruled: rule.ruled, coverage: rule.coverage };
    });
    entry.read = read;
    const aligned = align(rows, read);
    if (flag('--dump')) {
      process.stdout.write(
        `\n=== leaf ${leaf} (ref ${ref}) — ${rows.length} rows, ${found.length} lines, columns ${entry.columns} at ${rules.join(' ')} of ${img.w}` +
          `${aligned.ok ? '' : ` — ${aligned.reason}`}\n`,
      );
      const n = Math.max(rows.length, read.length);
      for (let i = 0; i < n; i++) {
        const r = rows[i];
        const l = aligned.ok ? read[aligned.map[i]] : read[i];
        const left = r ? r.plain.map((c) => c.slice(0, 18).padEnd(18)).join('|') : ''.padEnd(75);
        const right = l
          ? `${String(l.band.top).padStart(4)}-${String(l.band.bottom).padEnd(4)} ${l.ruled ? '=' : ' '}${Math.round(l.coverage * 100).toString().padStart(3)}% ${l.cells.map((c) => (c || '·').padEnd(6)).join(' ')}${flag('--counts') ? '  ' + l.counts.join('  ') : ''}`
          : '';
        process.stdout.write(`${String(i + 1).padStart(3)}  ${left}  ${right}\n`);
      }
    }
    if (!aligned.ok) {
      entry.status = `not aligned: ${aligned.reason}`;
      if (flag('--why') && aligned.at) {
        const { i, j } = aligned.at;
        const show = (r, l) =>
          `${(r ? r.plain.map((c) => c.slice(0, 14).padEnd(14)).join('|') : ''.padEnd(59))}  ${l ? `${l.cells.map((c) => (c || '·').padEnd(6)).join(' ')} ${l.written.join('/')}` : ''}`;
        process.stdout.write(`  leaf ${leaf}: ${aligned.reason}\n    ${show(rows[i], read[j])}\n    ${show(rows[i + 1], read[j + 1])}\n`);
      }
      continue;
    }
    // Every row has its line. Compare with what the row already says, and
    // propose the rest.
    const disagreements = [];
    const proposals = [];
    rows.forEach((row, i) => {
      if (aligned.map[i] === null) return;
      const seen = read[aligned.map[i]];
      const raw = row.raw;
      const cells = row.cells;
      const inks = cells.map((cell, c) => {
        const had = row.inks[c];
        const text = bare(cell);
        if (!text) return null;
        // An ink is proposed only off a firm reading — a cell with more than a
        // fleck of colour in it — and the cents take the dollars' ink where
        // their own two figures were too small to read.
        let got = seen.written[c] >= (c >= 2 ? 100 : 150) ? seen.cells[c] : '';
        if (c === 3 && got === '' && seen.written[2] >= 100 && bare(cells[2])) got = seen.cells[2];
        if (had && got && got !== 'mixed' && got !== 'black' && got !== had) {
          disagreements.push({ row: i + 1, cell: c, had, got, text });
        }
        if (had) return null;
        if (got === 'red' || got === 'pencil' || got === 'blue') return got;
        return null;
      });
      // A rule above a shared line belongs to the row that carries the money.
      const ruled =
        !row.ruled && seen.ruled && (row.plain[2].trim() !== '' || row.plain[3].trim() !== '');
      if (inks.some(Boolean) || ruled) proposals.push({ i, raw, cells, inks, ruled });
    });
    // The words and the colour say the same thing on a leaf that was read
    // right: a row that says « rec'd » stands on a red line, and a red line
    // stands under a row that says so — or under a bare figure, which is the
    // repeat the volume stops writing the words over from leaf 157. Where
    // they contradict, either the alignment slipped or the leaf is one of the
    // shapes this whole pass exists to find, and both want a person. Nothing
    // is written on such a leaf.
    const contradictions = [];
    rows.forEach((row, i) => {
      if (aligned.map[i] === null) return;
      const seen = read[aligned.map[i]];
      const words = row.plain[1];
      const saysReceived = /\b(rec['’]?d|received)\b/i.test(words) && !/\brec['’]?d\s+from\b/i.test(words);
      const moneyRed = [2, 3].some((c) => seen.cells[c] === 'red' && seen.written[c] >= 100 && bare(row.cells[c]));
      const wordsRed = seen.cells[1] === 'red' && seen.written[1] >= 150;
      const bareFigure = !/[A-Za-z]/.test(words) && (bare(row.cells[2]) || bare(row.cells[3]));
      if (saysReceived && !moneyRed && !wordsRed) contradictions.push(`row ${i + 1} says received and is not red`);
      if (!saysReceived && (moneyRed || wordsRed) && !bareFigure) contradictions.push(`row ${i + 1} is red and does not say received`);
    });
    entry.disagreements = disagreements;
    entry.contradictions = contradictions;
    entry.proposals = proposals.length;
    entry.status = disagreements.length
      ? 'disagrees'
      : contradictions.length
        ? `contradicts: ${contradictions.join('; ')}`
        : 'agrees';
    if (flag('--apply') && !disagreements.length && !contradictions.length && proposals.length) {
      // The rows are found by their place in the leaf's table and not by
      // their text: « & & 3666 & 67 » stands twice on leaf 133. The table is
      // the lines between this sheet's `\sheet{}` and the `\end{ledgertable}`
      // after it that carry a cell and end in `\\`, in the order the parser
      // read them.
      const start = src.indexOf(`\\sheet{${ref}}`);
      const stop = src.indexOf('\\end{ledgertable}', start);
      if (start < 0 || stop < 0) {
        entry.status = 'table not found in file';
        continue;
      }
      const region = src.slice(start, stop).split('\n');
      const rowLines = [];
      region.forEach((line, k) => {
        if (/\\\\\s*$/.test(line) && line.includes('&') && !line.startsWith('\\begin{ledgertable}')) {
          const body = line.replace(/\\\\\s*$/, '');
          if (body.split('&').some((c) => c.trim() !== '')) rowLines.push(k);
        }
      });
      if (rowLines.length !== rows.length) {
        entry.status = `table has ${rowLines.length} row line(s) for ${rows.length} rows`;
        continue;
      }
      for (const p of proposals) {
        // Set as the files set their rows: cells parted by « & » with a space
        // either side, and a row whose first cell is empty opening with the
        // space before its first « & ».
        const newCells = p.cells.map((cell, c) => {
          const text = cell.trim();
          return p.inks[c] ? `\\ink{${p.inks[c]}}{${text}}` : text;
        });
        let rowText = newCells.join(' & ').replace(/ {2,}/g, ' ');
        if (rowText.startsWith('&')) rowText = ` ${rowText}`;
        if (p.ruled) rowText = `\\ruledoff ${rowText.trimStart()}`;
        region[rowLines[p.i]] = `${rowText.trimEnd()} \\\\`;
      }
      src = src.slice(0, start) + region.join('\n') + src.slice(stop);
      changed = true;
    }
  }
  if (changed) writeFileSync(file.path, src);
}

/* ----------------------------------------------------------------- report */

const by = (s) => report.filter((e) => e.status === s);
for (const e of report) {
  const d = e.disagreements?.length ? ` — ${e.disagreements.length} disagreement(s): ${e.disagreements.map((x) => `row ${x.row} ${x.had}→${x.got} « ${x.text} »`).join('; ')}` : '';
  process.stdout.write(
    `  leaf ${String(e.leaf).padStart(3)}  ${String(e.rows).padStart(2)} rows / ${String(e.lines ?? '-').padStart(2)} lines  ${e.status}${e.proposals ? ` (${e.proposals} row(s) to mark)` : ''}${d}\n`,
  );
}
process.stdout.write(
  `ink: ${report.length} leaf(s); ${by('agrees').length} agree, ${by('disagrees').length} disagree, ` +
    `${report.filter((e) => e.status?.startsWith('contradicts')).length} contradict, ` +
    `${report.filter((e) => e.status?.startsWith('not aligned')).length} not aligned, ${by('no image').length} without an image` +
    `${flag('--apply') ? ' — applied where the counts agree and nothing disagrees' : ''}\n`,
);
