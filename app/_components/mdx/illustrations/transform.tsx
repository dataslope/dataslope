/**
 * Illustrations for the "Data transformation" chapter.
 *
 * map-filter-reduce  → a left-to-right pipeline: transform each, keep some,
 *                      fold to one;
 * functional-intuition → composition: a value flows through chained functions.
 */
import { P } from "./palette";
import { Arrow } from "./helpers";

// tiny stage glyphs drawn above each connector (no words)
function MapGlyph({ x }: { x: number }) {
  return (
    <g style={{ stroke: P.muted, strokeWidth: 2, strokeLinecap: "round", fill: "none" }}>
      <path d={`M${x - 8} 18 h12`} />
      <path d={`M${x + 1} 14 l4 4 l-4 4`} style={{ fill: P.muted, stroke: "none" }} />
      <path d={`M${x + 8} 30 h-12`} />
      <path d={`M${x - 1} 26 l-4 4 l4 4`} style={{ fill: P.muted, stroke: "none" }} />
    </g>
  );
}
function FilterGlyph({ x }: { x: number }) {
  return <path d={`M${x - 9} 14 h18 l-6 9 v8 l-6 4 v-12 z`} style={{ fill: P.muted }} />;
}
function ReduceGlyph({ x }: { x: number }) {
  return (
    <g style={{ stroke: P.muted, strokeWidth: 2, strokeLinecap: "round", fill: "none" }}>
      <path d={`M${x - 9} 14 l9 9 l-9 9`} />
      <path d={`M${x + 1} 23 h9`} />
    </g>
  );
}

/* ── map-filter-reduce: the three-stage pipeline ──────────────────────────── */
export function MfrPipeline() {
  const ys = [44, 88, 132, 176];
  const inputFills = [P.blue, P.green, P.yellow, P.red];

  return (
    <>
      {/* stage 1 — input */}
      {ys.map((y, i) => (
        <circle key={i} cx={32} cy={y} r={14} style={{ fill: inputFills[i] }} />
      ))}

      {/* map → recolor every item, same count */}
      <MapGlyph x={84} />
      {ys.map((y, i) => (
        <Arrow key={i} x1={50} y1={y} x2={120} y2={y} color={P.line} width={2} head={7} />
      ))}
      {ys.map((y, i) => (
        <rect key={i} x={124} y={y - 14} width={28} height={28} rx={7} style={{ fill: P.blue }} />
      ))}

      {/* filter → only some pass; two fall away */}
      <FilterGlyph x={196} />
      <Arrow x1={154} y1={ys[0]} x2={232} y2={70} color={P.line} width={2} head={7} />
      <Arrow x1={154} y1={ys[2]} x2={232} y2={150} color={P.line} width={2} head={7} />
      {/* dropped */}
      <rect x={166} y={ys[1] + 18} width={20} height={20} rx={5} style={{ fill: P.blue, opacity: 0.25 }} transform={`rotate(20 176 ${ys[1] + 28})`} />
      <rect x={166} y={ys[3] + 4} width={20} height={20} rx={5} style={{ fill: P.blue, opacity: 0.25 }} transform={`rotate(-15 176 ${ys[3] + 14})`} />
      <rect x={236} y={70 - 14} width={28} height={28} rx={7} style={{ fill: P.green }} />
      <rect x={236} y={150 - 14} width={28} height={28} rx={7} style={{ fill: P.green }} />

      {/* reduce → fold to one */}
      <ReduceGlyph x={308} />
      <Arrow x1={266} y1={70} x2={332} y2={104} color={P.line} width={2} head={7} />
      <Arrow x1={266} y1={150} x2={332} y2={116} color={P.line} width={2} head={7} />
      <circle cx={352} cy={110} r={20} style={{ fill: P.purple }} />
    </>
  );
}

/* ── functional-intuition: composition, a value flowing through f then g ───── */
export function ComposePipes() {
  const y = 70;
  const block = (x: number, fill: string) => (
    <g>
      <rect x={x} y={y - 34} width={56} height={68} rx={14} style={{ fill }} />
      {/* a small "process" chevron */}
      <path d={`M${x + 22} ${y - 12} l12 12 l-12 12`} style={{ fill: "none", stroke: P.onFill, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" }} />
    </g>
  );
  return (
    <>
      {/* in */}
      <circle cx={28} cy={y} r={16} style={{ fill: P.green }} />
      <Arrow x1={48} y1={y} x2={96} y2={y} color={P.ink} width={2.5} />
      {/* f */}
      {block(98, P.blue)}
      {/* intermediate value */}
      <Arrow x1={158} y1={y} x2={206} y2={y} color={P.ink} width={2.5} />
      <circle cx={186} cy={y} r={13} style={{ fill: P.yellow }} />
      {/* g */}
      {block(214, P.purple)}
      {/* out */}
      <Arrow x1={274} y1={y} x2={322} y2={y} color={P.ink} width={2.5} />
      <circle cx={348} cy={y} r={16} style={{ fill: P.red }} />
    </>
  );
}
