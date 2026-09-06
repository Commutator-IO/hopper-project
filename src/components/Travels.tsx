/**
 * Where the sources put Edward Hopper, drawn.
 *
 * Six points and seven arrows, which is all `life.json` will support and is
 * deliberately less than the page could have shown — `scripts/places.mjs` says
 * what was refused and why. The drawing's job is to make the small true thing
 * legible rather than to look like a map of a life.
 *
 * ## Two panels and a break, rather than one frame
 *
 * The places are five points inside four degrees of longitude and one point
 * five thousand kilometres away. Drawn in a single frame at true scale the
 * American cluster collapses to five per cent of the width and becomes
 * unreadable; stretched to fill the frame it would be a picture of nothing. So
 * the drawing is broken, as a broken axis is broken, and the break is drawn and
 * labelled instead of being hidden — inside each panel the scale is true and the
 * relative positions are the retrieved coordinates.
 *
 * ## Why two dots sit on top of each other
 *
 * The New York School of Art and 3 Washington Square North are two kilometres
 * apart, which at this scale is three pixels. They are kept as two nodes,
 * because the chronology moves between them fourteen years apart, and drawn at
 * the positions the gazetteer gave: the arrows fan so that both are visible and
 * the labels stack. Nudging one of them to make the picture tidier would be
 * inventing a geography, which is the one thing this drawing must not do.
 */
import travels from '../content/travels.json';

interface Place {
  key: string;
  name: string;
  what: string;
  note: string | null;
  lat: number;
  lon: number;
  resolved: string;
}
interface Move {
  from: string;
  to: string;
  year: number;
  what: string;
  source: { key: string; name: string; url: string };
}

const DATA = travels as unknown as {
  means: string;
  refused: { what: string; why: string }[];
  attribution: { name: string; url: string; licence: string };
  places: Place[];
  moves: Move[];
};

const W = 900;
const H = 360;

/** The Atlantic is where the frame breaks; nothing else separates the panels. */
const WEST = DATA.places.filter((p) => p.lon < -30);
const EAST = DATA.places.filter((p) => p.lon >= -30);

/**
 * Equirectangular, with the longitude squeezed by the cosine of the panel's own
 * middle latitude. Over four degrees of coast that is the whole of the
 * projection problem: without it Cape Cod sits a third too far from Manhattan.
 */
function project(list: Place[], x0: number, x1: number, y0: number, y1: number) {
  const mid = (Math.min(...list.map((p) => p.lat)) + Math.max(...list.map((p) => p.lat))) / 2;
  const k = Math.cos((mid * Math.PI) / 180);
  const xs = list.map((p) => p.lon * k);
  const ys = list.map((p) => -p.lat);
  const [xa, xb] = [Math.min(...xs), Math.max(...xs)];
  const [ya, yb] = [Math.min(...ys), Math.max(...ys)];
  // One scale for both axes, so the panel is not stretched into a shape the
  // coordinates do not have.
  const s = Math.min((x1 - x0) / (xb - xa || 1), (y1 - y0) / (yb - ya || 1));
  const cx = (x0 + x1) / 2 - ((xa + xb) / 2) * s;
  const cy = (y0 + y1) / 2 - ((ya + yb) / 2) * s;
  const at = new Map<string, { x: number; y: number }>();
  for (const p of list) at.set(p.key, { x: p.lon * k * s + cx, y: -p.lat * s + cy });
  return at;
}

const POS = new Map([
  ...project(WEST, 130, 540, 120, 290),
  ...project(EAST, 730, 830, 160, 220),
]);

/** Places drawn within a few pixels of each other, so their labels can stack. */
const CLUSTERS = (() => {
  const groups: Place[][] = [];
  for (const p of DATA.places) {
    const a = POS.get(p.key)!;
    const near = groups.find((g) => {
      const b = POS.get(g[0].key)!;
      return Math.hypot(a.x - b.x, a.y - b.y) < 12;
    });
    if (near) near.push(p);
    else groups.push([p]);
  }
  return groups;
})();

