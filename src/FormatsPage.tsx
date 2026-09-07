import { useMemo } from 'react';
import { Page } from './components/Frame.tsx';
import formatsData from './content/formats.json';
import { LEDGERS } from './content/catalogue.ts';

/**
 * The shapes the works were made in.
 *
 * ## Why this page is not on the accounts page
 *
 * Everything else measured in this repository is Jo Hopper's: she wrote the
 * prices, the buyers, the dates and the columns. The size is **Edward
 * Hopper's**, in his own drawn lettering beside his own record drawing, and
 * the inside cover of Book I says so in her hand. It is also the only figure
 * in the archive that measures a thing rather than reporting an event, so it
 * is the only one that cannot be wrong about the world — only misread.
 *
 * ## What the page is for
 *
 * One question: how far did he work to a repeated set of sizes? The answer is
 * on the first chart and it is not subtle. Two hundred and thirty work
 * headings have been read; the ones that state a size state 66 different ones,
 * and 162 of the 165 are wider than they are tall. There is no square canvas
 * anywhere in what has been transcribed.
 *
 * Nothing here is rounded. See `scripts/formats.mjs` for why that is the whole
 * design rather than a scruple.
 */

interface Size {
  label: string;
  height: number;
  width: number;
  count: number;
  approx: boolean;
  orientation: string;
  ratio: number;
  ledgers: string[];
  works: string[];
}

const F = formatsData as unknown as {
  basis: string;
  note: string;
  normalisation: string;
  headings: number;
  counted: number;
  formats: number;
  repeated: number;
  onceOnly: number;
  byOrientation: { orientation: string; formats: number; works: number }[];
  sizes: Size[];
  byLedger: Record<string, { label: string; count: number }[]>;
  unsized: { count: number; note: string; sample: { ledger: string; leaf: string | null; heading: string }[] };
};

const named = (id: string) => LEDGERS.find((l) => l.id === id)?.short ?? id;

