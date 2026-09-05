import { editionUrl, servedByLedger } from '../lib/batches.ts';
import { url } from '../lib/base.ts';
import type { Edition, Manifest } from '../lib/types.ts';

/**
 * The download row.
 *
 * Four formats, and each answers a different question, which is why none of
 * them is dropped for tidiness:
 *
 * — **LaTeX** is the source of record. A correction is made there and nowhere
 *   else; the HTML, the PDF and the TEI are derived and rebuilt.
 * — **PDF** is what a reader prints and marks up beside the book.
 * — **TEI** is what an archive or a repository deposits, and it carries the
 *   provenance — which model read the sheets, on what date, from which
 *   accession — as structured statements rather than as a sentence in a
 *   README.
 * — **CSV** is what the record edition is actually *for*: a ledger is a table,
 *   and a table can be summed and joined to a catalogue raisonné. It is
 *   offered on the record edition only, because extracting records from a
 *   transcription would mean parsing prose, and a number parsed out of prose
 *   is a number nobody wrote down.
 */
const FORMATS: { ext: 'tex' | 'pdf' | 'xml' | 'csv'; label: string; title: string }[] = [
  { ext: 'tex', label: 'LaTeX', title: 'The source of record — corrections go here' },
  { ext: 'pdf', label: 'PDF', title: 'Typeset, for reading beside the book' },
  { ext: 'xml', label: 'TEI', title: 'TEI P5, for a deposit or an archive' },
  { ext: 'csv', label: 'CSV', title: 'The extracted records, one row per entry' },
];

export function Downloads({
  manifest,
  ledger,
  batch,
  edition,
}: {
  manifest: Manifest | null;
  ledger: string;
  batch: number;
  edition: Edition;
}) {
  const per = manifest?.transcripts?.[`${ledger}#${batch}`];
  const whole = manifest?.ledgers?.[ledger];

  const available = (ext: 'tex' | 'pdf' | 'xml' | 'csv') => {
    if (ext === 'csv') return edition === 'rec' && Boolean(manifest?.records?.[ledger]);
    return (
      (per?.[ext] ?? []).includes(edition) || (whole?.[ext] ?? []).includes(edition)
    );
  };

  const rows = FORMATS.filter((f) => available(f.ext));
  if (!rows.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-ink-400">Download</span>
      {rows.map((f) => (
        <a
          key={f.ext}
          title={f.title}
          href={
            f.ext === 'csv'
              ? url(`/records/${ledger}.csv`)
              : editionUrl(manifest, ledger, batch, edition, f.ext)
          }
          download
          className="rounded-full border border-ink-200 px-2.5 py-0.5 text-[11.5px] text-ink-700 transition hover:border-brand-400 hover:text-brand-700"
        >
          {f.label}
          {f.ext !== 'csv' && servedByLedger(manifest, ledger, edition, f.ext) && (
            <span className="ml-1 text-ink-400" title="One file covers the whole ledger">
              ·whole
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
