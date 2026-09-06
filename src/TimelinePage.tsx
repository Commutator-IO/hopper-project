import { useMemo } from 'react';
import { Page } from './components/Frame.tsx';
import { LEDGERS, SHEETS } from './content/catalogue.ts';
import life from './content/life.json';
import worksData from './content/works.json';
import workNotes from './content/work-notes.json';
import { batchOfSeq } from './lib/batches.ts';
import { url } from './lib/base.ts';

/**
 * A reminder, not a biography.
 *
 * Reading a ledger leaf, one keeps wanting to know what year it is *in* — that
 * the Rehn Gallery entries begin in 1924 because Rehn took him on that
 * November, that the etchings stop because the printmaking did, that the last
 * entry in the account book is three months before he died. None of that is on
 * the sheets, and looking it up breaks the reading.
 *
 * Two rules keep this from becoming a place where facts get invented.
 *
 * **Every event carries the source that states it**, named and linked, and
 * nothing is written from memory. Where two sources disagree — the date he
 * took the Washington Square top floor is the live case — the disagreement is
 * printed rather than resolved by picking one quietly.
 *
 * **The link into the archive is derived, never asserted.** A year lights up
 * the sheets whose *own Whitney descriptor* names that year, which in practice
 * means Book IV: it is a running account, so the cataloguer had a date to give
 * for each leaf. The other five volumes are dated at the volume and not at the
 * sheet, and this page does not spread a volume's range over its leaves to
 * make the display fuller.
 */

interface LifeEvent {
  year: number;
  date?: string;
  what: string;
  source: string;
  key?: boolean;
}

interface IndexedWork {
  key: string;
  title: string;
  museumTitle: string | null;
  date: string | null;
  medium: string | null;
  held: boolean;
  holdings: { institution: string; short: string; url: string }[];
  namedIn: { ledger: string; batch: number; leaf: string | null; ref: string }[];
}

const WORKS = (worksData as unknown as { index: IndexedWork[] }).index;

const NOTES = (
  workNotes as unknown as {
    sources: Record<string, { name: string; url: string }>;
    notes: Record<
      string,
      { note: string; claims: { says: string; source: string }[] }
    >;
  }
);

/** The four-figure year a museum's date string states, if it states one. */
const yearOfDate = (d: string | null): number | null => {
  const m = d ? /\b(1[89]\d\d|20\d\d)\b/.exec(d) : null;
  return m ? Number(m[1]) : null;
};

const LIFE = life as unknown as {
  note: string;
  sources: Record<string, { name: string; url: string }>;
  events: LifeEvent[];
  disputed: { about: string; what: string }[];
};

