import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sheetPageUrl, sheetUrl } from '../lib/batches.ts';
import type { Sheet } from '../lib/types.ts';

/**
 * The right pane: the Whitney's own photograph of the sheet, streamed from
 * their server as it is looked at.
 *
 * Nothing is stored — not in the repository, not on any disk of ours, not even
 * behind a relay. `.gitignore` refuses `*.jpg` outright, and the `<img>`
 * below points at `resourcespace.whitney.org`. That is possible because the
 * Whitney's server permits it: it answers cross-origin, echoes the `Origin` it
 * is sent, holds a valid certificate and applies no referer check. The parent
 * project this method comes from needs a deployed Node relay to show a
 * facsimile at all; here the browser may simply ask.
 *
 * The pane is an image viewer rather than a PDF frame for the same reason. A
 * ledger sheet is one photograph, 1292 × 2000 at the largest public size, and
 * what a reader does with it is not turn pages but **magnify a figure** — is
 * that 16.66 or 16.60, is that a 3 or a 5. So the interactions are zoom and
 * drag, and the sheet strip along the top does the page-turning a PDF viewer
 * would have done.
 */

export interface OpenBatch {
  ledger: string;
  ledgerTitle: string;
  batch: number;
  sheets: Sheet[];
}

/** Zoom stops, in multiples of fit-to-pane. */
const ZOOMS = [1, 1.6, 2.5, 4];

/**
 * What the pane needs of a sheet: its address, the number on the paper and the
 * Whitney's descriptor. A ledger's `Sheet` has these and a notebook's
 * `NotebookSheet` has these, and the pane asks for no more so that both can
 * be turned in it.
 */
export type FacsimileSheet = Pick<Sheet, 'ref' | 'leaf' | 'descriptor'>;

export function FacsimilePane({
  sheets,
  current,
  onSelect,
}: {
  sheets: FacsimileSheet[];
  /** The sheet the transcript says is being read, by resource ref. */
  current: number | undefined;
  onSelect: (ref: number) => void;
}) {
  const active = useMemo(
    () => sheets.find((s) => s.ref === current) ?? sheets[0],
    [sheets, current],
  );
  const [zoom, setZoom] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const strip = useRef<HTMLDivElement>(null);

  // A new sheet starts fitted and centred. Carrying the previous sheet's zoom
  // over sounds convenient and is not: the reader lands on a magnified corner
  // of a leaf they have not seen whole, with no way to tell what they are
  // looking at.
  useEffect(() => {
    setZoom(0);
    setPan({ x: 0, y: 0 });
    setLoaded(false);
  }, [active?.ref]);

  // Keep the strip's current thumbnail in view when the transcript scrolls the
  // sheet out from under it.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [active?.ref]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => Math.max(0, Math.min(ZOOMS.length - 1, z + (e.deltaY > 0 ? -1 : 1))));
  }, []);

  if (!active) return null;

  const scale = ZOOMS[zoom];
  const index = sheets.indexOf(active);

  const step = (d: number) => {
    const next = sheets[index + d];
    if (next) onSelect(next.ref);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-100">
      {/* The strip. Small enough to hold a whole batch, and the only place in
          the interface where the *book* is visible rather than one leaf. */}
      <div
        ref={strip}
        className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-ink-200 bg-white/70 px-2 py-2"
      >
        {sheets.map((s) => (
          <button
            key={s.ref}
            data-active={s.ref === active.ref}
            onClick={() => onSelect(s.ref)}
            title={s.descriptor}
            className={`relative shrink-0 overflow-hidden rounded border transition ${
              s.ref === active.ref
                ? 'border-brand-600 ring-1 ring-brand-600'
                : 'border-ink-200 hover:border-ink-400'
            }`}
          >
            <img
              src={sheetUrl(s.ref, 'col')}
              alt=""
              loading="lazy"
              className="h-16 w-auto object-contain"
            />
            <span className="absolute inset-x-0 bottom-0 bg-white/85 text-center text-[9px] leading-3 text-ink-600">
              {s.leaf ?? '—'}
            </span>
          </button>
        ))}
      </div>

      {/* The sheet. */}
      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onWheel={onWheel}
        onPointerDown={(e) => {
          if (scale === 1) return;
          drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        style={{ cursor: scale === 1 ? 'default' : drag.current ? 'grabbing' : 'grab' }}
      >
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-[12px] text-ink-400">
            fetching the sheet from the Whitney…
          </div>
        )}
        <img
          key={active.ref}
          src={sheetUrl(active.ref, 'pre')}
          alt={active.descriptor}
          onLoad={() => setLoaded(true)}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
            transformOrigin: 'center',
            transition: drag.current ? 'none' : 'transform .15s ease-out',
            opacity: loaded ? 1 : 0,
          }}
        />

        {/* Controls, bottom right, over the sheet — there is no room for a
            toolbar and the sheet is the thing. */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full border border-ink-200 bg-white/92 px-1 py-1 shadow-sm backdrop-blur">
          <IconBtn label="Previous sheet" disabled={index === 0} onClick={() => step(-1)}>
            ‹
          </IconBtn>
          <span className="px-1.5 text-[11px] tabular text-ink-500">
            {index + 1}/{sheets.length}
          </span>
          <IconBtn
            label="Next sheet"
            disabled={index === sheets.length - 1}
            onClick={() => step(1)}
          >
            ›
          </IconBtn>
          <span className="mx-1 h-4 w-px bg-ink-200" />
          <IconBtn label="Zoom out" disabled={zoom === 0} onClick={() => setZoom((z) => z - 1)}>
            −
          </IconBtn>
          <span className="px-1 text-[11px] tabular text-ink-500">×{scale}</span>
          <IconBtn
            label="Zoom in"
            disabled={zoom === ZOOMS.length - 1}
            onClick={() => setZoom((z) => z + 1)}
          >
            +
          </IconBtn>
        </div>
      </div>

      {/* The descriptor, verbatim, and the link out. The descriptor is the
          Whitney's sentence and not ours, which is why it is quoted whole
          rather than shortened to fit. */}
      <div className="shrink-0 border-t border-ink-200 bg-white/70 px-3 py-2 text-[11.5px] leading-snug text-ink-600">
        <span className="text-ink-800">{active.descriptor}</span>
        <a
          href={sheetPageUrl(active.ref)}
          target="_blank"
          rel="noreferrer"
          className="ml-2 whitespace-nowrap text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
        >
          at the Whitney ↗
        </a>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-6 w-6 place-items-center rounded-full text-[15px] leading-none text-ink-700 transition hover:bg-ink-100 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
