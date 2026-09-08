import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * There is no proxy here, and that is the interesting part.
 *
 * The Grothendieck workbench this project is modelled on needs a relay — a
 * real Node process, deployed on its own hostname — because a browser cannot
 * fetch Montpellier's scans at all: `X-Frame-Options: SAMEORIGIN`, no CORS
 * headers, and a certificate that expired in December 2025. Every one of those
 * is enforced by the browser against the remote origin, so the request has to
 * be made server-side or not at all.
 *
 * None of it applies to the Whitney. Measured on 5 September 2026, against
 * `resourcespace.whitney.org/pages/download.php`:
 *
 * — a cross-origin `GET` is answered, and the server **echoes whatever
 *   `Origin` it is sent** into `Access-Control-Allow-Origin`, so even `fetch`
 *   is permitted from this site;
 * — the certificate is a current Let's Encrypt one;
 * — there is no referer check;
 * — `Range` is honoured, `206` with a correct `Content-Range`.
 *
 * The only restriction in force is `Content-Security-Policy: frame-ancestors
 * 'self'`, which forbids putting the response in an `<iframe>` — and an image
 * belongs in an `<img>`, which that header does not govern. So the facsimile
 * pane points straight at the Whitney's own file, in development and in
 * production alike, and nothing of the archive passes through this repository
 * at any point.
 *
 * If that ever changes — if the Whitney restricts `Origin` to its own site —
 * the fix is a relay of the kind the parent project already has, and
 * `docs/relay.md` says what it would have to do. Until then, building one
 * would be adding a hop between a reader and a museum for no reason.
 */
/**
 * Where this build is rooted, as an **absolute** path, always.
 *
 * `actions/configure-pages` reports the site's base path, and for a site at the
 * root of a custom domain it reports the **empty string**. Handing that to Vite
 * is not the same as handing it `/`: Vite reads an empty base as a request for
 * *relative* asset URLs, and emits `./assets/…` at the root and `../assets/…`
 * one level down. Those happen to resolve — and everything else does not.
 *
 * That is the trap, and it cost a blank page on hopper.commutator.io to find.
 * `import.meta.env.BASE_URL` becomes `./`, so `src/lib/base.ts` builds
 * `./transcripts/manifest.json`, which from `/book-i/` resolves to
 * `/book-i/transcripts/manifest.json` and 404s. The page's own assets load, the
 * manifest does not, and nothing in the console says why.
 *
 * So an empty, absent or dot-relative value all mean the root here, and a
 * project-site path is given the slashes it needs at both ends.
 */
function baseFromEnv(): string {
  const raw = (process.env.BASE_PATH ?? '').trim();
  if (raw === '' || raw === '.' || raw === './' || raw === '/') return '/';
  const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages serves a project site under /<repo>/; the deploy workflow
  // fills BASE_PATH in that case. Published on the custom domain
  // hopper.commutator.io, the root is correct.
  base: baseFromEnv(),
  build: {
    rollupOptions: {
      // One HTML entry per tab. Hosting is static: /book-iv/ is served from
      // its own index.html, with no client-side router and no redirect trick.
      // A URL opened on one batch still works in six months, which matters
      // when a transcription stretches over months.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        bookI: resolve(import.meta.dirname, 'book-i/index.html'),
        bookII: resolve(import.meta.dirname, 'book-ii/index.html'),
        bookIII: resolve(import.meta.dirname, 'book-iii/index.html'),
        bookIV: resolve(import.meta.dirname, 'book-iv/index.html'),
        bookV: resolve(import.meta.dirname, 'book-v/index.html'),
        dealers: resolve(import.meta.dirname, 'dealers/index.html'),
        timeline: resolve(import.meta.dirname, 'timeline/index.html'),
        accounts: resolve(import.meta.dirname, 'accounts/index.html'),
        technique: resolve(import.meta.dirname, 'technique/index.html'),
        method: resolve(import.meta.dirname, 'method/index.html'),
        contribute: resolve(import.meta.dirname, 'contribute/index.html'),
      },
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
