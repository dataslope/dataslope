import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { ds } from "../../theme/brand";
import { BAR, INK, PAPER } from "../../editorial/style";
import { H, W } from "../../editorial/ui";

/** Raw values: the population in the kit's data blue, one sample's values in
 *  a deeper blue of the same hue. Statistics take the accent (style.ts). */
export const POP_FILL = BAR;
export const SAMPLE_FILL = ds("blue", 800);

/** "$50", the way an axis tick reads. */
export const money = (v: number) => `$${v}`;

/**
 * A spread drawn as a bracket: a line from one value to another with an
 * upright tick at each end, growing out from its middle on `at`. A paper
 * underlay keeps it readable where it crosses bars. Positions are frame
 * pixels (already through `useLayout().y()`).
 */
export const Bracket: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  tick?: number;
  opacity?: number;
}> = ({ x0, x1, y, at, dur = 14, out, color = INK, width = 2.4, tick = 9, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid - (mid - x0) * p;
  const b = mid + (x1 - mid) * p;
  const lines = (stroke: string, w: number) => (
    <g stroke={stroke} strokeWidth={w} strokeLinecap="round">
      <line x1={a} x2={b} y1={y} y2={y} />
      <line x1={a} x2={a} y1={y - tick} y2={y + tick} />
      <line x1={b} x2={b} y1={y - tick} y2={y + tick} />
    </g>
  );
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: opacity * (1 - o) }}>
      {lines(PAPER, width + 5)}
      {lines(color, width)}
    </svg>
  );
};

/** A vertical rule, drawn upward from `y0` to `y1` on `at`. */
export const Rule: React.FC<{
  x: number;
  y0: number;
  y1: number;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ x, y0, y1, at, dur = 14, out, color = INK, width = 2, dash = "7 6", opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: opacity * (1 - o) }}>
      <line x1={x} x2={x} y1={y0} y2={y0 + (y1 - y0) * p} stroke={color} strokeWidth={width} strokeDasharray={dash} />
    </svg>
  );
};

/** Bar heights that move from one histogram to the next: `from` and `to`
 *  are heights per bin in px, `t` runs 0..1. */
export const blend = (from: readonly number[], to: readonly number[], t: number) =>
  to.map((v, i) => (from[i] ?? 0) + (v - (from[i] ?? 0)) * t);