export function FormatsPage() {
  const biggest = useMemo(() => Math.max(...F.sizes.map((s) => Math.max(s.height, s.width))), []);
  const top = useMemo(() => F.sizes.slice(0, 8), []);
  const landscape = F.byOrientation.find((o) => o.orientation === 'landscape')!;
  const portrait = F.byOrientation.find((o) => o.orientation === 'portrait')!;
  // Named rather than counted. Three exceptions in a hundred and sixty-five are
  // worth pointing at, and one of them — the ± on the Paris watercolours — is
  // an approximation she wrote herself rather than a measured sheet.
  const portraitNames = useMemo(
    () =>
      F.sizes
        .filter((s) => s.orientation === 'portrait')
        .map((s) => `${s.works[0] ?? 'an unread title'} at ${s.label}`)
        .join(', '),
    [],
  );

  // The scale drawings share one scale, which is the point of them: 8 × 10 has
  // to look like a postcard beside 35 × 60 or the picture is a lie about the
  // objects. 62 inches of paper across 640 units of drawing.
  const unit = 640 / (biggest + 4);

  return (
    <Page path="/formats/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Formats</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          The sizes the works were made at, as they are written at the head of each leaf. This is
          the one measurement in the archive that is <em>Edward</em> Hopper’s: the inside cover of
          Book I records that the drawings in the books are his, and the title and the dimensions
          are lettered beside them in his hand. Everything else on this site — the prices, the
          buyers, the dates, the ruled columns — is Josephine Hopper’s.
        </p>
        <p className="prose-note mt-2 max-w-3xl">
          It is also the only quantity here that measures an object rather than reporting an
          event. A price can be misremembered and a buyer written two ways; « 28 × 40 » is a
          canvas that was standing in the room.
        </p>
      </header>

      <section className="grid gap-4 border-b border-ink-200 py-6 sm:grid-cols-4">
        {[
          { k: 'Works with a size', v: String(F.counted) },
          { k: 'Distinct formats', v: String(F.formats) },
          { k: 'Used more than once', v: String(F.repeated) },
          { k: 'Wider than tall', v: `${landscape.works} of ${F.counted}` },
        ].map((c) => (
          <div key={c.k}>
            <div className="text-[11px] uppercase tracking-wider text-ink-400">{c.k}</div>
            <div className="font-serif text-2xl tabular text-ink-900">{c.v}</div>
          </div>
        ))}
      </section>

      <section className="py-8">
        <h2 className="font-serif text-xl text-ink-900">Every format, plotted</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          Width across, height up, one dot to a format and its area standing for how many works
          were made at it. The diagonal is where a picture would be square, and{' '}
          <strong>almost nothing rises to it</strong>: {landscape.works} of the {F.counted} works
          read so far are wider than they are tall. Three are not — they are the only dots above
          the line, and they are {portraitNames} — and not one work in the archive is square. The
          clusters below are the trades: etching plates down in the corner, watercolours through
          the middle, the late oils out at the top right.
        </p>

        <div className="mt-5 overflow-x-auto">
          <svg
            viewBox="0 0 700 480"
            className="h-auto w-full min-w-[520px]"
            role="img"
            aria-label={`Scatter of ${F.formats} formats, width against height. All but ${portrait.works} fall below the square diagonal.`}
          >
            {/* Grid every ten inches, in both directions. */}
            {[0, 10, 20, 30, 40, 50, 60].map((v) => (
              <g key={v}>
                <line
                  x1={60 + (v / 65) * 600}
                  y1={20}
                  x2={60 + (v / 65) * 600}
                  y2={420}
                  stroke="var(--color-ink-200)"
                  strokeWidth={1}
                />
                <line
                  x1={60}
                  y1={420 - (v / 65) * 400}
                  x2={660}
                  y2={420 - (v / 65) * 400}
                  stroke="var(--color-ink-200)"
                  strokeWidth={1}
                />
                <text
                  x={60 + (v / 65) * 600}
                  y={440}
                  textAnchor="middle"
                  fontSize={11}
                  fill="var(--color-ink-400)"
                >
                  {v}
                </text>
                <text
                  x={50}
                  y={424 - (v / 65) * 400}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--color-ink-400)"
                >
                  {v}
                </text>
              </g>
            ))}

            {/* Square. Nothing in the archive reaches it. */}
            <line
              x1={60}
              y1={420}
              x2={660}
              y2={20}
              stroke="var(--color-ink-400)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={355}
              y={195}
              fontSize={11.5}
              fill="var(--color-ink-500)"
              transform="rotate(-33 355 195)"
            >
              square — nothing reaches it
            </text>

            {F.sizes.map((s) => (
              <circle
                key={s.label}
                cx={60 + (s.width / 65) * 600}
                cy={420 - (s.height / 65) * 400}
                r={Math.max(3.2, Math.sqrt(s.count) * 3.6)}
                fill="var(--color-brand-400)"
                fillOpacity={s.count > 1 ? 0.62 : 0.34}
                stroke="var(--color-brand-600)"
                strokeWidth={s.count > 1 ? 1 : 0.6}
              >
                <title>{`${s.label} — ${s.count} work${s.count === 1 ? '' : 's'}${
                  s.works.length ? `: ${s.works.slice(0, 4).join(', ')}` : ''
                }`}</title>
              </circle>
            ))}

            {top.slice(0, 5).map((s) => (
              <text
                key={s.label}
                x={60 + (s.width / 65) * 600 + Math.sqrt(s.count) * 3.6 + 5}
                y={420 - (s.height / 65) * 400 + 4}
                fontSize={11.5}
                fill="var(--color-ink-700)"
              >
                {s.label}
              </text>
            ))}

            <text x={360} y={468} textAnchor="middle" fontSize={11.5} fill="var(--color-ink-500)">
              width, in inches as written
            </text>
            <text
              x={16}
              y={220}
              textAnchor="middle"
              fontSize={11.5}
              fill="var(--color-ink-500)"
              transform="rotate(-90 16 220)"
            >
              height, in inches
            </text>
          </svg>
        </div>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">The eight he came back to</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          The commonest formats drawn to one scale and to their real proportions, so that a
          plate the size of a postcard stands beside a canvas five feet across. Each is labelled
          with the number of works read at that size and the volume it is written in.
        </p>

        <div className="mt-5 overflow-x-auto">
          <svg
            viewBox={`0 0 700 ${Math.ceil(top.length / 4) * 190 + 10}`}
            className="h-auto w-full min-w-[560px]"
            role="img"
            aria-label="The eight commonest formats, drawn to one scale."
          >
            {top.map((s, i) => {
              const col = i % 4;
              const row = Math.floor(i / 4);
              const cellX = col * 175 + 12;
              const cellY = row * 190 + 12;
              const w = s.width * unit * 0.24;
              const h = s.height * unit * 0.24;
              return (
                <g key={s.label}>
                  <rect
                    x={cellX}
                    y={cellY + 110 - h}
                    width={w}
                    height={h}
                    fill="var(--color-brand-100)"
                    stroke="var(--color-brand-500)"
                    strokeWidth={1.2}
                  />
                  <text x={cellX} y={cellY + 132} fontSize={13} fill="var(--color-ink-900)">
                    {s.label}
                  </text>
                  <text x={cellX} y={cellY + 149} fontSize={11.5} fill="var(--color-ink-500)">
                    {s.count} work{s.count === 1 ? '' : 's'}
                  </text>
                  <text x={cellX} y={cellY + 165} fontSize={11.5} fill="var(--color-ink-400)">
                    {s.ledgers.map(named).join(', ')}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Every size, counted</h2>
        <p className="prose-note mt-2 max-w-3xl">{F.normalisation}</p>
        <table className="mt-4 w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-400">
              <th className="py-1.5 text-left font-normal">Format</th>
              <th className="py-1.5 text-right font-normal">Works</th>
              <th className="py-1.5 text-right font-normal">Wider by</th>
              <th className="py-1.5 text-left font-normal">In</th>
              <th className="w-1/4 py-1.5 text-left font-normal" />
            </tr>
          </thead>
          <tbody>
            {F.sizes
              .filter((s) => s.count > 1)
              .map((s) => (
                <tr key={s.label} className="border-b border-ink-100">
                  <td className="py-1.5 text-ink-900">
                    {s.label}
                    {s.orientation === 'portrait' && (
                      <span className="ml-1.5 text-[11.5px] text-ink-400">taller than wide</span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular text-ink-500">{s.count}</td>
                  <td className="py-1.5 text-right tabular text-ink-500">{s.ratio}×</td>
                  <td className="py-1.5 text-[12.5px] text-ink-500">
                    {s.ledgers.map(named).join(', ')}
                  </td>
                  <td className="py-1.5 pl-3">
                    <span
                      className="inline-block h-2 rounded-sm bg-brand-400 align-middle"
                      style={{ width: `${Math.max(2, (s.count / F.sizes[0].count) * 100)}%` }}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="prose-note mt-3 max-w-3xl">
          {F.onceOnly} further formats occur once each and are not listed. They are on the chart
          above, as the faint dots.
        </p>
      </section>

      <section className="border-t border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">What is not counted</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          {F.unsized.count} of the {F.headings} work headings read so far state no size at all,
          and they are the denominator of everything above. Most are running-list leaves where
          the title stands alone and the measurement is in a ruled column of its own; a few are
          titles that were only partly readable, so the leaf names a work this page cannot
          measure.
        </p>
        <p className="prose-note mt-2 max-w-3xl">{F.note}</p>
        <ul className="mt-3 max-w-3xl">
          {F.unsized.sample.slice(0, 8).map((u, i) => (
            <li key={i} className="border-b border-ink-100 py-2 text-[12.5px] text-ink-700">
              <span className="text-ink-400">
                {named(u.ledger)}
                {u.leaf ? ` leaf ${u.leaf}` : ''} —{' '}
              </span>
              {u.heading}
            </li>
          ))}
        </ul>
      </section>
    </Page>
  );
}