/**
 * Which way a place's label points: outward from the middle of its own panel.
 *
 * The obvious rule — left of the dot on the right half of the picture, right of
 * it on the left — puts South Truro's label straight back through the arrows it
 * is furthest from, because Truro is the easternmost point and the crowd is
 * behind it. Pushing every label away from its panel's own centre of mass sends
 * each one into the empty part of the frame instead, which is where the room
 * is.
 */
const CENTROID = (list: Place[]) => {
  const pts = list.map((p) => POS.get(p.key)!);
  return {
    x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
    y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
  };
};
const HUBS = [
  { of: new Set(WEST.map((p) => p.key)), at: CENTROID(WEST) },
  { of: new Set(EAST.map((p) => p.key)), at: CENTROID(EAST) },
];

function labelDir(key: string) {
  const p = POS.get(key)!;
  const hub = HUBS.find((h) => h.of.has(key))!.at;
  const dx = p.x - hub.x;
  const dy = p.y - hub.y;
  const len = Math.hypot(dx, dy) || 1;
  return { ux: dx / len, uy: dy / len };
}

/**
 * The arrows, and where each year can be written without landing on another.
 *
 * Two things needed solving. A long arrow across the break must not bow, or it
 * sweeps back across the panel it started in and crosses everything in it. And
 * arrows that share an endpoint have their apexes in nearly the same place —
 * 1922 and 1967 both end at Cape Cod and their labels sat on top of each other
 * — so a year slides along its own curve until it is clear of the years already
 * placed. It is still on its own arrow wherever it lands, which is the only
 * property that matters.
 */
const EDGES = (() => {
  const placed: { x: number; y: number }[] = [];
  return DATA.moves.map((m) => {
    const a = POS.get(m.from)!;
    const b = POS.get(m.to)!;
    // Parallel arrows are fanned apart, and « parallel » has to mean *drawn*
    // between the same two spots rather than declared between the same two
    // keys. Nyack to the schools in 1899 and Nyack to Washington Square in 1913
    // are different moves between different places, and at two kilometres apart
    // they are one arrow on the paper: matching on keys left 1899 lying exactly
    // under 1913, and matching on where they land separates them.
    const same = (p: { x: number; y: number }, q: { x: number; y: number }) =>
      Math.hypot(p.x - q.x, p.y - q.y) < 12;
    const twin = DATA.moves.filter((o) => {
      const oa = POS.get(o.from)!;
      const ob = POS.get(o.to)!;
      return (same(oa, a) && same(ob, b)) || (same(oa, b) && same(ob, a));
    });
    const rank = twin.indexOf(m) - (twin.length - 1) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // How far twins are fanned has to grow as the arrow gets shorter, not stay
    // fixed: the fan shows up at the apex as half the difference in bow, so 26px
    // of spread on the twenty-pixel hop from Nyack to Manhattan separated the
    // two labels by thirteen and they still touched. A wide spread flips one arc
    // to the other side of the line, which is what makes them countable.
    const spread = len < 60 ? 70 : 26;
    const bow = (len > 300 ? 10 : 30) + rank * spread;
    const mx = (a.x + b.x) / 2 - (dy / len) * bow;
    const my = (a.y + b.y) / 2 + (dx / len) * bow;
    const at = (t: number) => ({
      x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x,
      y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y,
    });
    // Clear of a year already placed means clear of its box, which is a good
    // deal wider than it is tall; a radius test called two labels separated when
    // one sat across the other's second digit.
    const t =
      [0.5, 0.36, 0.64, 0.26, 0.74, 0.16, 0.84].find((u) => {
        const q = at(u);
        return placed.every(
          (p) => Math.abs(p.x - q.x) > 34 || Math.abs(p.y - q.y) > 13,
        );
      }) ?? 0.5;
    const l = at(t);
    placed.push(l);
    return { m, a, b, mx, my, lx: l.x, ly: l.y };
  });
})();

