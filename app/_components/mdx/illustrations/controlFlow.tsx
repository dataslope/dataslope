/**
 * Illustrations for the "Control flow" chapter.
 *
 * conditionals → a decision diamond forking into a true/false branch;
 * loops       → a circular "repeat" arrow with an exit.
 */
import { P } from "./palette";
import { Arrow } from "./helpers";

/* ── conditionals: a decision splits the path two ways ────────────────────── */
export function BranchFork() {
  return (
    <>
      {/* entry */}
      <Arrow x1={180} y1={8} x2={180} y2={34} color={P.ink} width={2.5} />

      {/* the decision diamond */}
      <polygon
        points="180,34 222,74 180,114 138,74"
        style={{ fill: P.yellow }}
      />
      {/* a question mark drawn as a path, on the yellow diamond */}
      <path
        d="M171 64 a10 10 0 1 1 13 9 c-4 2 -4 4 -4 7"
        style={{
          fill: "none",
          stroke: P.onLight,
          strokeWidth: 3.4,
          strokeLinecap: "round",
        }}
      />
      <circle cx={180} cy={92} r={2.6} style={{ fill: P.onLight }} />

      {/* branches */}
      <Arrow x1={150} y1={98} x2={96} y2={150} color={P.green700} width={2.5} />
      <Arrow x1={210} y1={98} x2={264} y2={150} color={P.red600} width={2.5} />

      {/* true → green with a check */}
      <rect x={36} y={150} width={104} height={52} rx={13} style={{ fill: P.green }} />
      <path
        d="M68 176 l10 11 l20 -24"
        style={{ fill: "none", stroke: P.onFill, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" }}
      />

      {/* false → red with a cross */}
      <rect x={220} y={150} width={104} height={52} rx={13} style={{ fill: P.red }} />
      <g style={{ stroke: P.onFill, strokeWidth: 5, strokeLinecap: "round" }}>
        <line x1={258} y1={164} x2={286} y2={188} />
        <line x1={286} y1={164} x2={258} y2={188} />
      </g>
    </>
  );
}

/* ── loops-and-iteration: repeat the body, then exit ──────────────────────── */
export function LoopCycle() {
  const cx = 150;
  const cy = 108;
  const r = 60;
  // A near-complete ring with a gap at the top-right where the arrow re-enters.
  const a0 = -50; // start angle (deg)
  const a1 = 270; // end angle, sweeping clockwise most of the way round
  const rad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(rad(a0));
  const sy = cy + r * Math.sin(rad(a0));
  const ex = cx + r * Math.cos(rad(a1));
  const ey = cy + r * Math.sin(rad(a1));
  // three iteration ticks around the ring
  const ticks = [40, 130, 210].map((d) => ({
    x: cx + r * Math.cos(rad(d)),
    y: cy + r * Math.sin(rad(d)),
  }));
  return (
    <>
      {/* the repeat ring */}
      <path
        d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`}
        style={{ fill: "none", stroke: P.blue, strokeWidth: 7, strokeLinecap: "round" }}
      />
      {/* arrowhead closing the loop at the top */}
      <Arrow x1={ex - 1} y1={ey + 14} x2={ex + 6} y2={ey - 6} color={P.blue} width={7} head={15} />

      {/* iteration ticks */}
      {ticks.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={6} style={{ fill: P.paper, stroke: P.blue, strokeWidth: 3 }} />
      ))}

      {/* the loop body in the middle */}
      <rect x={cx - 24} y={cy - 20} width={48} height={40} rx={9} style={{ fill: P.blue, opacity: 0.18 }} />
      <rect x={cx - 24} y={cy - 20} width={48} height={40} rx={9} style={{ fill: "none", stroke: P.blue, strokeWidth: 2.5 }} />

      {/* exit when the condition fails */}
      <Arrow x1={cx + r - 6} y1={cy + 30} x2={262} y2={150} color={P.green700} width={3} />
      <rect x={256} y={150} width={56} height={44} rx={11} style={{ fill: P.green }} />
      <path
        d="M272 172 l7 8 l14 -17"
        style={{ fill: "none", stroke: P.onFill, strokeWidth: 4.5, strokeLinecap: "round", strokeLinejoin: "round" }}
      />
    </>
  );
}
