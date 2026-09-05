import { entryOf, transcriptUrl } from '../lib/batches.ts';
import type { Manifest } from '../lib/types.ts';

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

export function Downloads({
  manifest,
  ledger,
  batch,
}: {
  manifest: Manifest | null;
  ledger: string;
  batch: number;
}) {
  const entry = entryOf(manifest, ledger, batch);
  const rows = FORMATS.filter((f) => entry?.[f.ext]);
  if (!rows.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-ink-400">Download</span>
      {rows.map((f) => (
        <a
          key={f.ext}
          title={f.title}
          href={transcriptUrl(ledger, batch, f.ext)}
          download
          className="rounded-full border border-ink-200 px-2.5 py-0.5 text-[11.5px] text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
        >
          {f.label}
        </a>
      ))}
    </div>
  );
}
