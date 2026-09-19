import { Fragment, useEffect } from 'react';
import { Page } from './components/Frame.tsx';
import { FACET_LABEL, FACET_ORDER } from './components/Tags.tsx';
import { LEDGERS, LEDGER_BY_ID, NOTEBOOKS, NOTEBOOK_BY_ID, NOTEBOOK_SHEETS, SHEETS } from './content/catalogue.ts';
import { useKeywordIndex, useManifest } from './lib/batches.ts';
import { url } from './lib/base.ts';
import type { Facet, IndexSource, IndexTerm } from './lib/types.ts';

/**
 * The index: every term the transcriptions tag, and the batches that name it.
 *
 * ## Why this is a page and not a section of a volume
 *
 * A ledger page already shows its own terms, and that is the thing this page
 * exists because of. Rehn is named in seven volumes and appears there seven
 * times, as seven unrelated pills; a reader who wants the dealer has to
 * already know which volume to open, which is the one thing an index is for
 * not having to know. So the term is the entry here and the volumes are what
 * it points at — the same data, keyed the other way round, by
 * `npm run manifest`.
 *
 * It is not a second organisation of the archive, and that distinction is
 * worth keeping sharp because this site refuses those: there is no thematic
 * regrouping anywhere, every URL names a volume the Whitney can be asked
 * about, and nothing below moves a sheet out of the book it is bound in. An
 * index points; it does not refile.
 *
 * ## Why `/index/` and not `/names/` or a section of another page
 *
 * « Index » is what this is called in an edition, and it is the word a reader
 * arrives with. `/names/` was the alternative and undersells the contents: a
 * large part of the vocabulary is not a name at all — the mediums, the
 * subjects the notebooks turn on, and the features of the leaves themselves,
 * which is the largest group here after the people. The issue's other
 * suggestion was a section of `/archive/`, which this site does not have and
 * should not grow one of for this: an index of this size is a document, not a
 * panel at the foot of another.
 *
 * The one cost of `/index/` is internal and worth naming: the route's file is
 * `index/index.html`, which sits beside the site's own front page. The Vite
 * input is keyed `index` and the front page `main`, and nothing a reader sees
 * is affected.
 *
 * ## Everything on it is counted
 *
 * No figure below is typed into the prose — not the number of terms, not the
 * number a facet holds, not the coverage. They are read off `keywords.json`
 * and the manifest, so they move with the corpus instead of going stale while
 * looking authoritative.
 *
 * There is deliberately no search box. The whole index is on the page, so the
 * browser's own find runs over all of it; a filter that hid the rows it did
 * not match would take that away and give back something worse.
 */

const A = 'text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600';

/**
 * The volumes in the archive's order — the six ledgers as the Whitney
 * accessioned them, then the four notebooks — rather than in the order the
 * build happened to walk the directories.
 */
const VOLUME_ORDER = new Map<string, number>([
  ...LEDGERS.map((l, i) => [l.id, i] as const),
  ...NOTEBOOKS.map((n, i) => [n.id, LEDGERS.length + i] as const),
]);

const volumeName = (id: string) =>
  LEDGER_BY_ID.get(id)?.short ?? NOTEBOOK_BY_ID.get(id)?.short ?? id;

