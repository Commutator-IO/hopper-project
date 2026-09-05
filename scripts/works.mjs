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
 * The comparison key for a title.
 *
 * Institutions and the ledger differ on three things and only three, and each
 * is a matter of house style rather than of identity:
 *
 * — a leading article. The Art Institute has « The Evening Wind » and « The Cat
 *   Boat » where the Met and the ledger have neither;
 * — an ampersand. Jo Hopper writes « Cow & Rocks »; the Art Institute writes
 *   « Cow and Rocks »;
 * — case and punctuation.
 *
 * Everything beyond those three is left to fail, and to be declared by hand in
 * `work-aliases.json` if it is real. « Les Deux Pigeons » and « The Two
 * Pigeons » are the same plate under two house titles, and no normalisation
 * rule should be clever enough to discover that on its own — a rule that could
 * would also silently join things that are not the same.
 */
export const key = (title) =>
  title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

/* ------------------------------------------------------------ go */

const holdings = [...(await met()), ...(await aic())];

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

const out = {
  generated: new Date().toISOString(),
  sources: [
    { institution: 'The Metropolitan Museum of Art', api: 'https://collectionapi.metmuseum.org/public/collection/v1' },
    { institution: 'Art Institute of Chicago', api: 'https://api.artic.edu/api/v1' },
  ],
  note:
    'Every URL here was retrieved by scripts/works.mjs and its artist field checked against ' +
    '"Edward Hopper". A link says a work of this title is held there and can be looked at; it ' +
    'does not say that the ledger row you are reading concerns that copy.',
  aliases: aliasIndex,
  works: [...works.values()].sort((a, b) => a.title.localeCompare(b.title)),
};

writeFileSync(resolve(root, 'src/content/works.json'), JSON.stringify(out, null, 2) + '\n');

process.stdout.write(
  `works: ${out.works.length} titles, ${holdings.length} holdings, ` +
    `${Object.keys(aliasIndex).length} aliases\n`,
);
