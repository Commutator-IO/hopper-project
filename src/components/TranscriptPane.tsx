import { useEffect, useMemo, useRef } from 'react';
import { editionUrl } from '../lib/batches.ts';
import type { Edition, Manifest } from '../lib/types.ts';

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
  edition,
  /** Called with a resource ref as the reader scrolls. */
  onSheet,
  /** The sheet the pane should scroll to, when the reader picks one. */
  goto,
}: {
  manifest: Manifest | null;
  ledger: string;
  batch: number;
  edition: Edition;
  onSheet: (ref: number) => void;
  goto: number | undefined;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const src = useMemo(
    () => editionUrl(manifest, ledger, batch, edition, 'html'),
    [manifest, ledger, batch, edition],
  );

  const has = useMemo(() => {
    const per = manifest?.transcripts?.[`${ledger}#${batch}`];
    const whole = manifest?.ledgers?.[ledger];
    return (per?.html ?? []).includes(edition) || (whole?.html ?? []).includes(edition);
  }, [manifest, ledger, batch, edition]);

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

  useEffect(() => {
    if (!goto) return;
    frame.current?.contentWindow?.postMessage({ hopperGoto: goto }, location.origin);
  }, [goto]);

  if (!has) {
    return (
      <div className="grid h-full place-items-center bg-white p-8 text-center">
        <div className="max-w-sm">
          <p className="text-[14px] text-ink-700">
            No {edition === 'en' ? 'transcription' : 'record edition'} for this batch yet.
          </p>
          <p className="prose-note mt-2">
            {edition === 'rec'
              ? 'The record edition is made from the transcription, never from the photograph — so it cannot exist before one does.'
              : 'The sheets are on the right, at the resolution the Whitney publishes. Transcribing a batch is one pass of the /transcribe-hopper skill.'}
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
      title="Transcript"
      className="h-full w-full border-0 bg-white"
    />
  );
}
