#!/usr/bin/env node
/**
 * Builds `src/content/works.json` — where a work named in the ledgers can be
 * looked at.
 *
 * ## Why this exists
 *
 * The one thing the site cannot show is the work itself. Edward Hopper's ink
 * record sketch is on the sheet, in the right pane, at the resolution the
 * Whitney publishes — but the sketch is a memorandum of a painting or a plate,
 * drawn at an inch across, and a reader meeting « Evening Wind\quad 7 x 8 3/8" »
 * has no way from here to see what Evening Wind is. Nothing in this repository
 * can fix that by holding an image: the works are under copyright, and holding
 * one would break the only promise the project makes.
 *
 * What it can do is say, with a link that has been checked, **where the work is
 * and who is serving a picture of it**.
 *
 * ## Why it is fetched rather than typed
 *
 * A hand-typed museum URL is a claim nobody verified. Every source below is a
 * public API with no key, returning stable object records, so every link in
 * `works.json` is one this script actually retrieved and whose artist field it
 * checked against the string `Edward Hopper`. Re-run it and a link that has
 * rotted disappears rather than sitting in the site being wrong.
 *
 * Four of the five give the URL themselves: the Met returns `objectURL`
 * outright, the Art Institute returns `config.website_url` from which its
 * documented `/artworks/<id>` path is built, Cleveland returns `url`, and the
 * V&A's item path takes the `systemNumber` the search returns. The Whitney is
 * the exception and is worth naming as one — its API gives an id and no URL,
 * so `/collection/works/<id>` is an *observed* path rather than a supplied
 * one. It is not left on trust: `whitney()` fetches one such page every run
 * and fails the build unless the museum's own accession number is on it.
 *
 * For the other four, verification stops at the API, and that is a real limit
 * worth stating: their web front ends refuse automated requests — `artic.edu`
 * answers a Cloudflare challenge, `metmuseum.org` rate-limits — so no script
 * here can confirm those pages render. What it can confirm is that the object
 * exists and that the museum attributes it to Edward Hopper. Nothing is
 * assembled from memory.
 *
 * | Source | API |
 * |---|---|
 * | The Metropolitan Museum of Art | `collectionapi.metmuseum.org` |
 * | Art Institute of Chicago | `api.artic.edu` |
 * | Cleveland Museum of Art | `openaccess-api.clevelandart.org` |
 * | Whitney Museum of American Art | `whitney.org/api` |
 * | Victoria and Albert Museum | `api.vam.ac.uk` |
 *
 * This file used to say the Whitney published no API and that its listing
 * ignored every search parameter tried. The second half is true and is now
 * recorded where it belongs, against the endpoint it describes; the first half
 * was wrong, and while it stood it kept the largest Hopper collection in the
 * world out of the index. See `whitney()`.
 *
 * ## What a link does not assert
 *
 * That this is *the* impression, or the one the ledger's line is about. These
 * are prints in editions of a hundred, sold to a dozen institutions over forty
 * years, and the ledger's rows are the record of exactly that dispersal. The
 * link says « a work of this title is here, and you can see it »; it does not
 * say the row you are reading concerns that copy. `matched` in the output is a
 * title match, and nothing stronger.
 *
 *   npm run works
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readTranscripts, workKey, yearInCell, yearsInProse } from './lib/ledger.mjs';

const root = resolve(import.meta.dirname, '..');

const UA =
  'hopper.commutator.io works index (+https://hopper.commutator.io/method/)';

const json = async (url, headers = {}) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers } });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The comparison key for a title — re-exported from `lib/ledger.mjs`, which is
 * now the only copy. It used to live here and again in `render.mjs`, the
 * second under a comment reading « kept in step by hand ». They were in step;
 * the arrangement was still one edit away from not being.
 */
export const key = workKey;

/* ------------------------------------------------------- the Met */

