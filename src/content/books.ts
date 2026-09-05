import raw from './books.json';
import { BY_REF, LEDGERS, LEDGER_BY_ID, SHEETS } from './catalogue.ts';
import type { Book, BookKey, Ledger, Sheet } from '../lib/types.ts';

/**
 * The six books, read back from the JSON that `scripts/books.mjs` writes.
 *
 * Typing is applied here rather than in the JSON because this is the one place
 * a sheet cited by a book but absent from the archive would show, and it is
 * better that it show on start-up than when a pane opens empty.
 */
export const BOOKS: Book[] = raw as Book[];

export const BY_KEY = new Map(BOOKS.map((b) => [b.key, b]));

export function book(key: BookKey): Book {
  const b = BY_KEY.get(key);
  if (!b) throw new Error(`Unknown book: ${key}`);
  return b;
}

/** A book's sheets, in section order, resolved against the archive. */
export function sheetsOf(b: Book): Sheet[] {
  return b.sections.flatMap((s) =>
    s.sheets.map((ref) => {
      const sheet = BY_REF.get(ref);
      if (!sheet) {
        throw new Error(`Sheet ${ref} cited by “${b.title}” but absent from the archive.`);
      }
      return sheet;
    }),
  );
}

export const sheetCountOf = (b: Book) => b.sections.reduce((s, x) => s + x.sheets.length, 0);

/**
 * The ledgers a book draws on, in order of how much of it they supply.
 *
 * A book with one ledger reproduces an archive unit; a book with three has a
 * grouping of ours, and the page says so. This is derived rather than declared
 * so the two can never disagree.
 */
export function ledgersOf(b: Book): { ledger: Ledger; sheets: number }[] {
  const count = new Map<string, number>();
  for (const s of sheetsOf(b)) count.set(s.ledger, (count.get(s.ledger) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, x) => x[1] - a[1])
    .map(([id, sheets]) => {
      const ledger = LEDGER_BY_ID.get(id);
      if (!ledger) throw new Error(`Unknown ledger ${id}`);
      return { ledger, sheets };
    });
}

/**
 * Books that are being worked through now.
 *
 * Not a claim that any sheet of them is transcribed — that is read off the
 * files. The weaker fact that they are spoken for, so the whole-archive figure
 * does not colour them like the sheets nobody has opened.
 */
export const IN_PROGRESS: ReadonlySet<string> = new Set(
  BOOKS.filter((b) => b.inProgress).flatMap((b) => b.sections.flatMap((s) => s.sheets.map(String))),
);

/**
 * Sheets no book lists.
 *
 * There should be none, and the method page prints the number so that a book
 * quietly dropping half a volume shows up as an integer rather than as nothing
 * at all. Overlap is the opposite case and is expected: a leaf can belong to
 * more than one thread, and Book III's front lists belong to two.
 */
export const UNPLACED: Sheet[] = (() => {
  const placed = new Set(BOOKS.flatMap((b) => b.sections.flatMap((s) => s.sheets)));
  return SHEETS.filter((s) => !placed.has(s.ref));
})();

/** The whole archive, for the tab that gives it as it stands. */
export const TOTAL_SHEETS = SHEETS.length;

export const TOTAL_LEDGERS = LEDGERS.length;
