import { useCallback, useEffect, useRef, useState } from 'react';
import { citeBatch, citeLeaf, citeSheet } from '../lib/cite.ts';
import { batchCount, batchOfSeq, batchState } from '../lib/batches.ts';
import { BY_LEDGER } from '../content/catalogue.ts';
import { url } from '../lib/base.ts';
import { REPO } from '../lib/report.ts';
import type { Ledger, Manifest, Sheet } from '../lib/types.ts';

/**
 * The citation control, beside the download row.
 *
 * A reader who has found something in these books needs a sentence they can
 * paste, and left to compose one themselves they will write « leaf 58 » —
 * which names six different things across six volumes, and is precisely the
 * ambiguity the whole site is built to remove. So the sentence is offered
 * ready-made, from what the page already knows.
 *
 * Three forms rather than one, because three different things get cited and
 * they are not interchangeable:
 *
 * — **the sheet**, one photograph, the only unit with a unique address;
 * — **the leaf**, the page of the book as the Hoppers numbered it, which may
 *   be two photographs — Book II's leaf 33 is sheets 25 and 26 — and is what
 *   somebody holding the volume can find;
 * — **the batch**, twelve sheets, which is what to cite when the thing being
 *   cited is *the transcription*: a reading, a note, an editorial decision.
 *
 * The leaf form is absent for an unnumbered sheet, and that is the right
 * behaviour rather than a gap. A cover, a flyleaf, a loose insertion carries
 * no number because nobody wrote one on it; there is nothing to cite it by,
 * and the sheet form is the answer.
 */
export function Cite({
  manifest,
  ledger,
  batch,
  sheet,
}: {
  manifest: Manifest | null;
  ledger: Ledger;
  batch: number;
  sheet: Sheet | undefined;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Escape closes the panel and nothing else. The reader closes on Escape too,
  // and a reader who opened a panel and pressed Escape meant the panel — so
  // this listener runs in the capture phase and stops the event there, which
  // keeps the whole reading view from vanishing under them.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const all = BY_LEDGER.get(ledger.id) ?? [];
  const entry = manifest?.transcripts?.[`${ledger.id}#${batch}`];
  const state = batchState(manifest, ledger.id, batch);
  const has = (e?: { tex: boolean; html: boolean }) => Boolean(e?.tex || e?.html);

  const rows: { key: string; label: string; text: string }[] = [];

  if (sheet) {
    rows.push({
      key: 'sheet',
      label: `Sheet · ref ${sheet.ref}`,
      text: citeSheet({ ledger, sheet, batch, state, pass: entry?.pass, transcribed: has(entry) }),
    });

    if (sheet.leaf !== null) {
      // Every photograph of this leaf, in binding order — the catalogue is
      // already in that order. The batch is taken from the *first* of them and
      // not from the batch on screen, because the `leaf-` link resolves to the
      // first too, and a citation whose named batch and whose link disagreed
      // would be worse than no citation.
      const of = all.filter((s) => s.leaf === sheet.leaf);
      const home = batchOfSeq(of[0].seq);
      const hEntry = manifest?.transcripts?.[`${ledger.id}#${home}`];
      rows.push({
        key: 'leaf',
        label: of.length > 1 ? `Leaf ${sheet.leaf} · ${of.length} sheets` : `Leaf ${sheet.leaf}`,
        text: citeLeaf({
          ledger,
          leaf: sheet.leaf,
          refs: of.map((s) => s.ref),
          batch: home,
          state: batchState(manifest, ledger.id, home),
          pass: hEntry?.pass,
          transcribed: has(hEntry),
        }),
      });
    }
  }

  // A batch outside the book gets no citation, because there is nothing to
  // cite. The hash accepts any number — `#book-v/3` in a two-batch volume —
  // and `batchRange` answers it arithmetically with « sheets 25–16 », which is
  // not a range and would be printed into somebody's footnote as though it
  // were.
  if (batch >= 1 && batch <= batchCount(all.length)) {
    rows.push({
      key: 'batch',
      label: 'Batch — the transcription itself',
      text: citeBatch({ ledger, batch, all, state, pass: entry?.pass, transcribed: has(entry) }),
    });
  }

  if (!rows.length) return null;

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="A reference to copy — the leaf and the resource ref together, so the museum can be asked about it"
        className={`rounded-full border px-2.5 py-0.5 text-[11.5px] transition ${
          open
            ? 'border-brand-400 text-brand-700'
            : 'border-ink-200 text-ink-700 hover:border-brand-400 hover:text-brand-700'
        }`}
      >
        Cite
      </button>

      {open && (
        // A popover under the button on a wide screen, and a sheet at the foot
        // of the screen on a narrow one. Anchoring it to the button on a phone
        // put half of it past the right edge: the button sits mid-header, and
        // a panel wide enough to hold a citation is wider than what remains.
        <div className="absolute right-0 top-full z-10 mt-1.5 w-[min(34rem,calc(100vw-1.5rem))] rounded-card border border-ink-200 bg-white p-3 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:max-h-[70vh] max-sm:w-auto max-sm:overflow-y-auto">
          <p className="mb-2.5 text-[11.5px] leading-relaxed text-ink-500">
            The <strong>sheet</strong> is the default — one photograph, and the only unit with a
            unique address. The <strong>leaf</strong> is what somebody holding the volume can find.
            The <strong>batch</strong> is for citing the transcription itself.
          </p>
          <div className="space-y-2.5">
            {rows.map((r) => (
              <Row key={r.key} label={r.label} text={r.text} />
            ))}
          </div>
          <p className="prose-note mt-3 border-t border-ink-200 pt-2 text-[11.5px] leading-relaxed">
            Each of these cites <em>a reading</em>, not a fact — which is why the pass that
            produced it is named in the sentence. Readings here are corrected, and a corrected
            one keeps its address; until{' '}
            <a
              href={`${REPO}/issues/7`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-700 underline decoration-brand-200 underline-offset-2"
            >
              a per-file revision history
            </a>{' '}
            exists, the pass and the access date are what pin a citation to the words that were
            actually read.{' '}
            <a
              href={url('/method/#cite')}
              className="text-brand-700 underline decoration-brand-200 underline-offset-2"
            >
              How these are formed
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, text }: { label: string; text: string }) {
  const [done, setDone] = useState(false);

  // `navigator.clipboard` is absent over plain HTTP and may be refused
  // outright, and there is nothing to apologise for when it is: the sentence
  // is on screen and selectable, so a failed copy costs a reader one drag.
  // Saying « copy failed » would be the only real loss.
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      },
      () => {},
    );
  }, [text]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10.5px] uppercase tracking-wider text-ink-400">{label}</span>
        <button
          onClick={copy}
          className="shrink-0 rounded-full border border-ink-200 px-2 py-0.5 text-[11px] text-ink-600 transition hover:border-brand-400 hover:text-brand-700"
        >
          {done ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-0.5 select-all text-[12px] leading-relaxed text-ink-700">{text}</p>
    </div>
  );
}
