/**
 * Where this build is rooted, and the one function that knows it.
 *
 * The site's home is `hopper.commutator.io`, where everything sits at `/`. But
 * GitHub Pages also serves it from `commutator-io.github.io/hopper-project/`
 * whenever no custom domain is configured — which is the state before a DNS
 * record exists, and is exactly when somebody most wants to look at it.
 *
 * Under that prefix an absolute `/transcripts/…` resolves to the wrong origin
 * root and answers 404, while the *page* still answers 200. That combination
 * is the reason this file exists rather than a `base` setting alone: a site
 * whose HTML loads and whose every asset silently vanishes looks like a broken
 * build and is in fact a correctly built site being asked the wrong questions.
 *
 * Vite fills `import.meta.env.BASE_URL` from its `base` option, which the
 * deploy workflow sets from `actions/configure-pages`. So the value is derived
 * from the Pages configuration itself: add the custom domain and the next
 * build goes back to `/` with nothing here to change.
 */
const RAW = import.meta.env.BASE_URL || '/';

/** Always exactly one trailing slash, so joining never doubles or drops one. */
export const BASE = RAW.endsWith('/') ? RAW : `${RAW}/`;

/**
 * An absolute path within this deployment.
 *
 * Takes the path as it would be written for the site's own root — `/method/`,
 * `/transcripts/book-i/batch-01.en.html` — and returns it rooted at wherever
 * this build actually lives. Leading slash optional; the result always has one.
 */
export const url = (path: string) => `${BASE}${path.replace(/^\//, '')}`;

/**
 * Whether `path` is the page currently being shown.
 *
 * Both arguments are paths as written for the site's own root — each page
 * declares its own, so this never sees `location.pathname` and must not be
 * given the rooted form. Trailing slashes are normalised on both sides,
 * because a static host serves `/method/` and `/method` alike.
 */
export function isCurrent(path: string, here: string): boolean {
  const norm = (s: string) => (s.endsWith('/') ? s : `${s}/`);
  return norm(path) === norm(here);
}
