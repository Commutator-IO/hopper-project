/**
 * Where the sources put Edward Hopper, drawn — twice.
 *
 * The first drawing is the museum's chronology: six points and seven arrows,
 * which is all the sourced life events support and is deliberately less than
 * the page could have shown — `scripts/places.mjs` says what was refused and
 * why. The second is Josephine Hopper's black notebook read for its places:
 * her year chronicle and her list « To get this straight » of the Mexican
 * journeys, one arrow per leg she names, in the order she wrote them. Both
 * come out of `life.json` through the same script, so an arrow can never say
 * something the timeline entry above it does not.
 *
 * ## Two panels and a break, rather than one frame
 *
 * The life drawing is five points inside four degrees of longitude and one
 * point five thousand kilometres away. Drawn in a single frame at true scale
 * the American cluster collapses to five per cent of the width and becomes
 * unreadable; stretched to fill the frame it would be a picture of nothing.
 * So the drawing is broken, as a broken axis is broken, and the break is
 * drawn and labelled instead of being hidden — inside each panel the scale
 * is true and the relative positions are the retrieved coordinates.
 *
 * The notebook drawing needs no break: its journeys run from Maine to Oaxaca
 * and from Cape Cod to Portland, and a continent is the right frame for them.
 * The price is that the New York and New England places sit close together;
 * their labels stack, as they do in the first drawing.
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
import { url } from '../lib/base.ts';

interface Place {
  key: string;
  name: string;
  short: string;
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
  graph: 'life' | 'notebook';
  what: string;
  source: { key: string; name: string; url: string };
  sheet?: { notebook: string; ref: number; page: string };
}

const DATA = travels as unknown as {
  means: string;
  notebookMeans: string | null;
  refused: { what: string; why: string }[];
  attribution: { name: string; url: string; licence: string };
  places: Place[];
  moves: Move[];
};

const W = 900;
const H = 360;

const BY_KEY = new Map(DATA.places.map((p) => [p.key, p]));

/** The places a set of moves actually joins, in the order the moves name them. */
function placesOf(moves: Move[]): Place[] {
  const keys: string[] = [];
  for (const m of moves) for (const k of [m.from, m.to]) if (!keys.includes(k)) keys.push(k);
  return keys.map((k) => BY_KEY.get(k)!).filter(Boolean);
}

/**
 * Equirectangular, with the longitude squeezed by the cosine of the panel's own
 * middle latitude. Over four degrees of coast that is the whole of the
 * projection problem: without it Cape Cod sits a third too far from Manhattan.
 */
function project(list: Place[], x0: number, x1: number, y0: number, y1: number) {
  const at = new Map<string, { x: number; y: number }>();
  if (!list.length) return at;
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
  for (const p of list) at.set(p.key, { x: p.lon * k * s + cx, y: -p.lat * s + cy });
  return at;
}

interface Panel {
  of: (p: Place) => boolean;
  box: [number, number, number, number];
}

interface Edge {
  m: Move;
  a: { x: number; y: number };
  b: { x: number; y: number };
  mx: number;
  my: number;
  lx: number;
  ly: number;
}

interface Label {
  group: Place[];
  names: string[];
  x: number;
  y: number;
  left: boolean;
}

interface Layout {
  pos: Map<string, { x: number; y: number }>;
  clusters: Place[][];
  labels: Label[];
  edges: Edge[];
}

/** About how wide a label is drawn, at 11px: enough to test for a collision. */
const widthOf = (s: string) => s.length * 6.4;
const LINE = 13;

/**
 * One drawing's geometry: where each place lands, which labels stack, and
 * where each arrow's year can be written without landing on another.
 */