async function met() {
  const s = await json(
    'https://collectionapi.metmuseum.org/public/collection/v1/search?artistOrCulture=true&q=Edward%20Hopper',
  );
  const out = [];
  for (const id of s.objectIDs ?? []) {
    const o = await json(
      `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
    );
    // The search is by artist *or culture* and is generous; the filter is on
    // the record's own artist field, which is the museum's assertion and not
    // the search engine's guess.
    if (o.artistDisplayName !== 'Edward Hopper') continue;
    out.push({
      institution: 'The Metropolitan Museum of Art',
      short: 'Met',
      id: String(o.objectID),
      title: o.title,
      date: o.objectDate ?? null,
      medium: o.medium ?? null,
      url: o.objectURL,
      // Recorded rather than acted on: none of Hopper's work is open access at
      // either institution today, and this is the field that would say so if
      // that changed. Nothing here embeds an image either way.
      openImage: Boolean(o.isPublicDomain),
    });
    await sleep(120);
  }
  return out;
}

/* -------------------------------------- Art Institute of Chicago */

async function aic() {
  const d = await json(
    'https://api.artic.edu/api/v1/artworks/search?q=Edward+Hopper&limit=100' +
      '&fields=id,title,artist_title,date_display,medium_display,is_public_domain',
    { 'AIC-User-Agent': 'hopper.commutator.io (michel@commutator.io)' },
  );
  // The host comes from the API's own `config`, not from this file, and is
  // upgraded to https — the API still reports it as http.
  const site = (d.config?.website_url ?? 'https://www.artic.edu').replace(/^http:/, 'https:');
  return d.data
    .filter((x) => x.artist_title === 'Edward Hopper')
    .map((x) => ({
      institution: 'Art Institute of Chicago',
      short: 'AIC',
      id: String(x.id),
      title: x.title,
      date: x.date_display ?? null,
      medium: x.medium_display ?? null,
      url: `${site}/artworks/${x.id}`,
      openImage: Boolean(x.is_public_domain),
    }));
}

/* --------------------------------------------- Cleveland Museum of Art */

/**
 * Cleveland, added when Book I's oils arrived in batch 6.
 *
 * The first four batches of Book I are the etchings, and the Met and the Art
 * Institute hold those in depth. Batches 5 and 6 turn to the oils and
 * watercolours, and there the two original sources go quiet — Cleveland does
 * not. It holds « Hills, South Truro », which Book I leaf 59 records selling
 * to the Cleveland Museum on 9 November 1931 for 2000 less a third. The
 * ledger's row and the museum's catalogue are two independent records of one
 * transaction, and this is the first place in the project where they meet.
 *
 * Open, keyless, and — unlike every other candidate tried — it filters
 * properly: `?artists=Edward Hopper` returns six works and all six are his.
 * The artist field is checked anyway, on the same principle as the Met's.
 *
 * Harvard was tried here and refused: it requires a key, and still does.
 * The Whitney and the V&A were refused too, and both of those refusals have
 * since turned out to be answerable — not by the museums changing anything,
 * but by asking them a better question. Each is now a source of its own below,
 * and each carries the record of what the wrong question returned.
 */
async function cma() {
  const d = await json(
    'https://openaccess-api.clevelandart.org/api/artworks/?artists=Edward%20Hopper&limit=100',
  );
  return (d.data ?? [])
    .filter((x) =>
      (x.creators ?? []).some((c) => (c.description ?? '').includes('Edward Hopper')),
    )
    .map((x) => ({
      institution: 'Cleveland Museum of Art',
      short: 'CMA',
      id: String(x.id),
      title: x.title,
      date: x.creation_date ?? null,
      medium: x.technique ?? x.type ?? null,
      url: x.url ?? `https://www.clevelandart.org/art/${x.accession_number}`,
      openImage: (x.share_license_status ?? '').toUpperCase() === 'CC0',
    }));
}

/* ------------------------- Whitney Museum of American Art */

