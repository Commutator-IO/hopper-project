import { useMemo } from 'react';
import { Page } from './components/Frame.tsx';
import { LEDGERS, SHEETS } from './content/catalogue.ts';
import life from './content/life.json';
import worksData from './content/works.json';
import workNotes from './content/work-notes.json';
import { Travels } from './components/Travels.tsx';
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
  /**
   * The two events that bracket everything else. Declared in `life.json`, on
   * the entry that already carries the source stating it, so the strip's two
   * rules are drawn from a sourced fact rather than from two years typed into
   * a component where nothing could check them.
   *
   * Not `bound`: this page already uses that word for a date bound — « ≤ 1924 »,
   * no later than — and the two senses would be read as one.
   */
  life?: 'born' | 'died';
}

interface IndexedWork {
  key: string;
  title: string;
  museumTitle: string | null;
  date: string | null;
  medium: string | null;
  held: boolean;
  ledgerYear: number | null;
  ledgerDisagrees: boolean;
  notLaterThan: number | null;
  holdings: { institution: string; short: string; url: string }[];
  namedIn: { ledger: string; batch: number; leaf: string | null; ref: string }[];
}

const WORKS = (worksData as unknown as { index: IndexedWork[] }).index;

interface TranscribedYear {
  year: number;
  leaves: { ledger: string; batch: number; leaf: string; ref: number; rows: number }[];
}

/**
 * Years the transcribed leaves themselves record.
 *
 * Distinct from the sheets below them, which are dated by the Whitney's own
 * descriptor and are therefore Book IV and nothing else — its cataloguer had a
 * date for every leaf of a running account, and Book I's descriptors name no
 * year at all. These are read out of the transcriptions, so they appear only
 * where somebody has done the reading.
 */
const TRANSCRIBED = (worksData as unknown as { transcribedYears: TranscribedYear[] })
  .transcribedYears;

/**
 * Every transcribed leaf, indexed by `<ledger>/<leaf>`, so a note's `ledger:`
 * claim can be turned into a link to that sheet.
 *
 * The lookup has to be global, and that is the whole point of it. The
 * strongest notes are the ones that join two sheets — Night Hawks cites leaf
 * 25, which is Compartment C's leaf and where the Art Institute's part payment
 * is booked — so resolving a reference against only the noted work's own
 * `namedIn` would send those citations to the head of the volume instead of to
 * the leaf they name. `scripts/notes.mjs` already validates them against every
 * leaf in the archive; this reads them the same way.
 */
