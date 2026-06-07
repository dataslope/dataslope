/**
 * Illustrations for the "Thinking like a programmer" chapter.
 *
 * how-computers-execute-programs → the fetch / decode / execute cycle;
 * computational-thinking          → decomposition: a big problem into pieces;
 * problem-solving                 → a clear path found through obstacles.
 */
import { P } from "./palette";
import { Arrow } from "./helpers";

function NodeGlyph({ kind, x, y, on }: { kind: "fetch" | "decode" | "execute"; x: number; y: number; on: string }) {
  if (kind === "fetch")
    return (
      <g style={{ stroke: on, strokeWidth: 3, strokeLinecap: "round", fill: "none" }}>
        <path d={`M${x} ${y - 9} v15`} />
        <path d={`M${x - 6} ${y} l6 6 l6 -6`} style={{ fill: on, stroke: "none" }} />
        <path d={`M${x - 9} ${y + 11} h18`} />
      </g>
    );
  if (kind === "execute")
    return <polygon points={`${x - 7},${y - 9} ${x + 9},${y} ${x - 7},${y + 9}`} style={{ fill: on }} />;
  // decode → three offset bars
  return (
    <g style={{ stroke: on, strokeWidth: 3, strokeLinecap: "round" }}>
      <line x1={x - 8} y1={y - 6} x2={x + 8} y2={y - 6} />
      <line x1={x - 8} y1={y} x2={x + 4} y2={y} />
      <line x1={x - 8} y1={y + 6} x2={x + 8} y2={y + 6} />
    </g>
  );
}

/* ── how-computers-execute-programs: the fetch-decode-execute loop ────────── */
export function CpuCycle() {
  const cx = 160;
  const cy = 120;
  // three stations around the centre chip
  const nodes = [
    { x: cx, y: 38, fill: P.blue, glyph: "fetch" as const }, // top
    { x: cx + 78, y: 158, fill: P.green, glyph: "execute" as const }, // bottom-right
    { x: cx - 78, y: 158, fill: P.yellow, glyph: "decode" as const }, // bottom-left
  ];
  return (
    <>
      {/* connecting arcs (clockwise) */}
      <path d={`M${cx + 26} 52 A 96 96 0 0 1 ${cx + 70} 128`} style={{ fill: "none", stroke: P.muted, strokeWidth: 2.4 }} />
      <Arrow x1={cx + 64} y1={116} x2={cx + 72} y2={132} color={P.muted} width={2.4} head={8} />
      <path d={`M${cx + 58} 176 A 96 96 0 0 1 ${cx - 58} 176`} style={{ fill: "none", stroke: P.muted, strokeWidth: 2.4 }} />
      <Arrow x1={cx - 44} y1={181} x2={cx - 62} y2={174} color={P.muted} width={2.4} head={8} />
      <path d={`M${cx - 70} 128 A 96 96 0 0 1 ${cx - 26} 52`} style={{ fill: "none", stroke: P.muted, strokeWidth: 2.4 }} />
      <Arrow x1={cx - 32} y1={64} x2={cx - 24} y2={48} color={P.muted} width={2.4} head={8} />

      {/* centre chip */}
      <g>
        <rect x={cx - 26} y={cy - 26} width={52} height={52} rx={9} style={{ fill: P.blue, opacity: 0.12 }} />
        <rect x={cx - 26} y={cy - 26} width={52} height={52} rx={9} style={{ fill: "none", stroke: P.blue, strokeWidth: 2.5 }} />
        <rect x={cx - 12} y={cy - 12} width={24} height={24} rx={4} style={{ fill: P.blue }} />
        {[-16, 0, 16].map((d) => (
          <g key={d} style={{ stroke: P.blue, strokeWidth: 2.5, strokeLinecap: "round" }}>
            <line x1={cx + d} y1={cy - 26} x2={cx + d} y2={cy - 33} />
            <line x1={cx + d} y1={cy + 26} x2={cx + d} y2={cy + 33} />
            <line x1={cx - 26} y1={cy + d} x2={cx - 33} y2={cy + d} />
            <line x1={cx + 26} y1={cy + d} x2={cx + 33} y2={cy + d} />
          </g>
        ))}
      </g>

      {/* stations */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={26} style={{ fill: n.fill }} />
          <NodeGlyph kind={n.glyph} x={n.x} y={n.y} on={n.glyph === "fetch" ? P.onFill : P.onLight} />
        </g>
      ))}
    </>
  );
}

/* ── computational-thinking: decompose a big problem into smaller ones ────── */
export function DecompositionSplit() {
  const smalls = [
    { x: 232, y: 36, fill: P.green },
    { x: 304, y: 36, fill: P.yellow },
    { x: 232, y: 108, fill: P.red },
    { x: 304, y: 108, fill: P.purple },
  ];
  return (
    <>
      {/* the big problem */}
      <rect x={24} y={48} width={96} height={96} rx={16} style={{ fill: P.blue }} />

      {/* split into pieces */}
      {smalls.map((s, i) => (
        <g key={i}>
          <Arrow x1={126} y1={96} x2={s.x - 6} y2={s.y + 24} color={P.muted} width={2.2} head={8} />
          <rect x={s.x} y={s.y} width={48} height={48} rx={11} style={{ fill: s.fill }} />
        </g>
      ))}
    </>
  );
}

/* ── problem-solving: a clear path found through the obstacles ────────────── */
export function MazePath() {
  // scattered obstacles
  const blocks = [
    [70, 30], [150, 70], [60, 120], [210, 40], [250, 120], [140, 150], [30, 70],
  ];
  return (
    <>
      {blocks.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={30} height={30} rx={7} style={{ fill: P.surface, stroke: P.line, strokeWidth: 1.5 }} />
      ))}

      {/* the worked-out path — a dotted trail from start to goal */}
      <path
        d="M24 176 C 90 176, 96 110, 150 120 S 230 180, 300 96"
        style={{ fill: "none", stroke: P.blue, strokeWidth: 4.5, strokeLinecap: "round", strokeDasharray: "0.5 11" }}
      />

      {/* start */}
      <circle cx={24} cy={176} r={9} style={{ fill: P.blue }} />
      {/* goal flag */}
      <line x1={300} y1={96} x2={300} y2={62} style={{ stroke: P.green700, strokeWidth: 3, strokeLinecap: "round" }} />
      <path d="M300 64 h22 l-6 8 l6 8 h-22 z" style={{ fill: P.green }} />
    </>
  );
}
