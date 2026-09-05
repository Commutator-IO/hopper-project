/**
 * The state of a batch: what exists, and what somebody has claimed.
 *
 * Every state is settled in the repository and none of it in the reader's
 * browser. A mark kept in local storage tells the person who made it something
 * nobody else can see, and tells them nothing at all from a second machine.
 * What a batch's state *is* belongs with the batch.
 *
 * Two sources, and the difference between them is the whole design:
 *
 * — **Observed.** Whether a transcription exists is a fact about a file.
 *   `npm run manifest` reads it, so `drafted` is never written down anywhere
 *   and cannot go stale.
 * — **Declared.** Whether a pass is in flight; whether a person has sat with
 *   the photograph and gone sheet by sheet; whether a batch was judged to hold
 *   nothing to transcribe — no file can show any of that. Those three live in
 *   `transcripts/status.json`, where a change is a diff somebody can review.
 *
 * A progress table one believes to be automatic and which is not misleads more
 * than it informs; so does one that ignores what it can plainly see; and so
 * does one that lets a machine pass wear a person's name.
 */

export type State = 'todo' | 'running' | 'drafted' | 'checked' | 'skipped';

/** What may be written in `transcripts/status.json` — the rest is observed. */
export type DeclaredState = 'running' | 'checked' | 'skipped';

export const STATES: { key: State; label: string; help: string }[] = [
  { key: 'todo', label: 'To do', help: 'Nothing exists for this batch yet.' },
  {
    key: 'running',
    label: 'Running',
    help: 'A pass is in flight. Declared in transcripts/status.json.',
  },
  {
    key: 'drafted',
    label: 'Drafted',
    help: 'The transcription exists — read from the files, not declared.',
  },
  {
    key: 'checked',
    label: 'Checked',
    help: 'A person compared it with the photograph, sheet by sheet. Declared, not observed.',
  },
  {
    key: 'skipped',
    label: 'Skipped',
    help: 'Blank leaves, covers, a sheet with nothing written on it. Declared.',
  },
];

export const progressKey = (ledger: string, batch: number) => `${ledger}#${batch}`;

/** How far along a state is, so evidence and claim can be compared. */
const RANK: Record<State, number> = {
  todo: 0,
  running: 1,
  drafted: 2,
  checked: 3,
  // Skipped is a decision, not a stage: nothing overrides it, and it overrides
  // nothing.
  skipped: 3,
};

export interface Evidence {
  transcribed: boolean;
}

/**
 * The state to show: whichever of the declaration and the evidence is further on.
 *
 * Evidence only ever moves a batch forward. A batch marked `checked` has been
 * through a comparison the manifest cannot contradict, and one marked
 * `skipped` records a decision the presence of a file does not undo.
 */
export function shownState(declared: DeclaredState | undefined, evidence: Evidence): State {
  const observed: State = evidence.transcribed ? 'drafted' : 'todo';
  if (!declared) return observed;
  return RANK[declared] >= RANK[observed] ? declared : observed;
}

export interface Tally {
  total: number;
  byState: Record<State, number>;
  sheetsChecked: number;
  sheetsTotal: number;
}

export function tally(batches: { state: State; sheets: number }[]): Tally {
  const byState: Record<State, number> = {
    todo: 0,
    running: 0,
    drafted: 0,
    checked: 0,
    skipped: 0,
  };
  let sheetsChecked = 0;
  let sheetsTotal = 0;
  for (const b of batches) {
    byState[b.state] += 1;
    sheetsTotal += b.sheets;
    if (b.state === 'checked') sheetsChecked += b.sheets;
  }
  return { total: batches.length, byState, sheetsChecked, sheetsTotal };
}
