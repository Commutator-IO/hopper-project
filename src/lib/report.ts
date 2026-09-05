import { batchName, sheetPageUrl } from './batches.ts';

/**
 * Reporting a defect in a reading.
 *
 * Everything here was produced by a model on a first pass, and the home page
 * says so. That admission is worth nothing without a way to act on it: a
 * reader who spots a misread figure is, at that moment, the only person in the
 * world who knows. The cost of telling us has to be one click, or it does not
 * happen.
 *
 * It goes to the repository's issue tracker rather than to a form of our own.
 * There is no server here to receive a form — the site is static — and an
 * issue is public, so a disputed reading stays visible beside the file it
 * disputes, which is what an apparatus is for. The URL carries a prefilled
 * title and body: the ledger, the batch, the sheet and its resource ref are
 * exactly what one forgets to include, and exactly what makes a report
 * actionable.
 *
 * The resource ref matters more here than a page number does in a manuscript
 * project. Three numberings overlap in these books, and « leaf 58 » is
 * ambiguous across six volumes while ref 18297 is not.
 */
export const REPO = 'https://github.com/Commutator-IO/hopper-project';

/** Raw file host for the same repository, for downloading a skill directly. */
export const RAW = 'https://raw.githubusercontent.com/Commutator-IO/hopper-project/main';

export interface ReportContext {
  ledger: string;
  ledgerTitle: string;
  /** Absent when reporting on a whole ledger rather than one batch. */
  batch?: number;
  /** The sheet on screen, when the reader is in the reading view. */
  ref?: number;
  /** Its leaf number, where it has one. */
  leaf?: number | null;
}

export function issueUrl({ ledger, ledgerTitle, batch, ref, leaf }: ReportContext): string {
  const where = batch ? `${ledgerTitle}, ${batchName(batch)}` : ledgerTitle;
  const title = `[${where}] `;

  // A template rather than an empty box. Naming the sheet and quoting what is
  // written are what let anyone else check the claim without reproducing the
  // reader's whole session, and people supply them when asked and rarely
  // otherwise. Everything prefilled is something the page already knows.
  const body = [
    `**Ledger** ${ledgerTitle} (\`${ledger}\`)`,
    batch ? `**Batch** ${batchName(batch)}` : null,
    `**Sheet** ${ref ? `ref ${ref}` : '<which sheet?>'}${
      leaf === null ? ' (unnumbered)' : leaf ? `, leaf ${leaf}` : ''
    }`,
    '**Edition** transcription (`.en`) / record edition (`.rec`) — delete one',
    '',
    '### What the reading says',
    '',
    '### What the sheet shows',
    '',
    '### Anything else',
    '',
    '---',
    ref ? `Sheet at the Whitney: ${sheetPageUrl(ref)}` : null,
    'Reported from the reading view. These editions are first-pass machine work;',
    'corrections are the point of publishing them.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  return (
    `${REPO}/issues/new?title=${encodeURIComponent(title)}` +
    `&body=${encodeURIComponent(body)}&labels=${encodeURIComponent('reading')}`
  );
}
