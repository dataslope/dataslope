import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../components/motion";
import { SANS } from "../theme/fonts";
import { BAR, INK, INK_SOFT } from "./style";
import { H, W } from "./ui";

export const normalPdf = (x: number, mu: number, s: number) =>
  Math.exp(-0.5 * ((x - mu) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));

/** A linear x-scale from data units to frame pixels. */
export type XScale = { lo: number; hi: number; x0: number; x1: number };
export const sx = (s: XScale, v: number) => s.x0 + ((v - s.lo) / (s.hi - s.lo)) * (s.x1 - s.x0);

const Frame: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/**
 * A histogram as crisp SVG bars on a baseline. `counts[i]` covers
 * [lo + i*bin, lo + (i+1)*bin); each bar is `unit` px per count tall, and
 * `grow(i)` (0..1) lets bars rise one after another. `overlay` paints part of
 * each bar's top in another ink (the newest arrivals).
 */
export const Bars: React.FC<{
  counts: readonly number[];
  lo: number;
  bin: number;
  scale: XScale;
  base: number;
  unit: number;
  grow?: (i: number) => number;
  color?: string;
  gap?: number;
  opacity?: number;
  overlay?: { counts: readonly number[]; color: string };
}> = ({ counts, lo, bin, scale, base, unit, grow, color = BAR, gap = 2, opacity = 1, overlay }) => (
  <Frame opacity={opacity}>
    {counts.map((c, i) => {
      const g = grow ? grow(i) : 1;
      if (c <= 0 || g <= 0) return null;
      const x = sx(scale, lo + i * bin);
      const w = Math.max(1, sx(scale, lo + (i + 1) * bin) - x - gap);
      const h = c * unit * g;
      const top = overlay ? Math.min(overlay.counts[i] ?? 0, c) * unit * g : 0;
      return (
        <g key={i}>
          <rect x={x + gap / 2} y={base - h} width={w} height={h} fill={color} />
          {top > 0 ? <rect x={x + gap / 2} y={base - h} width={w} height={top} fill={overlay?.color} /> : null}
        </g>
      );
    })}
  </Frame>
);

/** A baseline, small ticks below it, numbers, and an optional axis title. */
export const Axis: React.FC<{
  scale: XScale;
  base: number;
  ticks: readonly number[];
  format?: (v: number) => string;
  title?: string;
  at: number;
  opacity?: number;
  size?: number;
}> = ({ scale, base, ticks, format = (v) => String(v), title, at, opacity = 1, size = 21 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const t = ease(frame, at + 6, 12);
  return (
    <Frame opacity={opacity}>
      <line
        x1={scale.x0}
        x2={scale.x0 + (scale.x1 - scale.x0) * p}
        y1={base + 0.5}
        y2={base + 0.5}
        stroke={INK}
        strokeWidth={1.6}
      />
      <g opacity={t}>
        {ticks.map((v) => {
          const x = sx(scale, v);
          return (
            <g key={v}>
              <line x1={x} x2={x} y1={base + 1} y2={base + 7} stroke={INK} strokeWidth={1.2} />
              <text
                x={x}
                y={base + 26}
                textAnchor="middle"
                style={{ fontFamily: SANS, fontSize: size, fontWeight: 500, fill: INK_SOFT, fontVariantNumeric: "tabular-nums" }}
              >
                {format(v)}
              </text>
            </g>
          );
        })}
        {title ? (
          <text
            x={scale.x1}
            y={base + 26}
            textAnchor="end"
            style={{
              fontFamily: SANS,
              fontSize: 19,
              fontWeight: 650,
              fill: INK_SOFT,
            }}
          >
            {title}
          </text>
        ) : null}
      </g>
    </Frame>
  );
};

/** The normal curve a histogram of `count` values in bins of `bin` should
 *  follow, drawn in on `at`. */
export const NormalCurve: React.FC<{
  scale: XScale;
  base: number;
  unit: number;
  mu: number;
  sd: number;
  count: number;
  bin: number;
  at: number;
  dur?: number;
  color: string;
  width?: number;
  opacity?: number;
}> = ({ scale, base, unit, mu, sd, count, bin, at, dur = 22, color, width = 3, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const steps = 160;
  // Only where the curve is visibly off the baseline: past 4.5 SD it would
  // just underline the axis.
  const from = Math.max(scale.lo, mu - 4.5 * sd);
  const to = Math.min(scale.hi, mu + 4.5 * sd);
  const d = Array.from({ length: steps + 1 }, (_, i) => {
    const v = from + ((to - from) * i) / steps;
    const y = base - count * bin * normalPdf(v, mu, sd) * unit;
    return `${i ? "L" : "M"}${sx(scale, v).toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <Frame opacity={opacity}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Frame>
  );
};
