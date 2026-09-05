import { Page } from './components/Frame.tsx';
import { LEDGERS, BY_LEDGER, SHEETS } from './content/catalogue.ts';
import { BOOKS, UNPLACED } from './content/books.ts';
import { BATCH_SIZE, batchCount, batchState, useManifest } from './lib/batches.ts';
import { STATES, tally, type State } from './lib/progress.ts';
import { STATE_COLOURS } from './components/Reader.tsx';

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

  const batches = LEDGERS.flatMap((l) => {
    const all = BY_LEDGER.get(l.id) ?? [];
    return Array.from({ length: batchCount(all.length) }, (_, i) => ({
      state: batchState(manifest, l.id, i + 1) as State,
      sheets: Math.min(BATCH_SIZE, all.length - i * BATCH_SIZE),
    }));
  });
  const t = tally(batches);
  const read = Object.values(manifest?.read ?? {}).reduce((a, b) => a + b, 0);
  const records = Object.values(manifest?.records ?? {}).reduce((a, b) => a + b, 0);

  return (
    <Page path="/method/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Method &amp; progress</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          Adapted, nearly whole, from the workbench built for the Grothendieck fonds at
          Montpellier. What changed, changed because these are different objects — and the
          differences are set out below rather than smoothed over.
        </p>
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Where it stands</h2>
        <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
          <Stat n={SHEETS.length} label="sheets in the archive" />
          <Stat n={read} label="sheets transcribed" />
          <Stat n={t.sheetsChecked} label="sheets checked by a person" />
          <Stat n={records} label="records extracted" />
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
              ['\\hand{edward|jo|later|unidentified}{…}', 'whose hand wrote it. No counterpart in the Grothendieck preamble, and the most important macro in this one'],
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

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">What differs from the parent project</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-[14.5px] leading-relaxed text-ink-700">
          <Diff title="No relay, and the reason is measured">
            Montpellier sends <code className="font-mono text-[13px]">X-Frame-Options</code>, no
            CORS headers, and a certificate that expired in December 2025, so a browser cannot
            fetch its scans at all and a deployed Node process has to do it instead. The Whitney’s
            server answers cross-origin, echoes the <code className="font-mono text-[13px]">Origin</code>{' '}
            it is sent, holds a current certificate and applies no referer check. Only framing is
            forbidden, and an image belongs in an <code className="font-mono text-[13px]">&lt;img&gt;</code>.
            Building a relay here would be adding a hop between a reader and a museum for no
            reason.
          </Diff>
          <Diff title="Twelve sheets to a batch, not twenty pages">
            A page of Grothendieck is prose and formulae read once through. A ledger leaf is a
            ruled table forty lines deep, and every line carries a date, a place, a price and a
            fraction — the commissions run “25 – 1/3” and the figures “16.66” — none of which can
            be skimmed and any one of which is wrong if it is guessed.
          </Diff>
          <Diff title="The second edition is records, not a modernisation">
            Grothendieck’s manuscripts get a modernised mathematical reading. A ledger is already
            a table, and what it wants is to become one: the record edition restates each entry as
            a structured record — work, medium, size, date, price, buyer, dealer — which{' '}
            <code className="font-mono text-[13px]">npm run records</code> extracts to CSV and
            JSON-LD. Every field is empty when the leaf does not carry it, and no field is ever
            completed from knowledge of Hopper.
          </Diff>
          <Diff title="The inventory is harvested by a person, once">
            Montpellier’s inventory can be read by a script. The Whitney’s HTML pages sit behind a
            JavaScript bot-check, which this project does not impersonate. So the listing is taken
            in a browser with the snippet in{' '}
            <code className="font-mono text-[13px]">scripts/harvest.js</code> and committed to{' '}
            <code className="font-mono text-[13px]">harvest/</code> — which has the side benefit
            that the inventory this site rests on is reviewable in a diff. The images themselves
            need no such step: <code className="font-mono text-[13px]">download.php</code> is
            open, and <code className="font-mono text-[13px]">robots.txt</code>’s ten-second crawl
            delay is honoured by <code className="font-mono text-[13px]">npm run mirror</code>.
          </Diff>
          <Diff title="One language, and it is English">
            Grothendieck wrote French, and that project keeps two French editions in step. The
            Hoppers wrote English. There is no translation to maintain, which is one artifact
            fewer.
          </Diff>
          <Diff title="A copyright that is live, not historical">
            The fonds at Montpellier is under copyright too, but these ledgers are © Heirs of
            Josephine N. Hopper, licensed by Artists Rights Society, and the Whitney records the
            object rights as transferred to the Museum. A transcription reproduces Josephine
            Hopper’s text. Every file carries{' '}
            <code className="font-mono text-[13px]">\watermark&#123;&#125;</code> and the renderer{' '}
            <em>refuses to build a file without it</em>, so the declaration cannot be dropped by
            accident.
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
        <h2 className="font-serif text-2xl text-ink-900">The books, and what they leave out</h2>
        <p className="prose-note mt-1.5 max-w-3xl">
          Overlap between books is expected — Book III’s front lists belong to two threads, and
          deleting them from one would be a claim that they do not. A sheet belonging to{' '}
          <em>no</em> book is the failure worth counting, so it is counted.
        </p>
        <table className="mt-5 w-full max-w-3xl text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-left text-[11.5px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5">Book</th>
              <th className="py-1.5">Grouping</th>
              <th className="py-1.5 text-right">Sheets</th>
            </tr>
          </thead>
          <tbody>
            {BOOKS.map((b) => (
              <tr key={b.key} className="border-b border-ink-200">
                <td className="py-2">
                  <a href={b.path} className="text-brand-700 hover:underline">
                    {b.title}
                  </a>
                </td>
                <td className="py-2 text-ink-600">
                  {b.archiveUnit ? `the archive’s (${b.archiveUnit})` : 'ours'}
                </td>
                <td className="py-2 text-right tabular">
                  {b.sections.reduce((s, x) => s + x.sheets.length, 0)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2 text-ink-500">Sheets in no book</td>
              <td />
              <td className="py-2 text-right tabular text-ink-500">{UNPLACED.length}</td>
            </tr>
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
