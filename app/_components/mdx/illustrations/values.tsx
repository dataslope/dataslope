/**
 * Illustrations for the "Values, variables, and types" chapter.
 *
 * Styles intentionally differ page to page: a flat token grid (types), a
 * line-art tag-and-box rebind (variables), a blueprint number line (numbers),
 * a filmstrip of indexed cells (strings), and a set-theory Venn (booleans).
 */
import { P } from "./palette";
import { Arrow } from "./helpers";

const MONO = "var(--font-mono, monospace)";

/* ── values-and-types: the built-in types as flat, glyph-only chips ───────── */
export function TypesAsTokens() {
  const tiles = [
    { x: 10, y: 12, fill: P.blue, glyph: "number" as const, on: P.onFill },
    { x: 136, y: 12, fill: P.green, glyph: "string" as const, on: P.onLight },
    { x: 262, y: 12, fill: P.yellow, glyph: "boolean" as const, on: P.onLight },
    { x: 10, y: 116, fill: P.red, glyph: "null" as const, on: P.onFill },
    { x: 136, y: 116, fill: P.purple, glyph: "object" as const, on: P.onFill },
    { x: 262, y: 116, fill: P.teal, glyph: "array" as const, on: P.onLight },
  ];
  return (
    <>
      {tiles.map((t, i) => {
        const cx = t.x + 54;
        const cy = t.y + 42;
        return (
          <g key={i}>
            <rect
              x={t.x}
              y={t.y}
              width={108}
              height={84}
              rx={16}
              style={{ fill: t.fill }}
            />
            <Glyph kind={t.glyph} cx={cx} cy={cy} color={t.on} />
          </g>
        );
      })}
    </>
  );
}

function Glyph({
  kind,
  cx,
  cy,
  color,
}: {
  kind: "number" | "string" | "boolean" | "null" | "object" | "array";
  cx: number;
  cy: number;
  color: string;
}) {
  const stroke = {
    stroke: color,
    strokeWidth: 4,
    strokeLinecap: "round" as const,
    fill: "none",
  };
  if (kind === "number") {
    // A hash "#" drawn as four strokes.
    return (
      <g style={stroke}>
        <line x1={cx - 7} y1={cy - 16} x2={cx - 11} y2={cy + 16} />
        <line x1={cx + 11} y1={cy - 16} x2={cx + 7} y2={cy + 16} />
        <line x1={cx - 17} y1={cy - 5} x2={cx + 17} y2={cy - 5} />
        <line x1={cx - 17} y1={cy + 7} x2={cx + 17} y2={cy + 7} />
      </g>
    );
  }
  if (kind === "string") {
    // Three "lines of text" of decreasing width.
    return (
      <g style={stroke}>
        <line x1={cx - 18} y1={cy - 12} x2={cx + 18} y2={cy - 12} />
        <line x1={cx - 18} y1={cy} x2={cx + 12} y2={cy} />
        <line x1={cx - 18} y1={cy + 12} x2={cx + 4} y2={cy + 12} />
      </g>
    );
  }
  if (kind === "boolean") {
    // A toggle switch in the "on" position.
    return (
      <g>
        <rect
          x={cx - 22}
          y={cy - 12}
          width={44}
          height={24}
          rx={12}
          style={{ fill: "none", stroke: color, strokeWidth: 3.5 }}
        />
        <circle cx={cx + 10} cy={cy} r={7} style={{ fill: color }} />
      </g>
    );
  }
  if (kind === "null") {
    // The empty-set sign: a ring with a slash.
    return (
      <g style={{ stroke: color, strokeWidth: 4, fill: "none" }}>
        <circle cx={cx} cy={cy} r={16} />
        <line
          x1={cx - 13}
          y1={cy + 13}
          x2={cx + 13}
          y2={cy - 13}
          style={{ strokeLinecap: "round" }}
        />
      </g>
    );
  }
  if (kind === "object") {
    // Three key→value rows (a small record).
    return (
      <g>
        {[-13, 0, 13].map((dy, i) => (
          <g key={i}>
            <circle cx={cx - 16} cy={cy + dy} r={3.2} style={{ fill: color }} />
            <line
              x1={cx - 7}
              y1={cy + dy}
              x2={cx + 17}
              y2={cy + dy}
              style={{ stroke: color, strokeWidth: 3, strokeLinecap: "round" }}
            />
          </g>
        ))}
      </g>
    );
  }
  // array: three little cells in a row.
  return (
    <g style={{ fill: "none", stroke: color, strokeWidth: 3 }}>
      <rect x={cx - 24} y={cy - 9} width={16} height={18} rx={3} />
      <rect x={cx - 8} y={cy - 9} width={16} height={18} rx={3} />
      <rect x={cx + 8} y={cy - 9} width={16} height={18} rx={3} />
    </g>
  );
}

/* ── variables-and-state: a name (tag) rebound from one value to another ──── */
export function VariableRebind() {
  return (
    <>
      {/* the name — a luggage tag */}
      <g>
        <path
          d="M28 78 h74 a14 14 0 0 1 14 14 v16 a14 14 0 0 1 -14 14 h-74 l-16 -22 z"
          style={{ fill: P.blue }}
        />
        <circle cx={28} cy={100} r={5} style={{ fill: P.paper }} />
      </g>

      {/* old binding — faded */}
      <rect
        x={250}
        y={20}
        width={104}
        height={56}
        rx={12}
        style={{ fill: "none", stroke: P.line, strokeWidth: 2 }}
      />
      <circle cx={302} cy={48} r={15} style={{ fill: P.muted, opacity: 0.5 }} />
      <Arrow x1={120} y1={92} x2={246} y2={56} color={P.muted} width={2} dashed />

      {/* current binding */}
      <rect
        x={250}
        y={120}
        width={104}
        height={56}
        rx={12}
        style={{ fill: "none", stroke: P.green, strokeWidth: 2.5 }}
      />
      <circle cx={302} cy={148} r={15} style={{ fill: P.green }} />
      <Arrow x1={120} y1={108} x2={246} y2={148} color={P.blue} width={3} />
    </>
  );
}

