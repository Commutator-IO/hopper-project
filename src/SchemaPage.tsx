import { useState } from 'react';
import { Page } from './components/Frame.tsx';
import { ERDiagram, ERLegend } from './components/ERDiagram.tsx';
import { LedgerForm } from './components/LedgerForm.tsx';
import { ARCHIVE_MODEL, SCHEMAS } from './content/schemas.ts';
import { LEDGERS, SHEETS } from './content/catalogue.ts';
import { useManifest } from './lib/batches.ts';
import type { Apparatus } from './lib/types.ts';
import accounts from './content/accounts.json';
import partyAliases from './content/party-aliases.json';
import workAliases from './content/work-aliases.json';
import { url } from './lib/base.ts';

/**
 * The six volumes read as a data model.
 *
 * The claim this page makes is narrow and worth stating before anything else:
 * Jo Hopper kept records with a structure, that structure is legible, and it
 * has recognisable counterparts in how records are kept now. The claim it does
 * **not** make is that she was designing a schema. She was keeping accounts.
 * Every term below — foreign key, authority file, append-only, state machine —
 * is ours, applied afterwards, and the page says so twice because the whole
 * failure mode of a page like this is to make a bookkeeper sound like an
 * architect.
 *
 * Every figure is read off the corpus at build time: the apparatus census
 * comes from `npm run manifest`, the money from `npm run accounts`, the sheet
 * counts from the Whitney's own listing. Nothing here is typed into the prose,
 * because a hand-typed count is wrong the day the next batch lands and goes on
 * looking authoritative.
 */
