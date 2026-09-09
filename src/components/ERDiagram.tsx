/**
 * A small entity-relationship renderer, for reading the ledgers as data models.
 *
 * Hand-laid rather than auto-laid, and deliberately: there are five diagrams on
 * this site, each is a dozen boxes, and a layout engine would cost more than it
 * saves while making every diagram move whenever one attribute is added. Every
 * box carries an explicit `x`, `y` and `w`; the renderer computes only the
 * heights, the elbows and the crow's feet, which are the parts that are tedious
 * to keep consistent by hand.
 *
 * The notation is ordinary crow's foot, because it is the one an ER diagram is
 * expected to be in: a bar is one, a foot is many, a circle is optional. What
 * is *not* ordinary is what the diagrams say — a dashed box is an entity the
 * leaf never separates out, and a dashed relationship is a join the books do not
 * enforce. Those two conventions carry most of the argument, since the
 * interesting thing about these schemas is consistently what they leave
 * implicit.
 */

export type Card = 'one' | 'many' | 'zero-one' | 'zero-many';
export type Side = 'l' | 'r' | 't' | 'b';

export interface ErAttr {
  name: string;
  /** `pk` is drawn underlined, `fk` in the brand colour — the usual reading. */
  key?: 'pk' | 'fk';
  /** What the leaf actually writes in that field, quoted where possible. */
  note?: string;
  /**
   * The pen. `red` is Jo Hopper's receipt ink, which is a status field written
   * in a second colour; `edward` is the one hand that is not hers.
   */
  ink?: 'red' | 'edward';
}

export interface ErEntity {
  id: string;
  title: string;
  /** A word on what one row of it is. */
  sub?: string;
  x: number;
  y: number;
  w: number;
  attrs: ErAttr[];
  /** Dashed: a table the leaf implies but never rules as one. */
  ghost?: boolean;
}

export interface ErRel {
  from: string;
  to: string;
  fromSide: Side;
  toSide: Side;
  fromCard: Card;
  toCard: Card;
  /** Where on the edge to attach, 0 to 1. */
  fromAt?: number;
  toAt?: number;
  label?: string;
  /** Position of the label, in diagram coordinates. */
  labelAt?: { x: number; y: number };
  /** The x (or y) of the elbow, when the midpoint is not where it should be. */
  bend?: number;
  /** Dashed: a join nothing in the books enforces. */
  dashed?: boolean;
}

export interface ErModel {
  w: number;
  h: number;
  entities: ErEntity[];
  rels: ErRel[];
  /** Read out to a screen reader in place of the picture. */
  aria: string;
}

const HEAD = 28;
const ROW = 17;
const FOOT = 8;
/**
 * How far the connector leaves the box before the elbow is measured.
 *
 * Zero, and deliberately: the markers are drawn *on* the line, the way every
 * ER tool draws them — the crow's foot's middle prong lies along it, the bar
 * crosses it, and the optional circle is filled with the page colour so it
 * punches a hole in it. A positive gap here detached every marker from its own
 * connector and left a row of dashes floating between the boxes.
 */
const GAP = 0;

const boxH = (e: ErEntity) => HEAD + e.attrs.length * ROW + FOOT;

