import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, headline as headlineStyle, HIGHLIGHT, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a part's kicker, a
 * two-ink headline, a slow push, the watercolor spots, highlighter and strike
 * marks, bars that grow on their cue, token chips, and a bracket. Kicker,
 * Headline, Drift, Spot, Marked and Bracket follow estimation/parts.tsx.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const FIG_Y = 286;
/** Where the price tags hang. The sheet scene hangs them in the same place as
 *  the opening, so they stay put across the cut. */
export const TAGS = { left: 1300, top: 74, width: 460, height: 259 };

// ── Colors: one meaning each, for the whole video ────────────────────────────

/** Tokens the model reads (input), on every figure. */
export const INPUT = ds("blue", 500);
export const INPUT_SOFT = `color-mix(in srgb, ${ds("blue", 500)} 32%, ${PAPER})`;
export const INPUT_INK = inkOf.blue;
/** Tokens the model writes (output); thinking is output too, hatched. */
export const OUTPUT = ds("orange", 500);
export const OUTPUT_INK = inkOf.orange;
export const THINK_FILL = `repeating-linear-gradient(135deg, ${ds("orange", 500)} 0 5px, ${ds("orange", 200)} 5px 11px)`;
/** Input read back from the cache. */
export const CACHED = ds("teal", 500);
export const CACHED_SOFT = `color-mix(in srgb, ${ds("teal", 500)} 26%, ${PAPER})`;
export const CACHED_INK = inkOf.teal;
/** Dollars: every bill and total is drawn in ink. */
export const COST = `color-mix(in srgb, ${INK} 72%, ${PAPER})`;
/** Whatever the narration is pointing at: the kit's accent. */
export const POINT = ACCENT;
export const POINT_INK = ACCENT_INK;
/** Set back from what is being talked about. */
export const FADED = `color-mix(in srgb, ${INK_SOFT} 28%, ${PAPER})`;
export const RULE = `color-mix(in srgb, ${INK} 18%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for the thing being named. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI);
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(108), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/** A two-ink headline line: the first phrase in ink, the second following it
 *  in italic accent, each on its own cue. The row takes the headline's size,
 *  so the word space between the halves is measured in that face. */
export const Headline: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 66, top = 146, children, italic }) => {
  const { y } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        top: y(top),
        display: "flex",
        gap: "0.28em",
        whiteSpace: "nowrap",
        fontSize: headlineStyle(size).fontSize,
      }}
    >
      <Ink at={at} dur={20} out={out} style={{ position: "relative", ...headlineStyle(size) }}>
        {children}
      </Ink>
      {italic && second !== undefined ? (
        <Ink at={second} dur={18} out={out} style={{ position: "relative", ...headlineStyle(size, true), color: ACCENT_INK }}>
          {italic}
        </Ink>
      ) : null}
    </div>
  );
};

/** A slow, eased push on a figure, so a figure being talked about is never
 *  quite frozen. Keep illustrations outside it: they are drawn at their
 *  pixels' size. */
export const Drift: React.FC<{ from: number; to: number; amount?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  amount = 0.018,
  origin = "50% 55%",
  children,
}) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/** A watercolor spot from illustrations.json: pops in on `at`, bobs gently,
 *  fades on `out`. Nothing is drawn while the art is not in. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  amp?: number;
}> = ({ id, at, out, left, top, width, height, amp = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={`${VIDEO}-${id}`}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, amp, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** A highlighter stroke behind the words it wraps: grows left to right on
 *  `at`, lifts on `out`, sized to the words in any face. */
export const Marked: React.FC<{ at: number; color?: string; out?: number; children: React.ReactNode }> = ({
  at,
  color = HIGHLIGHT,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.1em",
          right: "-0.1em",
          top: "0.08em",
          bottom: "-0.02em",
          background: color,
          borderRadius: "0.12em",
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = POINT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top: "0.55em",
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.08em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-1.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/**
 * A horizontal bar that grows from its left end to `w` on `at` (width may
 * change frame to frame, so a bar can grow or shrink as it is talked about).
 * `fill` takes any CSS background, so a bar can be hatched.
 */
export const HBar: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  dur?: number;
  out?: number;
  fill: string;
  opacity?: number;
  radius?: number;
  outline?: string;
  style?: React.CSSProperties;
}> = ({ x, y, w, h, at, dur = 14, out, fill, opacity = 1, radius = 3, outline, style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: Math.max(0, w * p),
        height: h,
        background: fill,
        borderRadius: radius,
        boxShadow: outline ? `inset 0 0 0 2px ${outline}` : undefined,
        opacity: opacity * (1 - o),
        ...style,
      }}
    />
  );
};

/** A token as a chip: its exact text in mono (a leading space shown as a
 *  middle dot, the way the course draws one), on a tinted ground. */
export const Chip: React.FC<{
  piece: string;
  color: string;
  ink?: string;
  size?: number;
  glow?: number;
  style?: React.CSSProperties;
}> = ({ piece, color, ink = INK, size = 22, glow = 0, style }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: size * 1.75,
      padding: "0 0.42em",
      borderRadius: 6,
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 600,
      color: ink,
      whiteSpace: "pre",
      background: `color-mix(in srgb, ${color} ${Math.round(18 + glow * 40)}%, ${PAPER})`,
      boxShadow: `inset 0 0 0 2px ${color}`,
      ...style,
    }}
  >
    {piece.startsWith(" ") ? (
      <>
        <span style={{ color: INK_SOFT, opacity: 0.7 }}>·</span>
        {piece.slice(1)}
      </>
    ) : (
      piece
    )}
  </span>
);

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
      <path d={`M${a},${y + t} L${a},${y} L${b},${y} L${b},${y + t}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
    </Svg>
  );
};

