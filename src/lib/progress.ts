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
 * — **Declared.** Whether a person has sat with the photograph and gone sheet
 *   by sheet; whether a batch was judged to hold nothing to transcribe — no
 *   file can show either. Those two live in `transcripts/status.json`, where a
 *   change is a diff somebody can review.
 *
 * There was a third, `running`, for a pass in flight. It is gone. It was a
 * claim about a process rather than about an artifact: nothing set it false
 * again when somebody stopped halfway, so its only reachable states were true
 * and stale. What it was for — two people transcribing one batch at once — a
 * branch says better, and a branch expires by itself.
 *
 * A progress table one believes to be automatic and which is not misleads more
 * than it informs; so does one that ignores what it can plainly see; and so
 * does one that lets a machine pass wear a person's name.
 */

export type State = 'todo' | 'drafted' | 'checked' | 'skipped';

/** What may be written in `transcripts/status.json` — the rest is observed. */
export type DeclaredState = 'checked' | 'skipped';

export const STATES: { key: State; label: string; help: string }[] = [
  { key: 'todo', label: 'To do', help: 'Nothing exists for this batch yet.' },
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
  drafted: 1,
  checked: 2,
  // Skipped is a decision, not a stage: nothing overrides it, and it overrides
  // nothing.
  skipped: 2,
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
