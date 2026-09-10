#!/usr/bin/env node
/**
 * Downloads sheets into `archives/`, for transcription and for nothing else.
 *
 * Reading needs none of this: the site points an `<img>` at the Whitney and
 * stores nothing. What needs it is a transcription pass, which wants twelve
 * sheets on disk at once so they can be looked at together and cropped
 * without a round trip per glance.
 *
 * `archives/` is outside `public/`, so a build can never carry the files, and
 * `.gitignore` refuses `*.jpg` outright, so a commit never can either. Those
 * two lines are the whole of the promise that nothing of the archive is stored
 * here, and they are worth more than any sentence in a README.
 *
 * ## Rate
 *
 * The Whitney's `robots.txt` asks for a ten-second crawl delay. It disallows
 * only `/filestore`, which nothing here touches. Ten seconds is honoured
 * between requests — a twelve-sheet batch therefore takes two minutes, which
 * is the correct cost and not a defect. `--delay` may lower it and should not
 * be used without a reason you would be willing to give the Whitney.
 *
 *   npm run mirror -- book-i --batches 1
 *   npm run mirror -- book-i --batches 1-3
 *   npm run mirror -- dealers                # the whole volume
 *   npm run mirror -- garrulities --batches 1   # a notebook, by its id
 *
 * A notebook is mirrored the same way, under its own id: its sheets are
 * counted in twelves too, so a sitting can ask for the next dozen.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const BATCH_SIZE = 12;

/**
 * The archive, parsed out of the generated catalogue. See `render.mjs`.
 * The notebooks' sheets say `notebook:` where a ledger's say `ledger:`, and
 * are filed here under the notebook's id so the same command reaches both.
 */
const SHEETS = (() => {
  const src = readFileSync(resolve(root, 'src/content/catalogue.ts'), 'utf8');
  return [
    ...src.matchAll(/\{ ref: (\d+), (?:ledger|notebook): '([^']+)', seq: (\d+), leaf: (null|\d+),/g),
  ].map((m) => ({
    ref: Number(m[1]),
    ledger: m[2],
    seq: Number(m[3]),
    leaf: m[4] === 'null' ? null : Number(m[4]),
  }));
})();

const args = process.argv.slice(2);
const ledger = args.find((a) => !a.startsWith('-'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? undefined : args[i + 1];
};

if (!ledger) {
  process.stderr.write(
    'usage: npm run mirror -- <ledger|notebook> [--batches 1-3] [--delay 10]\n' +
      '       ledgers:   book-i book-ii book-iii book-iv book-v dealers\n' +
      '       notebooks: garrulities three-wash-sq battle-of-wash-sq black-notebook\n',
  );
  process.exit(1);
}

const all = SHEETS.filter((s) => s.ledger === ledger);
if (!all.length) {
  process.stderr.write(`mirror: no such ledger or notebook “${ledger}”\n`);
  process.exit(1);
}

const range = flag('batches');
const [lo, hi] = range
  ? range.split('-').map(Number)
  : [1, Math.ceil(all.length / BATCH_SIZE)];
const wanted = all.filter((s) => {
  const k = Math.floor((s.seq - 1) / BATCH_SIZE) + 1;
  return k >= lo && k <= (hi ?? lo);
});

const delay = Number(flag('delay') ?? 10) * 1000;

/**
 * `size=pre` — the largest the Whitney serves without a login, 1292 × 2000.
 *
 * `scr`, `lpr`, `hpr` and the original all answer `200` with the login page as
 * `text/html`, which is why the content type is checked below rather than
 * trusted: a naive mirror of those would fill `archives/` with 43 KB files
 * named `.jpg` and nothing would say why the transcription went badly.
 */
const url = (ref) =>
  'https://resourcespace.whitney.org/pages/download.php?' +
  new URLSearchParams({
    ref: String(ref),
    size: 'pre',
    ext: 'jpg',
    page: '1',
    alternative: '-1',
    watermarked: '',
    k: '',
    noattach: 'true',
  });

const dir = resolve(root, 'archives', ledger);
mkdirSync(dir, { recursive: true });

process.stdout.write(
  `mirror: ${wanted.length} sheet(s) of ${ledger}, batches ${lo}-${hi ?? lo}, ` +
    `${delay / 1000}s apart -> archives/${ledger}/\n`,
);

let got = 0;
let skipped = 0;
for (const [i, s] of wanted.entries()) {
  const name = `${String(s.seq).padStart(3, '0')}-${s.ref}${
    s.leaf === null ? '' : `-leaf${s.leaf}`
  }.jpg`;
  const path = resolve(dir, name);
  if (existsSync(path)) {
    skipped++;
    continue;
  }
  if (i > 0) await new Promise((r) => setTimeout(r, delay));

  const res = await fetch(url(s.ref), {
    // Named, so that anyone reading the Whitney's logs can see what the
    // traffic is and where to complain. A request with no user agent looks
    // like a scraper, which is the worst possible impression for something
    // whose whole defence is that it stores nothing it does not have to.
    headers: {
      'User-Agent':
        'hopper.commutator.io transcription mirror (+https://hopper.commutator.io/method/)',
    },
  });
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.startsWith('image/')) {
    process.stderr.write(
      `  ref ${s.ref}: ${res.status} ${type} — not an image. ` +
        `The public size is “pre”; larger sizes return the login page.\n`,
    );
    continue;
  }
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  got++;
  process.stdout.write(`  ${name}\n`);
}

process.stdout.write(`mirror: ${got} fetched, ${skipped} already present\n`);