export function Travels() {
  return (
    <div>
      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[680px] text-ink-400"
          role="img"
          aria-label="Six places named in the sourced chronology, joined by seven dated arrows in the order the sources fall."
        >
          <defs>
            <marker
              id="tv-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-brand-600" />
            </marker>
            <pattern id="tv-break" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 0 6 L 6 0" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
            </pattern>
          </defs>

          {/* The break. Drawn, labelled, and the only place in the picture where
              a distance means nothing. */}
          <rect x={612} y={70} width={56} height={H - 130} fill="url(#tv-break)" />
          <text x={640} y={62} textAnchor="middle" className="fill-current text-[10px]">
            the Atlantic
          </text>
          <text x={640} y={H - 48} textAnchor="middle" className="fill-current text-[10px]">
            not to scale
          </text>

          <text x={90} y={62} className="fill-current text-[11px] font-semibold">
            New York and New England
          </text>
          <text x={720} y={62} className="fill-current text-[11px] font-semibold">
            France
          </text>

          {EDGES.map(({ m, a, b, mx, my, lx, ly }, i) => {
            return (
              <g key={i}>
                <path
                  d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                  fill="none"
                  className="stroke-brand-400"
                  strokeWidth="1.1"
                  markerEnd="url(#tv-arrow)"
                />
                <rect
                  x={lx - 15}
                  y={ly - 8}
                  width={30}
                  height={13}
                  rx={2}
                  className="fill-ink-50"
                />
                <text
                  x={lx}
                  y={ly + 2}
                  textAnchor="middle"
                  className="fill-brand-700 tabular text-[10px]"
                >
                  {m.year}
                </text>
              </g>
            );
          })}

          {CLUSTERS.map((group) => {
            const at = POS.get(group[0].key)!;
            const { ux, uy } = labelDir(group[0].key);
            const left = ux < 0;
            return (
              <g key={group[0].key}>
                {group.map((p) => {
                  const q = POS.get(p.key)!;
                  return (
                    <circle
                      key={p.key}
                      cx={q.x}
                      cy={q.y}
                      r={3.5}
                      className="fill-ink-900 stroke-ink-50"
                      strokeWidth="1"
                    />
                  );
                })}
                {group.map((p, j) => (
                  <text
                    key={p.key}
                    x={at.x + ux * 10 + (left ? -3 : 3)}
                    y={at.y + uy * 12 + 4 + j * 13 - (group.length - 1) * 6.5}
                    textAnchor={left ? 'end' : 'start'}
                    className="fill-ink-800 text-[11px]"
                  >
                    {p.name}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="prose-note mt-3 max-w-3xl">{DATA.means}</p>

      <ul className="mt-4 max-w-3xl">
        {DATA.moves.map((m) => (
          <li
            key={`${m.from}-${m.to}-${m.year}`}
            className="flex items-baseline gap-3 border-b border-ink-100 py-1.5 text-[13px]"
          >
            <span className="tabular w-10 shrink-0 text-ink-500">{m.year}</span>
            <span className="min-w-0 flex-1 text-ink-700">
              {m.what}{' '}
              <a
                href={m.source.url}
                target="_blank"
                rel="noreferrer"
                title={m.source.name}
                className="whitespace-nowrap text-[11.5px] text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
              >
                source ↗
              </a>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 max-w-3xl">
        <p className="prose-note">
          <strong className="font-semibold text-ink-700">What is deliberately not drawn:</strong>
        </p>
        <ul className="mt-1 max-w-3xl space-y-1.5">
          {DATA.refused.map((r) => (
            <li key={r.what} className="prose-note">
              <em className="text-ink-700">{r.what}</em> — {r.why}
            </li>
          ))}
        </ul>
        <p className="prose-note mt-3">
          Positions are retrieved from{' '}
          <a
            href={DATA.attribution.url}
            target="_blank"
            rel="noreferrer"
            className="text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600"
          >
            {DATA.attribution.name}
          </a>{' '}
          by <code className="font-mono text-[12px]">npm run places</code>, never typed:{' '}
          {DATA.attribution.licence}
        </p>
      </div>
    </div>
  );
}
