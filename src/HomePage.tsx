import { Page } from './components/Frame.tsx';
import { BOOKS, TOTAL_SHEETS, ledgersOf, sheetCountOf } from './content/books.ts';
import { LEDGERS } from './content/catalogue.ts';
import { BATCH_SIZE, useManifest } from './lib/batches.ts';

export function HomePage() {
  const manifest = useManifest();
  const read = Object.values(manifest?.read ?? {}).reduce((a, b) => a + b, 0);

  return (
    <Page path="/">
      <section className="border-b border-ink-200 py-14">
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-ink-900">
          The books in which Edward Hopper drew every painting he sold, and Josephine Hopper
          wrote down what it fetched
        </h1>
        <p className="mt-5 max-w-3xl text-[16px] leading-relaxed text-ink-700">
          A reading and transcription workbench for the six artist’s ledgers at the Whitney
          Museum of American Art — {TOTAL_SHEETS} digitised sheets, 1907 to 1967. Every
          transcription sits beside the photograph it came from, so that any reading can be
          checked against the hand it was read out of, on one screen.
        </p>

        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
          <Stat n={LEDGERS.length} label="ledger books" />
          <Stat n={TOTAL_SHEETS} label="digitised sheets" />
          <Stat n={read} label="sheets transcribed" />
          <Stat n={BATCH_SIZE} label="sheets to a batch" />
        </dl>
      </section>

      <section className="border-b border-ink-200 py-10">
        <h2 className="font-serif text-2xl text-ink-900">What these books are</h2>
        <div className="mt-4 grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="space-y-3 text-[14.5px] leading-relaxed text-ink-700">
            <p>
              After Hopper finished a work he meant to sell, he drew it small at the head of a
              leaf — a precise thing of bold strokes and cross-hatching, made for the record and
              not for anyone to see. The books were ordinary ledgers from Woolworth’s.
            </p>
            <p>
              Jo Hopper wrote everything else: the date it was finished, the size, the price, the
              buyer, the exhibitions it went to and whether the jury took it, the commission, the
              date the cheque cleared. And descriptions — long, particular, often inventing an
              anecdote for a picture her husband would not discuss. Leaf 2 of Book I carries
              thirty-one lines under one etching, running from 1921 to 1927.
            </p>
          </div>
          <div className="space-y-3 text-[14.5px] leading-relaxed text-ink-700">
            <p>
              So the archive is two documents at once. It is the business record of a painter’s
              working life, complete and continuous in a way almost no artist’s is — Book IV
              alone runs without a gap from November 1913 to March 1967. And it is a record of
              Josephine Hopper’s own work, which was to decide what about a painting was worth
              writing down.
            </p>
            <p>
              This site keeps the two hands apart. The transcription marks every passage with
              whose hand wrote it, and <em>unidentified</em> is a permitted and frequent answer.
              Flattening them would destroy the archive’s chief documentary value.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-200 py-10">
        <h2 className="font-serif text-2xl text-ink-900">Six ways in</h2>
        <p className="prose-note mt-1.5 max-w-3xl">
          Three of these reproduce a volume exactly; three are threads drawn across the archive
          by us. Each page says which at its head, because citing “the Apparatus” does not commit
          you to the same thing as citing 96.208.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BOOKS.map((b) => (
            <a key={b.key} href={b.path} className="card group p-5 transition hover:border-brand-400">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg text-ink-900 group-hover:text-brand-700">
                  {b.title}
                </h3>
                <span className="shrink-0 text-[11.5px] text-ink-400">{b.period}</span>
              </div>
              <p className="prose-note mt-2">{b.subtitle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className={`rounded-full px-2 py-0.5 ${
                    b.archiveUnit
                      ? 'bg-relu-100 text-relu-700'
                      : 'bg-encours-100 text-encours-700'
                  }`}
                >
                  {b.archiveUnit ? 'the archive’s grouping' : 'our grouping'}
                </span>
                <span className="tabular text-ink-500">{sheetCountOf(b)} sheets</span>
                <span className="text-ink-400">
                  {ledgersOf(b)
                    .map((l) => l.ledger.short)
                    .join(' · ')}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="border-b border-ink-200 py-10">
        <h2 className="font-serif text-2xl text-ink-900">Nothing of the archive is stored here</h2>
        <div className="mt-4 max-w-3xl space-y-3 text-[14.5px] leading-relaxed text-ink-700">
          <p>
            Not one sheet, not in the repository and not on any disk of ours. The facsimile pane
            points an <code className="font-mono text-[13px]">&lt;img&gt;</code> straight at the
            Whitney’s own file, fetched as it is looked at, and{' '}
            <code className="font-mono text-[13px]">.gitignore</code> refuses{' '}
            <code className="font-mono text-[13px]">*.jpg</code> outright.
          </p>
          <p>
            That is simpler than it might have been, and the simplicity was measured rather than
            assumed. The Whitney’s ResourceSpace answers a cross-origin request, echoes the{' '}
            <code className="font-mono text-[13px]">Origin</code> it is sent, holds a current
            certificate and applies no referer check. Only framing is forbidden — and an image
            belongs in an <code className="font-mono text-[13px]">&lt;img&gt;</code>, which that
            restriction does not govern. The project this method comes from needs a deployed
            relay to show a facsimile at all; here a browser may simply ask.
          </p>
          <p className="text-ink-600">
            The largest size the Whitney publishes is 1292 × 2000, about 3 MB — enough to read
            Jo Hopper’s figures, which was the first thing checked before any of this was built.
            The 2239 × 3465 original needs a login, and whoever wants it asks the Whitney.
          </p>
        </div>
      </section>

      <section className="py-10">
        <h2 className="font-serif text-2xl text-ink-900">What this is not</h2>
        <div className="mt-4 max-w-3xl space-y-3 text-[14.5px] leading-relaxed text-ink-700">
          <p>
            No transcription here is an edition, and none of it has been checked sheet by sheet
            by a person. It is first-pass machine work, published because a reading that can be
            compared with its photograph is worth more than one nobody can check — and because
            the corrections are the point.
          </p>
          <p>
            Gail Levin’s catalogue raisonné and her biography of Hopper worked from these very
            books. Anything this site appears to discover is, in the first instance, probably in
            Levin already; the{' '}
            <a href="/method/" className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600">
              method page
            </a>{' '}
            says how that prior is handled rather than leaving it implied.
          </p>
        </div>
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
