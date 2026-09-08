#!/usr/bin/env node
/**
 * A sitemap over the pages that exist, plus one entry per batch that has
 * something to read.
 *
 * Batch URLs are fragments — `#book-i/3` — which a sitemap cannot express, so
 * what is listed here is the page, once. Listing every batch as a distinct URL
 * would claim a hundred documents that the crawler would fetch as one, and a
 * sitemap that lies about its own site is worse than none.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const SITE = 'https://hopper.commutator.io';

// The six volumes, read off the generated catalogue so a new one cannot be
// forgotten here.
const ledgers = [
  ...readFileSync(resolve(root, 'src/content/catalogue.ts'), 'utf8').matchAll(
    /^    id: '([\w-]+)',$/gm,
  ),
].map((m) => `/${m[1]}/`);

const paths = ['/', ...ledgers, '/timeline/', '/accounts/', '/technique/', '/method/', '/contribute/'];

const today = new Date().toISOString().slice(0, 10);

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  paths
    .map(
      (p) =>
        `  <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod>` +
        `<priority>${p === '/' ? '1.0' : '0.7'}</priority></url>`,
    )
    .join('\n') +
  '\n</urlset>\n';

if (!existsSync(dist)) {
  process.stdout.write('sitemap: no dist/ — run npm run build first\n');
  process.exit(0);
}
writeFileSync(resolve(dist, 'sitemap.xml'), xml);
process.stdout.write(`sitemap: ${paths.length} pages\n`);