/**
 * The Whitney — the museum that holds these ledgers, and the largest Hopper
 * collection anywhere.
 *
 * Its search really is decorative, and that is worth recording so nobody
 * spends an afternoon on it again: against `whitney.org/api/artworks`, the
 * parameters `q`, `artist`, `search`, `keyword`, `query`, `term`,
 * `filter[artist]` and `filter[display_artist_text]` all return the same
 * `total: 27428` and the same unrelated artists. A link built on any of them
 * would take a reader to somebody else's painting.
 *
 * What filters is the artist's own sub-resource. `/api/artists/621/artworks`
 * returns 3,151 records and every one is Hopper's. The 621 is not remembered:
 * `/api/artists/621` is fetched first and its `display_name` checked, so this
 * throws rather than quietly indexing another artist if the museum renumbers.
 *
 * Two things here that neither the Met nor the Art Institute can give. The
 * artist record carries `ulan_id` 500031212 and `wikidata_id` Q203401, so
 * identity between museums can be an identifier match rather than a match on
 * a spelling. And whitney.org answers automated requests with a plain 200 —
 * no Cloudflare challenge, no rate limit — so unlike either of those two, the
 * object page it points at can actually be checked. The canary below does
 * exactly that, because this is the one source whose URL the API does not
 * supply: the `/collection/works/<id>` path is observed, not given, and an
 * observed path has earned a test that fails loudly when it stops being true.
 *
 * ## Why not all 3,151
 *
 * 2,849 of them are classified Drawings, and they are the contents of the
 * studio — the Josephine N. Hopper Bequest, sketches and studies, most of
 * which never left the building. The ledgers record works that *went out*:
 * sold, consigned, exhibited, given. A study that never left cannot be a row
 * in them, and carrying 2,282 titles into `works.json` to serve a lookup
 * nobody will make is weight in every browser that loads the site.
 *
 * The cut is not by classification, because classification is the wrong cut:
 * the Whitney files watercolours under Drawings, and « House on Pamet River »,
 * the 1934 watercolour Book I names, is one of them. So the medium is followed
 * as well, and the two together are exact. Paintings, prints and watercolours
 * are 573 records and match all 32 of the works the transcriptions name — the
 * same 32 that all 3,151 match, at a fifth of the bulk.
 */
async function whitney() {
  const ARTIST = '621';
  const who = await json(`https://whitney.org/api/artists/${ARTIST}`);
  const name = who.data?.attributes?.display_name;
  if (name !== 'Edward Hopper')
    throw new Error(`whitney: artist ${ARTIST} is now "${name}", not Edward Hopper`);

  const rows = [];
  for (let page = 1; ; page++) {
    const d = await json(`https://whitney.org/api/artists/${ARTIST}/artworks?page=${page}`);
    if (!d.data?.length) break;
    rows.push(...d.data);
    if (rows.length >= (d.meta?.total ?? 0)) break;
    await sleep(120);
  }

  const kept = rows.filter((r) => {
    const a = r.attributes;
    // « Edward Hopper, Guy Pène Du Bois » is a real joint attribution and
    // belongs here, which is why this is a containment test and not equality.
    if (!(a.display_artist_text ?? '').includes('Edward Hopper')) return false;
    return (
      a.classification === 'Paintings' ||
      a.classification === 'Prints' ||
      /watercolor/i.test(a.medium ?? '')
    );
  });

  const url = (id) => `https://whitney.org/collection/works/${id}`;

  // The canary. One page, once a run: if the collection path ever changes,
  // every Whitney link in works.json is wrong at the same moment, and this is
  // the difference between finding that out here and finding it out from a
  // reader. It asserts the museum's own accession number is on the page the
  // id resolves to, so a 200 from a redirect to a search form will not pass.
  const probe = kept[0];
  if (probe) {
    const acc = probe.attributes.accession_number;
    const r = await fetch(url(probe.id), { headers: { 'User-Agent': UA } });
    const html = r.ok ? await r.text() : '';
    if (!r.ok || !acc || !html.includes(acc))
      throw new Error(
        `whitney: ${url(probe.id)} no longer shows accession ${acc} ` +
          `(status ${r.status}); the collection path has changed and every ` +
          'Whitney link built here would be wrong',
      );
  }

  return kept.map((r) => ({
    institution: 'Whitney Museum of American Art',
    short: 'Whitney',
    id: String(r.id),
    title: r.attributes.title,
    date: r.attributes.display_date ?? null,
    medium: r.attributes.medium ?? null,
    url: url(r.id),
    // The Whitney publishes no public-domain flag, and Hopper is in copyright
    // until 2038 regardless. Nothing here embeds an image either way.
    openImage: false,
  }));
}

