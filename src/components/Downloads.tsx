import { entryOf, notebookEntryOf, notebookTranscriptUrl, transcriptUrl } from '../lib/batches.ts';
import type { Manifest, Pass } from '../lib/types.ts';

/**
 * The download row.
 *
 * Three formats, and each answers a different question, which is why none is
 * dropped for tidiness:
 *
 * — **LaTeX** is the source of record. A correction is made there and nowhere
 *   else; the HTML, the PDF and the TEI are derived and rebuilt.
 * — **PDF** is what a reader prints and marks up beside the book.
 * — **TEI** is what an archive or a repository deposits, and it carries the
 *   provenance — which model read the sheets, on what date, from which
 *   accession — as structured statements rather than as a sentence in a
 *   README. Its `<handNote>` declarations keep Edward's writing apart from
 *   Josephine's, which is the one thing in the transcription nobody could
 *   reconstruct from the photographs.
 */
const FORMATS: { ext: 'tex' | 'pdf' | 'xml'; label: string; title: string }[] = [
  { ext: 'tex', label: 'LaTeX', title: 'The source of record — corrections go here' },
  { ext: 'pdf', label: 'PDF', title: 'Typeset, for reading beside the book' },
  { ext: 'xml', label: 'TEI', title: 'TEI P5, for a deposit or an archive' },
];

/** The models that read a file, in the order they first read it, without repeats. */
const models = (passes: Pass[]) => {
  const seen = [...new Set(passes.map((p) => p.model))];
  return seen.length > 1 ? `${seen.slice(0, -1).join(', ')} and ${seen[seen.length - 1]}` : seen[0];
};

/** The days a file was read, as one date or as the first and the last. */
const span = (passes: Pass[], day: (iso: string) => string) => {
  const days = [...new Set(passes.map((p) => p.date))].sort();
  return days.length > 1 ? `${day(days[0])} to ${day(days[days.length - 1])}` : day(days[0]);
};

export function Downloads({
  manifest,
  ledger,
  batch,
  notebook,
}: {
  manifest: Manifest | null;
  ledger: string;
  batch: number;
  /** A notebook's id, whose one file stands where a batch's would. */
  notebook?: string;
}) {
  const entry = notebook ? notebookEntryOf(manifest, notebook) : entryOf(manifest, ledger, batch);
  const rows = FORMATS.filter((f) => entry?.[f.ext]);
  if (!rows.length) return null;

  /**
   * Every pass the file's header records, which is what a reader needs to see
   * that a transcription has been read more than once.
   *
   * The manifest has carried `passes` since the notebooks arrived, and nothing
   * showed it: the citation clause takes the *first* pass, deliberately, since
   * it reads « first machine pass by … », so a file read again in a later
   * sitting looked from the outside exactly like a file read once. A ledger
   * batch has one line and reads as it always did; a notebook has one per
   * sitting of twelve sheets.
   *
   * This is not a revision history — the corrections are in git, and showing
   * those is a different job (issue #7). It is the provenance the file itself
   * states, shown where the file is downloaded.
   */
  const passes = entry?.passes?.length ? entry.passes : entry?.pass ? [entry.pass] : [];
  const day = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-ink-400">Download</span>
      {rows.map((f) => (
        <a
          key={f.ext}
          title={f.title}
          href={notebook ? notebookTranscriptUrl(notebook, f.ext) : transcriptUrl(ledger, batch, f.ext)}
          download
          className="rounded-full border border-ink-200 px-2.5 py-0.5 text-[11.5px] text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
        >
          {f.label}
        </a>
      ))}
      {passes.length > 0 && (
        <span
          className="text-[11.5px] text-ink-400"
          /* The sittings in full, one per line, where a reader who wants the
             detail will look for it. On the row itself they are summarised:
             six repetitions of « Opus 5 · 12 September 2026 » say less than
             « read in 6 sittings » does, and take six times the width. */
          title={passes.map((p) => `${p.model} (${p.id}), ${day(p.date)}`).join('\n')}
        >
          {passes.length > 1
            ? `Read in ${passes.length} sittings, ${models(passes)}, ${span(passes, day)}`
            : `Read by ${passes[0].model} · ${day(passes[0].date)}`}
        </span>
      )}
    </div>
  );
}
