/**
 * Illustrations for the "Composite data" chapter.
 *
 * arrays      → indexed cells holding values (zero-based);
 * objects     → named slots (key → value), a small record card;
 * nested-data → arrays and objects nested into a small tree.
 */
import { P } from "./palette";

const MONO = "var(--font-mono, monospace)";
const CELL_FILLS = [P.blue, P.green, P.yellow, P.red, P.purple];

/* ── arrays: a row of indexed cells, value dots inside ────────────────────── */
export function ArrayCells() {
  const n = 5;
  const size = 58;
  const gap = 8;
  const x0 = 18;
  const y = 22;
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const x = x0 + i * (size + gap);
        const dotFill = CELL_FILLS[i % CELL_FILLS.length];
        const onLight = dotFill === P.yellow;
        return (
          <g key={i}>
            <rect x={x} y={y} width={size} height={size} rx={11} style={{ fill: P.surface, stroke: P.line, strokeWidth: 1.5 }} />
            <circle cx={x + size / 2} cy={y + size / 2} r={15} style={{ fill: dotFill }} />
            <circle cx={x + size / 2} cy={y + size / 2} r={5} style={{ fill: onLight ? P.onLight : P.onFill, opacity: 0.85 }} />
            {/* index */}
            <text x={x + size / 2} y={y + size + 22} textAnchor="middle" style={{ fill: P.muted, font: `600 14px ${MONO}` }}>
              {i}
            </text>
          </g>
        );
      })}
      {/* bracket framing to read as "one array" */}
      <path d={`M10 ${y - 4} q-4 0 -4 6 v${size - 4} q0 6 4 6`} style={{ fill: "none", stroke: P.muted, strokeWidth: 2.5, strokeLinecap: "round" }} />
      <path d={`M${x0 + n * (size + gap) - gap + 8} ${y - 4} q4 0 4 6 v${size - 4} q0 6 -4 6`} style={{ fill: "none", stroke: P.muted, strokeWidth: 2.5, strokeLinecap: "round" }} />
    </>
  );
}

/* ── objects: a record card of key → value rows ───────────────────────────── */
export function ObjectRecord() {
  const rows = [
    { key: P.blue, val: "dot" as const, valFill: P.green },
    { key: P.green, val: "bar" as const, valFill: P.yellow },
    { key: P.yellow, val: "dot" as const, valFill: P.red },
    { key: P.red, val: "bar" as const, valFill: P.purple },
  ];
  const x = 70;
  const w = 232;
  const top = 22;
  const rh = 38;
  return (
    <>
      {/* the card */}
      <rect x={x} y={top} width={w} height={rows.length * rh + 20} rx={16} style={{ fill: P.surface, stroke: P.line, strokeWidth: 1.5 }} />
      {/* brace on the left to read as an object literal */}
      <path
        d={`M58 ${top} q-12 0 -12 14 v${(rows.length * rh) / 2 - 8} q0 10 -8 12 q8 2 8 12 v${(rows.length * rh) / 2 - 8} q0 14 12 14`}
        style={{ fill: "none", stroke: P.purple, strokeWidth: 3, strokeLinecap: "round" }}
      />
      {rows.map((r, i) => {
        const cy = top + 28 + i * rh;
        return (
          <g key={i}>
            {/* key pill */}
            <rect x={x + 18} y={cy - 11} width={46} height={22} rx={11} style={{ fill: r.key }} />
            {/* colon */}
            <circle cx={x + 80} cy={cy} r={2.4} style={{ fill: P.muted }} />
            {/* value */}
            {r.val === "dot" ? (
              <circle cx={x + 120} cy={cy} r={11} style={{ fill: r.valFill }} />
            ) : (
              <rect x={x + 104} y={cy - 8} width={96} height={16} rx={8} style={{ fill: r.valFill }} />
            )}
          </g>
        );
      })}
    </>
  );
}

/* ── nested-data: arrays and objects nested into a tree ───────────────────── */
export function NestedTree() {
  // root object → two children: an array (with leaves) and an object (with leaves)
  const root = { x: 180, y: 30 };
  const left = { x: 92, y: 104 };
  const right = { x: 268, y: 104 };
  const leaves = [
    { x: 44, y: 176, fill: P.yellow },
    { x: 100, y: 176, fill: P.yellow },
    { x: 156, y: 176, fill: P.yellow },
    { x: 240, y: 176, fill: P.red },
    { x: 296, y: 176, fill: P.red },
  ];
  const node = (cx: number, cy: number, fill: string, kind: "obj" | "arr") => (
    <g>
      <rect x={cx - 22} y={cy - 18} width={44} height={36} rx={10} style={{ fill }} />
      {kind === "obj" ? (
        <g style={{ stroke: P.onFill, strokeWidth: 2.6, strokeLinecap: "round" }}>
          <line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} />
          <line x1={cx - 9} y1={cy - 7} x2={cx + 9} y2={cy - 7} />
          <line x1={cx - 9} y1={cy + 7} x2={cx + 2} y2={cy + 7} />
        </g>
      ) : (
        <g style={{ fill: "none", stroke: P.onLight, strokeWidth: 2.2 }}>
          <rect x={cx - 13} y={cy - 6} width={8} height={12} rx={2} />
          <rect x={cx - 4} y={cy - 6} width={8} height={12} rx={2} />
          <rect x={cx + 5} y={cy - 6} width={8} height={12} rx={2} />
        </g>
      )}
    </g>
  );
  return (
    <>
      {/* edges */}
      {[left, right].map((c, i) => (
        <line key={i} x1={root.x} y1={root.y + 16} x2={c.x} y2={c.y - 16} style={{ stroke: P.line, strokeWidth: 2.5 }} />
      ))}
      {leaves.slice(0, 3).map((l, i) => (
        <line key={i} x1={left.x} y1={left.y + 16} x2={l.x} y2={l.y - 14} style={{ stroke: P.line, strokeWidth: 2.5 }} />
      ))}
      {leaves.slice(3).map((l, i) => (
        <line key={i} x1={right.x} y1={right.y + 16} x2={l.x} y2={l.y - 14} style={{ stroke: P.line, strokeWidth: 2.5 }} />
      ))}

      {/* leaves */}
      {leaves.map((l, i) => (
        <circle key={i} cx={l.x} cy={l.y} r={13} style={{ fill: l.fill }} />
      ))}

      {/* branch nodes */}
      {node(left.x, left.y, P.teal, "arr")}
      {node(right.x, right.y, P.purple, "obj")}
      {/* root */}
      {node(root.x, root.y, P.blue, "obj")}
    </>
  );
}