const LEAVES = new Map<string, { batch: number; ref: string }>();
for (const w of WORKS) {
  for (const n of w.namedIn) {
    if (n.leaf === null) continue;
    const k = `${n.ledger}/${n.leaf}`;
    if (!LEAVES.has(k)) LEAVES.set(k, { batch: n.batch, ref: n.ref });
  }
}

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
      ...TRANSCRIBED.map((t) => t.year),
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
          A year lists two different kinds of leaf, and the difference is worth knowing.{' '}
          <span className="rounded-full border border-relu-200 bg-relu-50 px-1.5 py-px text-relu-700">
            green
          </span>{' '}
          leaves are <strong>transcribed</strong>: somebody read the sheet, and the year is one
          Jo Hopper wrote in its own date column. Those appear only where the reading has been
          done, which today means Book I.{' '}
          <span className="rounded-full border border-ink-200 px-1.5 py-px text-ink-700">
            grey
          </span>{' '}
          leaves are dated by the Whitney’s <em>own</em> descriptor, without anyone here reading
          anything — and that is Book IV and nothing else, because it is a running account and
          its cataloguer had a date for every leaf. Book I’s descriptors say « Page 56 [multiple
          works] » and name no year, which is why none of its 117 sheets appears in grey however
          much of it is transcribed. A volume’s range is never spread over its leaves to make the
          page look fuller.
        </p>
      </header>

      {/* The strip: one mark per year, so the shape of the record is visible
          before any of it is read. Height is the number of dated sheets. */}
      <section className="border-b border-ink-200 py-6">
        <div className="flex items-end gap-px overflow-x-auto pt-6">
          {Array.from({ length: span.hi - span.lo + 1 }, (_, i) => span.lo + i).map((y) => {
            const n = byYear.get(y)?.length ?? 0;
            const ev = LIFE.events.some((e) => e.year === y);
            // The two rules are read off the life file, where the year carries
            // the source that states it, rather than typed into this
            // component. A date written into a chart is a date nobody can
            // check against anything.
            const life = LIFE.events.find((e) => e.year === y && e.life)?.life;
            return (
              <a
                key={y}
                href={`#y${y}`}
                title={`${y}${n ? ` — ${n} sheet${n === 1 ? '' : 's'}` : ''}`}
                className="group relative flex w-2 shrink-0 flex-col justify-end"
                style={{ height: 44 }}
              >
                {life && (
                  <>
                    <span className="pointer-events-none absolute bottom-0 left-0 top-[-22px] w-px bg-ink-400" />
                    <span className="pointer-events-none absolute left-1 top-[-22px] whitespace-nowrap text-[9.5px] leading-none text-ink-500">
                      {life === 'born' ? `b. ${y}` : `d. ${y}`}
                    </span>
                  </>
                )}
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
          const recorded = TRANSCRIBED.find((t) => t.year === y)?.leaves ?? [];
          if (!events.length && !sheets.length && !madeThisYear.length && !recorded.length)
            return null;
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

                {/* One spine for the three runs. They used to set the label
                    inline with the chips, so each row began at a different x
                    and the block read as a paragraph of pills; a fixed label
                    column lines the chips up and lets the eye go down them.
                    The year is in the gutter already, so the labels no longer
                    repeat it. */}
                {(madeThisYear.length > 0 || recorded.length > 0 || sheets.length > 0) && (
                  <div className="mt-2 grid gap-x-4 gap-y-2.5 sm:grid-cols-[6.5rem_1fr]">
                    {madeThisYear.length > 0 && (
                      <>
                        <div
                          title={`Works the ledgers name that a museum dates to ${y}`}
                          className="text-[11px] uppercase tracking-wider text-ink-400 sm:pt-1 sm:text-right"
                        >
                          {madeThisYear.length} work{madeThisYear.length === 1 ? '' : 's'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {madeThisYear.map((w) => {
                            const at = w.namedIn[0];
                            return (
                              <a
                                key={w.key}
                                href={url(`/${at.ledger}/#${at.ledger}/${at.batch}/${at.ref}`)}
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
                      </>
                    )}

                    {recorded.length > 0 && (
                      <>
                        <div
                          title={`Leaves somebody has transcribed that carry an entry Jo Hopper dated ${y}`}
                          className="text-[11px] uppercase tracking-wider text-ink-400 sm:pt-1 sm:text-right"
                        >
                          {recorded.length} read
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recorded.slice(0, 12).map((l) => (
                            <a
                              key={`${l.ledger}-${l.ref}`}
                              href={url(`/${l.ledger}/#${l.ledger}/${l.batch}/${l.ref}`)}
                              title={`${l.rows} row${l.rows === 1 ? '' : 's'} dated ${y} — opens the leaf`}
                              className="rounded-full border border-relu-200 bg-relu-50 px-2 py-0.5 text-[11.5px] text-relu-700 transition hover:border-relu-400"
                            >
                              {LEDGERS.find((g) => g.id === l.ledger)?.short} leaf {l.leaf}
                            </a>
                          ))}
                          {recorded.length > 12 && (
                            <span className="self-center text-[11.5px] text-ink-400">
                              and {recorded.length - 12} more
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {sheets.length > 0 && (
                      <>
                        <div
                          title={`Sheets the Whitney's own descriptor dates to ${y}, with nobody here having read them`}
                          className="text-[11px] uppercase tracking-wider text-ink-400 sm:pt-1 sm:text-right"
                        >
                          {sheets.length} catalogued
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sheets.slice(0, 10).map((s) => {
                            const ledger = LEDGERS.find((l) => l.id === s.ledger);
                            return (
                              <a
                                key={s.ref}
                                href={url(`/${s.ledger}/#${s.ledger}/${batchOfSeq(s.seq)}/${s.ref}`)}
                                title={s.descriptor}
                                className="rounded-full border border-ink-200 px-2 py-0.5 text-[11.5px] text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
                              >
                                {ledger?.short}
                                {s.leaf !== null && ` leaf ${s.leaf}`}
                              </a>
                            );
                          })}
                          {sheets.length > 10 && (
                            <span className="self-center text-[11.5px] text-ink-400">
                              and {sheets.length - 10} more
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Why the strip stops at 1995, which is otherwise the one year on it
          that has nothing to do with either Hopper. */}
      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Catalogue raisonné</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          The strip above ends in 1995 and not at either death, because that is the year the
          Whitney published Hopper’s catalogue raisonné — “a project twenty years in the
          making,” by the museum’s own account. It is the reason these six books matter beyond
          themselves: the standard listing of what Edward Hopper made was assembled while Jo
          Hopper’s own listing sat in the archive, and the research behind it became the Edward
          and Josephine Hopper Research Collection, “compiled by Whitney curators while preparing
          exhibitions of Hopper’s work and the Hopper Catalogue Raisonné.”
        </p>
        <p className="prose-note mt-3 max-w-3xl">
          Two things about that are worth keeping in view while reading a leaf.
        </p>
        <dl className="mt-3 max-w-3xl space-y-3 text-[14px] leading-relaxed text-ink-700">
          <div>
            <dt className="font-medium text-ink-900">
              These six did not come with the bequest.
            </dt>
            <dd className="mt-0.5 text-ink-700">
              Nearly three thousand items reached the Whitney when Jo Hopper died in 1968. The
              ledgers are not credited to that: four of the six read “Gift of Lloyd Goodrich” —
              the friend who organised the 1964 retrospective — and two were purchased, one with
              funds from an anonymous donor. Those credit lines are the museum’s and are printed
              unchanged beside each volume. <em>When</em> the six were accessioned is not
              something these pages state, and their numbers are not read here as a date.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-900">The compiler is not named on these pages.</dt>
            <dd className="mt-0.5 text-ink-700">
              The Whitney’s account says when the catalogue raisonné appeared and how long it
              took, and does not say who compiled it. The gap is left standing rather than filled
              in from elsewhere, on the same rule as every date above: this page states what a
              named source states, and a name supplied from memory would be the one thing it
              refuses. Worth noticing, on a site whose whole method is marking which hand wrote
              what.
            </dd>
          </div>
        </dl>
        <p className="prose-note mt-4 max-w-3xl">
          The Whitney has since published images of all six ledger books — “documenting his
          career” — which is what this site reads.{' '}
          {['whitney-hoppers', 'whitney-resources'].map((k, i) => (
            <span key={k}>
              {i > 0 && ' · '}
              <a
                href={LIFE.sources[k].url}
                target="_blank"
                rel="noreferrer"
                title={LIFE.sources[k].name}
                className="whitespace-nowrap text-[11.5px] text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                source ↗
              </a>
            </span>
          ))}
        </p>
      </section>

      {/* The chronology in space rather than in time, and much smaller than the
          list above it: a place is here only where a named source puts him at
          it, which is six places against the thirty the transcriptions tag. The
          component says what was refused and why, because a reader who came
          expecting a map of a life should be told which map this is. */}
      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Where the sources put him</h2>
        <p className="prose-note mt-2 max-w-3xl">
          The same entries as the years above, read for their places instead of their dates.
        </p>
        <Travels />
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
          {' '}Of the rest, {WORKS.filter((w) => !w.date && w.ledgerYear).length} carries a date
          written on the leaf in Edward Hopper’s own hand (marked <span className="text-brand-700">*</span>),
          and {WORKS.filter((w) => !w.date && !w.ledgerYear && w.notLaterThan).length} carry a
          bound rather than a date — <span className="text-ink-400">≤</span> means the work was
          made no later than that year, because it is the earliest year the ledger records
          anything happening to it, and a plate cannot be sold before it is cut. The remaining{' '}
          {WORKS.filter((w) => !w.date && !w.ledgerYear && !w.notLaterThan).length} have nothing
          and stay that way.
        </p>
        <p className="prose-note mt-2 max-w-3xl">
          <strong className="font-semibold text-ink-700">What is deliberately not done here:</strong>{' '}
          reading a date off the leaves either side. Book I’s etchings section is not in
          chronological order — across the twenty works on leaves 2 to 44 that a museum dates, the
          correlation between leaf number and year of making is r&nbsp;=&nbsp;−0.33, and leaf 16
          is 1918 sitting between 1923 and 1919. Interpolating from neighbours would produce
          confident wrong answers. The bound produces only what cannot fail to be true, and it was
          checked against every work here whose museum date is known: all of them satisfy it, and
          several are exact.
        </p>
        <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {WORKS.map((w) => {
            const note = NOTES.notes[w.key];
            return (
              <li
                key={w.key}
                className="flex items-baseline gap-2 border-b border-ink-100 py-1.5 text-[13.5px]"
              >
                {/* Four different things, and the column shows which is which.
                    A museum's date is a date. The leaf's own is a date in
                    Edward's hand. « ≤ » is a bound, not a date — the earliest
                    year the ledger records anything happening to the work, so
                    it cannot have been made later. A dash is a dash. */}
                <span
                  className="w-14 shrink-0 tabular text-[12.5px]"
                  title={
                    yearOfDate(w.date)
                      ? `${w.date} — the holding museum's date`
                      : w.ledgerYear
                        ? `${w.ledgerYear} — written on the leaf in Edward Hopper's hand`
                        : w.notLaterThan
                          ? `Made no later than ${w.notLaterThan}: the earliest year the ledger ` +
                            `records anything happening to this work. A bound, not a date.`
                          : 'No source dates it and the ledger records no dated activity for it'
                  }
                >
                  {yearOfDate(w.date) ? (
                    <span className="text-ink-500">{yearOfDate(w.date)}</span>
                  ) : w.ledgerYear ? (
                    <span className="text-brand-700">{w.ledgerYear}*</span>
                  ) : w.notLaterThan ? (
                    <span className="text-ink-400">≤{w.notLaterThan}</span>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink-900">{w.title}</span>
                  {w.museumTitle && (
                    <span className="text-ink-400"> · {w.museumTitle}</span>
                  )}
                  {w.ledgerDisagrees && (
                    <span
                      title={`The leaf says ${w.ledgerYear}; the museum says ${w.date}. Both stand.`}
                      className="ml-1.5 rounded-full bg-encours-100 px-1.5 py-px text-[10px] uppercase tracking-wide text-encours-700"
                    >
                      leaf {w.ledgerYear}
                    </span>
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
                          href={url(`/${n.ledger}/#${n.ledger}/${n.batch}/${n.ref}`)}
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
            {/* The note stays open and its apparatus folds away.
                Which half to hide is not a toss-up. The note is the reading —
                a few sentences a reader can take in while scrolling — and the
                claims under it are three or four times its length, so with one
                note per work the page would eventually be mostly citation. But
                the citations are what make the note worth having, so they are
                one click away and never a click plus a page load: the whole of
                a note's evidence is in the DOM, and `\notesappendix` prints all
                of it, unfolded, into the batch PDF. */}
            <p className="prose-note mt-1">
              The only prose on this site a reader cannot check by looking at the sheet, so every
              sentence carries the source that states it. Open a note to see them — or read them
              set out in full at the back of the batch’s PDF, which is where they go when this
              page is not to hand.
            </p>
            {Object.entries(NOTES.notes).map(([k, n]) => (
              <details key={k} className="group mt-3 rounded-card border border-ink-200 px-4 py-3">
                <summary className="cursor-pointer list-none marker:content-none">
                  <h4 className="text-[13.5px] font-semibold text-ink-900">
                    {WORKS.find((w) => w.key === k)?.title ?? k}
                  </h4>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{n.note}</p>
                  <span className="prose-note mt-1 inline-block text-brand-700 group-open:hidden">
                    {n.claims.length} source{n.claims.length === 1 ? '' : 's'} ↓
                  </span>
                </summary>
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
                            const at = LEAVES.get(`${lg}/${lf}`);
                            return (
                              <a
                                href={url(`/${lg}/#${lg}/${at?.batch ?? 1}${at ? `/${at.ref}` : ''}`)}
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
              </details>
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