/* ------------------------------------- Victoria and Albert Museum */

/**
 * The V&A, refused once for a reason that turned out to be the wrong
 * parameter rather than the wrong museum.
 *
 * `q_actor=Edward Hopper` does not filter — it returns 13,601 records, among
 * them a poster by « Norman, Hopper & Co. » and a teaset designed by an Albert
 * Edward Jones. That finding stands and is why free-text actor search is not
 * used here. But `q_actor` is a search box, not the museum's index of people:
 * `id_person` is, and `id_person=A6880` returns two records, exact, both
 * Hopper's. The A6880 was read off the `artistMakerPerson` block of the V&A's
 * own record for « The Evening Wind », not guessed at.
 *
 * Two works is a small return for a source, and they are the right two: « The
 * Evening Wind » (1921) and « East Side Interior » (1922) are both Book I
 * plates, and `collection:Victoria and Albert Museum` is tagged on batches 2
 * and 9. The search result carries no medium, so each object is fetched once
 * for `materialsAndTechniques`; at two records that costs nothing.
 */
async function vam() {
  const PERSON = 'A6880';
  const d = await json(
    `https://api.vam.ac.uk/v2/objects/search?id_person=${PERSON}&page_size=100`,
  );
  const out = [];
  for (const r of d.records ?? []) {
    // If `id_person` ever degrades into the free-text behaviour `q_actor` has,
    // this is what catches it rather than letting a teaset into the index.
    if (!(r._primaryMaker?.name ?? '').includes('Hopper, Edward')) continue;
    let medium = r.objectType ?? null;
    try {
      const full = await json(`https://api.vam.ac.uk/v2/museumobject/${r.systemNumber}`);
      medium = (full.record ?? full).materialsAndTechniques || medium;
    } catch {
      // The search record already carries enough to make the link; the medium
      // is a nicety and its absence is not a reason to drop the holding.
    }
    out.push({
      institution: 'Victoria and Albert Museum',
      short: 'V&A',
      id: r.systemNumber,
      title: r._primaryTitle,
      date: r._primaryDate ?? null,
      medium,
      url: `https://collections.vam.ac.uk/item/${r.systemNumber}/`,
      openImage: false,
    });
    await sleep(120);
  }
  return out;
}

/* ------------------------------------------------------------ go */

const holdings = [
  ...(await met()),
  ...(await aic()),
  ...(await cma()),
  ...(await whitney()),
  ...(await vam()),
];

/**
 * Aliases, hand-declared and committed.
 *
 * Each one is a claim that two titles name one work, and each carries how far
 * it can be trusted, because these are the entries a reader would cite without
 * checking. `certain` is a slip of the pen; `likely` is a judgement.
 */
const ALIASES = JSON.parse(readFileSync(resolve(root, 'src/content/work-aliases.json'), 'utf8'));

const works = new Map();
for (const h of holdings) {
  const k = key(h.title);
  if (!works.has(k)) {
    works.set(k, { key: k, title: h.title, date: h.date, medium: h.medium, holdings: [] });
  }
  const w = works.get(k);
  // Prefer the shortest title as the canonical one: it is the ledger's habit,
  // and « Evening Wind » is what a reader of these leaves has in hand.
  if (h.title.length < w.title.length) w.title = h.title;
  w.holdings.push({ institution: h.institution, short: h.short, id: h.id, url: h.url, openImage: h.openImage });
}

