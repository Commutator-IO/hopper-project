import { useMemo } from 'react';
import { Page } from './components/Frame.tsx';
import formatsData from './content/formats.json';
import materialsData from './content/materials.json';
import { LEDGERS } from './content/catalogue.ts';

/**
 * How the works were made: what of, and what shape.
 *
 * ## Why the two halves belong on one page
 *
 * They are the two standing fields of the record that are not about money.
 * Under the title of a work leaf she writes the size and then the formula, in
 * that order, leaf after leaf for thirty years — and neither of them is a
 * remark about the picture. The rest of the leaf is: the description, the
 * buyer, the cheque, the exhibition. These two are the specification.
 *
 * They come from opposite hands, and that is worth saying rather than
 * smoothing over. The **size is Edward Hopper's**, in his drawn lettering
 * beside his own record drawing; the inside cover of Book I says so in her
 * hand. The **formula is Josephine Hopper's**, like everything else written
 * here. So the page holds his measurement of an object and her record of his
 * practice, and the only thing they have in common is that neither can be
 * wrong about an event, because neither reports one.
 *
 * ## What each half is for
 *
 * The materials answer: what did he habitually paint with, and when did it
 * change? The answer is a succession rather than a preference — Rembrandt
 * colours and zinc white in poppy oil at the start, Winsor & Newton and flake
 * white in linseed oil and turpentine for the rest of his life, with the
 * canvas maker turning over underneath it.
 *
 * The formats answer: how far did he work to a repeated set of sizes? The
 * answer is on the scatter and it is not subtle.
 *
 * Nothing on either half is rounded, folded or inferred beyond what
 * `scripts/materials.mjs` and `scripts/formats.mjs` say in their headers, and
 * both say why that is the design rather than a scruple.
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

interface Material {
  name: string;
  group: string;
  works: number;
  ledgers: string[];
  firstYear: number | null;
  lastYear: number | null;
  years: Record<string, number>;
  variants: { spelling: string; count: number }[];
  examples: string[];
}

const M = materialsData as unknown as {
  basis: string;
  note: string;
  method: string;
  normalisation: string;
  dating: string;
  works: number;
  worksWithFormula: number;
  handsRead: number;
  looseHands: number;
  dated: number;
  undated: number;
  groups: { group: string; label: string; note: string; materials: Material[] }[];
  formulae: {
    formula: string[];
    works: number;
    ledgers: string[];
    firstYear: number | null;
    lastYear: number | null;
    examples: string[];
  }[];
  byLedger: Record<string, { works: number; withFormula: number; materials: Record<string, number> }>;
};

const named = (id: string) => LEDGERS.find((l) => l.id === id)?.short ?? id;

/** One colour per group, so a formula reads as a sequence of kinds. */
const GROUP_TINT: Record<string, string> = {
  colourman: 'var(--color-brand-500)',
  white: 'var(--color-ink-500)',
  oil: 'var(--color-brand-300)',
  thinner: 'var(--color-ink-300)',
  canvas: 'var(--color-brand-700)',
  priming: 'var(--color-ink-700)',
};

