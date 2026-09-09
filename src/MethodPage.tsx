import { useEffect } from 'react';
import { Page } from './components/Frame.tsx';
import { LEDGERS, BY_LEDGER, SHEETS } from './content/catalogue.ts';
import { BATCH_SIZE, batchCount, batchState, useManifest } from './lib/batches.ts';
import { STATES, tally, type State } from './lib/progress.ts';
import { STATE_COLOURS } from './components/Reader.tsx';
import { url } from './lib/base.ts';
import { REPO } from './lib/report.ts';
import glossaryData from './content/glossary.json';

/** The volume, as the cards name it. Two other pages carry the same one line. */
const named = (id: string) => LEDGERS.find((l) => l.id === id)?.short ?? id;

/**
 * The three kinds, and what a reader is being told by each.
 *
 * They are separated on the page because they are separated in kind, and the
 * separation is the one thing this section is for: an abbreviation has an
 * expansion, a notation has a *reading* that is not an expansion at all, and a
 * misspelling has neither — it has a leaf that spells it that way, and it is
 * here so that searching for the right form does not lose the entry.
 */
const GLOSSARY_HEADING = {
  abbreviation: 'Abbreviations',
  notation: 'Notations',
  spelling: 'Spellings that recur',
} as const;

const GLOSSARY_BLURB = {
  abbreviation:
    'Words she shortened and never expanded. Neither does the transcription, so this is where the expansion lives.',
  notation:
    'Forms that are not short for anything. They mean something other than what they look like, and the first of them is the one that has misled every reader of these books at least once.',
  spelling:
    'Not corrections. She spells several names more than one way, and the transcription keeps every form as written — which means a reader searching for the right spelling will miss the leaf. These are finding aids: the wrong form, and the leaf that has it.',
} as const;

/**
 * How the reading is done, what it costs, and what it does not claim.
 *
 * The page exists because everything on this site is a machine pass over
 * somebody else's handwriting, and a project that says so once on the home
 * page and never again is not being honest, it is being polite. Here the
 * arithmetic is printed: what is transcribed, what is only declared, and the
 * difference between the two.
 */