/** A vertical bracket from y0 to y1, its ticks pointing left at what it
 *  spans (or right with `right`). It opens from its middle. */
export const VBracket: React.FC<{
  x: number;
  y0: number;
  y1: number;
  at: number;
  out?: number;
  color?: string;
  tick?: number;
  width?: number;
  right?: boolean;
}> = ({ x, y0, y1, at, out, color = INK, tick = 12, width = 2.2, right = false }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (y0 + y1) / 2;
  const a = mid + (y0 - mid) * p;
  const b = mid + (y1 - mid) * p;
  const t = right ? tick : -tick;
  return (
    <Svg opacity={1 - o}>
      <path d={`M${x + t},${a} L${x},${a} L${x},${b} L${x + t},${b}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
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
}> = ({ from, to, at, dur = 14, out, color = INK, width = 2.4, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(15, len * 0.6);
  return (
    <Svg opacity={opacity * (1 - o)}>
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

/** A dashed vertical guide, drawn downward on `at`. */
export const Guide: React.FC<{ x: number; y0: number; y1: number; at: number; out?: number; color?: string; width?: number }> = ({
  x,
  y0,
  y1,
  at,
  out,
  color = INK_SOFT,
  width = 1.6,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={1 - o}>
      <line x1={x} x2={x} y1={y0} y2={y0 + (y1 - y0) * p} stroke={color} strokeWidth={width} strokeDasharray="5 6" />
    </Svg>
  );
};

/** A table rule across a figure, drawn left to right on `at`. */
export const Hairline: React.FC<{ x: number; y: number; w: number; at: number; out?: number; color?: string }> = ({
  x,
  y,
  w,
  at,
  out,
  color = RULE,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: w * p, height: 1.5, background: color, opacity: 1 - o }} />;
};

/** A dimmer: children fade to `to` of their strength from `at`. */
export const Dim: React.FC<{ at: number; to?: number; dur?: number; children: React.ReactNode }> = ({ at, to = 0.35, dur = 16, children }) => {
  const frame = useCurrentFrame();
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - ease(frame, at, dur) * (1 - to) }}>{children}</div>;
};

/** POINT's glow behind a row that the narration names: 0..1. */
export const rowGlow = (amount: number) => `color-mix(in srgb, ${POINT} ${Math.round(amount * 9)}%, transparent)`;

export { INK, INK_SOFT, PAPER };
