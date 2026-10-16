import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { INK } from "../../editorial/style";
import { H, W } from "../../editorial/ui";

/**
 * A spread drawn as a bracket: a line between two values with an upright
 * tick at each end, growing out from its middle on `at`. Positions are frame
 * pixels (already through `useLayout().y()`).
 */
export const Span: React.FC<{
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
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: opacity * (1 - o) }}>
      <g stroke={color} strokeWidth={width} strokeLinecap="round">
        <line x1={a} x2={b} y1={y} y2={y} />
        <line x1={a} x2={a} y1={y - tick} y2={y + tick} />
        <line x1={b} x2={b} y1={y - tick} y2={y + tick} />
      </g>
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
}> = ({ x, y0, y1, at, dur = 14, out, color = INK, width = 2, dash, opacity = 1 }) => {
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

/** A marker stroke behind a word: grows left to right on `at`, behind the
 *  text it wraps, sized to it in any face. */
export const Marked: React.FC<{ at: number; color: string; children: React.ReactNode }> = ({ at, color, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          right: "-0.08em",
          top: "0.18em",
          bottom: "0.02em",
          background: color,
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};