export function TechniquePage() {
  /* ------------------------------------------------------------- materials */

  const allMaterials = useMemo(() => M.groups.flatMap((g) => g.materials), []);
  const groupOf = useMemo(
    () => new Map(allMaterials.map((m) => [m.name, m.group])),
    [allMaterials],
  );

  // The chronology is drawn only from materials that carry a date at all, and
  // the count of the ones that do not is printed beside it. A material named
  // on nine leaves of which one states its year is one point on this chart and
  // nine rows in the table below, and the difference is the point.
  const dateable = useMemo(
    () => allMaterials.filter((m) => m.firstYear !== null),
    [allMaterials],
  );

  const span = useMemo(() => {
    const ys = dateable.flatMap((m) => Object.keys(m.years).map(Number));
    // Rounded out to the decade so the axis has whole numbers on it, and never
    // narrower than the data.
    const lo = Math.floor(Math.min(...ys) / 5) * 5;
    const hi = Math.ceil(Math.max(...ys) / 5) * 5;
    return { lo, hi };
  }, [dateable]);

  // Ordered by when a material first appears, so the chart reads as a
  // succession down the page rather than as a ranking.
  const timeline = useMemo(
    () => [...dateable].sort((a, b) => a.firstYear! - b.firstYear! || a.name.localeCompare(b.name)),
    [dateable],
  );

  const topFormulae = useMemo(() => M.formulae.filter((f) => f.works > 1).slice(0, 8), []);
  const busiest = useMemo(
    () => Math.max(...allMaterials.map((m) => m.works)),
    [allMaterials],
  );

  const ROW = 21;
  const chartH = timeline.length * ROW + 46;
  const xOf = (y: number) => 132 + ((y - span.lo) / (span.hi - span.lo)) * 528;

  /* --------------------------------------------------------------- formats */

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
    <Page path="/technique/">
      <header className="border-b border-ink-200 py-10">
        <h1 className="font-serif text-3xl text-ink-900">Technique</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          The two things the leaves state about a work that are not about money: what it was made
          of, and what shape it was. Both stand under the title, in the same words, leaf after
          leaf for thirty years — and neither is a remark about the picture. The description, the
          buyer and the cheque are all remarks. These are the specification.
        </p>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-700">
          They come from opposite hands. The <strong>size is Edward Hopper’s</strong>, lettered
          beside his own record drawing — the inside cover of Book I says the drawings in the
          books are his. The <strong>formula is Josephine Hopper’s</strong>, like every other word
          written here. So this page holds his measurement of an object and her record of his
          practice, and what the two share is that neither can be wrong about an event, because
          neither reports one.
        </p>
      </header>

      {/* ============================================================ materials */}

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">What he painted with</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          From Book II onward nearly every work leaf carries a short block naming the colourman,
          the canvas and its priming, the white, the oil and the thinner — in that order, and
          usually in four lines. {M.worksWithFormula} of the {M.works} work headings read so far
          carry one. It is the only surviving statement of what was on the palette on a given day.
        </p>
        <p className="prose-note mt-2 max-w-3xl">{M.method}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
          {[
            { k: 'Works with a formula', v: String(M.worksWithFormula) },
            { k: 'Distinct materials', v: String(allMaterials.length) },
            { k: 'Distinct formulae', v: String(M.formulae.length) },
            { k: 'Datable to a year', v: `${M.dated} of ${M.worksWithFormula}` },
          ].map((c) => (
            <div key={c.k}>
              <div className="text-[11px] uppercase tracking-wider text-ink-400">{c.k}</div>
              <div className="font-serif text-2xl tabular text-ink-900">{c.v}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">A succession, not a preference</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          Each material against the years the leaves date it to, earliest first. One dot to a
          year, its size standing for how many works that year names it. Read down the page and
          the changes are plain: Rembrandt colours and zinc white in poppy oil at the start,
          Winsor &amp; Newton and flake white in linseed oil and turpentine from the middle 1940s
          to the end, and underneath them the canvas turning over — National, then Herga — with
          the priming going from double to single as it does.
        </p>
        <p className="prose-note mt-2 max-w-3xl">{M.dating}</p>

        <div className="mt-5 overflow-x-auto">
          <svg
            viewBox={`0 0 700 ${chartH}`}
            className="h-auto w-full min-w-[600px]"
            role="img"
            aria-label={`When each of ${timeline.length} materials is named on a dated leaf, ${span.lo} to ${span.hi}.`}
          >
            {/* Five-year rules, labelled at the foot. */}
            {Array.from({ length: (span.hi - span.lo) / 5 + 1 }, (_, i) => span.lo + i * 5).map(
              (y) => (
                <g key={y}>
                  <line
                    x1={xOf(y)}
                    y1={6}
                    x2={xOf(y)}
                    y2={timeline.length * ROW + 12}
                    stroke="var(--color-ink-200)"
                    strokeWidth={1}
                  />
                  <text
                    x={xOf(y)}
                    y={timeline.length * ROW + 30}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--color-ink-400)"
                  >
                    {y}
                  </text>
                </g>
              ),
            )}

            {timeline.map((m, i) => {
              const y = 18 + i * ROW;
              const tint = GROUP_TINT[m.group] ?? 'var(--color-brand-400)';
              return (
                <g key={m.name}>
                  <text x={124} y={y + 4} textAnchor="end" fontSize={11.5} fill="var(--color-ink-700)">
                    {m.name}
                  </text>
                  {/* The span between the first and last dated leaf. It is not a
                      claim that the material was in use throughout — only that
                      these two leaves are dated and both name it. */}
                  <line
                    x1={xOf(m.firstYear!)}
                    y1={y}
                    x2={xOf(m.lastYear!)}
                    y2={y}
                    stroke={tint}
                    strokeWidth={1.5}
                    strokeOpacity={0.35}
                  />
                  {Object.entries(m.years).map(([yr, n]) => (
                    <circle
                      key={yr}
                      cx={xOf(Number(yr))}
                      cy={y}
                      r={Math.max(2.6, Math.sqrt(n) * 3)}
                      fill={tint}
                      fillOpacity={0.7}
                    >
                      <title>{`${m.name}, ${yr} — ${n} work${n === 1 ? '' : 's'}`}</title>
                    </circle>
                  ))}
                  <text
                    x={668}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="var(--color-ink-400)"
                  >
                    {m.works}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="prose-note mt-3 max-w-3xl">
          The figure at the right of each row is the number of works naming that material
          altogether, dated or not, so it is larger than the dots account for. {M.undated} of the{' '}
          {M.worksWithFormula} leaves with a formula state no year of their own and are absent
          from the chart.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">The formulae he came back to</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          Not the ingredients but the whole recipes: the set of materials one leaf names, counted
          as a set. This is the nearest thing the archive has to a statement of habit, and the
          commonest of them stands on {M.formulae[0]?.works ?? 0} leaves.
        </p>
        <ul className="mt-4 max-w-3xl">
          {topFormulae.map((f) => (
            <li key={f.formula.join('|')} className="border-b border-ink-100 py-3">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                {f.formula.map((n, i) => (
                  <span key={n} className="text-[13.5px] text-ink-800">
                    <span
                      className="mr-1 inline-block h-2 w-2 rounded-full align-middle"
                      style={{ background: GROUP_TINT[groupOf.get(n) ?? ''] ?? 'var(--color-brand-400)' }}
                    />
                    {n}
                    {i < f.formula.length - 1 && <span className="ml-1.5 text-ink-300">·</span>}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[12.5px] text-ink-500">
                {f.works} works
                {f.firstYear && (
                  <>
                    {' · '}
                    {f.firstYear === f.lastYear ? f.firstYear : `${f.firstYear}–${f.lastYear}`}
                  </>
                )}
                {' · '}
                {f.ledgers.map(named).join(', ')}
                {f.examples.length > 0 && (
                  <span className="text-ink-400"> · {f.examples.slice(0, 3).join(', ')}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="prose-note mt-3 max-w-3xl">
          {M.formulae.length - topFormulae.length} further combinations occur once each and are
          not listed. A formula here is what one leaf happens to write down, so a leaf that names
          the white and not the oil makes a shorter formula than a leaf that names both — the
          list is of what was recorded, not of what was in the room.
        </p>
      </section>

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-xl text-ink-900">Every material, counted</h2>
        <p className="prose-note mt-2 max-w-3xl">{M.normalisation}</p>

        {M.groups.map((g) => (
          <div key={g.group} className="mt-6">
            <h3 className="flex items-baseline gap-2 font-serif text-[15px] text-ink-900">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: GROUP_TINT[g.group] ?? 'var(--color-brand-400)' }}
              />
              {g.label}
            </h3>
            <p className="prose-note mt-1 max-w-3xl">{g.note}</p>
            <table className="mt-3 w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-ink-300 text-[11px] uppercase tracking-wider text-ink-400">
                  <th className="py-1.5 text-left font-normal">Material</th>
                  <th className="py-1.5 text-right font-normal">Works</th>
                  <th className="py-1.5 text-right font-normal">Dated to</th>
                  <th className="py-1.5 text-left font-normal">In</th>
                  <th className="py-1.5 text-left font-normal">Spelt on the leaves</th>
                  <th className="w-[14%] py-1.5 text-left font-normal" />
                </tr>
              </thead>
              <tbody>
                {g.materials.map((m) => (
                  <tr key={m.name} className="border-b border-ink-100">
                    <td className="py-1.5 text-ink-900">{m.name}</td>
                    <td className="py-1.5 text-right tabular text-ink-500">{m.works}</td>
                    <td className="py-1.5 text-right tabular text-ink-500">
                      {m.firstYear === null
                        ? '—'
                        : m.firstYear === m.lastYear
                          ? m.firstYear
                          : `${m.firstYear}–${m.lastYear}`}
                    </td>
                    <td className="py-1.5 text-[12.5px] text-ink-500">
                      {m.ledgers.map(named).join(', ')}
                    </td>
                    <td className="py-1.5 text-[12.5px] text-ink-400">
                      {m.variants.map((v) => v.spelling).join(', ')}
                    </td>
                    <td className="py-1.5 pl-3">
                      <span
                        className="inline-block h-2 rounded-sm align-middle"
                        style={{
                          width: `${Math.max(2, (m.works / busiest) * 100)}%`,
                          background: GROUP_TINT[g.group] ?? 'var(--color-brand-400)',
                          opacity: 0.65,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <p className="prose-note mt-5 max-w-3xl">
          Which volumes carry a formula at all:{' '}
          {Object.entries(M.byLedger)
            .sort((a, b) => b[1].withFormula - a[1].withFormula)
            .map(([id, v]) => `${named(id)} ${v.withFormula} of ${v.works}`)
            .join(' · ')}
          . The etchings of Book I have none, and should not: an etching plate has no palette to
          record, and the leaves that hold those works rule columns for exhibitions and prices
          instead.
        </p>
      </section>

      {/* ============================================================== formats */}

      <section className="border-b border-ink-200 py-8">
        <h2 className="font-serif text-2xl text-ink-900">The sizes he worked at</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          The dimensions written at the head of each leaf, in Edward Hopper’s own drawn lettering.
          It is the only quantity in the archive that measures an object rather than reporting an
          event: a price can be misremembered and a buyer written two ways, but « 28 × 40 » is a
          canvas that was standing in the room.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-4">
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
        </div>
      </section>

      <section className="border-b border-ink-200 py-8">
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

      <section className="border-b border-ink-200 py-8">
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

      <section className="border-b border-ink-200 py-8">
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

      {/* ========================================================== the gaps */}

      <section className="py-8">
        <h2 className="font-serif text-xl text-ink-900">What is not counted</h2>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-700">
          {F.unsized.count} of the {F.headings} work headings read so far state no size at all,
          and {M.works - M.worksWithFormula} of the {M.works} works name no material. Both are the
          denominators of everything above. Most are running-list leaves where the title stands
          alone and the measurement is in a ruled column of its own; a few are titles that were
          only partly readable, so the leaf names a work this page cannot measure. The etchings
          have no formula because a plate has no palette.
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