/* ── numbers-and-arithmetic: a number line with one "+" hop (blueprint) ───── */
export function NumberLine() {
  const y = 112;
  const x0 = 24;
  const x1 = 356;
  const step = (x1 - x0) / 10;
  const ticks = Array.from({ length: 11 }, (_, i) => x0 + i * step);
  const zeroX = ticks[5];
  return (
    <>
      {/* faint blueprint grid */}
      {ticks.map((tx, i) => (
        <line
          key={i}
          x1={tx}
          y1={28}
          x2={tx}
          y2={150}
          style={{ stroke: P.line, strokeWidth: 1, opacity: 0.5 }}
        />
      ))}

      {/* a "+3" hop above the line */}
      <path
        d={`M ${zeroX} ${y - 6} C ${zeroX + step} ${y - 56}, ${zeroX + 2 * step} ${y - 56}, ${zeroX + 3 * step} ${y - 6}`}
        style={{ fill: "none", stroke: P.blue, strokeWidth: 3 }}
      />
      <Arrow
        x1={zeroX + 3 * step - 12}
        y1={y - 22}
        x2={zeroX + 3 * step}
        y2={y - 6}
        color={P.blue}
        width={3}
        head={8}
      />

      {/* the axis */}
      <Arrow
        x1={x0}
        y1={y}
        x2={x1}
        y2={y}
        color={P.ink}
        width={2.5}
        double
        head={10}
      />
      {ticks.map((tx, i) => (
        <line
          key={i}
          x1={tx}
          y1={y - (i === 5 ? 12 : 7)}
          x2={tx}
          y2={y + (i === 5 ? 12 : 7)}
          style={{ stroke: P.ink, strokeWidth: i === 5 ? 3 : 2 }}
        />
      ))}
      <text
        x={zeroX}
        y={y + 30}
        textAnchor="middle"
        style={{ fill: P.muted, font: `600 13px ${MONO}` }}
      >
        0
      </text>
    </>
  );
}

/* ── strings-and-text: characters in indexed cells (filmstrip + ruler) ────── */
export function StringCells() {
  const chars = ["H", "e", "l", "l", "o"];
  const size = 60;
  const gap = 10;
  const x0 = 22;
  const y = 26;
  return (
    <>
      {chars.map((ch, i) => {
        const x = x0 + i * (size + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={size}
              height={size}
              rx={10}
              style={{ fill: P.blue, opacity: i === 0 ? 1 : 0.16 }}
            />
            <rect
              x={x}
              y={y}
              width={size}
              height={size}
              rx={10}
              style={{ fill: "none", stroke: P.blue, strokeWidth: 2 }}
            />
            <text
              x={x + size / 2}
              y={y + size / 2 + 9}
              textAnchor="middle"
              style={{
                fill: i === 0 ? P.onFill : P.ink,
                font: `500 26px ${MONO}`,
              }}
            >
              {ch}
            </text>
            {/* index ruler */}
            <line
              x1={x + size / 2}
              y1={y + size + 8}
              x2={x + size / 2}
              y2={y + size + 16}
              style={{ stroke: P.muted, strokeWidth: 2 }}
            />
            <text
              x={x + size / 2}
              y={y + size + 33}
              textAnchor="middle"
              style={{ fill: P.muted, font: `600 13px ${MONO}` }}
            >
              {i}
            </text>
          </g>
        );
      })}
    </>
  );
}

/* ── booleans-and-logic: two conditions overlapping (set Venn) ────────────── */
export function BooleanVenn() {
  // Circles centered on the same y, the lens (AND) carved from their overlap.
  const cyc = 100;
  const r = 64;
  const lx = 150;
  const rx = 226;
  // Intersection points (both circles share radius r): vertical line at the
  // midpoint x, offset ±h in y.
  const midX = (lx + rx) / 2;
  const d = (rx - lx) / 2;
  const h = Math.sqrt(r * r - d * d);
  const top = `${midX} ${cyc - h}`;
  const bot = `${midX} ${cyc + h}`;
  return (
    <>
      <circle cx={lx} cy={cyc} r={r} style={{ fill: P.blue, opacity: 0.85 }} />
      <circle cx={rx} cy={cyc} r={r} style={{ fill: P.green, opacity: 0.85 }} />
      {/* the AND lens */}
      <path
        d={`M ${top} A ${r} ${r} 0 0 1 ${bot} A ${r} ${r} 0 0 1 ${top} Z`}
        style={{ fill: P.teal }}
      />
      {/* thin definition so the shapes read on a white page */}
      <circle
        cx={lx}
        cy={cyc}
        r={r}
        style={{ fill: "none", stroke: P.blue, strokeWidth: 1.5 }}
      />
      <circle
        cx={rx}
        cy={cyc}
        r={r}
        style={{ fill: "none", stroke: P.green, strokeWidth: 1.5 }}
      />
    </>
  );
}