/**
 * Fold aliased titles into their target.
 *
 * Two jobs, and they are different. A lookup redirection lets a title the
 * ledger uses — « Night in the L Train » — find a work catalogued under
 * another; that is the `aliasIndex` below. A *merge* is needed when both
 * titles have holdings of their own, which happens because the Art Institute
 * catalogues the 1920 plate as « The Two Pigeons » and the Met as « Les Deux
 * Pigeons »: without merging, a reader gets one museum's link and not the
 * other's, for one plate.
 *
 * A merge is a claim that two catalogue entries are one work, so it carries
 * the alias's `mapping` onto the surviving entry, where the reading view shows
 * it. A `likely` join that presented itself as a fact would be exactly the kind
 * of thing somebody cites.
 */
const aliasIndex = {};
for (const a of ALIASES) {
  const from = key(a.from);
  const to = key(a.to);
  if (!works.has(to)) {
    process.stderr.write(
      `works: alias "${a.from}" -> "${a.to}" has no holding to point at; kept, but it will link nothing\n`,
    );
  }
  aliasIndex[from] = { to, mapping: a.mapping, why: a.why };

  if (works.has(from) && works.has(to)) {
    const src = works.get(from);
    const dst = works.get(to);
    for (const h of src.holdings) {
      if (!dst.holdings.some((x) => x.short === h.short && x.id === h.id)) dst.holdings.push(h);
    }
    (dst.alsoTitled ??= []).push({ title: src.title, mapping: a.mapping, why: a.why });
    // The weakest join wins: an entry assembled from one certain and one likely
    // identification is a likely identification.
    if (a.mapping !== 'certain') dst.mapping = a.mapping;
    works.delete(from);
  }
}

/* ------------------------------- what the ledgers actually name */

/**
 * The index of works, which is a different thing from the list of holdings.
 *
 * `works` above is « what these three museums hold by Edward Hopper », and it
 * contains plenty the ledgers never mention. What a reader of the ledgers
 * wants is the other list: **every work the transcriptions name**, with a date
 * where a museum gives one and an honest blank where none does.
 *
 * So this is read straight out of the `.tex` files. A title appears here
 * because a transcribed leaf carries it in a `\work{}`, and nowhere else —
 * not from a catalogue raisonné and not from memory. Four titles in Book I
 * are refused for being holes rather than names: `\work{B\ill{}}` on leaf 56
 * is an initial under a clipping, and `\work{Night in \ill{}}` on leaf 4
 * stops after three letters. « Night in » would match something if it were
 * allowed to try, which is exactly why it is not.
 *
 * **The date is the museum's, never the leaf's.** A leaf's date column is the
 * day a work went to the dealer or a jury, which is not the year it was made
 * and is often a decade off it: Book I leaf 60 books the 1923 Gloucester
 * watercolours in October 1924. Where no source here holds the work, `date` is
 * null and stays null.
 */
const named = new Map();
for (const file of readTranscripts(root)) {
  for (const w of file.works) {
    if (!w.read) continue;
    let k = w.key;
    if (aliasIndex[k]) k = aliasIndex[k].to;
    if (!named.has(k))
      named.set(k, { key: k, title: w.title, namedIn: [], statedYear: null, earliest: null });
    const n = named.get(k);
    if (w.title.length < n.title.length) n.title = w.title;
    n.namedIn.push({ ledger: w.ledger, batch: w.batch, leaf: w.leaf, ref: w.ref });
    // The date Edward wrote into the title line, where he wrote one.
    if (w.statedYear !== null) n.statedYear = Math.min(n.statedYear ?? 9999, w.statedYear);
    // The earliest year the ledger records anything happening to *this work* —
    // not to its leaf. A leaf carries several works, and taking the leaf's
    // earliest bounded 7" Ave. Shops at 1929 when Early Sunday Morning is 1930.
    for (const r of w.rows) {
      const y = yearInCell(r.plain[0], r.dateColumn);
      if (y !== null) n.earliest = Math.min(n.earliest ?? 9999, y);
    }
  }
}

