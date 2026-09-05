import { Page } from './components/Frame.tsx';
import { REPO } from './lib/report.ts';

/**
 * How to help, in the order the help is actually worth.
 *
 * A correction to one figure outranks a new batch, and the page says so
 * plainly: a transcription nobody checks accumulates errors at a constant rate
 * and the archive gets no more readable.
 */
export function ContributePage() {
  return (
    <Page path="/contribute/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Contribute</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          Everything published here is a first machine pass over a hand of the 1920s. The most
          valuable thing anyone can do is find where it is wrong.
        </p>
      </header>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Report a reading</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          Every reading view carries a <strong>Report a reading</strong> button that opens a
          prefilled issue with the ledger, the batch, the sheet and its resource ref already
          filled in. Those are exactly what one forgets to include and exactly what makes a report
          actionable — three numberings overlap in these books, and “leaf 58” is ambiguous across
          six volumes while ref 18297 is not.
        </p>
        <p className="prose-note mt-3 max-w-3xl">
          A misread price, a buyer’s name got wrong, a date in the wrong year: these are the
          reports worth most, because they are the ones that would otherwise be cited.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">Transcribe a batch</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] leading-relaxed text-ink-700">
          One edition, and two skills, installed under{' '}
          <code className="font-mono text-[13px]">.claude/skills/</code>:
        </p>
        <table className="mt-4 w-full max-w-3xl text-[13.5px]">
          <tbody>
            {[
              [
                '/transcribe-hopper',
                'the transcription — the sheets as written, with the apparatus and the two hands kept apart',
              ],
              [
                '/tag-hopper',
                'the ledger’s tags — the \\keywords{} line closing a transcription, which is their only source',
              ],
            ].map(([cmd, what]) => (
              <tr key={cmd} className="border-b border-ink-200 align-top">
                <td className="w-56 py-2 pr-4 font-mono text-[12.5px] text-brand-700">{cmd}</td>
                <td className="py-2 text-ink-600">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <pre className="mt-5 max-w-3xl overflow-x-auto rounded-card border border-ink-200 bg-white p-4 text-[12.5px] leading-relaxed text-ink-700">
{`git clone ${REPO.replace('https://github.com/', 'git@github.com:')}.git
npm install
npm run mirror -- book-i --batches 1   # the sheets, for reading; git-ignored
npm run dev                            # the site

# after a pass
npm run render      # transcripts/*.tex -> the reading views; fails loudly
npm run manifest    # tell the site which files now exist`}
        </pre>

        <p className="prose-note mt-4 max-w-3xl">
          <code className="font-mono text-[12.5px]">npm run render</code> is strict on purpose. It
          refuses a resource ref that is not in the archive, a ref belonging to another volume, a
          leaf number that disagrees with the Whitney’s own descriptor, sheets transcribed out of
          order, a macro outside the permitted subset, and a file with no{' '}
          <code className="font-mono text-[12.5px]">\watermark&#123;&#125;</code>. Each of those
          failures is invisible in the output if it is allowed through.
        </p>
      </section>

      <section className="py-8">
        <h2 className="font-serif text-2xl text-ink-900">What not to do</h2>
        <ul className="mt-3 max-w-3xl space-y-2 text-[14.5px] leading-relaxed text-ink-700">
          <li>
            <strong>Fill a gap.</strong> An illegible figure stays{' '}
            <code className="font-mono text-[13px]">\ill&#123;&#125;</code>. Always. A guessed
            number is a transaction that did not happen.
          </li>
          <li>
            <strong>Normalise anything.</strong> “Fall 1923” stays “Fall 1923”; “Les Deux Pigeon”
            and “Les Poillus” stay misspelled, because the misspelling is Hopper’s and is how the
            entry is found. Prices are never converted and never adjusted for inflation.
          </li>
          <li>
            <strong>Complete a record from knowledge of Hopper.</strong> Six months on, a field
            that came from a scholar’s memory is indistinguishable from one that was read.
          </li>
          <li>
            <strong>Describe a sketch.</strong> It is one pane away at the resolution the Whitney
            publishes, and prose about it competes with looking at it. Transcribe what is written
            on it and nothing else.
          </li>
          <li>
            <strong>Catalogue the paper.</strong> Stains, orientation, which leaf came loose — the
            Whitney has recorded all of it, and its descriptors are shown verbatim beside every
            sheet.
          </li>
          <li>
            <strong>Extend the LaTeX subset without extending{' '}
            <code className="font-mono text-[13px]">scripts/render.mjs</code></strong> in the same
            commit.
          </li>
        </ul>
      </section>
    </Page>
  );
}
