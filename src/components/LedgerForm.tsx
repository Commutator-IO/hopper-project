import { useEffect, useState } from 'react';
import type { LineKind, SchemaDef } from '../content/schemas.ts';

/**
 * Keep the books yourself: a form whose fields are one volume's columns.
 *
 * The argument of the schema page is that these volumes have a structure. The
 * cheapest way to test that claim is to hand somebody the structure and see
 * whether a record can be written into it, which is what this does — the fields
 * are the leaf's columns, the line kinds are the kinds of line the leaf
 * carries, and the output is the leaf.
 *
 * Two things it deliberately is not.
 *
 * It is **not a contribution path**. Nothing here is submitted, nothing is
 * uploaded, and nothing written here can ever reach a transcription. That is
 * not a limitation of a static site; it is the archive's first rule. Every
 * figure in the edition has to come off a photographed leaf, and a form that
 * let a visitor add a plausible row would be manufacturing exactly the thing
 * the whole method exists to prevent — a transaction that did not happen, at a
 * price nobody paid. What you type stays in your browser and goes nowhere.
 *
 * It is **not a validator**. Nothing normalises a date, totals a column or
 * objects to « 30 - 1/3 ». She did not have those either, and the point of the
 * exercise is largely to feel how much the notation carries and how little the
 * form does.
 */

interface Line {
  key: number;
  kind: string;
  ink: 'black' | 'red';
  cells: string[];
}

interface Saved {
  head: Record<string, string>;
  lines: Line[];
}

const store = (id: string) => `hopper.leaf.${id}`;

/**
 * A field's width, twelfths on a wide screen and roomier on a narrow one.
 *
 * Written out as whole class names rather than composed from the number:
 * Tailwind scans the source for literals, so `col-span-${n}` would generate
 * nothing at all and every field would silently fall to full width.
 */
const SPAN: Record<number, string> = {
  3: 'col-span-6 sm:col-span-3',
  4: 'col-span-6 sm:col-span-4',
  5: 'col-span-12 sm:col-span-5',
  6: 'col-span-12 sm:col-span-6',
  8: 'col-span-12 sm:col-span-8',
  9: 'col-span-12 sm:col-span-9',
  12: 'col-span-12',
};