const index = [...named.values()]
  .map((n) => {
    const held = works.get(n.key) ?? null;
    const museumYear = held?.date ? Number(/\b(1[89]\d\d)\b/.exec(held.date)?.[1]) || null : null;
    return {
      key: n.key,
      // The ledger's title is the one a reader of these leaves has in hand, so
      // it leads; the museum's is kept beside it when the two differ.
      title: n.title,
      museumTitle: held && held.title !== n.title ? held.title : null,
      date: held?.date ?? null,
      medium: held?.medium ?? null,
      held: Boolean(held),
      holdings: held?.holdings ?? [],
      /**
       * The year the leaf itself gives, in Edward's hand, where it gives one.
       * Observed, not inferred, and printed even where it differs from the
       * museum's — three of the eight that can be compared differ by a year,
       * and that disagreement is worth more than either number alone.
       */
      ledgerYear: n.statedYear,
      ledgerDisagrees:
        n.statedYear !== null && museumYear !== null && n.statedYear !== museumYear,
      /**
       * A bound, not a date: the earliest year the ledger records anything
       * happening to this work. A plate cannot be sold before it is cut, so
       * the work was made no later than this.
       *
       * This is the only inference in the index and it is a valid one, which
       * is why it is here and why interpolating from neighbouring leaves is
       * not. Book I's etchings section is not in chronological order — the
       * correlation between leaf number and year of making, over the twenty
       * works on leaves 2 to 44 that a museum dates, is r = -0.33, and leaf 16
       * is 1918 sitting between 1923 and 1919. Reading a date off the leaves
       * either side would produce confident wrong answers. This bound instead
       * says only what cannot fail to be true, and it was checked against every
       * work here whose museum date is known: all of them satisfy it, several
       * exactly.
       */
      notLaterThan: held?.date ? null : n.earliest,
      namedIn: n.namedIn,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

/**
 * Which transcribed leaves record activity in which year.
 *
 * The timeline already lights up the sheets whose *Whitney descriptor* names a
 * year, and that is Book IV and nothing else: 157 of its 161 sheets are dated
 * by the cataloguer, because it is a running account and every leaf had a date
 * to give. Book I's descriptors say « Page 56 [multiple works] » and name no
 * year at all, so none of its 117 sheets has ever appeared on that page —
 * however much of it has been transcribed.
 *
 * That is now a fixable gap rather than a fact about the archive. Once a leaf
 * is transcribed its dates are on the page in Jo Hopper's hand, and this reads
 * them back: a leaf appears under every year it names. It is derived from the
 * transcriptions and grows only as batches land, which is the point — the
 * timeline should show what has been read.
 *
 * A leaf names a year in one of two places and both are read. The **date
 * column** is the obvious one, and for a while it was the only one — which
 * quietly limited this to the two volumes that rule columns at all. Books II,
 * III and V rule none: their leaves are one work each in running prose, and
 * the sale is a sentence with the date inside it. Reading only the columns
 * reported those three volumes as transcribed and dateless, which said
 * something about their ruling and nothing about their contents. So the
 * **prose** is read as well, from `\hand{}` and from nothing else, and each
 * leaf keeps the two counts apart so the difference stays visible.
 */
const leafYears = new Map();

/** Record that `leaf` names `year`, and say which half of the leaf said so. */
const noteYear = (year, leaf, from) => {
  if (year === null || !leaf.leaf || !leaf.ref) return;
  if (!leafYears.has(year)) leafYears.set(year, new Map());
  const m = leafYears.get(year);
  const k = `${leaf.ledger}/${leaf.ref}`;
  if (!m.has(k))
    m.set(k, {
      ledger: leaf.ledger,
      batch: leaf.batch,
      leaf: leaf.leaf,
      ref: Number(leaf.ref),
      rows: 0,
      prose: 0,
    });
  m.get(k)[from]++;
};

for (const file of readTranscripts(root)) {
  for (const rows of [...file.works.map((w) => w.rows), file.looseRows])
    for (const r of rows) noteYear(yearInCell(r.plain[0], r.dateColumn), r, 'rows');

  /**
   * The same reading, out of the prose, for the volumes that rule nothing.
   *
   * Books II, III and V write every sale as a sentence — « Jos. H. Hirshhorn -
   * Sept. 30, 1954. 3500 - 1/3 » — so the loop above finds no date on any of
   * their leaves and the timeline showed them as transcribed and silent. That
   * was an artefact of the ruling and not a fact about the archive.
   *
   * `yearsInProse` is deliberately narrow about what counts (see its header),
   * and this reads only `\hand{}` — what somebody wrote on the leaf — so a
   * transcriber's note about the year a leaf *ought* to carry never becomes a
   * year the leaf carries. The two counts stay apart on each leaf: `rows` is
   * the date column, `prose` the sentences, and a consumer can tell which
   * reading put a leaf under a year.
   */
  for (const h of file.hands) for (const y of yearsInProse(h.plain)) noteYear(y, h, 'prose');
}
const transcribedYears = [...leafYears.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([year, m]) => ({
    year,
    // By volume first, then by leaf. A year now draws leaves from up to five
    // volumes at once, and sorting on the leaf number alone would interleave
    // Book I leaf 6 with Book V leaf 7 as though they were one sequence.
    leaves: [...m.values()].sort(
      (a, b) => a.ledger.localeCompare(b.ledger) || Number(a.leaf) - Number(b.leaf),
    ),
  }));

const out = {
  generated: new Date().toISOString(),
  sources: [
    { institution: 'The Metropolitan Museum of Art', api: 'https://collectionapi.metmuseum.org/public/collection/v1' },
    { institution: 'Art Institute of Chicago', api: 'https://api.artic.edu/api/v1' },
    { institution: 'Cleveland Museum of Art', api: 'https://openaccess-api.clevelandart.org/api' },
    { institution: 'Whitney Museum of American Art', api: 'https://whitney.org/api' },
    { institution: 'Victoria and Albert Museum', api: 'https://api.vam.ac.uk/v2' },
  ],
  note:
    'Every holding here was retrieved by scripts/works.mjs and its artist field checked against ' +
    '"Edward Hopper". Four of the five sources supply the URL themselves; the Whitney supplies an ' +
    'id, and the path built from it is checked against the museum\'s own page on every run. ' +
    'A link says a work of this title is held there and can be looked at; it does not say that ' +
    'the ledger row you are reading concerns that copy, and where a museum holds several ' +
    'impressions or versions each is listed separately.',
  aliases: aliasIndex,
  works: [...works.values()].sort((a, b) => a.title.localeCompare(b.title)),
  /**
   * Works the transcriptions name, dated where a museum dates them. Derived
   * from `transcripts/`, so it grows only as batches are transcribed and can
   * never claim a work nobody has read.
   */
  index,
  /**
   * Years the transcribed leaves themselves record, with the leaves that
   * record them. Derived from `transcripts/`, so it covers only what has been
   * read — unlike the Whitney's own sheet dating, which covers only Book IV.
   */
  transcribedYears,
};

writeFileSync(resolve(root, 'src/content/works.json'), JSON.stringify(out, null, 2) + '\n');

const dated = index.filter((w) => w.date).length;
const ledgerDated = index.filter((w) => !w.date && w.ledgerYear).length;
const bounded = index.filter((w) => !w.date && !w.ledgerYear && w.notLaterThan).length;
const disagree = index.filter((w) => w.ledgerDisagrees);
process.stdout.write(
  `works: ${out.works.length} titles held, ${holdings.length} holdings, ` +
    `${Object.keys(aliasIndex).length} aliases\n` +
    `index: ${index.length} works named in the transcriptions, ` +
    `${dated} dated by a museum, ${ledgerDated} dated only by the leaf, ` +
    `${bounded} bounded « no later than », ` +
    `${index.length - dated - ledgerDated - bounded} with neither\n` +
    (disagree.length
      ? `       leaf and museum disagree on ${disagree.length}: ` +
        disagree.map((w) => `${w.title} (leaf ${w.ledgerYear}, museum ${w.date})`).join('; ') +
        '\n'
      : ''),
);