function layout(
  places: Place[],
  moves: Move[],
  panels: Panel[],
  nameOf: (p: Place) => string = (p) => p.name,
): Layout {
  const pos = new Map<string, { x: number; y: number }>();
  const groupsOfPanel: Place[][] = [];
  for (const panel of panels) {
    const list = places.filter(panel.of);
    groupsOfPanel.push(list);
    for (const [k, v] of project(list, ...panel.box)) pos.set(k, v);
  }

  /** Places drawn within a few pixels of each other, so their labels can stack. */
  const clusters: Place[][] = [];
  for (const p of places) {
    const a = pos.get(p.key)!;
    const near = clusters.find((g) => {
      const b = pos.get(g[0].key)!;
      return Math.hypot(a.x - b.x, a.y - b.y) < 12;
    });
    if (near) near.push(p);
    else clusters.push([p]);
  }

  /**
   * Which way a place's label points: outward from the middle of its own panel.
   *
   * The obvious rule — left of the dot on the right half of the picture, right
   * of it on the left — puts South Truro's label straight back through the
   * arrows it is furthest from, because Truro is the easternmost point and the
   * crowd is behind it. Pushing every label away from its panel's own centre
   * of mass sends each one into the empty part of the frame instead, which is
   * where the room is.
   */
  const hubs = groupsOfPanel.map((list) => {
    const pts = list.map((p) => pos.get(p.key)!);
    return {
      of: new Set(list.map((p) => p.key)),
      at: {
        x: pts.reduce((a, p) => a + p.x, 0) / (pts.length || 1),
        y: pts.reduce((a, p) => a + p.y, 0) / (pts.length || 1),
      },
    };
  });
  const labelDir = (key: string) => {
    const p = pos.get(key)!;
    const hub = hubs.find((h) => h.of.has(key))!.at;
    const dx = p.x - hub.x;
    const dy = p.y - hub.y;
    const len = Math.hypot(dx, dy) || 1;
    return { ux: dx / len, uy: dy / len };
  };

  /**
   * Where each cluster's label goes: outward from its panel's centre, and then
   * down, a line at a time, until it lies on no label already placed. The
   * first drawing never needed this; the second puts six places of New
   * England inside forty pixels, and with every label pointing east they lay
   * on top of one another. A label that moves stays tied to its dot by the
   * eye — it is the nearest text to it — and the alternative, moving the dot,
   * would be inventing a geography.
   */
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  const hits = (b: { x: number; y: number; w: number; h: number }) =>
    boxes.some((o) => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
  const labels: Label[] = [...clusters]
    .sort((a, b) => pos.get(a[0].key)!.y - pos.get(b[0].key)!.y)
    .map((group) => {
      const at = pos.get(group[0].key)!;
      const { ux, uy } = labelDir(group[0].key);
      const w = Math.max(...group.map((p) => widthOf(nameOf(p))));
      // Outward from the hub — unless outward runs off the paper, which it
      // does for Cape Cod, the easternmost point of a drawing whose frame
      // ends a hundred pixels further on.
      let left = ux < 0;
      if (!left && at.x + 13 + w > W - 6) left = true;
      if (left && at.x - 13 - w < 6) left = false;
      const x = at.x + (left ? -13 : 13);
      const h = group.length * LINE;
      let y = at.y + uy * 12 + 4 - (group.length - 1) * 6.5;
      for (let tries = 0; tries < 12; tries++) {
        const box = { x: left ? x - w : x, y: y - 10, w, h };
        if (!hits(box)) {
          boxes.push(box);
          break;
        }
        y += LINE;
      }
      return { group, x, y, left, names: group.map(nameOf) };
    });

  /**
   * The arrows, and where each year can be written without landing on another
   * — or on a place's name, which is the collision the second drawing added.
   *
   * Two things needed solving. A long arrow across the break must not bow, or
   * it sweeps back across the panel it started in and crosses everything in
   * it. And arrows that share an endpoint have their apexes in nearly the
   * same place — 1922 and 1967 both end at Cape Cod and their labels sat on
   * top of each other — so a year slides along its own curve until it is
   * clear of the years already placed. It is still on its own arrow wherever
   * it lands, which is the only property that matters.
   */
  const placed: { x: number; y: number }[] = [];
  const same = (p: { x: number; y: number }, q: { x: number; y: number }) =>
    Math.hypot(p.x - q.x, p.y - q.y) < 12;
  // How many arrows a place has: a hub is where the years cannot be written,
  // because a dozen arrows leave 3 Washington Square North and their labels
  // would all sit on New England. A year is written towards the far end of
  // an arrow that leaves a hub and towards the near end of one that returns.
  const degree = new Map<string, number>();
  for (const m of moves) for (const k of [m.from, m.to]) degree.set(k, (degree.get(k) ?? 0) + 1);
  const NEAR = [0.5, 0.36, 0.64, 0.26, 0.74, 0.16, 0.84, 0.44, 0.56, 0.3, 0.7, 0.1, 0.9, 0.06, 0.94];
  const FAR = [0.7, 0.78, 0.62, 0.86, 0.55, 0.92, 0.48, 0.4, 0.96, 0.32, 0.24, 0.16];
  const edges = moves.map((m) => {
    const fromHub = (degree.get(m.from) ?? 0) >= 4;
    const toHub = (degree.get(m.to) ?? 0) >= 4;
    const order = fromHub && !toHub ? FAR : toHub && !fromHub ? FAR.map((u) => 1 - u) : NEAR;
    const a = pos.get(m.from)!;
    const b = pos.get(m.to)!;
    // Parallel arrows are fanned apart, and « parallel » has to mean *drawn*
    // between the same two spots rather than declared between the same two
    // keys. Nyack to the schools in 1899 and Nyack to Washington Square in
    // 1913 are different moves between different places, and at two
    // kilometres apart they are one arrow on the paper: matching on keys left
    // 1899 lying exactly under 1913, and matching on where they land
    // separates them.
    const twin = moves.filter((o) => {
      const oa = pos.get(o.from)!;
      const ob = pos.get(o.to)!;
      return (same(oa, a) && same(ob, b)) || (same(oa, b) && same(ob, a));
    });
    const rank = twin.indexOf(m) - (twin.length - 1) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // How far twins are fanned has to grow as the arrow gets shorter, not
    // stay fixed: the fan shows up at the apex as half the difference in bow,
    // so 26px of spread on the twenty-pixel hop from Nyack to Manhattan
    // separated the two labels by thirteen and they still touched. A wide
    // spread flips one arc to the other side of the line, which is what
    // makes them countable.
    const spread = len < 60 ? 70 : 26;
    const bow = (len > 300 ? 10 : 30) + rank * spread;
    const mx = (a.x + b.x) / 2 - (dy / len) * bow;
    const my = (a.y + b.y) / 2 + (dx / len) * bow;
    const at = (t: number) => ({
      x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * mx + t * t * b.x,
      y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * my + t * t * b.y,
    });
    // Clear of a year already placed means clear of its box, which is a good
    // deal wider than it is tall; a radius test called two labels separated
    // when one sat across the other's second digit.
    const free = (q: { x: number; y: number }) =>
      placed.every((p) => Math.abs(p.x - q.x) > 34 || Math.abs(p.y - q.y) > 13) &&
      !hits({ x: q.x - 15, y: q.y - 8, w: 30, h: 13 });
    const t = order.find((u) => free(at(u)));
    // An arrow twenty pixels long between two named places has no free point
    // on it at all. Its year is then lifted off the apex, square to the
    // arrow, the least distance that clears everything — still nearer to its
    // own arrow than to any other.
    const lifted = (): { x: number; y: number } => {
      const q = at(0.5);
      const nx = -dy / len;
      const ny = dx / len;
      const ux = dx / len;
      const uy = dy / len;
      for (const d of [14, -14, 26, -26, 38, -38, 50, -50]) {
        for (const s of [0, 18, -18, 36, -36]) {
          const c = { x: q.x + nx * d + ux * s, y: q.y + ny * d + uy * s };
          if (free(c)) return c;
        }
      }
      return q;
    };
    const l = t === undefined ? lifted() : at(t);
    placed.push(l);
    return { m, a, b, mx, my, lx: l.x, ly: l.y };
  });

  return { pos, clusters, labels, edges };
}

const LIFE_MOVES = DATA.moves.filter((m) => m.graph !== 'notebook');
const NOTEBOOK_MOVES = DATA.moves.filter((m) => m.graph === 'notebook');

/** The Atlantic is where the life drawing breaks; nothing else separates the panels. */
const LIFE = layout(placesOf(LIFE_MOVES), LIFE_MOVES, [
  { of: (p) => p.lon < -30, box: [130, 540, 120, 290] },
  { of: (p) => p.lon >= -30, box: [730, 830, 160, 220] },
]);

/** One frame for the notebook: the continent, at one scale. */
/** Taller than the life drawing: the continent is taller than it is wide here. */
const NH = 520;
const NOTEBOOK = layout(
  placesOf(NOTEBOOK_MOVES),
  NOTEBOOK_MOVES,
  [{ of: () => true, box: [110, 800, 60, NH - 40] }],
  (p) => p.short,
);

/** The source link of a move: a museum's page, or the notebook open at the page. */
function sourceHref(m: Move) {
  if (m.sheet) return `${url(`diaries/${m.sheet.notebook}/`)}#read/${m.sheet.ref}`;
  return m.source.url;
}

function Figure({
  id,
  lay,
  label,
  height = H,
  children,
}: {
  id: string;
  lay: Layout;
  label: string;
  height?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="h-auto w-full min-w-[680px] text-ink-400"
        role="img"
        aria-label={label}
      >
        <defs>
          <marker
            id={`${id}-arrow`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-brand-600" />
          </marker>
          <pattern id={`${id}-break`} width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 0 6 L 6 0" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
          </pattern>
        </defs>

        {children}

        {lay.edges.map(({ m, a, b, mx, my, lx, ly }, i) => (
          <g key={i}>
            <path
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              fill="none"
              className="stroke-brand-400"
              strokeWidth="1.1"
              markerEnd={`url(#${id}-arrow)`}
            />
            <rect x={lx - 15} y={ly - 8} width={30} height={13} rx={2} className="fill-ink-50" />
            <text x={lx} y={ly + 2} textAnchor="middle" className="fill-brand-700 tabular text-[10px]">
              {m.year}
            </text>
          </g>
        ))}

        {lay.labels.map(({ group, names, x, y, left }) => (
          <g key={group[0].key}>
            {group.map((p) => {
              const q = lay.pos.get(p.key)!;
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
                x={x}
                y={y + j * LINE}
                textAnchor={left ? 'end' : 'start'}
                className="fill-ink-800 text-[11px]"
              >
                {names[j]}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

const LINK =
  'whitespace-nowrap text-[11.5px] text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-600';

export function Travels() {
  // The notebook's legs, one row per year: the places in the order she wrote
  // them, the sentence they rest on, and the page it is read off.
  const years = [...new Set(NOTEBOOK_MOVES.map((m) => m.year))].sort((a, b) => a - b);
  const legsOf = (y: number) => NOTEBOOK_MOVES.filter((m) => m.year === y);
  const chain = (legs: Move[]) => {
    const keys = [legs[0].from];
    for (const l of legs) keys.push(l.to);
    return keys.map((k) => BY_KEY.get(k)?.name ?? k);
  };

  return (
    <div>
      <Figure
        id="tv"
        lay={LIFE}
        label="Six places named in the sourced chronology, joined by seven dated arrows in the order the sources fall."
      >
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
      </Figure>

      <p className="prose-note mt-3 max-w-3xl">{DATA.means}</p>

      <ul className="mt-4 max-w-3xl">
        {LIFE_MOVES.map((m) => (
          <li
            key={`${m.from}-${m.to}-${m.year}`}
            className="flex items-baseline gap-3 border-b border-ink-100 py-1.5 text-[13px]"
          >
            <span className="tabular w-10 shrink-0 text-ink-500">{m.year}</span>
            <span className="min-w-0 flex-1 text-ink-700">
              {m.what}{' '}
              <a
                href={sourceHref(m)}
                target={m.sheet ? undefined : '_blank'}
                rel={m.sheet ? undefined : 'noreferrer'}
                title={m.source.name}
                className={LINK}
              >
                {m.sheet ? `notebook, pages ${m.sheet.page}` : 'source ↗'}
              </a>
            </span>
          </li>
        ))}
      </ul>

      {NOTEBOOK_MOVES.length > 0 && (
        <>
          <h3 className="mt-10 font-serif text-lg text-ink-900">
            Where the black notebook puts them
          </h3>
          <Figure
            id="nb"
            lay={NOTEBOOK}
            height={NH}
            label={`${placesOf(NOTEBOOK_MOVES).length} places the black notebook names, joined by ${NOTEBOOK_MOVES.length} dated arrows in the order she wrote them.`}
          >
            <text x={110} y={30} className="fill-current text-[11px] font-semibold">
              North America, at one scale
            </text>
          </Figure>
          {DATA.notebookMeans && <p className="prose-note mt-3 max-w-3xl">{DATA.notebookMeans}</p>}
          <ul className="mt-4 max-w-3xl">
            {years.map((y) => {
              const legs = legsOf(y);
              const m = legs[0];
              return (
                <li
                  key={y}
                  className="flex items-baseline gap-3 border-b border-ink-100 py-1.5 text-[13px]"
                >
                  <span className="tabular w-10 shrink-0 text-ink-500">{y}</span>
                  <span className="min-w-0 flex-1 text-ink-700">
                    <span className="text-ink-900">{chain(legs).join(' → ')}</span>
                    <span className="block text-[12.5px] text-ink-600">
                      {m.what}{' '}
                      <a
                        href={sourceHref(m)}
                        target={m.sheet ? undefined : '_blank'}
                        rel={m.sheet ? undefined : 'noreferrer'}
                        title={m.source.name}
                        className={LINK}
                      >
                        {m.sheet ? `notebook, pages ${m.sheet.page}` : 'source ↗'}
                      </a>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