function load(id: string): Saved | null {
  try {
    const raw = localStorage.getItem(store(id));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

/** TeX's five, and only those: the transcriptions' subset spells no others. */
const escape = (s: string) => s.replace(/([&$%#_])/g, '\\$1');

function toLatex(schema: SchemaDef, head: Record<string, string>, lines: Line[]): string {
  const f = schema.form;
  const out: string[] = [];

  const title = head.title?.trim();
  const size = head.size?.trim();
  if (title) out.push(`\\work{${escape(title)}${size ? `\\quad ${escape(size)}` : ''}}`, '');
  for (const h of f.head ?? []) {
    if (h.id === 'title' || h.id === 'size') continue;
    const v = head[h.id]?.trim();
    if (v) out.push(`\\hand{${h.hand === 'edward' ? 'edward' : 'jo'}}{${escape(v)}}`, '');
  }

  if (lines.length) {
    out.push(`\\begin{ledgertable}{${f.spec}}{${f.headerRow}}`);
    for (const l of lines) {
      out.push(`${l.cells.map((c) => escape(c.trim())).join(' & ')} \\\\`);
    }
    out.push('\\end{ledgertable}');
    if (lines.some((l) => l.ink === 'red')) {
      out.push(
        '',
        '\\note{the entries are in black and every receipt line --- date, words and',
        'figure --- is in red.}',
      );
    }
  }
  return out.join('\n');
}

export function LedgerForm({ schema }: { schema: SchemaDef }) {
  const f = schema.form;
  const [kindId, setKindId] = useState(f.kinds[0].id);
  const [head, setHead] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [copied, setCopied] = useState(false);

  // Restore whatever this browser last wrote for this volume, and nothing else:
  // the leaf is per-viewer and never leaves the machine it was typed on.
  useEffect(() => {
    const s = load(schema.id);
    setHead(s?.head ?? {});
    setLines(s?.lines ?? []);
    setKindId(f.kinds[0].id);
    setDraft({});
  }, [schema.id, f.kinds]);

  useEffect(() => {
    try {
      localStorage.setItem(store(schema.id), JSON.stringify({ head, lines }));
    } catch {
      /* a private window, or site data blocked — the leaf just does not persist */
    }
  }, [schema.id, head, lines]);

  const kind = f.kinds.find((k) => k.id === kindId) ?? f.kinds[0];

  function write(k: LineKind) {
    const cells = f.columns.map(() => '');
    for (const [col, text] of k.fixed ?? []) cells[col] = text;
    for (const fld of k.fields) {
      const v = draft[fld.id] ?? '';
      if (v.trim()) cells[fld.col] = v;
    }
    if (!cells.some((c) => c.trim())) return;
    setLines((prev) => [...prev, { key: Date.now(), kind: k.id, ink: k.ink, cells }]);
    setDraft({});
  }

  const latex = toLatex(schema, head, lines);

  return (
    <div>
      {f.head && (
        <div className="mb-5">
          <h4 className="text-[12px] uppercase tracking-wider text-ink-400">
            The head of the leaf
          </h4>
          <div className="mt-2 grid grid-cols-12 gap-2">
            {f.head.map((h) => (
              <label
                key={h.id}
                className={`col-span-12 ${h.id === 'desc' ? '' : 'sm:col-span-6'} block`}
              >
                <span className="flex items-center gap-1.5 text-[11.5px] text-ink-500">
                  {h.label}
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      h.hand === 'edward' ? 'bg-edward-500' : 'bg-jo-500'
                    }`}
                    title={h.hand === 'edward' ? 'Edward’s hand' : 'Jo’s hand'}
                  />
                </span>
                <input
                  value={head[h.id] ?? ''}
                  placeholder={h.placeholder}
                  onChange={(e) => setHead({ ...head, [h.id]: e.target.value })}
                  className="mt-0.5 w-full rounded border border-ink-200 bg-white px-2 py-1.5 text-[13px] text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none"
                />
              </label>
            ))}
          </div>
          <p className="prose-note mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-edward-500" /> Edward wrote
              this field
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-jo-500" /> Jo wrote this one
            </span>
          </p>
        </div>
      )}

      <h4 className="text-[12px] uppercase tracking-wider text-ink-400">What kind of line is it?</h4>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {f.kinds.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => {
              setKindId(k.id);
              setDraft({});
            }}
            aria-pressed={k.id === kindId}
            className={`rounded-full border px-3 py-1 text-[12.5px] transition ${
              k.id === kindId
                ? k.ink === 'red'
                  ? 'border-alerte-500 bg-alerte-50 text-alerte-700'
                  : 'border-ink-400 bg-ink-100 text-ink-900'
                : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300'
            }`}
          >
            {k.label}
            {k.ink === 'red' && <span className="ml-1.5 text-[10px] uppercase">red</span>}
          </button>
        ))}
      </div>
      {kind.hint && <p className="prose-note mt-2">{kind.hint}</p>}

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          write(kind);
        }}
      >
        <div className="grid grid-cols-12 gap-2">
          {kind.fields.map((fld) => (
            <label key={fld.id} className={`block ${SPAN[fld.span ?? 6] ?? SPAN[6]}`}>
              <span className="text-[11.5px] text-ink-500">{fld.label}</span>
              {fld.kind === 'select' ? (
                <select
                  value={draft[fld.id] ?? ''}
                  onChange={(e) => setDraft({ ...draft, [fld.id]: e.target.value })}
                  className="mt-0.5 w-full rounded border border-ink-200 bg-white px-2 py-1.5 text-[13px] text-ink-900 focus:border-brand-400 focus:outline-none"
                >
                  {(fld.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o === '' ? '—' : o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={draft[fld.id] ?? ''}
                  placeholder={fld.placeholder}
                  onChange={(e) => setDraft({ ...draft, [fld.id]: e.target.value })}
                  className={`mt-0.5 w-full rounded border border-ink-200 bg-white px-2 py-1.5 text-[13px] placeholder:text-ink-300 focus:border-brand-400 focus:outline-none ${
                    kind.ink === 'red' ? 'text-alerte-700' : 'text-ink-900'
                  }`}
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-full bg-ink-900 px-4 py-1.5 text-[13px] text-ink-50 hover:bg-ink-800"
          >
            Write the line
          </button>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => setLines([])}
              className="rounded-full border border-ink-200 px-3 py-1.5 text-[12.5px] text-ink-500 hover:border-ink-300"
            >
              Clear the leaf
            </button>
          )}
          {kind.fixed?.map(([, text]) => (
            <span key={text} className="prose-note">
              writes « {text} » itself
            </span>
          ))}
        </div>
      </form>

      <h4 className="mt-6 text-[12px] uppercase tracking-wider text-ink-400">The leaf</h4>
      <div className="mt-2 overflow-x-auto rounded-card border border-ink-200 bg-white">
        <table className="w-full min-w-[34rem] border-collapse text-[13px]">
          {f.columns.some(Boolean) && (
            <thead>
              <tr className="border-b border-ink-300 text-left text-[11px] uppercase tracking-wider text-ink-400">
                {f.columns.map((c, i) => (
                  <th key={i} className="px-2.5 py-1.5 font-normal">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={f.columns.length} className="px-2.5 py-6 text-center text-ink-400">
                  Nothing written yet.
                </td>
              </tr>
            )}
            {lines.map((l) => (
              <tr
                key={l.key}
                className="group border-b border-ink-100 last:border-0"
                style={f.rules ? { boxShadow: 'inset 3.5rem 0 0 -3.4rem var(--color-alerte-200)' } : undefined}
              >
                {l.cells.map((c, i) => (
                  <td
                    key={i}
                    className={`px-2.5 py-1 align-top ${i >= 2 && f.rules ? 'tabular text-right' : ''} ${
                      l.ink === 'red' ? 'text-alerte-600' : 'text-ink-800'
                    }`}
                  >
                    {c}
                    {i === l.cells.length - 1 && (
                      <button
                        type="button"
                        aria-label="Strike this line out"
                        onClick={() => setLines(lines.filter((x) => x.key !== l.key))}
                        className="float-right ml-2 text-ink-300 opacity-0 transition group-hover:opacity-100 hover:text-alerte-600"
                      >
                        ×
                      </button>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="prose-note mt-2">{f.note}</p>

      {lines.length > 0 && (
        <details className="mt-4 rounded-card border border-ink-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-[13.5px] text-ink-700">
            The same leaf in the edition’s own notation
          </summary>
          <p className="prose-note mt-2">
            This is what a transcription of your leaf would look like — the markup{' '}
            <code className="font-mono text-[12.5px]">npm run render</code> turns into the reading
            view. It stays in this browser: nothing here is submitted, and no figure that was not
            read off a photographed sheet may ever enter the edition.
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-ink-50 p-3 font-mono text-[11.5px] leading-relaxed text-ink-700">
            {latex}
          </pre>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(latex).then(
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                },
                () => {},
              );
            }}
            className="mt-2 rounded-full border border-ink-200 px-3 py-1 text-[12.5px] text-ink-600 hover:border-ink-300"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </details>
      )}
    </div>
  );
}
