import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { SERIF } from "../../editorial/fonts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles, as the Central Limit Theorem video sets them: raw
 * data (each person, each month, each answer) in ink and neutral tones or the
 * kit's data blue; a statistic computed from it (an average, a gap) in the red
 * accent; the truth (a process's level, a parameter) in dashed ink.
 */
export const DOT = `color-mix(in srgb, ${INK} 62%, transparent)`;
/** A crowd of raw values, set back from what the narration points at. */
export const RAW = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 0 → 1 → 0 over `dur` frames from `at`: a brief swell for a mark that is
 * named again once it is already on the page (a bar, a dot, a line).
 */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

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
      <line x1={x} x2={x} y1={bottom} y2={bottom + (top - bottom) * p} stroke={color} strokeWidth={width} strokeDasharray="7 6" />
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
  dim?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 16, out, dim, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.7;
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(18, len * 0.6);
  return (
    <Svg opacity={(1 - o) * (1 - d)}>
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

/** A horizontal bracket from x0 to x1, its end ticks pointing at what it
 *  measures (down, or up with `up`). It opens from its middle. */
export const Bracket: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  out?: number;
  color?: string;
  tick?: number;
  width?: number;
  up?: boolean;
}> = ({ x0, x1, y, at, out, color = INK, tick = 12, width = 2.2, up = false }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid + (x0 - mid) * p;
  const b = mid + (x1 - mid) * p;
  const t = up ? -tick : tick;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${a},${y + t} L${a},${y} L${b},${y} L${b},${y + t}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/**
 * A line struck through the words it wraps, drawn left to right on `at`.
 * Sized in em and to the words, so it fits in any face.
 */
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  top = "0.52em",
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 1 }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top,
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.07em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-2.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` and lifted again on `out`: the phrase the narrator is reading, made
 * visible. Sized in em and to the words, like Strike.
 */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.14em",
          top: "0.04em",
          bottom: "-0.06em",
          width: `calc((100% + 0.28em) * ${p})`,
          background: color,
          borderRadius: "0.14em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/**
 * A normal curve's outline over a baseline, dashed like every other truth in
 * the video, drawn left to right on `at` with a faint wash under it: the
 * shape a process draws its values from. `height` is the peak in px.
 */
export const Bell: React.FC<{
  x: (v: number) => number;
  mu: number;
  sd: number;
  base: number;
  height: number;
  at: number;
  out?: number;
  dur?: number;
  opacity?: number;
}> = ({ x, mu, sd, base, height, at, out, dur = 26, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const steps = 120;
  const lo = mu - 3.4 * sd;
  const hi = mu + 3.4 * sd;
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const v = lo + ((hi - lo) * i) / steps;
    return [x(v), base - height * Math.exp(-0.5 * ((v - mu) / sd) ** 2)] as const;
  });
  const line = pts.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const x0 = x(lo);
  const x1 = x(hi);
  return (
    <Svg opacity={(1 - o) * opacity}>
      {/* An inset on a group is measured against its own box, which spans x0 to x1. */}
      <g style={{ clipPath: `inset(-4px ${(1 - p) * 100}% -4px -4px)` }}>
        <path d={`${line} L${x1},${base} L${x0},${base} Z`} fill={`color-mix(in srgb, ${INK} 6%, transparent)`} />
        <path d={line} fill="none" stroke={`color-mix(in srgb, ${INK} 52%, transparent)`} strokeWidth={1.8} strokeDasharray="6 5" />
      </g>
    </Svg>
  );
};

/**
 * Symbols, set in the serif whatever face surrounds them: x-bar as an italic
 * x with a combining macron (the latin subset carries U+0304, so the face
 * places the bar itself), and mu upright, from the Greek subset fonts.ts
 * waits for.
 */
export const XBar: React.FC<{ color?: string }> = ({ color }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "italic", color }}>{"x\u0304"}</span>
);
export const Mu: React.FC<{ color?: string }> = ({ color }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "normal", color }}>μ</span>
);

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Nothing is drawn while the art is not in.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  /** Set the spot back (to 30%) from this frame on: the thing it pictures is
   *  what the narration says you cannot see. */
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.7;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
