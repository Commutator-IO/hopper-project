#!/usr/bin/env node
/**
 * Builds `src/content/travels.json` — where the sources put Edward Hopper, and
 * in what order.
 *
 * ## What this is, and the smaller thing it is not
 *
 * The obvious version of this page is a map of everywhere Hopper went, drawn
 * from the ledgers, and it cannot be built. The transcriptions tag thirty
 * places, and they are the subjects of pictures rather than the whereabouts of
 * a man: Gettysburg is in Book II because of « Light Battery at Gettysburg »
 * and « Dawn Before Gettysburg », and Saltillo, Charleston and Santa Fe are
 * titles. A graph drawn on those would assert a dozen journeys nobody
 * recorded, and — this is the whole reason it is refused — it would look
 * exactly as authoritative as the seven that are sourced.
 *
 * What can be built is the chain through the places `life.json` names, in the
 * order its events fall. That is seven arrows and six points. It is a small
 * drawing and every line in it is checkable, which is the trade this archive
 * makes everywhere else.
 *
 * ## Why a move is declared and then verified
 *
 * `src/content/places.json` is hand-written, because deciding that the 1910
 * entry — « Last of the Paris visits. Nyack ceases to be his primary
 * residence » — draws an arrow from Paris to Nyack is a judgement, and a
 * judgement belongs in a file a person edits. What is *not* left to a person is
 * whether the entry says that at all: each move carries the year and a
 * distinctive phrase of the event it rests on, and this script requires
 * **exactly one** `life.json` event to match. Nought is a move resting on
 * nothing; two is a phrase too vague to identify which. Either fails the build.
 *
 * So `life.json` can be edited freely and this cannot silently drift from it:
 * reword the 1934 entry past « second home and studio on Cape Cod » and the
 * build stops rather than the map quietly meaning something else.
 *
 * ## Why the coordinates are fetched
 *
 * A latitude typed from memory is a claim nobody checked, and it is the kind
 * that looks right — a point in roughly the correct part of the coast is
 * indistinguishable from the true one at this scale. So each place carries the
 * query string it is looked up by, and the coordinate is whatever
 * OpenStreetMap's Nominatim returns for it, with the name it returned kept
 * beside the one we use. Re-run it and a place that no longer resolves fails
 * rather than sitting in the site being wrong.
 *
 * Nominatim asks for no key and one request a second, both of which are
 * honoured. Its data is © OpenStreetMap contributors, ODbL, and the page says
 * so — the licence line is carried through from the API's own response rather
 * than written here.
 *
 * ## `--check`, and why the build runs it
 *
 * The coordinates need the network, so this is run by hand and its output is
 * committed — the same arrangement as `works.mjs`, and for the same reason.
 * That leaves one hole: reword a `life.json` entry and `travels.json` goes
 * quietly stale, still drawing an arrow off a sentence that no longer says it.
 *
 * So `npm run places -- --check` does the verification and none of the
 * fetching: it re-runs every move against the current `life.json` *and*
 * against the generated file, and fails if the two have parted. The build runs
 * it, which is the same guard CI already puts on `catalogue.ts`.
 *
 *   npm run places            # verify, then fetch, then write
 *   npm run places -- --check # verify only; no network
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));

const decl = read('src/content/places.json');
const life = read('src/content/life.json');

const UA = 'hopper.commutator.io places index (+https://hopper.commutator.io/method/)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const problems = [];

/* ------------------------------------- every move against its event */

const byKey = new Map(decl.places.map((p) => [p.key, p]));
const moves = [];

