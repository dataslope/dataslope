/**
 * Illustrations for the "Engineering foundations" chapter.
 *
 * debugging-and-reasoning → a magnifier and a bug over a block of code;
 * maintainable-code       → tangled vs. tidy, side by side;
 * modular-organization    → modules that plug into one another;
 * next-steps              → a road ahead with milestones.
 */
import { P } from "./palette";

/* ── debugging-and-reasoning: hunt the bug in the code ────────────────────── */
export function BugMagnifier() {
  return (
    <>
      {/* code block */}
      <rect x={24} y={28} width={210} height={144} rx={14} style={{ fill: P.surface, stroke: P.line, strokeWidth: 1.5 }} />
      {[
        { y: 52, w: 120, c: P.blue },
        { y: 74, w: 150, c: P.green },
        { y: 96, w: 96, c: P.yellow600 },
        { y: 118, w: 140, c: P.blue },
        { y: 140, w: 80, c: P.green },
      ].map((l, i) => (
        <g key={i}>
          <circle cx={42} cy={l.y} r={3} style={{ fill: P.muted }} />
          <rect x={54} y={l.y - 5} width={l.w} height={10} rx={5} style={{ fill: l.c, opacity: 0.55 }} />
        </g>
      ))}

      {/* the bug */}
      <g>
        <ellipse cx={150} cy={120} rx={15} ry={18} style={{ fill: P.red }} />
        <line x1={150} y1={104} x2={150} y2={136} style={{ stroke: P.red700, strokeWidth: 2 }} />
        <g style={{ stroke: P.red, strokeWidth: 3, strokeLinecap: "round" }}>
          <line x1={135} y1={112} x2={123} y2={106} />
          <line x1={135} y1={122} x2={121} y2={122} />
          <line x1={135} y1={132} x2={123} y2={140} />
          <line x1={165} y1={112} x2={177} y2={106} />
          <line x1={165} y1={122} x2={179} y2={122} />
          <line x1={165} y1={132} x2={177} y2={140} />
        </g>
        <circle cx={144} cy={110} r={2.4} style={{ fill: P.onFill }} />
        <circle cx={156} cy={110} r={2.4} style={{ fill: P.onFill }} />
      </g>

      {/* magnifier over the bug */}
      <circle cx={150} cy={120} r={40} style={{ fill: P.blue, opacity: 0.08 }} />
      <circle cx={150} cy={120} r={40} style={{ fill: "none", stroke: P.blue, strokeWidth: 5 }} />
      <line x1={180} y1={150} x2={214} y2={184} style={{ stroke: P.blue, strokeWidth: 9, strokeLinecap: "round" }} />
    </>
  );
}

/* ── maintainable-code: tangled vs. tidy ──────────────────────────────────── */
export function TangleVsTidy() {
  return (
    <>
      {/* messy */}
      <rect x={14} y={22} width={150} height={140} rx={14} style={{ fill: P.red, opacity: 0.06 }} />
      <path
        d="M40 60 C 120 30, 60 90, 130 70 S 50 120, 120 130 C 150 138, 70 150, 44 120 S 130 96, 60 96"
        style={{ fill: "none", stroke: P.red, strokeWidth: 3.5, strokeLinecap: "round" }}
      />

      {/* tidy */}
      <rect x={196} y={22} width={150} height={140} rx={14} style={{ fill: P.green, opacity: 0.06 }} />
      {[44, 70, 96, 122].map((y, i) => (
        <g key={i}>
          <circle cx={216} cy={y} r={5} style={{ fill: P.green }} />
          <rect x={230} y={y - 6} width={[96, 70, 104, 58][i]} height={12} rx={6} style={{ fill: P.green, opacity: 0.6 }} />
        </g>
      ))}
    </>
  );
}

/* ── modular-organization: modules that plug together ─────────────────────── */
export function ModulesBlocks() {
  // each module is a rounded block with a plug (export) on the right and a
  // socket (import) on the left — except the ends.
  const blockBody = (x: number, fill: string) => (
    <g>
      <rect x={x} y={50} width={86} height={76} rx={14} style={{ fill }} />
      {[66, 82, 98].map((y, i) => (
        <rect key={i} x={x + 14} y={y} width={[44, 58, 34][i]} height={8} rx={4} style={{ fill: P.onFill, opacity: 0.85 }} />
      ))}
    </g>
  );
  return (
    <>
      {/* module A — plug on right */}
      {blockBody(24, P.blue)}
      <rect x={110} y={78} width={16} height={20} rx={5} style={{ fill: P.blue }} />

      {/* module B — socket on left, plug on right */}
      <rect x={132} y={78} width={14} height={20} rx={5} style={{ fill: P.surface, stroke: P.green, strokeWidth: 2 }} />
      {blockBody(146, P.green)}
      <rect x={232} y={78} width={16} height={20} rx={5} style={{ fill: P.green }} />

      {/* module C — socket on left */}
      <rect x={254} y={78} width={14} height={20} rx={5} style={{ fill: P.surface, stroke: P.yellow600, strokeWidth: 2 }} />
      {blockBody(268, P.yellow)}
    </>
  );
}

/* ── next-steps: the road ahead, with milestones ──────────────────────────── */
export function Roadmap() {
  const flag = (x: number, y: number, fill: string) => (
    <g>
      <line x1={x} y1={y} x2={x} y2={y - 30} style={{ stroke: P.muted, strokeWidth: 3, strokeLinecap: "round" }} />
      <path d={`M${x} ${y - 30} h22 l-6 7 l6 7 h-22 z`} style={{ fill }} />
      <circle cx={x} cy={y} r={6} style={{ fill }} />
    </g>
  );
  return (
    <>
      {/* the road */}
      <path
        d="M16 178 C 90 178, 96 96, 170 96 S 250 40, 326 40"
        style={{ fill: "none", stroke: P.surface, strokeWidth: 22, strokeLinecap: "round" }}
      />
      <path
        d="M16 178 C 90 178, 96 96, 170 96 S 250 40, 326 40"
        style={{ fill: "none", stroke: P.blue, strokeWidth: 3, strokeLinecap: "round", strokeDasharray: "2 16", opacity: 0.8 }}
      />
      {/* start */}
      <circle cx={16} cy={178} r={8} style={{ fill: P.blue }} />
      {/* milestones */}
      {flag(118, 150, P.green)}
      {flag(212, 78, P.yellow)}
      {flag(312, 40, P.red)}
    </>
  );
}