export function TimelinePage() {
  /** Sheets whose descriptor names a year, indexed by that year. */
  const byYear = useMemo(() => {
    const m = new Map<number, typeof SHEETS>();
    for (const s of SHEETS) {
      for (const y of s.years) {
        const list = m.get(y) ?? [];
        list.push(s);
        m.set(y, list);
      }
    }
    return m;
  }, []);

  /**
   * Works indexed by the year a museum dates them to.
   *
   * The museum's date, never the leaf's. A leaf's date column is the day a
   * work went to a dealer or a jury, which is not the year it was made and is
   * often a decade off it — Book I leaf 60 books the 1923 Gloucester
   * watercolours in October 1924. A work no museum here holds has no year and
   * appears only in the index below, undated.
   */
  const worksByYear = useMemo(() => {
    const m = new Map<number, IndexedWork[]>();
    for (const w of WORKS) {
      const y = yearOfDate(w.date);
      if (y === null) continue;
      const list = m.get(y) ?? [];
      list.push(w);
      m.set(y, list);
    }
    return m;
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>([
      ...LIFE.events.map((e) => e.year),
      ...byYear.keys(),
      ...worksByYear.keys(),
    ]);
    return [...set].sort((a, b) => a - b);
  }, [byYear, worksByYear]);

  const span = useMemo(() => {
    const lo = years[0];
    const hi = years[years.length - 1];
    return { lo, hi };
  }, [years]);

  return (
    <Page path="/timeline/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Timeline</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          A reminder to keep beside a dated leaf: what year it is in, and what was happening in
          it. Every entry names the source that states it and links to that page — nothing here
          is written from memory, and where sources disagree the disagreement is printed rather
          than resolved.
        </p>
        <p className="prose-note mt-3 max-w-3xl">
          A year also lists the sheets whose <em>own</em> Whitney descriptor names it. That is
          nearly all Book IV: it is a running account, so the cataloguer had a date for each
          leaf. The other five volumes are dated at the volume and not at the sheet, and a
          volume’s range is not spread over its leaves here to make the page look fuller.
        </p>
      </header>

      {/* The strip: one mark per year, so the shape of the record is visible
          before any of it is read. Height is the number of dated sheets. */}
      <section className="border-b border-ink-200 py-6">
        <div className="flex items-end gap-px overflow-x-auto">
          {Array.from({ length: span.hi - span.lo + 1 }, (_, i) => span.lo + i).map((y) => {
            const n = byYear.get(y)?.length ?? 0;
            const ev = LIFE.events.some((e) => e.year === y);
            return (
              <a
                key={y}
                href={`#y${y}`}
                title={`${y}${n ? ` — ${n} sheet${n === 1 ? '' : 's'}` : ''}`}
                className="group relative flex w-2 shrink-0 flex-col justify-end"
                style={{ height: 44 }}
              >
                <span
                  className={`w-full rounded-sm ${n ? 'bg-brand-400' : 'bg-ink-200'}`}
                  style={{ height: Math.max(3, Math.min(34, n * 4)) }}
                />
                {ev && <span className="mt-0.5 h-1 w-full rounded-full bg-ink-800" />}
              </a>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular text-ink-400">
          <span>{span.lo}</span>
          <span>
            <span className="mr-3">
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-brand-400 align-middle" />
              sheets dated to the year
            </span>
            <span>
              <span className="mr-1 inline-block h-1 w-2 rounded-full bg-ink-800 align-middle" />
              a life event
            </span>
          </span>
          <span>{span.hi}</span>
        </div>
      </section>

      <section className="py-6">
        {years.map((y) => {
          const events = LIFE.events.filter((e) => e.year === y);
          const sheets = byYear.get(y) ?? [];
          const madeThisYear = worksByYear.get(y) ?? [];
          if (!events.length && !sheets.length && !madeThisYear.length) return null;
          return (
            <div
              key={y}
              id={`y${y}`}
              className="grid gap-x-6 gap-y-2 border-b border-ink-200 py-5 last:border-0 sm:grid-cols-[5rem_1fr] scroll-mt-16"
            >
              <div className="font-serif text-2xl tabular text-ink-900">{y}</div>
              <div>
                {events.map((e, i) => {
                  const src = LIFE.sources[e.source];
                  return (
                    <p
                      key={i}
                      className={`mb-2 text-[14.5px] leading-relaxed ${
                        e.key ? 'text-ink-900' : 'text-ink-600'
                      }`}
                    >
                      {e.date && (
                        <span className="mr-1.5 text-[12px] uppercase tracking-wide text-ink-400">
                          {e.date}{' '}
                        </span>
                      )}
                      {e.what}{' '}
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        title={src.name}
                        className="whitespace-nowrap text-[11.5px] text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                      >
                        source ↗
                      </a>
                    </p>
                  );
                })}

                {madeThisYear.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-ink-400">
                      {madeThisYear.length} work{madeThisYear.length === 1 ? '' : 's'} the ledgers
                      name, dated {y} by a museum
                    </span>
                    {madeThisYear.map((w) => {
                      const at = w.namedIn[0];
                      return (
                        <a
                          key={w.key}
                          href={url(`/${at.ledger}/#${at.ledger}/${at.batch}`)}
                          title={`${w.medium ?? ''}${w.medium ? ' — ' : ''}named on ${w.namedIn
                            .map((n) => `${n.ledger} leaf ${n.leaf}`)
                            .join(', ')}`}
                          className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11.5px] text-brand-800 transition hover:border-brand-400 hover:bg-brand-100"
                        >
                          {w.title}
                        </a>
                      );
                    })}
                  </div>
                )}

                {sheets.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-wider text-ink-400">
                      {sheets.length} sheet{sheets.length === 1 ? '' : 's'} dated to {y}
                    </span>
                    {sheets.slice(0, 10).map((s) => {
                      const ledger = LEDGERS.find((l) => l.id === s.ledger);
                      return (
                        <a
                          key={s.ref}
                          href={url(`/${s.ledger}/#${s.ledger}/${batchOfSeq(s.seq)}`)}
                          title={s.descriptor}
                          className="rounded-full border border-ink-200 px-2 py-0.5 text-[11.5px] text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
                        >
                          {ledger?.short}
                          {s.leaf !== null && ` leaf ${s.leaf}`}
                        </a>
                      );
                    })}
                    {sheets.length > 10 && (
                      <span className="text-[11.5px] text-ink-400">
                        and {sheets.length - 10} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* The index of works, which is a different list from « what these museums
          hold »: a title is here because a transcribed leaf carries it, and for
          no other reason. It grows as batches land. */}
      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Works the ledgers name</h2>
        <p className="prose-note mt-2 max-w-3xl">
          {WORKS.length} works, read out of the transcribed leaves themselves — a title is here
          because a leaf carries it in a <code>\work{'{}'}</code>, and for no other reason. Four
          titles in Book I are refused for being holes rather than names: an initial under a
          clipping is not a work. {WORKS.filter((w) => w.date).length} are dated, and the date is
          always the museum’s, never the leaf’s — a leaf’s date column is the day a work went to
          a dealer or a jury, which is often a decade off the year it was made. The
          {' '}{WORKS.filter((w) => !w.date).length} the rest are undated here and stay that way
          until a source dates them.
        </p>
        <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {WORKS.map((w) => {
            const note = NOTES.notes[w.key];
            return (
              <li
                key={w.key}
                className="flex items-baseline gap-2 border-b border-ink-100 py-1.5 text-[13.5px]"
              >
                <span className="w-10 shrink-0 tabular text-ink-400">
                  {yearOfDate(w.date) ?? '—'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink-900">{w.title}</span>
                  {w.museumTitle && (
                    <span className="text-ink-400"> · {w.museumTitle}</span>
                  )}
                  {note && (
                    <span
                      title={note.note}
                      className="ml-1.5 rounded-full bg-relu-100 px-1.5 py-px text-[10px] uppercase tracking-wide text-relu-700"
                    >
                      note
                    </span>
                  )}
                  <span className="ml-1 text-[11.5px] text-ink-400">
                    {' · '}
                    {w.namedIn.map((n, i) => (
                      <span key={`${n.ledger}-${n.ref}`}>
                        {i > 0 && ', '}
                        <a
                          href={url(`/${n.ledger}/#${n.ledger}/${n.batch}`)}
                          title={`Open ${n.ledger} at the batch holding leaf ${n.leaf ?? n.ref}`}
                          className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                        >
                          {n.leaf ? `leaf ${n.leaf}` : `ref ${n.ref}`}
                        </a>
                      </span>
                    ))}
                  </span>
                </span>
                {w.holdings.map((h) => (
                  <a
                    key={h.short}
                    href={h.url}
                    target="_blank"
                    rel="noreferrer"
                    title={h.institution}
                    className="shrink-0 text-[11px] text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                  >
                    {h.short}
                  </a>
                ))}
              </li>
            );
          })}
        </ul>
        {Object.keys(NOTES.notes).length > 0 && (
          <div className="mt-6 max-w-3xl">
            <h3 className="text-[13.5px] font-semibold text-ink-900">Notes</h3>
            <p className="prose-note mt-1">
              The only prose on this site a reader cannot check by looking at the sheet, so every
              sentence carries the source that states it.
            </p>
            {Object.entries(NOTES.notes).map(([k, n]) => (
              <div key={k} className="mt-3 rounded-card border border-ink-200 px-4 py-3">
                <h4 className="text-[13.5px] font-semibold text-ink-900">
                  {WORKS.find((w) => w.key === k)?.title ?? k}
                </h4>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{n.note}</p>
                <ul className="mt-2">
                  {n.claims.map((c, i) => {
                    const src = NOTES.sources[c.source];
                    return (
                      <li key={i} className="text-[12px] leading-relaxed text-ink-500">
                        {c.says}{' '}
                        {src ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            title={src.name}
                            className="whitespace-nowrap text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                          >
                            source ↗
                          </a>
                        ) : c.source.startsWith('ledger:') ? (
                          (() => {
                            const [lg, lf] = c.source.slice(7).split('/');
                            const at = WORKS.find((w) => w.key === k)?.namedIn.find(
                              (n) => n.ledger === lg && n.leaf === lf,
                            );
                            return (
                              <a
                                href={url(`/${lg}/#${lg}/${at?.batch ?? 1}`)}
                                className="whitespace-nowrap text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
                              >
                                {lg} leaf {lf} →
                              </a>
                            );
                          })()
                        ) : (
                          <span className="text-ink-400">[{c.source}]</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Where the sources disagree</h2>
        {LIFE.disputed.map((d) => (
          <div key={d.about} className="mt-3 max-w-3xl rounded-card border border-encours-200 bg-encours-50 px-4 py-3">
            <h3 className="text-[13.5px] font-semibold text-ink-900">{d.about}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{d.what}</p>
          </div>
        ))}
        <p className="prose-note mt-5 max-w-3xl">
          Sources used: {Object.values(LIFE.sources).map((s, i, a) => (
            <span key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                {s.name}
              </a>
              {i < a.length - 1 ? ' · ' : '.'}
            </span>
          ))}{' '}
          This is a reminder assembled for reading these ledgers, not a biography. Gail Levin’s
          is the biography, and it was written from these very books.
        </p>
      </section>
    </Page>
  );
}
