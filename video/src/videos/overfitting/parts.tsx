import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { HAIRLINE, INK, INK_SOFT, note } from "../../editorial/style";
import { SANS } from "../../theme/fonts";

/** A chart's box in page pixels: x through an XScale, y already through
 *  `useLayout().y()`, with the value range it spans. */
export type Box = { x: XScale; top: number; base: number; lo: number; hi: number };

/** A value's page y inside a box. */
export const by = (b: Box, v: number) => b.base - ((v - b.lo) / (b.hi - b.lo)) * (b.base - b.top);

/** Data to page points. */
export const toPage = (b: Box, xs: readonly number[], ys: readonly number[]) =>
  xs.map((x, i) => [sx(b.x, x), by(b, ys[i])] as const);

export const pathOf = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([px, py], i) => `${i ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");

const TEXT: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: 20,
  fontWeight: 500,
  fill: INK_SOFT,
  fontVariantNumeric: "tabular-nums",
};

/**
 * Faint horizontal rules with their values at the left, an ink baseline and
 * ticks along x. Nothing else: no frame, no tick marks on y.
 */
export const Grid: React.FC<{
  box: Box;
  yTicks: readonly number[];
  yFormat: (v: number) => string;
  xTicks: readonly number[];
  xFormat?: (v: number) => string;
  at: number;
}> = ({ box, yTicks, yFormat, xTicks, xFormat = String, at }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const t = ease(frame, at + 6, 12);
  if (p <= 0) return null;
  const { x } = box;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      {yTicks.map((v) => {
        const gy = by(box, v);
        return (
          <g key={v} opacity={t}>
            <line
              x1={x.x0}
              x2={x.x0 + (x.x1 - x.x0) * p}
              y1={gy + 0.5}
              y2={gy + 0.5}
              stroke={HAIRLINE}
              strokeWidth={1}
              opacity={0.5}
            />
            <text x={x.x0 - 16} y={gy + 7} textAnchor="end" style={TEXT}>
              {yFormat(v)}
            </text>
          </g>
        );
      })}
      <line x1={x.x0} x2={x.x0 + (x.x1 - x.x0) * p} y1={box.base + 0.5} y2={box.base + 0.5} stroke={INK} strokeWidth={1.6} />
      <g opacity={t}>
        {xTicks.map((v) => {
          const px = sx(x, v);
          return (
            <g key={v}>
              <line x1={px} x2={px} y1={box.base + 1} y2={box.base + 7} stroke={INK} strokeWidth={1.2} />
              <text x={px} y={box.base + 31} textAnchor="middle" style={TEXT}>
                {xFormat(v)}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/**
 * A line through page points, revealed left to right up to page x `reveal`
 * and clipped to its chart box (plus `bleed` px), so a curve that leaves the
 * chart is cut at its edge rather than drawn over the page.
 */
export const Curve: React.FC<{
  id: string;
  pts: readonly (readonly [number, number])[];
  box: Box;
  reveal: number;
  color: string;
  width?: number;
  dash?: string;
  opacity?: number;
  bleed?: number;
}> = ({ id, pts, box, reveal, color, width = 4, dash, opacity = 1, bleed = 6 }) => {
  if (reveal <= box.x.x0 + 0.5 || opacity <= 0) return null;
  const left = box.x.x0 - bleed;
  const right = Math.min(reveal, box.x.x1 + bleed);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <defs>
        <clipPath id={id}>
          <rect x={left} y={box.top - bleed} width={right - left} height={box.base - box.top + 2 * bleed} />
        </clipPath>
      </defs>
      <path
        d={pathOf(pts)}
        clipPath={`url(#${id})`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dash}
      />
    </svg>
  );
};

/** A short stroke of a series' color, for legends and table rows. */
export const Swatch: React.FC<{ color: string; dash?: string; width?: number }> = ({ color, dash, width = 34 }) => (
  <svg width={width} height={12} style={{ overflow: "visible", flex: "none" }}>
    <line x1={2} x2={width - 2} y1={6} y2={6} stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={dash} />
  </svg>
);

/** A filled dot, for legends. */
export const Dot: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flex: "none" }} />
);

/** Inter for a sentence of notes: `note()` sets tabular figures, which in
 *  Inter also widen the hyphen, so "scikit-learn" came out spaced. */
export const prose = (size = 20, color: string = INK_SOFT): React.CSSProperties => ({
  ...note(size, color),
  fontVariantNumeric: "lining-nums",
});