export function SchemaPage() {
  const manifest = useManifest();
  const app = manifest?.apparatus ?? {};

  const totals = Object.values(app).reduce(
    (a: Apparatus, e) => ({
      macros: Object.fromEntries(
        [...new Set([...Object.keys(a.macros), ...Object.keys(e.macros)])].map((k) => [
          k,
          (a.macros[k] ?? 0) + (e.macros[k] ?? 0),
        ]),
      ),
      hands: Object.fromEntries(
        [...new Set([...Object.keys(a.hands), ...Object.keys(e.hands)])].map((k) => [
          k,
          (a.hands[k] ?? 0) + (e.hands[k] ?? 0),
        ]),
      ),
      tables: a.tables + e.tables,
      rows: a.rows + e.rows,
    }),
    { macros: {}, hands: {}, tables: 0, rows: 0 },
  );

  const unnumbered = SHEETS.filter((s) => s.leaf === null).length;
  const refs = SHEETS.map((s) => s.ref);
  const sameAs = (partyAliases as { same?: string[][] }).same?.length ?? 0;
  const weak = (partyAliases as { weakSurnames?: string[] }).weakSurnames ?? [];

  return (
    <Page path="/schema/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">The schemas Jo Hopper kept</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          Six volumes, four different record structures, fifty-four years, and not one of them
          designed. This page reads them the way one would read a data model — what a record is,
          what identifies it, what states it moves through, what the model cannot express — and
          names the modern counterpart of each. The counterparts are <em>ours</em>. She was
          keeping accounts, not specifying a system, and the distance between those two things is
          the most interesting thing on the page.
        </p>
        <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
          <Stat n={SHEETS.length} label="sheets in the archive" />
          <Stat n={totals.tables} label="ruled tables transcribed" />
          <Stat n={totals.rows} label="rows inside them" />
          <Stat n={accounts.entries.length} label="money rows parsed" />
        </dl>
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The rule that makes the rest evidence</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          On the inside front cover of Book I, Jo Hopper wrote that the record was made{' '}
          <em>at the time each work is finished, or before it leaves the studio</em>. That single
          instruction is the whole difference between these books and a reminiscence. A record
          written at the moment of the event, by the person the event happened to, is what
          archivists call <strong>capture at the point of creation</strong>, and it is what gives a
          document evidential weight rather than merely informational weight. Everything below is
          a consequence of it: the columns are terse because they were filled in while the paint
          was wet, the dates run out of order because entries were made as things happened rather
          than sorted afterwards, and the arithmetic reconciles because nobody was reconstructing
          it later.
        </p>
        <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          It also fixes who wrote what, and the division is sharper than it sounds. Edward drew
          the record sketch and lettered the title and the plate size above it; Jo wrote
          everything else — the columns, the prices, the buyers, the anecdotes, the corrections.
          So every transcription attributes its passages to a hand, and the corpus so far holds{' '}
          <span className="tabular">{(totals.hands.jo ?? 0).toLocaleString('en-US')}</span> in
          hers, <span className="tabular">{totals.hands.later ?? 0}</span> in the later curatorial
          hands, and <span className="tabular">{totals.hands.unidentified ?? 0}</span> attributed
          to nobody because the sheets do not settle it.
        </p>
        <p className="prose-note mt-4 max-w-3xl">
          The count for Edward’s hand is{' '}
          <span className="tabular">{totals.hands.edward ?? 0}</span>, and that is not an
          oversight — it is the schema showing through. His contribution is not prose to be
          attributed but structure to be marked: it is the{' '}
          <span className="tabular">{totals.macros.sketch ?? 0}</span> record drawings and the
          titles that head the work blocks, which carry their own macros. The vocabulary offers
          four hands; the corpus uses three, because the fourth never wrote a sentence.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Four schemas, six volumes</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The volumes are not variants of one form. Each answers a different question, and the
          shape of each follows from its question — which is why a parser written for one of them
          reads nothing in the next.
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-[13.5px]">
            <thead>
              <tr className="border-b border-ink-300 text-left text-[11.5px] uppercase tracking-wider text-ink-400">
                <th className="py-1.5">Volume</th>
                <th className="py-1.5">One record is</th>
                <th className="py-1.5">Keyed by</th>
                <th className="py-1.5">Modern counterpart</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'book-i',
                  'one etching plate, and every event in its life',
                  'the plate’s title',
                  'an item record with an event log appended to it',
                ],
                [
                  'book-ii',
                  'one painting, on one opening, with its sale',
                  'the work’s title',
                  'an item record with a single transaction attached',
                ],
                [
                  'book-iii',
                  'the same as Book II, with the running lists moved to the front',
                  'the work’s title',
                  'the same model, re-ordered for lookup rather than for entry',
                ],
                [
                  'book-iv',
                  'one commission, from order to cheque',
                  'nothing — position in the book is the key',
                  'a chronological journal of open items',
                ],
                [
                  'book-v',
                  'one drawing, one loan, one receipt',
                  'a letter index at the front',
                  'a small item register with an access point',
                ],
                [
                  'dealers',
                  'one dealer, and the prints that passed through them',
                  'the dealer’s name',
                  'a secondary index over data held elsewhere',
                ],
              ].map(([id, record, key, modern]) => {
                const l = LEDGERS.find((x) => x.id === id)!;
                return (
                  <tr key={id} className="border-b border-ink-200 align-top">
                    <td className="py-2 pr-4">
                      <a href={url(`/${id}/`)} className="text-brand-700 hover:underline">
                        {l.short}
                      </a>
                      <div className="text-[11.5px] text-ink-400">{l.date}</div>
                    </td>
                    <td className="py-2 pr-4 text-ink-600">{record}</td>
                    <td className="py-2 pr-4 text-ink-600">{key}</td>
                    <td className="py-2 text-ink-600">{modern}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The four schemas, drawn</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The same volumes as entity-relationship diagrams. Every box, field and cardinality below
          was read off a transcribed leaf, and a field quotes the cell that establishes it — an ER
          diagram looks authoritative in exactly the way a table of figures does, so one invented
          attribute would be indistinguishable from a read one a year from now. Two of the
          conventions carry most of the argument: a <strong>dashed box</strong> is a table the leaf
          implies but never rules, and a <strong>dashed line</strong> is a join that holds in fact
          and is enforced by nothing.
        </p>
        <Workbench />
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">
          Book IV is a state machine, and the ink is the status field
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The pocket memorandum book is the most machine-like of the six, and the only one that
          tracks a thing through states rather than recording it once. Every commission in it
          passes through the same sequence, and each step gets its own dated line:
        </p>

        <ol className="mt-5 max-w-3xl space-y-0">
          {[
            ['Commissioned', 'the client and the date, in black — the obligation is incurred'],
            ['Itemised', 'what was drawn, one line each, with the price at the right'],
            ['Referenced', 'the client’s own order number, written beside the item'],
            ['Billed', '« bill rendered », dated, still in black — a claim now exists'],
            ['Settled', '« rec’d by check », dated, in red — and only this line is red'],
          ].map(([state, what], i, all) => (
            <li key={state} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                    i === all.length - 1 ? 'bg-rose-500' : 'bg-ink-400'
                  }`}
                />
                {i < all.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
              </div>
              <div className="pb-5">
                <div className="text-[14px] font-semibold text-ink-900">{state}</div>
                <div className="text-[13.5px] leading-relaxed text-ink-600">{what}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <Card title="Colour is a status column">
            From May 1914 the convention is absolute and never breaks: entries and bills in black,
            receipts in red — date, words and figure. One glance down a leaf says what has been
            paid. Today this is a status field, or a conditional format; there it is a second pen.
          </Card>
          <Card title="Order numbers are foreign keys">
            « Order no. 10963 », « Order 553 B » point into the client’s filing system, not hers.
            The book is deliberately joinable to a record she did not hold.
          </Card>
          <Card title="Totals are carried, not restated">
            A running subtotal crosses a leaf turn and is not repeated: 65 at the foot of leaf 21
            takes 15 on leaf 22 to make 80. The balance lives between two pages, which is exactly
            where a parser loses it.
          </Card>
        </div>

        <p className="prose-note mt-5 max-w-3xl">
          What it is not: double entry. There is no counter-account, no balance, no close of
          period, and no total for a year anywhere in the volume. It is single-entry cash
          bookkeeping with an open-item receivables ledger laid over it — which is a more useful
          thing to have than a trial balance, if what you want to know is who owed you what and
          for how long.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Three identifier namespaces, and a join</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          Any sheet in this archive has three different names, and confusing two of them moves an
          entry into the wrong year without anything downstream noticing.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Card title="The leaf number">
            Written on the paper by the Hoppers. What a citation cites, and what this site prints.
            Not every sheet has one — <span className="tabular">{unnumbered}</span> of{' '}
            <span className="tabular">{SHEETS.length}</span> carry no number at all, because
            nobody wrote one on a cover or a flyleaf.
          </Card>
          <Card title="The Whitney’s sequence">
            The order the sheets were photographed in, counting covers, versos and loose
            insertions whole. This is what a batch of twelve is cut from, and it is not the leaf
            number.
          </Card>
          <Card title="The resource ref">
            <span className="tabular">
              {Math.min(...refs)}–{Math.max(...refs)}
            </span>
            , in no order whatsoever, and the sheet’s only stable address. An opaque surrogate key,
            which is the one kind that never has to be revised.
          </Card>
        </div>
        <ERDiagram model={ARCHIVE_MODEL} className="mt-5" />
        <p className="prose-note mt-1 max-w-3xl">
          The archive’s own three tables — and the one place in any of this where a foreign key is
          genuinely enforced.
        </p>
        <p className="prose-note mt-4 max-w-3xl">
          Each transcription joins two of the three explicitly —{' '}
          <code className="font-mono text-[12.5px]">\sheet&#123;16853&#125;&#123;2&#125;</code>{' '}
          means resource 16853 is the leaf numbered 2 — and{' '}
          <code className="font-mono text-[12.5px]">npm run render</code> checks the pair against
          the Whitney’s own listing and <strong>fails the build on a disagreement</strong>. That
          is a foreign-key constraint, enforced at write time rather than hoped for. It is also
          what lets the facsimile turn as the transcript is scrolled.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">
          Corrections are appended, never overwritten
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          A price revised, a buyer who withdrew, an exhibition that fell through: she struck the
          line and left it legible, and wrote the new figure beside it. Nothing in these books is
          erased. That is an append-only history with a full audit trail, and it is the reason a
          crossing-out is so often the more interesting half of an entry — a destructive edit
          would have thrown away the fact that the sale nearly happened.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Stat n={totals.macros.struck ?? 0} label="struck-out passages kept" />
          <Stat n={totals.macros.marginal ?? 0} label="marginal additions" />
          <Stat n={totals.macros.uncertain ?? 0} label="doubtful readings flagged" />
          <Stat n={totals.macros.ill ?? 0} label="passages left illegible" />
        </div>
        <p className="prose-note mt-4 max-w-3xl">
          The last two are this project’s discipline rather than hers, and they follow the same
          principle one level up. An illegible figure is recorded as illegible and never filled
          in, because an invented figure is a transaction that did not happen — at a price nobody
          paid, to a buyer who never bought — and a table looks like data in a way that prose does
          not. See <a href={url('/method/')} className="text-brand-700 hover:underline">Method</a>{' '}
          for the whole apparatus.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Dealers/Etchings is a second index</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The same prints that Book I records plate by plate appear again in Dealers/Etchings
          organised by whose hands they passed through — Keppel, Kraushaar, Kennedy, the Downtown
          Gallery, the Weyhe Book Shop, Vickery Atkins &amp; Torrey each get a leaf, and the
          impressions move down it. Nothing new is recorded. It is one dataset given a second
          access path because the first one answered the wrong question, which is what a secondary
          index is for, and it is the clearest evidence on the whole shelf that she was thinking
          about retrieval and not only about entry.
        </p>
        <p className="prose-note mt-4 max-w-3xl">
          Its leaves are numbered from 51, because the volume was begun in the middle of a book
          already partly used — an offset that means something to whoever wrote it and nothing to
          anyone else. Two of its leaves are written across the page rather than down it and were
          photographed turned.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The missing piece is an authority file</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          This is the one place the model genuinely fails, and it fails in the way every records
          system fails before somebody notices. A work is keyed by its title and a buyer by his
          name, and both are written freehand, differently, on different leaves.{' '}
          <em>Kepple</em> for Keppel. <em>J. Walton Thompson</em> on one leaf and{' '}
          <em>J. Walter Thompson</em> on the next. <em>Les Deux Pigeon</em> in a descriptor and{' '}
          <em>Les Deux Pigeons</em> in the index, of one plate. Nothing in the books resolves any
          of it, because nothing in them was ever meant to be counted.
        </p>
        <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          So this project keeps the authority file the books lack, in two small hand-written
          files: <span className="tabular">{sameAs}</span> pairs of labels declared to be one
          party, <span className="tabular">{weak.length}</span> surnames declared to be{' '}
          <em>insufficient evidence on their own</em>, and{' '}
          <span className="tabular">{(workAliases as unknown[]).length}</span> title mappings, each
          entry carrying the reason it was written. They are files rather than rules for one
          reason: every one is a claim somebody can disagree with in a diff.
        </p>
        <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          The negative declarations are the ones that earn their keep, and they are the part no
          similarity measure supplies. Matching on a surname alone made{' '}
          <em>Hopper</em> a buyer of his own work three times over, because every « Inv. Hopper
          Oils, Watercolors &amp; Etchings » is an exhibition title. It put three of the Wadsworth
          Atheneum’s watercolours on Huntington Hartford’s row, because the Atheneum is in
          Hartford, Connecticut.{' '}
          {weak.map((w, i) => (
            <span key={w}>
              {i > 0 && (i === weak.length - 1 ? ' and ' : ', ')}
              <em>{w}</em>
            </span>
          ))}{' '}
          are now credited only where the full name appears — and every one of them was found by
          reading the rows the surname had wrongly matched, not by reasoning about names.
        </p>
      </section>

      <section className="py-8">
        <h2 className="font-serif text-2xl text-ink-900">What the model cannot express</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          A fair reading has to include the limits, because they are what make the accounts on
          this site a floor under a number rather than the number.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card title="One date where two events happened">
            Book II writes a single date to a sale and does not separate the day the work went out
            from the day the cheque came. It is booked at the sale, and no payment is invented out
            of it — which is why{' '}
            <span className="tabular">
              {accounts.receivable.at(-1)?.outstanding.toLocaleString('en-US')}
            </span>{' '}
            sits outstanding in the accounts and most of it is a silence rather than a debt.
          </Card>
          <Card title="The date column means different things">
            On the oils leaves the first column dates the sale; on the etchings leaves it dates
            the exhibition, and a sale in that row has no date of its own but the day its cheque
            cleared. The same column position carries two meanings, and only the header — where
            there is one — says which.
          </Card>
          <Card title="No column headings at all in Book IV">
            The pocket book’s four fields are the stationer’s printed rules, and nobody ever wrote
            a heading above any of them in fifty-four years. The meaning of a column is
            positional, undeclared, and recoverable only by reading down it.
          </Card>
          <Card title="The arithmetic is not always right">
            Where a row states a price, a commission and a receipt, the three can be checked
            against each other: <span className="tabular">{accounts.arithmetic.checkable}</span>{' '}
            rows are checkable, <span className="tabular">{accounts.arithmetic.agree}</span> agree
            and <span className="tabular">{accounts.arithmetic.disagree}</span> do not. A
            disagreement is reported and never corrected — it most often means a figure was
            misread, and it points at the row to go back to.
          </Card>
        </div>
        <p className="prose-note mt-5 max-w-3xl">
          One last time, because it is the whole caveat of this page: none of this vocabulary is
          hers. She did not have a schema, an authority file or a state machine; she had a pen, a
          second pen in red, and the habit of writing things down before they left the studio.
          That the habit turns out to be legible as a data model fifty years later is a fact about
          how much structure careful bookkeeping carries, not a claim that she was doing something
          other than bookkeeping.
        </p>
      </section>
    </Page>
  );
}

/**
 * One schema at a time: the diagram, what a person who normalises tables would
 * say about it, and a form whose fields are that volume's own columns.
 *
 * The form is a sandbox and says so where it matters. Nothing typed into it is
 * submitted or stored anywhere but the reader's own browser, and that is a rule
 * of the edition rather than a limit of the hosting: every figure published here
 * has to come off a photographed leaf, and a form that let a visitor contribute
 * a plausible row would manufacture precisely what the method exists to prevent.
 */
function Workbench() {
  const [id, setId] = useState(SCHEMAS[0].id);
  const s = SCHEMAS.find((x) => x.id === id) ?? SCHEMAS[0];
  return (
    <div className="mt-5">
      <div role="tablist" aria-label="The schemas" className="flex flex-wrap gap-1.5">
        {SCHEMAS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={x.id === id}
            onClick={() => setId(x.id)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${
              x.id === id
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            {x.tab}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-card border border-ink-200 bg-white p-4 sm:p-6">
        <h3 className="font-serif text-xl text-ink-900">{s.volumes}</h3>
        <p className="mt-1 text-[13.5px] text-ink-500">
          One record is <em>{s.record}</em>.
        </p>
        <p className="mt-3 max-w-3xl text-[14px] leading-relaxed text-ink-700">{s.gist}</p>

        <ERDiagram model={s.model} className="mt-5" />
        <ERLegend />

        <p className="mt-4 max-w-3xl border-l-2 border-ink-200 pl-3 text-[13.5px] leading-relaxed text-ink-600">
          <strong className="text-ink-800">Where it would fail a review:</strong> {s.normal}
        </p>

        <div className="mt-7 border-t border-ink-200 pt-5">
          <h4 className="font-serif text-lg text-ink-900">Keep this book yourself</h4>
          <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-600">
            The fields below are this volume’s columns and nothing else. Write a line and it goes
            onto the leaf in the pen the book would have used — which is the quickest way to feel
            how much of the record is carried by the notation and how little by the form.{' '}
            <strong>It is a sandbox.</strong> What you type stays in your browser, and no figure
            that was not read off a photographed sheet may ever enter the edition.
          </p>
          <div className="mt-4">
            <LedgerForm schema={s} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <dt className="text-[12px] uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="tabular font-serif text-3xl text-ink-900">{n.toLocaleString('en-US')}</dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white px-4 py-3">
      <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}
