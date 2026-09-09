import { useEffect, useState } from 'react';
import { LEDGERS } from '../content/catalogue.ts';
import { isCurrent, url } from '../lib/base.ts';

/**
 * Header and footer, shared by every page.
 *
 * Hosting is static, so each tab is a real document rather than a client-side
 * route. A URL opened on one batch still works months later, which matters
 * when a transcription stretches over months.
 */

const OTHER_PAGES: { path: string; label: string }[] = [
  { path: '/timeline/', label: 'Timeline' },
  { path: '/accounts/', label: 'Accounts' },
  { path: '/technique/', label: 'Technique' },
  { path: '/schema/', label: 'Schema' },
  { path: '/method/', label: 'Method' },
  { path: '/contribute/', label: 'Contribute' },
];

export function Header({ path }: { path: string }) {
  const [open, setOpen] = useState(false);

  // Escape closes the folded-out menu. On a tablet it opens by tap rather than
  // hover, so without this there is no way out of it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // The folded-out menu has room for the full titles; only the inline row is
  // short of space.
  // The six volumes, in the Whitney's order, and then the standing pages.
  // There is no thematic grouping here and there should not be: the Hoppers
  // numbered the books, and a second organisation laid over theirs would only
  // ever be ours.
  const links = [
    ...LEDGERS.map((l) => ({ path: `/${l.id}/`, label: l.short })),
    ...OTHER_PAGES,
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/93 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-2.5">
        <a href={url('/')} className="flex min-w-0 items-center gap-2.5">
          <Mark />
          <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-ink-900">
            Hopper Ledgers
          </span>
        </a>

        <nav className="ml-auto hidden items-center gap-0.5 text-[13px] text-ink-500 lg:flex">
          {links.map((l) => (
            <a
              key={l.path}
              href={url(l.path)}
              aria-current={isCurrent(l.path, path) ? 'page' : undefined}
              className={`rounded-full px-2.5 py-1 transition ${
                isCurrent(l.path, path)
                  ? 'bg-ink-100 text-ink-900'
                  : 'hover:bg-ink-100 hover:text-ink-900'
              }`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="ml-auto rounded-full border border-ink-200 px-3 py-1 text-[13px] text-ink-600 lg:hidden"
        >
          Menu
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-200 bg-white px-5 py-2 lg:hidden">
          {[
            ...LEDGERS.map((l) => ({ path: `/${l.id}/`, label: l.title })),
            ...OTHER_PAGES,
          ].map((l) => (
            <a
              key={l.path}
              href={url(l.path)}
              className="block rounded px-2 py-1.5 text-[14px] text-ink-700 hover:bg-ink-100"
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

/**
 * The mark: a ruled leaf with a sketch block at its head.
 *
 * Which is what every one of the five hundred sheets is — Edward Hopper's
 * drawing at the top, Jo Hopper's rules beneath it. Drawn rather than
 * photographed, because a photograph of a sheet would be a piece of the
 * archive, and the point of this project is that it holds none.
 */
function Mark() {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden="true" className="shrink-0">
      <rect x="0.6" y="0.6" width="18.8" height="22.8" rx="1.4" fill="none"
        stroke="currentColor" strokeWidth="1.1" className="text-ink-400" />
      <rect x="4" y="3.5" width="12" height="7" fill="none"
        stroke="currentColor" strokeWidth="1" className="text-brand-600" />
      {[13, 15.5, 18, 20.5].map((y) => (
        <line key={y} x1="3.5" y1={y} x2="16.5" y2={y}
          stroke="currentColor" strokeWidth="0.9" className="text-ink-300" />
      ))}
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-8 text-[12.5px] leading-relaxed text-ink-500">
        <p className="max-w-3xl">
          The sheets are from the <strong className="text-ink-700">Edward and Josephine Hopper
          artist’s ledgers</strong>, Whitney Museum of American Art, 96.208–96.213 — gifts of
          Lloyd Goodrich and museum purchases. Every image on this site is fetched from the
          Whitney’s own server as it is looked at; none is stored here.
        </p>
        <p className="mt-2 max-w-3xl">
          © Heirs of Josephine N. Hopper, licensed by Artists Rights Society (ARS), New York. The
          transcriptions are unauthorised working documents and say so on their own face. No
          transcription here is an edition: a machine pass over a hand of the 1920s produces a
          reading, checkable against the photograph on the same screen. That is its whole value,
          and its whole claim.
        </p>
        <p className="mt-4">
          <a href={url('/method/')} className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">
            Method &amp; progress
          </a>
          {' · '}
          <a href={url('/timeline/')} className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">
            Timeline
          </a>
          {' · '}
          <a href="https://github.com/Commutator-IO/hopper-project" className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">
            Source
          </a>
          {' · '}
          <a href="https://resourcespace.whitney.org/pages/collections_featured.php?parent=1116" className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">
            The ledgers at the Whitney ↗
          </a>
          {' · '}
          <a href="https://www.commutator.io" className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">
            Commutator ↗
          </a>
        </p>
      </div>
    </footer>
  );
}

export function Page({ path, children }: { path: string; children: React.ReactNode }) {
  return (
    <>
      <Header path={path} />
      <main className="mx-auto max-w-6xl px-5">{children}</main>
      <Footer />
    </>
  );
}