for (const m of decl.moves) {
  for (const end of ['from', 'to']) {
    if (!byKey.has(m[end])) {
      problems.push(`move ${m.year} names place "${m[end]}", which is not declared`);
    }
  }
  const hits = life.events.filter(
    (e) => e.year === m.year && String(e.what).includes(m.match),
  );
  if (hits.length !== 1) {
    problems.push(
      `move ${m.from} → ${m.to} (${m.year}) matches ${hits.length} life.json events on ` +
        `"${m.match}"; it must match exactly one, or the arrow rests on nothing ` +
        `(or on something ambiguous)`,
    );
    continue;
  }
  const e = hits[0];
  const src = life.sources[e.source];
  if (!src) {
    problems.push(`life.json event ${e.year} cites source "${e.source}", which it does not declare`);
    continue;
  }
  moves.push({
    from: m.from,
    to: m.to,
    year: m.year,
    // Carried through from life.json rather than restated, so the arrow and the
    // timeline entry above it can never say two different things.
    what: e.what,
    source: { key: e.source, name: src.name, url: src.url },
  });
}

/* ------------------------------------- and the generated file, in --check */

const CHECK = process.argv.includes('--check');

if (CHECK) {
  const built = existsSync(resolve(root, 'src/content/travels.json'))
    ? read('src/content/travels.json')
    : null;
  if (!built) {
    problems.push('src/content/travels.json is missing; run `npm run places`');
  } else {
    const seen = (m) => `${m.from}>${m.to}@${m.year}`;
    const declared = new Map(moves.map((m) => [seen(m), m]));
    const drawn = new Map(built.moves.map((m) => [seen(m), m]));
    for (const k of declared.keys()) {
      if (!drawn.has(k)) problems.push(`move ${k} is declared but not in travels.json`);
    }
    for (const k of drawn.keys()) {
      if (!declared.has(k)) problems.push(`travels.json draws ${k}, which is no longer declared`);
    }
    for (const [k, m] of declared) {
      // The arrow's caption is life.json's own sentence. If the entry has been
      // reworded, the drawing is repeating something nobody says any more.
      if (drawn.has(k) && drawn.get(k).what !== m.what) {
        problems.push(
          `move ${k} draws a sentence life.json no longer carries; re-run \`npm run places\``,
        );
      }
    }
    for (const p of decl.places) {
      if (!built.places.some((q) => q.key === p.key)) {
        problems.push(`place "${p.key}" is declared but has no retrieved coordinate`);
      }
    }
  }
}

if (problems.length) {
  process.stderr.write('places: refusing to pass\n');
  for (const p of problems) process.stderr.write(`  - ${p}\n`);
  process.exit(1);
}

if (CHECK) {
  process.stdout.write(
    `places: ${moves.length} move(s) still match life.json, ` +
      `${decl.places.length} place(s) located\n`,
  );
  process.exit(0);
}

/* --------------------------------------------- the coordinates */

const places = [];
let licence = null;

for (const p of decl.places) {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('q', p.query);
  u.searchParams.set('format', 'jsonv2');
  u.searchParams.set('limit', '1');
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  if (!r.ok) {
    process.stderr.write(`places: ${p.key}: nominatim -> ${r.status}\n`);
    process.exit(1);
  }
  const [hit] = await r.json();
  if (!hit) {
    process.stderr.write(`places: ${p.key}: « ${p.query} » resolves to nothing\n`);
    process.exit(1);
  }
  licence ??= hit.licence;
  places.push({
    key: p.key,
    name: p.name,
    what: p.what,
    note: p.note ?? null,
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    // The name the gazetteer gave, kept beside ours: « Village of Nyack, Town
    // of Orangetown » is not what a reader of these leaves calls it, and the
    // difference is the sort of thing that shows a lookup went somewhere else.
    resolved: hit.display_name,
    query: p.query,
  });
  // Nominatim's usage policy is one request a second, absolute.
  await sleep(1100);
}

const out = {
  generated: new Date().toISOString(),
  note: decl.note,
  means: decl.means,
  refused: decl.refused,
  attribution: {
    name: 'OpenStreetMap Nominatim',
    url: 'https://nominatim.openstreetmap.org/',
    licence,
  },
  places,
  moves,
};

writeFileSync(resolve(root, 'src/content/travels.json'), JSON.stringify(out, null, 2) + '\n');
process.stdout.write(
  `places: ${places.length} place(s) located, ${moves.length} move(s), ` +
    `each resting on exactly one life.json event\n`,
);
