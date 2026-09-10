import { Page } from './components/Frame.tsx';
import { NOTEBOOKS } from './content/catalogue.ts';
import { url } from './lib/base.ts';
import { paamPartsOverlapping } from './lib/diaries.ts';

/**
 * Josephine Hopper's diaries: the scoping, and nothing transcribed.
 *
 * This page exists so that the diaries have somewhere to be that is not a
 * seventh ledger tab. Everything on it is what could be established from the
 * holding institutions' own pages, and it says plainly what is not decided.
 * Nothing here is a transcription, and the section's header carries no
 * Timeline, Accounts, Technique or Schema, because none of those could be
 * built from a diary.
 */

const REPO = 'https://github.com/Commutator-IO/hopper-project';

const A = 'text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600';

export function DiariesPage() {
  return (
    <Page path="/diaries/">
      <header className="border-b border-ink-200 py-10">
        <p className="text-[12px] uppercase tracking-wider text-ink-400">Scoping — nothing transcribed</p>
        <h1 className="mt-2 max-w-3xl font-serif text-3xl leading-tight text-ink-900">
          Josephine Hopper’s diaries
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          The ledgers record what a work sold for and to whom. The diaries are the other half of
          the same working life, and the ledgers’ own descriptive passages — the anecdotes Jo
          Hopper wrote under pictures her husband would not discuss — are plainly continuous with
          them. They are not in this corpus, and this page is the account of what would have to
          be true before a single page of them was read here.
        </p>
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">What exists, and where</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          Two institutions, and neither holds all of it.
        </p>
        <div className="mt-5 grid max-w-5xl gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h3 className="font-serif text-lg text-ink-900">
              Provincetown Art Association and Museum
            </h3>
            <p className="prose-note mt-2">
              A gift of 2016: 22 diaries dating between 1933 and 1956, given with 96 drawings by
              Edward Hopper and 69 drawings and watercolours by Josephine, through Laurence C.
              and J. Anton Schiffenhaus in honour of their mother Mary Schiffenhaus, a friend of
              the Hoppers, and two anonymous donors. PAAM describes them as chronicling the
              Hoppers’ lives on Cape Cod and beyond.
            </p>
            <p className="mt-3 text-[12.5px]">
              <a href="https://paam.org/collection/the-hoppers/" className={A}>
                The Hoppers at PAAM ↗
              </a>
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-serif text-lg text-ink-900">
              Whitney Museum of American Art — Sanborn Hopper Archive
            </h3>
            <p className="prose-note mt-2">
              A gift of 2017 from the Arthayer R. Sanborn Hopper Collection Trust, nearly four
              thousand items: letters, photographs, notebooks, dealer records and ephemera. The
              Whitney’s own description of it counts ninety notebooks by Josephine Nivison
              Hopper, and its digital collection files her papers as Series IV, 1911–1966. The
              same ResourceSpace that serves the ledger sheets to this site serves what has been
              digitised of it.
            </p>
            <p className="mt-3 text-[12.5px]">
              <a
                href="https://resourcespace.whitney.org/pages/collections_featured.php?parent=1115"
                className={A}
              >
                The archive’s digital collection ↗
              </a>
              {' · '}
              <a href="https://whitney.org/research/archives/manuscript-collections" className={A}>
                The Whitney’s description ↗
              </a>
            </p>
          </div>
        </div>
        <p className="prose-note mt-4 max-w-3xl">
          Which of the ninety notebooks are diaries, and whether any of them continue the run
          past 1956, is not stated on either institution’s public pages and is the first thing to
          ask rather than infer. Nothing here claims it.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The four notebooks the Whitney has digitised</h2>
        <p className="prose-note mt-1.5 max-w-3xl">
          Subseries A of Series IV of the Sanborn Hopper Archive, harvested from the Whitney’s
          listing exactly as the ledgers were, one collection to a notebook. The titles are hers,
          as written on the cover or the first page; the dates and the scope notes are the
          Whitney’s. Each tab shows every sheet, fetched from the Whitney as it is looked at, and
          transcribes none of it. The coverage mark says only that PAAM publishes a typed
          transcript for those years — not that it is of that notebook.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {NOTEBOOKS.map((n) => {
            const parts = paamPartsOverlapping(n);
            return (
              <a
                key={n.id}
                href={url(`/diaries/${n.id}/`)}
                className="card group flex flex-col p-5 transition hover:border-brand-400"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-lg text-ink-900 group-hover:text-brand-700">
                    {n.title}
                  </h3>
                  <span className="shrink-0 text-[11.5px] text-ink-400">{n.date}</span>
                </div>
                <p className="prose-note mt-2 flex-1">{n.scope}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="tabular text-ink-500">{n.sheets} sheets</span>
                  {n.archiveNumber && <span className="font-mono text-ink-500">{n.archiveNumber}</span>}
                  {parts.length > 0 && (
                    <span
                      className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700"
                      title={`PAAM publishes a typed transcript for ${parts[0].from}–${parts[parts.length - 1].to}; whether it includes this notebook is not established.`}
                    >
                      PAAM transcript years: {parts.map((p) => p.part).join(', ')}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">What is already done</h2>
        <div className="mt-2 max-w-3xl space-y-3 text-[14.5px] leading-relaxed text-ink-700">
          <p>
            The diaries are not, as the ledgers were, an unread hand waiting for a first pass.
            PAAM publishes <strong>transcripts</strong> of Josephine Hopper’s diaries — including,
            it says, diaries not in its own collection — and holds microfilm images of the diaries
            from 1933 to 1965, which it makes available to researchers on request. Gail Levin’s
            biography of 1995 drew on the diaries at length, and the prior this site states for
            the ledgers applies here with more force than anywhere: most of what a first reading
            finds surprising is in Levin already, and nothing here may claim priority.
          </p>
          <p>
            That changes what a transcription project could add. For the ledgers the value is
            the reading itself, checkable against a photograph on the same screen. For the
            diaries a reading exists; what does not exist, publicly, is the photograph.
          </p>
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">What would have to be true first</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The ledgers work on this site for one measured reason: the Whitney serves each sheet at
          1292 × 2000 to any browser that asks, so a transcription can sit beside its facsimile
          and be wrong in public. The diaries have no such image. A transcription nobody can
          check against the page is the one kind this site refuses to publish, so the questions
          below are in the order they block.
        </p>
        <ol className="mt-4 max-w-3xl list-decimal space-y-2 pl-6 text-[14.5px] leading-relaxed text-ink-700">
          <li>
            <strong>A facsimile a reader can open.</strong> Whether either institution will
            serve page images openly, at what resolution, and under what terms. Without this
            there is nothing to build.
          </li>
          <li>
            <strong>The rights position, established independently.</strong> The ledgers’
            position — © Heirs of Josephine N. Hopper, licensed by ARS, the Whitney holding the
            object rights — is not assumed to carry over to a different document in a different
            museum.
          </li>
          <li>
            <strong>What this site would add to PAAM’s transcripts</strong> rather than
            duplicate: at the least, the apparatus — what was read, what was guessed, what is
            illegible, whose hand — and a date that is the entry’s own subject rather than a leaf
            number.
          </li>
          <li>
            <strong>The unit of work</strong> in place of the twelve-sheet batch, and whether the
            transcription method built for ruled columns and two hands extends to a diary or
            needs its own.
          </li>
        </ol>
        <p className="prose-note mt-4 max-w-3xl">
          Written down in advance, as the scoping asked: if the first question has no answer,
          this section stays a page of scoping, and that is the right outcome rather than a
          failure. The questions are tracked as{' '}
          <a href={`${REPO}/issues/14`} className={A}>
            issue #14 ↗
          </a>
          , and the question of whether a document that is not a ledger can exist in this corpus
          at all as{' '}
          <a href={`${REPO}/issues/3`} className={A}>
            issue #3 ↗
          </a>
          .
        </p>
      </section>

      <section className="py-8">
        <h2 className="font-serif text-2xl text-ink-900">Why the diaries are not a tab</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The header switches between the ledgers and the diaries before it shows anything else,
          and the ledgers’ pages — the six volumes, the{' '}
          <a href={url('/timeline/')} className={A}>
            timeline
          </a>
          , the{' '}
          <a href={url('/accounts/')} className={A}>
            accounts
          </a>
          , the schema — do not appear here. They are ways of reading one document in six
          volumes, and none of them could be built from a diary. Filing the diaries beside them
          would have made a notebook look like a seventh ledger.
        </p>
      </section>
    </Page>
  );
}