export function MethodPage() {
  const manifest = useManifest();

  // `/method/#cite` has to land on the citation section, and by itself it does
  // not: the browser looks for the element while the page is still an empty
  // root div, finds nothing, and stays at the top. The reader's **Cite** panel
  // links here, so a reader who follows it to find out what they just copied
  // would arrive at the progress table instead.
  //
  // `instant` rather than the page's own smooth scroll: a reader who followed a
  // link wants to be there, not to watch seventeen hundred pixels go past.
  useEffect(() => {
    if (!location.hash) return;
    document
      .getElementById(location.hash.slice(1))
      ?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, []);

  const batches = LEDGERS.flatMap((l) => {
    const all = BY_LEDGER.get(l.id) ?? [];
    return Array.from({ length: batchCount(all.length) }, (_, i) => ({
      state: batchState(manifest, l.id, i + 1) as State,
      sheets: Math.min(BATCH_SIZE, all.length - i * BATCH_SIZE),
    }));
  });
  const t = tally(batches);
  const read = Object.values(manifest?.read ?? {}).reduce((a, b) => a + b, 0);

  return (
    <Page path="/method/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Method &amp; progress</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          How these leaves are read, what the reading records, and how much of it is done.
          Adapted, nearly whole, from a{' '}
          <a
            href="https://grothendieck.commutator.io"
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
          >
            workbench built for another manuscript archive
          </a>
          ; what changed, changed because a ledger is not a manuscript.
        </p>
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Where it stands</h2>
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Stat n={SHEETS.length} label="sheets in the archive" />
          <Stat n={read} label="sheets transcribed" />
          <Stat n={t.sheetsChecked} label="sheets checked by a person" />
          <Stat n={t.total} label="batches in all" />
        </dl>

        <table className="mt-7 w-full max-w-3xl text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-left text-[11.5px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5">State</th>
              <th className="py-1.5 text-right">Batches</th>
              <th className="py-1.5 pl-6">What it means</th>
            </tr>
          </thead>
          <tbody>
            {STATES.map((s) => (
              <tr key={s.key} className="border-b border-ink-200">
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11.5px] ${STATE_COLOURS[s.key]}`}>
                    {s.label}
                  </span>
                </td>
                <td className="py-2 text-right tabular">{t.byState[s.key]}</td>
                <td className="py-2 pl-6 text-ink-600">{s.help}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="prose-note mt-4 max-w-3xl">
          Two of those six states are observed and cannot go stale: <em>Drafted</em> and{' '}
          <em>Records extracted</em> are facts about which files exist, read by{' '}
          <code className="font-mono text-[12.5px]">npm run manifest</code>. The other three are
          declarations in <code className="font-mono text-[12.5px]">transcripts/status.json</code>,
          where a change is a diff somebody can review. Nothing here verifies a claim that a
          person has checked a batch; only a person may make it.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The critical apparatus is the point</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          A transcription that smooths over a doubtful figure has destroyed the only thing it was
          made for. In a manuscript of mathematics an invented word is a wrong word. Here an
          invented figure is a <strong>sale that did not happen</strong>, at a price nobody paid,
          to a buyer who never bought — and it will be cited, because a table looks like data in a
          way that prose does not.
        </p>
        <table className="mt-5 w-full max-w-3xl text-[13.5px]">
          <tbody>
            {[
              ['\\sheet{16853}{2}', 'this sheet begins — the resource ref, then the number written on the paper. This is what turns the photograph as the transcript is scrolled.'],
              ['\\ill{}', 'illegible; never guessed'],
              ['\\uncertain{…}', 'a reading offered, and flagged as doubtful'],
              ['\\add{…}', 'an editorial addition — an expanded abbreviation, an implied dollar sign'],
              ['\\struck{…}', 'struck out in the book. Jo Hopper struck a great deal, and a crossing-out is often the more interesting half of an entry'],
              ['\\note{…}', 'the transcriber’s note — ours'],
              ['\\marginal{…}', 'a marginal note in the book — theirs'],
              ['\\hand{edward|jo|later|unidentified}{…}', 'whose hand wrote it. These books were written by two people and annotated by more, and a transcription that flattened the three would destroy what they chiefly record'],
              ['\\sketch{…}', 'Edward Hopper’s ink record drawing stands here. The argument is what is written on it, never a description of it'],
              ['\\clipping{…}', 'something printed and pasted to the leaf; the argument transcribes its printed text'],
              ['ledgertable', 'the ruled columns. Jo Hopper ruled them herself; the table is not a presentation of the content, it is the content'],
            ].map(([macro, meaning]) => (
              <tr key={macro} className="border-b border-ink-200 align-top">
                <td className="w-64 py-2 pr-4 font-mono text-[12px] text-brand-700">{macro}</td>
                <td className="py-2 text-ink-600">{meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* The glossary, with an id the reading view's own link points into.
          It sits directly under the apparatus because the two answer adjacent
          questions: that table says what our marks mean, and this one says
          what *hers* mean. The order matters — a reader who has just met
          « 25 - 1/10 » on a leaf arrives at the second, not the first. */}
      <section id="glossary" className="scroll-mt-16 border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">
          What she wrote, and what it means
        </h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          {glossaryData.means}
        </p>
        <p className="prose-note mt-3 max-w-3xl">{glossaryData.note}</p>

        {(['abbreviation', 'notation', 'spelling'] as const).map((kind) => {
          const rows = glossaryData.entries.filter((e) => e.kind === kind);
          if (rows.length === 0) return null;
          return (
            <div key={kind} className="mt-8">
              <h3 className="font-serif text-[17px] text-ink-900">{GLOSSARY_HEADING[kind]}</h3>
              <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-600">
                {GLOSSARY_BLURB[kind]}
              </p>
              <ul className="mt-4 max-w-3xl">
                {rows.map((e) => (
                  <li key={e.term} className="border-b border-ink-200 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono text-[13px] text-brand-700">{e.written}</span>
                      <span className="text-[11.5px] text-ink-400">
                        {e.count}× on {e.sheets} sheet{e.sheets === 1 ? '' : 's'}
                      </span>
                    </div>
                    {'standard' in e && e.standard ? (
                      <div className="mt-1 text-[13px] text-ink-500">
                        <span className="text-ink-400">for</span> {e.standard}
                      </div>
                    ) : null}
                    <p className="mt-1 text-[13.5px] leading-relaxed text-ink-700">{e.means}</p>
                    {'note' in e && e.note ? (
                      <p className="prose-note mt-1">{e.note}</p>
                    ) : null}
                    <div className="mt-2 space-y-1">
                      {e.seen.map((s) => (
                        <div key={s.ref} className="text-[12px] leading-relaxed text-ink-500">
                          <a
                            className="text-brand-700 hover:underline"
                            href={`${url(`${s.ledger}/`)}#${s.ledger}/${s.batch}/${s.ref}`}
                          >
                            {named(s.ledger)}, {s.leaf ? `leaf ${s.leaf}` : 'unnumbered leaf'}
                          </a>{' '}
                          <span className="text-ink-400">— {s.shows}</span>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      {/* How to cite, with an id the reader's Cite panel links into. A reader
          who has just copied a sentence and wants to know what is in it lands
          here, so the section has to answer that question first and argue
          second. */}
      <section id="cite" className="scroll-mt-16 border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">How to cite</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          Three numbering systems overlap in these books and only one of them is an address. The
          Hoppers wrote leaf numbers on the paper. The Whitney&rsquo;s digitisation counts{' '}
          <em>photographs</em> — the covers, the versos, the flyleaves and the loose insertions
          included — so it agrees with the leaf numbers nowhere. ResourceSpace holds a resource
          ref, which is in no order at all and is the only thing in the archive naming exactly one
          image. <strong>“Leaf 58” names six different things across six volumes — and inside Book I
          alone it names three photographs, refs 18297, 17062 and 17411. Ref 18297 names
          one.</strong> So a citation from here prints both: the leaf, because it is what the book
          itself says and the only number a reader of the photograph can see, and the ref, because
          it is the one the museum can be asked about.
        </p>

        <figure className="mt-5 max-w-3xl rounded-card border border-ink-200 bg-white px-4 py-3">
          <p className="text-[13.5px] leading-relaxed text-ink-800">
            Josephine Nivison Hopper and Edward Hopper, Artist’s ledger — Book I, leaf 58 (ref
            18297). Whitney
            Museum of American Art, 96.208. Hopper Ledgers, batch-06, first machine pass by Opus 5,
            6 September 2026, https://hopper.commutator.io/book-i/#book-i/6/18297 (accessed 10
            September 2026).
          </p>
          <figcaption className="mt-2 border-t border-ink-200 pt-2 text-[12.5px] leading-relaxed text-ink-500">
            Two clauses. <strong>The object</strong> — authors, volume, leaf, ref, institution,
            accession — is the Whitney’s, and stays true whatever happens to this site.{' '}
            <strong>The reading</strong> — this site, the batch, the pass — is a claim of ours, it
            is dated, and it may be wrong.
          </figcaption>
        </figure>

        <p className="prose-note mt-4 max-w-3xl">
          Press <strong>Cite</strong> in any reading view, beside the download row, and the
          sentence is built from what the page already knows. It offers three, because three
          different things get cited and they are not interchangeable.
        </p>

        <table className="mt-4 w-full max-w-3xl text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-left text-[11.5px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5">Unit</th>
              <th className="py-1.5 pl-6">When</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'a sheet — one photograph, ref 18297',
                'By default. It is the only unit with a unique address.',
              ],
              [
                'a leaf — leaf 58 (refs 18297, 17062, 17411)',
                'When somebody holding the volume should be able to find it. A leaf may be several photographs — the Whitney shot hinged leaves and pasted-in clippings more than once — so every ref is printed, in binding order, rather than one being quietly picked. Its link is the leaf- form, resolved on arrival, which keeps working if the batching ever changes.',
              ],
              [
                'a batch — batch-06 (sheets 61–72, leaves 56–63)',
                'When what is cited is the transcription itself: a reading, a note, an editorial decision. It names the sheets and the leaves it covers, because a batch number is ours and means nothing to anybody holding the book.',
              ],
            ].map(([unit, when]) => (
              <tr key={unit} className="border-b border-ink-200 align-top">
                <td className="w-64 py-2 pr-4 text-ink-800">{unit}</td>
                <td className="py-2 pl-6 text-ink-600">{when}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 max-w-3xl space-y-4 text-[14.5px] leading-relaxed text-ink-700">
          <Diff title="A sheet nobody numbered is cited as an unnumbered leaf">
            A cover, a flyleaf, an index leaf, a loose insertion — about one sheet in nine — carries
            no number, and is cited by its ref as an <em>unnumbered leaf</em>. That is the same
            answer the TEI gives as <code className="font-mono text-[13px]">n=&quot;unnumbered&quot;</code>,
            and it is an answer rather than an omission: nobody wrote a number on that leaf, and
            inventing one for the sake of a tidy citation would be inventing a fact about the
            object. Such a sheet has no leaf citation at all, because there is nothing to name it
            by.
          </Diff>
          <Diff title="A sheet nobody has transcribed keeps its object and loses its reading">
            The object clause stands whole and the reading clause is replaced by{' '}
            <em>Not transcribed; sheet listed in Hopper Ledgers</em>. The photograph is there and
            this site will show it; there is simply no reading of ours to cite, and saying so is an
            answer rather than a gap. A batch <em>declared</em> to hold nothing to transcribe says
            something else, because that is a decision rather than a gap: <em>No transcription:
            this batch is declared to hold nothing to transcribe.</em>
          </Diff>
          <Diff title="Nothing in the sentence is invented — the TEI already emits all of it">
            The authors are the file’s <code className="font-mono text-[13px]">&lt;author&gt;</code>{' '}
            elements, in the order it lists them — Josephine first, because the writing in these
            books is overwhelmingly hers — the leaf is its{' '}
            <code className="font-mono text-[13px]">&lt;pb n=&quot;58&quot;/&gt;</code>, the ref is
            the same tag’s <code className="font-mono text-[13px]">facs</code> and{' '}
            <code className="font-mono text-[13px]">xml:id</code>, the accession is its{' '}
            <code className="font-mono text-[13px]">&lt;msIdentifier&gt;</code> and the pass is its{' '}
            <code className="font-mono text-[13px]">&lt;respStmt&gt;</code>. One source, so a
            citation copied from the screen and a TEI file deposited in a repository cannot
            disagree.
          </Diff>
          <Diff title="It cites a reading, which may change">
            The pass is named in the sentence — which model read the sheets, and on what day —
            because a citation of this site cites a <em>reading</em>, not a fact. A reading that
            could not be dated could not be superseded, and “the site says X” would stay true
            forever and be worth nothing. Where a person has gone sheet by sheet against the
            photograph the sentence says that too, and only a person may declare it. Until{' '}
            <a
              href={`${REPO}/issues/7`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
            >
              each transcription carries a revision history
            </a>
            , the pass and the access date are what pin a citation to the words that were actually
            read. The address does not move when a reading does: a corrected sheet keeps its ref,
            its leaf and its URL.
          </Diff>
        </div>
      </section>

      {/* Four decisions that are not obvious from the code, kept because a
          reader checking a reading deserves to know how the sheet in front of
          them got here and what may be done with it. */}
      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Decisions worth stating</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-[14.5px] leading-relaxed text-ink-700">
          <Diff title="The images are fetched from the museum, not through us">
            The Whitney’s server answers cross-origin, echoes the{' '}
            <code className="font-mono text-[13px]">Origin</code> it is sent, holds a current
            certificate and applies no referer check. Only framing is forbidden, and an image
            belongs in an <code className="font-mono text-[13px]">&lt;img&gt;</code> anyway. So
            every photograph on this site is loaded from the museum that made it, and there is no
            relay in between: nothing is cached here, nothing is re-served, and a reader’s
            browser talks to the Whitney directly.
          </Diff>
          <Diff title="Twelve sheets to a batch">
            A ledger leaf is a ruled table forty lines deep, and every line carries a date, a
            place, a price and a fraction — the commissions run “25 – 1/3” and the figures
            “16.66” — none of which can be skimmed and any one of which is wrong if it is
            guessed. Twelve is what one pass of sustained attention actually covers.
          </Diff>
          <Diff title="No grouping of ours, anywhere">
            The archive’s six volumes are the site’s six pages. An earlier version offered
            reading books that were threads we had drawn across the volumes, and each had to
            announce at its head whose grouping it was — which is honest, and still a second
            organisation laid over one that already had an author.
          </Diff>
          <Diff title="The inventory is harvested by a person, once">
            The Whitney’s HTML pages sit behind a JavaScript bot-check, which this project does
            not impersonate. So the listing is taken in a browser with the snippet in{' '}
            <code className="font-mono text-[13px]">scripts/harvest.js</code> and committed to{' '}
            <code className="font-mono text-[13px]">harvest/</code> — which has the side benefit
            that the inventory this site rests on is reviewable in a diff. The images themselves
            need no such step: <code className="font-mono text-[13px]">download.php</code> is
            open, and <code className="font-mono text-[13px]">robots.txt</code>’s ten-second crawl
            delay is honoured by <code className="font-mono text-[13px]">npm run mirror</code>.
          </Diff>
          <Diff title="The copyright is live, and the watermark cannot be dropped">
            These ledgers are © Heirs of Josephine N. Hopper, licensed by Artists Rights Society,
            and the Whitney records the object rights as transferred to the Museum. A
            transcription reproduces Josephine Hopper’s text. Every file carries{' '}
            <code className="font-mono text-[13px]">\watermark&#123;&#125;</code> and the renderer{' '}
            <em>refuses to build a file without it</em>, so the declaration cannot be lost by
            accident.
          </Diff>
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Seeing the work</h2>
        <div className="mt-3 max-w-3xl space-y-3 text-[14.5px] leading-relaxed text-ink-700">
          <p>
            The one thing this site cannot show is the work itself. The right pane has the sheet,
            and on the sheet is Edward Hopper’s ink memorandum of a painting or a plate, drawn an
            inch across; what it is a memorandum <em>of</em> is not here and cannot be, because
            holding an image of a work in copyright would break the only promise the project
            makes.
          </p>
          <p>
            So a work title that a museum with a public API holds carries a{' '}
            <strong>see the work</strong> link beside it, to that museum’s own record.{' '}
            <code className="font-mono text-[13px]">npm run works</code> builds the index by
            querying the Metropolitan Museum of Art and the Art Institute of Chicago and keeping
            only objects whose artist field their catalogue gives as <em>Edward Hopper</em> — so
            no URL here was typed from memory, and re-running it drops a link that has rotted
            rather than leaving it in the site being wrong.
          </p>
          <p>
            The Whitney holds far more Hopper than either and is deliberately absent:{' '}
            <code className="font-mono text-[13px]">whitney.org</code> publishes no API, and its
            collection listing ignores every search parameter tried — the same thirty works come
            back each time. A link built on a parameter the server ignores would take a reader
            somewhere else, which is worse than no link.
          </p>
        </div>
        <div className="mt-4 max-w-3xl space-y-4 text-[14.5px] leading-relaxed text-ink-700">
          <Diff title="A link does not say the row concerns that copy">
            These are editions of a hundred, sold to a dozen institutions over forty years, and
            the ledger’s rows are the record of exactly that dispersal. The link says a work of
            this title is there and can be looked at, and nothing stronger. The same caveat is
            written into the JSON-LD, where the links travel as{' '}
            <code className="font-mono text-[13px]">sameAs</code>.
          </Diff>
          <Diff title="An identification that is a judgement is marked">
            Matching normalises three things and three only — a leading article, an ampersand,
            case — so “Cow &amp; Rocks” finds “Cow and Rocks” unaided. Everything beyond that is
            declared by hand with a <code className="font-mono text-[13px]">mapping</code> of{' '}
            <em>certain</em> or <em>likely</em>, and a <strong>*</strong> on the link says which.
            “Night in the L Train” is <em>likely</em> the plate both museums catalogue as “Night
            on the El Train”; saying so is not the same as knowing it.
          </Diff>
          <Diff title="A blank is an answer">
            On Book I leaf 4 the plate&rsquo;s title is under a pasted clipping, so the
            transcription reads <code className="font-mono text-[13px]">\work&#123;Night in
            \ill&#123;&#125;&#125;</code> and links nothing. The plate is named in the index four
            leaves earlier, and the transcription does not reach for it: nothing was read{' '}
            <em>there</em>, and a link would say otherwise. A reader who wants the identification
            can make it from the index, which is transcribed too.
          </Diff>
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The prior, stated</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          Gail Levin catalogued Hopper’s work from these books and wrote his biography from them.
          That makes the prior on any “discovery” here very strong and very specific: most of what
          a first pass finds surprising is in Levin already. The findings apparatus this project
          inherits therefore records, for every candidate, <em>what was actually searched</em> and
          how far it got — and a candidate nobody has checked against Levin says{' '}
          <code className="font-mono text-[13px]">unsearched</code>, which is the truth, rather
          than implying otherwise by silence. No entry may say who was first.
        </p>
      </section>

      <section className="py-8">
        <h2 className="font-serif text-2xl text-ink-900">The six volumes</h2>
        <p className="prose-note mt-1.5 max-w-3xl">
          The archive’s organisation is the site’s organisation. An earlier version of this
          project offered six reading “books” — three reproducing a volume and three drawn across
          volumes by us — each having to announce at its head whose grouping it was. The Hoppers
          numbered their books and the Whitney accessioned them; a second organisation laid over
          that would only ever have been ours, and every URL here would have named something the
          museum cannot be asked about.
        </p>
        <table className="mt-5 w-full max-w-3xl text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-left text-[11.5px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5">Volume</th>
              <th className="py-1.5">Accession</th>
              <th className="py-1.5">Dated</th>
              <th className="py-1.5 text-right">Sheets</th>
              <th className="py-1.5 text-right">Transcribed</th>
            </tr>
          </thead>
          <tbody>
            {LEDGERS.map((l) => (
              <tr key={l.id} className="border-b border-ink-200">
                <td className="py-2">
                  <a href={url(`/${l.id}/`)} className="text-brand-700 hover:underline">
                    {l.title}
                  </a>
                </td>
                <td className="py-2 font-mono text-[12px] text-ink-600">{l.objectNumber}</td>
                <td className="py-2 text-ink-600">{l.date}</td>
                <td className="py-2 text-right tabular">{(BY_LEDGER.get(l.id) ?? []).length}</td>
                <td className="py-2 text-right tabular">{manifest?.read?.[l.id] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Page>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div>
      <dt className="text-[12px] uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="tabular font-serif text-3xl text-ink-900">{n}</dd>
    </div>
  );
}

function Diff({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white px-4 py-3">
      <h3 className="text-[14px] font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}
