/**
 * What git knows about a transcription, for the site and for the TEI export.
 *
 * ## Why this is not in the file's header
 *
 * Every `.tex` opens with its `% Pass:` lines, and those are the *reading* —
 * which model read the sheets, on what day. They are written once and do not
 * change when somebody corrects a figure, which is the point: a citation of
 * this edition cites a first machine pass, and that clause has to stay true.
 *
 * The corrections are a different fact and only git holds it. The project asks
 * for them — « the most valuable thing anybody can do is find where it is
 * wrong » — and until now a reader had no way to see that a correction had
 * happened, when, or why (issue #7).
 *
 * ## What counts as a revision
 *
 * Every commit that touched the file, with its subject line as written. Not a
 * filtered list of « real » corrections: deciding which commit corrected a
 * reading and which fixed a keyword would be a judgement made once per commit,
 * by hand, and a judgement nobody records is a judgement nobody can check. The
 * subjects are written for the repository and say what they did.
 *
 * `--follow`, so a file that was renamed keeps the history it had before.
 *
 * ## When git cannot answer
 *
 * A shallow clone knows one commit and would report every file as changed once,
 * on the day of the last commit, which is worse than saying nothing. So a
 * shallow repository, a missing `.git`, or a git that errors, all yield an
 * empty history, and the consumers show nothing rather than something false.
 * The deploy workflow checks out the full history for this reason.
 */
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
};

/** Whether git can answer at all here — a full clone with a history to read. */
const usable = (() => {
  const inside = git(['rev-parse', '--is-inside-work-tree']);
  if (inside?.trim() !== 'true') return false;
  return git(['rev-parse', '--is-shallow-repository'])?.trim() === 'false';
})();

const UNIT = '';

/**
 * Every commit that touched `path`, newest first.
 *
 * Each is `{ sha, short, date, subject }`, the date being the author date as
 * `YYYY-MM-DD` — the day the change was made, not the day it was pushed.
 */
export function fileHistory(path) {
  if (!usable) return [];
  const out = git(['log', '--follow', `--format=%H${UNIT}%aI${UNIT}%s`, '--', path]);
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, iso, ...rest] = line.split(UNIT);
      return { sha, short: sha.slice(0, 7), date: iso.slice(0, 10), subject: rest.join(UNIT) };
    });
}

/** Whether this run can see history at all, so a consumer can say so rather than imply it. */
export const historyAvailable = usable;