interface Anchor {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

function anchor(e: ErEntity, side: Side, at = 0.5): Anchor {
  const h = boxH(e);
  if (side === 'l') return { x: e.x, y: e.y + h * at, nx: -1, ny: 0 };
  if (side === 'r') return { x: e.x + e.w, y: e.y + h * at, nx: 1, ny: 0 };
  if (side === 't') return { x: e.x + e.w * at, y: e.y, nx: 0, ny: -1 };
  return { x: e.x + e.w * at, y: e.y + h, nx: 0, ny: 1 };
}

/** An orthogonal path between the two markers' outer ends. */
function elbow(a: Anchor, b: Anchor, bend?: number): string {
  const a2 = { x: a.x + a.nx * GAP, y: a.y + a.ny * GAP };
  const b2 = { x: b.x + b.nx * GAP, y: b.y + b.ny * GAP };
  const aH = a.ny === 0;
  const bH = b.ny === 0;
  if (aH && bH) {
    const mx = bend ?? (a2.x + b2.x) / 2;
    return `M ${a2.x} ${a2.y} L ${mx} ${a2.y} L ${mx} ${b2.y} L ${b2.x} ${b2.y}`;
  }
  if (!aH && !bH) {
    const my = bend ?? (a2.y + b2.y) / 2;
    return `M ${a2.x} ${a2.y} L ${a2.x} ${my} L ${b2.x} ${my} L ${b2.x} ${b2.y}`;
  }
  const c = aH ? { x: b2.x, y: a2.y } : { x: a2.x, y: b2.y };
  return `M ${a2.x} ${a2.y} L ${c.x} ${c.y} L ${b2.x} ${b2.y}`;
}

/**
 * The cardinality marker, drawn at the box edge and reaching outwards.
 *
 * The crow's foot's prongs touch the entity, which is the way round that reads
 * correctly: the many-end fans out against the table it multiplies.
 */
function Marker({ a, card }: { a: Anchor; card: Card }) {
  const { x, y, nx, ny } = a;
  const px = -ny;
  const py = nx;
  const p = (d: number, s = 0) => `${x + nx * d + px * s} ${y + ny * d + py * s}`;
  const many = card === 'many' || card === 'zero-many';
  const optional = card === 'zero-one' || card === 'zero-many';
  const stroke = 'var(--color-ink-500)';
  return (
    <g fill="none" stroke={stroke} strokeWidth={1.1} strokeLinecap="round">
      {many ? (
        <>
          <path d={`M ${p(13)} L ${p(0)}`} />
          <path d={`M ${p(13)} L ${p(0, 5.5)}`} />
          <path d={`M ${p(13)} L ${p(0, -5.5)}`} />
        </>
      ) : (
        <path d={`M ${p(10, 5.5)} L ${p(10, -5.5)}`} />
      )}
      {optional && <circle cx={x + nx * 17.5} cy={y + ny * 17.5} r={3.4} fill="var(--color-ink-50)" />}
    </g>
  );
}

function Box({ e }: { e: ErEntity }) {
  const h = boxH(e);
  return (
    <g>
      <rect
        x={e.x}
        y={e.y}
        width={e.w}
        height={h}
        rx={5}
        fill="#fff"
        stroke={e.ghost ? 'var(--color-ink-300)' : 'var(--color-ink-400)'}
        strokeWidth={e.ghost ? 1 : 1.2}
        strokeDasharray={e.ghost ? '4 3' : undefined}
      />
      <path
        d={`M ${e.x} ${e.y + HEAD} H ${e.x + e.w}`}
        stroke="var(--color-ink-300)"
        strokeWidth={1}
      />
      <text
        x={e.x + 9}
        y={e.y + 18}
        fontSize={12}
        fontWeight={600}
        fill="var(--color-ink-900)"
        style={{ letterSpacing: '0.02em' }}
      >
        {e.title}
      </text>
      {e.sub && (
        <text x={e.x + e.w - 9} y={e.y + 18} fontSize={9.5} textAnchor="end" fill="var(--color-ink-400)">
          {e.sub}
        </text>
      )}
      {e.attrs.map((a, i) => {
        const y = e.y + HEAD + i * ROW + 12;
        const fill =
          a.ink === 'red'
            ? 'var(--color-alerte-600)'
            : a.ink === 'edward'
              ? 'var(--color-edward-500)'
              : a.key === 'fk'
                ? 'var(--color-brand-700)'
                : 'var(--color-ink-700)';
        return (
          <g key={a.name}>
            {a.key && (
              <text x={e.x + 9} y={y} fontSize={8} fill="var(--color-ink-400)" fontFamily="var(--font-mono)">
                {a.key.toUpperCase()}
              </text>
            )}
            <text
              x={e.x + (a.key ? 30 : 9)}
              y={y}
              fontSize={10.5}
              fill={fill}
              textDecoration={a.key === 'pk' ? 'underline' : undefined}
            >
              {a.name}
            </text>
            {a.note && (
              <text x={e.x + e.w - 9} y={y} fontSize={9} textAnchor="end" fill="var(--color-ink-400)">
                {a.note}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function ERDiagram({ model, className = '' }: { model: ErModel; className?: string }) {
  const byId = new Map(model.entities.map((e) => [e.id, e]));
  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg
        viewBox={`0 0 ${model.w} ${model.h}`}
        className="h-auto w-full"
        style={{ minWidth: Math.min(model.w, 640) }}
        role="img"
        aria-label={model.aria}
      >
        {model.rels.map((r, i) => {
          const from = byId.get(r.from);
          const to = byId.get(r.to);
          if (!from || !to) return null;
          const a = anchor(from, r.fromSide, r.fromAt);
          const b = anchor(to, r.toSide, r.toAt);
          return (
            <g key={`${r.from}-${r.to}-${i}`}>
              <path
                d={elbow(a, b, r.bend)}
                fill="none"
                stroke="var(--color-ink-500)"
                strokeWidth={1.1}
                strokeDasharray={r.dashed ? '5 4' : undefined}
              />
              <Marker a={a} card={r.fromCard} />
              <Marker a={b} card={r.toCard} />
              {r.label && r.labelAt && (
                <text
                  x={r.labelAt.x}
                  y={r.labelAt.y}
                  fontSize={9.5}
                  textAnchor="middle"
                  fill="var(--color-ink-500)"
                >
                  <tspan
                    style={{ paintOrder: 'stroke' }}
                    stroke="var(--color-ink-50)"
                    strokeWidth={4}
                  >
                    {r.label}
                  </tspan>
                </text>
              )}
            </g>
          );
        })}
        {model.entities.map((e) => (
          <Box key={e.id} e={e} />
        ))}
      </svg>
    </div>
  );
}

/** The notation, said once, under the first diagram that uses it. */
export function ERLegend() {
  const item = (svg: React.ReactNode, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      <svg width={26} height={12} viewBox="0 0 26 12" aria-hidden="true" className="shrink-0">
        {svg}
      </svg>
      <span>{label}</span>
    </span>
  );
  const s = { stroke: 'var(--color-ink-500)', strokeWidth: 1.1, fill: 'none' } as const;
  return (
    <p className="prose-note mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
      {item(
        <>
          <path d="M 26 6 L 8 6" {...s} />
          <path d="M 8 1 L 8 11" {...s} />
        </>,
        'exactly one',
      )}
      {item(
        <>
          <path d="M 26 6 L 13 6" {...s} />
          <path d="M 13 6 L 2 1 M 13 6 L 2 6 M 13 6 L 2 11" {...s} />
        </>,
        'many',
      )}
      {item(
        <>
          <path d="M 26 6 L 15 6" {...s} />
          <circle cx={17} cy={6} r={3.2} {...s} fill="var(--color-ink-50)" />
          <path d="M 12 6 L 2 1 M 12 6 L 2 6 M 12 6 L 2 11" {...s} />
        </>,
        'none or many',
      )}
      {item(<rect x={1} y={1} width={24} height={10} rx={2} {...s} strokeDasharray="4 3" />, 'a table the leaf never rules')}
      {item(<path d="M 1 6 L 25 6" {...s} strokeDasharray="5 4" />, 'a join nothing enforces')}
    </p>
  );
}
