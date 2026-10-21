import React from "react";
import { useCurrentFrame } from "remotion";
import { arrowHead } from "../../components/arrow";
import { ease } from "../../components/motion";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { ds } from "../../theme/brand";

/**
 * The video's color roles, the unit's: raw data (the population, one
 * sample's customers) in ink and neutral tones; an estimate in color. The
 * random sample's estimate takes the brand blue, the easy sample's, the
 * biased one, the red accent; the truth is ink.
 */
export const RANDOM = BAR;
export const RANDOM_INK = BLUE_INK;
export const EASY = ACCENT;
export const EASY_INK = ACCENT_INK;
/** The population's bars: a grey that sits back from the estimates. */
export const RAW = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
/** One customer in a sample, drawn as a dot. */
export const DOT = `color-mix(in srgb, ${INK} 72%, transparent)`;
/** A happy customer (above the threshold) in a sample: raw data, so not an
 *  estimate's color, but the yellow of the band that marks them in Fig. 1,
 *  deep enough to read as a dot. */
export const HAPPY = ds("yellow", 600);

/** An estimate's color, part way from the easy sample's red to the random
 *  sample's blue (0 is red, 1 is blue). */
export const between = (t: number, ink = false) => {
  const p = Math.round(Math.max(0, Math.min(1, t)) * 100);
  return `color-mix(in srgb, ${ink ? RANDOM_INK : RANDOM} ${p}%, ${ink ? EASY_INK : EASY})`;
};

const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A dashed vertical rule that draws itself upward: where the truth is. */
export const TruthLine: React.FC<{
  x: number;
  bottom: number;
  top: number;
  at: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ x, bottom, top, at, out, color = INK, width = 2 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={1 - o}>
      <line
        x1={x}
        x2={x}
        y1={bottom}
        y2={bottom + (top - bottom) * p}
        stroke={color}
        strokeWidth={width}
        strokeDasharray="7 6"
      />
    </Svg>
  );
};

/** A straight arrow that draws from `from` to `to`, its head built by
 *  arrowHead() on the drawn line. */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ from, to, at, dur = 16, out, color = INK, width = 2.4, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={(1 - o) * opacity}>
      <line x1={from[0]} y1={from[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path
        d={arrowHead([from, tip], headLen, headLen * 0.6)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** A horizontal bracket from x0 to x1 with short end ticks pointing down at
 *  what it measures. It opens from its middle. */
export const Bracket: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  out?: number;
  color?: string;
  tick?: number;
  width?: number;
}> = ({ x0, x1, y, at, out, color = INK, tick = 12, width = 2.2 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid + (x0 - mid) * p;
  const b = mid + (x1 - mid) * p;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${a},${y + tick} L${a},${y} L${b},${y} L${b},${y + tick}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/**
 * A hand-drawn underline under the words it wraps, sized in em and to the
 * words so it fits in any face.
 */
export const Underline: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  return (
    <span style={{ position: "relative" }}>
      {children}
      {/* Stretched to the words, with a stroke that keeps its weight at any
          width, and drawn left to right by a clip rather than a dash (a dash
          is measured before the stretch). */}
      <svg
        viewBox="0 0 380 30"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: -6,
          top: "0.95em",
          width: "calc(100% + 12px)",
          height: "0.28em",
          overflow: "visible",
          clipPath: `inset(-20px ${(1 - p) * 100}% -20px -20px)`,
          opacity: frame > at ? 1 : 0,
        }}
      >
        <path
          d="M4,18 C80,8 190,6 372,14"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
};
