import React from "react";
import { BINOMIAL, BERNOULLI, expPdf, GEOMETRIC, normalPdf, POISSON } from "./data";
import { DIST, DIST_FILL } from "./parts";

export type MiniKind = "bernoulli" | "binomial" | "poisson" | "geometric" | "uniform" | "exponential" | "normal";

/** Each named distribution's own probabilities, as its figure draws them. */
const BARS: Partial<Record<MiniKind, readonly number[]>> = {
  bernoulli: BERNOULLI.pmf,
  binomial: BINOMIAL.pmf.slice(0, 17),
  poisson: POISSON.pmf.slice(0, 11),
  geometric: GEOMETRIC.pmf.slice(0, 14),
};

/** The three continuous shapes, as the lesson's own "continuous families"
 *  chart draws them: the same mean of 2 on 0 to 6. */
const CURVES: Partial<Record<MiniKind, (x: number) => number>> = {
  uniform: (x) => (x >= 0 && x <= 4 ? 0.25 : 0),
  exponential: (x) => expPdf(x, 2),
  normal: (x) => normalPdf(x, 2, 0.8),
};

/**
 * A distribution's silhouette in a box: bars for a count, a filled curve for
 * a measurement, scaled to the box's height. `p` draws it in from the left.
 * Rendered inside an <svg>.
 */
export const Mini: React.FC<{
  kind: MiniKind;
  x: number;
  top: number;
  w: number;
  h: number;
  p?: number;
  color?: string;
  fill?: string;
}> = ({ kind, x, top, w, h, p = 1, color = DIST, fill = DIST_FILL }) => {
  if (p <= 0) return null;
  const base = top + h;
  const bars = BARS[kind];
  if (bars) {
    const max = Math.max(...bars);
    const step = w / bars.length;
    return (
      <g>
        {bars.map((v, i) => {
          const g = Math.max(0, Math.min(1, p * bars.length - i));
          if (g <= 0) return null;
          const bh = (v / max) * h * g;
          return <rect key={i} x={x + i * step + step * 0.14} y={base - bh} width={step * 0.72} height={bh} fill={color} rx={1} />;
        })}
        <line x1={x - 4} x2={x + w + 4} y1={base + 0.5} y2={base + 0.5} stroke={color} strokeWidth={1.4} opacity={0.5 * p} />
      </g>
    );
  }
  const f = CURVES[kind];
  if (!f) return null;
  const steps = 90;
  const lo = 0;
  const hi = 6;
  const max = Math.max(...Array.from({ length: steps + 1 }, (_, i) => f(lo + ((hi - lo) * i) / steps)));
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / steps;
    return [x + (w * i) / steps, base - (f(v) / max) * h] as const;
  });
  // The uniform's walls are vertical: step onto and off its flat top.
  const shown = pts.slice(0, Math.max(2, Math.round(p * steps) + 1));
  const d = shown.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${(kind === "uniform" && i === 0 ? base : b).toFixed(1)}`).join(" ");
  const [lx] = shown[shown.length - 1];
  return (
    <g>
      <path d={`${d} L${lx.toFixed(1)},${base} L${x},${base} Z`} fill={fill} />
      <path d={d} fill="none" stroke={color} strokeWidth={2.6} strokeLinejoin="round" />
      <line x1={x - 4} x2={x + w + 4} y1={base + 0.5} y2={base + 0.5} stroke={color} strokeWidth={1.4} opacity={0.5 * p} />
    </g>
  );
};