export function IndexPage() {
  const terms = useKeywordIndex();
  const manifest = useManifest();

  // Counted, never declared: a facet holds what the corpus puts in it, and a
  // facet the readings have not used yet holds nothing and is not shown.
  const groups = [
    ...FACET_ORDER.map((f) => [f, (terms ?? []).filter((t) => t.facets.includes(f))] as const),
    ['none', (terms ?? []).filter((t) => t.facets.length === 0)] as const,
  ].filter(([, list]) => list.length > 0);

  // The coverage, both documents kept apart, because they are two documents:
  // the ledgers' sheets and the notebooks' pages are not one denominator.
  const readLedgers = Object.values(manifest?.read ?? {}).reduce((a, b) => a + b, 0);
  const readNotebooks = Object.values(manifest?.readNotebooks ?? {}).reduce((a, b) => a + b, 0);

  // « Not placed » is a group on the page and is not a facet, so it is not
  // counted as one: saying the vocabulary has thirteen facets when it has
  // twelve would misreport the one thing this page is about.
  const facetsUsed = groups.filter(([f]) => f !== 'none').length;
  const volumes = new Set((terms ?? []).flatMap((t) => t.volumes.map((v) => v.ledger))).size;

  // The groups are not in the document until the index has been fetched, so
  // the browser has nothing to jump to when it reads `#dealer` off the URL
  // and gives up silently. Every facet chip on the page hands out one of those
  // links; a link that lands on the top of the page is worse than none.
  useEffect(() => {
    if (!terms) return;
    const id = location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, [terms]);

  return (
    <Page path="/index/">
      <header className="border-b border-ink-200 py-10">
        <p className="text-[12px] uppercase tracking-wider text-ink-400">
          {terms
            ? `${terms.length} terms · ${facetsUsed} facets · merged across ${volumes} volumes`
            : 'Reading the index…'}
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-3xl leading-tight text-ink-900">
          The index
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          Every dealer, buyer, place, museum, society, publication and subject the transcriptions
          name so far, grouped by what the reading called it and alphabetical inside each group.
          A term is followed by the batches whose transcription carries it; each one opens that
          batch beside its photograph. A ledger is looked up by who and where far more often than
          it is read through, and until this page the only way to that was knowing which volume
          to open.
        </p>
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">What this index is, and is not</h2>
        <div className="mt-3 grid max-w-5xl gap-4 md:grid-cols-3">
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-ink-900">
              It cannot describe a sheet nobody has read
            </h3>
            <p className="prose-note mt-2">
              Every entry comes from the <code>\keywords{'{}'}</code> line that closes a
              transcription, which is the only source of tags in this project — there is no tags
              file and there will not be one. A term exists because somebody read the sheets and
              then wrote it. So the index covers{' '}
              <span className="tabular">{readLedgers}</span> of the{' '}
              <span className="tabular">{SHEETS.length}</span> digitised ledger sheets and{' '}
              <span className="tabular">{readNotebooks}</span> of the{' '}
              <span className="tabular">{NOTEBOOK_SHEETS.length}</span> notebook sheets, and is
              silent about the rest rather than thin about them.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-ink-900">It merges nothing</h3>
            <p className="prose-note mt-2">
              The entry is the spelling as it was written, and the index below shows what that
              costs: « watercolors » and « watercolours » are two terms, « Mrs. Osgord Blanchard »
              and « Mrs. John Osgord Blanchard » are two women, « Frank K. M. Rehn » and
              « Rehn Gallery » are two dealers. Not one of those pairs is joined here, because the
              spelling as written is how an entry is found and this edition normalises nothing.
              Which follows: <strong>no entry here is a person</strong>. It is a string somebody
              wrote after reading a leaf, and what makes two strings the same man is a question
              for the leaves.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="text-[14px] font-semibold text-ink-900">
              It does not settle what a name was
            </h3>
            <p className="prose-note mt-2">
              The facet is declared in the transcription and never guessed from the string. Where
              two volumes placed the same name differently — Duncan Phillips is a person in Book I
              and a collection in Book IV, and both are true of him — the term stands under both
              headings and says so. Choosing one would be a reading, performed by a merge, in the
              one place nobody would look for it.
            </p>
          </div>
        </div>
      </section>

      {terms === null ? (
        <section className="py-8">
          <p className="prose-note">Reading the index…</p>
        </section>
      ) : (
        <>
          <nav className="border-b border-ink-200 py-6" aria-label="Facets">
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-500">
              The facets, and how many terms each holds
            </h2>
            <p className="prose-note mt-1 max-w-3xl">
              The vocabulary is closed and deliberately small, so that a reader can find the
              museums without reading past the places; <span className="tabular">{facetsUsed}</span>{' '}
              of its facets are in use, and one is not a facet at all —{' '}
              <em>Not placed</em> is where a term stands that no reading placed. The counts are the
              corpus’s own, and a term placed under two facets is counted under both, which is why
              they sum past the <span className="tabular">{terms.length}</span> terms.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {groups.map(([facet, list]) => (
                <a
                  key={facet}
                  href={`#${facet}`}
                  className="rounded-full bg-brand-50 px-2.5 py-1 text-[12px] text-brand-700 transition hover:bg-brand-100"
                >
                  {facet === 'none' ? 'Not placed' : FACET_LABEL[facet as Facet]}{' '}
                  <span className="tabular text-brand-500">{list.length}</span>
                </a>
              ))}
            </div>
          </nav>

          {groups.map(([facet, list]) => (
            // `scroll-mt` because the header is sticky: without it a facet
            // jumped to from the row above lands underneath the navigation.
            <section key={facet} id={facet} className="scroll-mt-14 border-b border-ink-200 py-8">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-serif text-2xl text-ink-900">
                  {facet === 'none' ? 'Not placed' : FACET_LABEL[facet as Facet]}
                </h2>
                <span className="tabular text-[13px] text-ink-500">
                  {list.length} {list.length === 1 ? 'term' : 'terms'}
                </span>
              </div>
              {facet === 'none' && (
                <p className="prose-note mt-1.5 max-w-3xl">
                  A permitted answer rather than a gap: these are terms no reading placed into a
                  kind. Whether they were dealers or buyers is decided by the sheets, and nobody
                  has decided it yet.
                </p>
              )}
              <ul className="mt-4 columns-1 gap-x-10 sm:columns-2 lg:columns-3">
                {list.map((t) => (
                  <Term key={t.label} term={t} under={facet} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </Page>
  );
}

/**
 * One entry: the label, the volumes that name it, and — where the readings
 * disagreed — the other headings it also stands under.
 */
function Term({ term, under }: { term: IndexTerm; under: string }) {
  const volumes = [...term.volumes].sort(
    (a, b) => (VOLUME_ORDER.get(a.ledger) ?? 99) - (VOLUME_ORDER.get(b.ledger) ?? 99),
  );
  const elsewhere = term.facets.filter((f) => f !== under);

  return (
    <li className="mb-2 break-inside-avoid text-[13.5px] leading-snug">
      <span className="text-ink-900">{term.label}</span>
      <span className="ml-1.5 text-[12px] text-ink-500">
        {volumes.map((v, i) => (
          <Fragment key={v.ledger}>
            {i > 0 && <span className="text-ink-300"> · </span>}
            <Source source={v} />
          </Fragment>
        ))}
      </span>
      {elsewhere.length > 0 && (
        <span
          className="ml-1.5 text-[11px] text-ink-400"
          title={volumes
            .map((v) => `${volumeName(v.ledger)}: ${v.facet ?? 'not placed'}`)
            .join(' · ')}
        >
          also under{' '}
          {elsewhere
            .map((f) => FACET_LABEL[f])
            .join(', ')}
        </span>
      )}
    </li>
  );
}

/**
 * One volume's share of a term.
 *
 * A ledger's batches are each a link, because a batch is a unit somebody can
 * open and the term was written about that batch. **A notebook's are not.**
 * Its one `\keywords{}` line closes the whole file and describes the notebook
 * as far as it has been read, so a link per sitting would offer a filter that
 * returns the same pages whichever sitting is chosen — which is a lie about
 * what a click does. The notebook is the link, and the sittings its line
 * covers are named in the tooltip.
 */
function Source({ source }: { source: IndexSource }) {
  const notebook = NOTEBOOK_BY_ID.get(source.ledger);
  if (notebook) {
    return (
      <a
        href={url(`/diaries/${notebook.id}/`)}
        title={`Written after reading ${source.batches.length === 1 ? 'sitting' : 'sittings'} ${source.batches.join(', ')} — the line closes the file, not a sitting`}
        className={A}
      >
        {notebook.short}
      </a>
    );
  }
  return (
    <>
      <span className="text-ink-400">{volumeName(source.ledger)}</span>{' '}
      {source.batches.map((b, i) => (
        <Fragment key={b}>
          {i > 0 && <span className="text-ink-300">, </span>}
          <a
            href={url(`/${source.ledger}/#${source.ledger}/${b}`)}
            title={`Batch ${b} of ${volumeName(source.ledger)} — the transcription whose keywords line carries this term`}
            className={A}
          >
            {b}
          </a>
        </Fragment>
      ))}
    </>
  );
}
