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
 * A hand-typed museum URL is a claim nobody verified. Both sources below are
 * public APIs with no key, returning stable object records, so every link in
 * `works.json` is one this script actually retrieved and whose artist field it
 * checked against the string `Edward Hopper`. Re-run it and a link that has
 * rotted disappears rather than sitting in the site being wrong.
 *
 * Verification stops at the API, and that is a real limit worth stating: both
 * museums' *web* front ends refuse automated requests — `artic.edu` answers a
 * Cloudflare challenge and `metmuseum.org` rate-limits — so no script here can
 * confirm that a page renders. What it can confirm is that the object exists,
 * that the museum attributes it to Edward Hopper, and that the URL is the one
 * the museum's own API gives (the Met returns `objectURL` outright; the Art
 * Institute returns `config.website_url`, from which its documented
 * `/artworks/<id>` path is built). Nothing is assembled from memory.
 *
 * | Source | API |
 * |---|---|
 * | The Metropolitan Museum of Art | `collectionapi.metmuseum.org` |
 * | Art Institute of Chicago | `api.artic.edu` |
 *
 * The Whitney holds far more Hopper than either, and is not here: `whitney.org`
 * publishes no API, and its collection listing ignores every search parameter
 * tried — `?q=`, `?filter=`, `?search=`, `?keyword=` all return the same thirty
 * works. A link built on a parameter the server ignores would take a reader to
 * a page about something else, which is worse than no link.
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
import { readTranscripts, workKey, yearInCell } from './lib/ledger.mjs';

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
 * Three others were tried and refused. Harvard requires a key. The Whitney
 * still publishes no API, so the largest Hopper collection in the world stays
 * out. The V&A answers without a key and ranks Hopper's etchings first, but
 * `q_actor` does not actually filter — the same query returns a 1903 poster
 * and a design for a teaset — and a source whose filter is decorative is the
 * failure this file already refuses for whitney.org.
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

/* ------------------------------------------------------------ go */

const holdings = [...(await met()), ...(await aic()), ...(await cma())];

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
      const y = yearInCell(r.plain[0]);
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
 * them back: a leaf appears under every year its own date column names. It is
 * derived from the transcriptions and grows only as batches land, which is the
 * point — the timeline should show what has been read.
 */
const leafYears = new Map();
for (const file of readTranscripts(root)) {
  for (const rows of [...file.works.map((w) => w.rows), file.looseRows]) {
    for (const r of rows) {
      if (!r.leaf || !r.ref) continue;
      const y = yearInCell(r.plain[0]);
      if (y === null) continue;
      if (!leafYears.has(y)) leafYears.set(y, new Map());
      const m = leafYears.get(y);
      const k = `${r.ledger}/${r.ref}`;
      if (!m.has(k))
        m.set(k, { ledger: r.ledger, batch: r.batch, leaf: r.leaf, ref: Number(r.ref), rows: 0 });
      m.get(k).rows++;
    }
  }
}
const transcribedYears = [...leafYears.entries()]
  .sort((a, b) => a[0] - b[0])
  .map(([year, m]) => ({
    year,
    leaves: [...m.values()].sort((a, b) => Number(a.leaf) - Number(b.leaf)),
  }));

const out = {
  generated: new Date().toISOString(),
  sources: [
    { institution: 'The Metropolitan Museum of Art', api: 'https://collectionapi.metmuseum.org/public/collection/v1' },
    { institution: 'Art Institute of Chicago', api: 'https://api.artic.edu/api/v1' },
    { institution: 'Cleveland Museum of Art', api: 'https://openaccess-api.clevelandart.org/api' },
  ],
  note:
    'Every URL here was retrieved by scripts/works.mjs and its artist field checked against ' +
    '"Edward Hopper". A link says a work of this title is held there and can be looked at; it ' +
    'does not say that the ledger row you are reading concerns that copy.',
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
