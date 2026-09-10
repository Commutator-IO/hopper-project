import { useCallback, useEffect, useMemo, useRef } from 'react';
import { entryOf, notebookEntryOf, notebookTranscriptUrl, transcriptUrl } from '../lib/batches.ts';
import type { Manifest } from '../lib/types.ts';

/**
 * The left pane: the transcript, in a frame of its own, reporting the sheet
 * being read.
 *
 * ## Why a frame
 *
 * The reading view carries a complete stylesheet — `scripts/render.mjs` writes
 * it — that claims `body` and a dozen generic element selectors, so that the
 * transcript reads as a document and not as a panel of an application.
 * Dropped into this Tailwind page it would fight everything; scoped by hand it
 * would no longer be the same stylesheet, and the PDF and the screen would
 * stop coming from one source. A same-origin frame keeps it verbatim and still
 * lets the parent watch it scroll.
 *
 * ## The two directions
 *
 * Scrolling the transcript turns the photograph: the frame posts
 * `{ hopperSheet }` as the reader moves, and this hands it up. Clicking a
 * thumbnail scrolls the transcript: this posts `{ hopperGoto }` down. Both are
 * `postMessage` because the frame is a document, not a component — and both
 * are guarded, because a page that acts on any message from any frame is a
 * page anyone can drive.
 */
export function TranscriptPane({
  manifest,
  ledger,
  batch,
  notebook,
  /** Called with a resource ref as the reader scrolls. */
  onSheet,
  /** The sheet the pane should scroll to, when the reader picks one. */
  goto,
}: {
  manifest: Manifest | null;
  /** A batch of a ledger — or, with `notebook` set, ignored. */
  ledger: string;
  batch: number;
  /** A notebook's id: one file for the whole notebook, no batch. */
  notebook?: string;
  onSheet: (ref: number) => void;
  goto: number | undefined;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const src = useMemo(
    () => (notebook ? notebookTranscriptUrl(notebook, 'html') : transcriptUrl(ledger, batch, 'html')),
    [ledger, batch, notebook],
  );
  const has = Boolean(
    notebook ? notebookEntryOf(manifest, notebook)?.html : entryOf(manifest, ledger, batch)?.html,
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Same-origin only, and only our own shape. The frame is a file this
      // build wrote; anything else posting at this window is not it.
      if (e.origin !== location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      const ref = (e.data as { hopperSheet?: number } | null)?.hopperSheet;
      if (typeof ref === 'number') onSheet(ref);
    };
    addEventListener('message', onMessage);
    return () => removeEventListener('message', onMessage);
  }, [onSheet]);

  // Posting on `goto` alone is not enough, and the gap only shows when moving
  // between batches without a page load: the frame's src changes, the message
  // is posted at a document that is still unloading, and nothing scrolls. The
  // ref is kept so the load handler below can post it again once the new
  // document is actually there.
  const wanted = useRef<number | undefined>(undefined);
  useEffect(() => {
    wanted.current = goto;
    if (!goto) return;
    frame.current?.contentWindow?.postMessage({ hopperGoto: goto }, location.origin);
  }, [goto]);

  const onLoad = useCallback(() => {
    if (wanted.current === undefined) return;
    frame.current?.contentWindow?.postMessage({ hopperGoto: wanted.current }, location.origin);
  }, []);

  if (!has) {
    // The exact command, not the name of the skill. The ledger id is the same
    // string the site uses in its own URLs, and it is the form that works for
    // all six volumes — Dealers/Etchings has no number. A notebook takes its
    // id and a sitting, and the first sitting is always the one to ask for.
    const command = notebook
      ? `/transcribe-hopper ${notebook} 1`
      : `/transcribe-hopper ${ledger} ${batch}`;
    return (
      <div className="grid h-full place-items-center bg-white p-8 text-center">
        <div className="max-w-md">
          <p className="text-[14px] text-ink-700">
            No transcription for this {notebook ? 'notebook' : 'batch'} yet.
          </p>
          <p className="prose-note mt-2">
            The sheets are on the right, at the resolution the Whitney publishes. Transcribing{' '}
            {notebook ? 'its first sitting' : 'this batch'} is one pass of the transcribe-hopper
            skill, with these arguments:
          </p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(command)}
            title="Copy this command"
            className="mt-3 w-full rounded-card border border-ink-200 bg-ink-50 px-3 py-2 font-mono text-[13px] text-ink-800 transition hover:border-brand-400 hover:text-brand-700"
          >
            {command}
          </button>
          <p className="prose-note mt-2">
            Twelve sheets, one pass, one conversation. Past twelve the quality of reading degrades
            towards the end with nothing to signal it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={frame}
      key={src}
      src={src}
      onLoad={onLoad}
      title="Transcript"
      className="h-full w-full border-0 bg-white"
    />
  );
}
