import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, fmt, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles, as Unit 1 and the Central Limit Theorem video set
 * them: raw data (each salary, order or delivery) in the kit's data blue or
 * in ink dots; the mean, the statistic the narration keeps pointing at, in
 * the red accent; the median and other robust markers in ink; a truth or a
 * reference in dashed ink. A second group, where one is needed, in teal.
 */
export const DOT = `color-mix(in srgb, ${INK} 62%, transparent)`;
export const RAW = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;
export const DATA = BAR;
export const SECOND = ds("teal", 500);
export const SECOND_INK = "var(--ds-teal-ink)";
export const SOFT_FILL = `color-mix(in srgb, ${BAR} 18%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

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

/**
 * A slow, eased push on a finished figure: it grows by `scale` (a fraction,
 * a few percent at most) and shifts by `dx`, `dy` between `from` and `to`,
 * about `origin`, so a figure that is being talked about never sits dead
 * still. Never a jolt: it eases in and out.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  dx?: number;
  dy?: number;
  origin?: readonly [number, number];
  children: React.ReactNode;
}> = ({ from, to, scale = 0.025, dx = 0, dy = 0, origin = [960, 600], children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
        transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + scale * p})`,
      }}
    >
      {children}
    </div>
  );
};

/** A value that counts from `a` to `b` over `dur` frames from `at`. */
export const count = (frame: number, at: number, a: number, b: number, dur = 18) =>
  lerp(a, b, interpolate(frame, [at, at + dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));

/** "2,828.4": a counted value set the way the figure sets the final one. */
export const counted = (frame: number, at: number, a: number, b: number, digits = 1, dur = 18) =>
  fmt(count(frame, at, a, b, dur), digits);

/** A ring that swells out of a point and fades, over a soft halo of the same
 *  color: a point being named. */
export const Pulse: React.FC<{ x: number; y: number; at: number; r?: number; color?: string; width?: number }> = ({
  x,
  y,
  at,
  r = 10,
  color = STAT,
  width = 2.4,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0 || p >= 1) return null;
  const grow = Easing.out(Easing.cubic)(p);
  return (
    <Svg>
      <circle cx={x} cy={y} r={r + 30 * grow} fill={color} opacity={0.22 * (1 - p)} />
      <circle cx={x} cy={y} r={r + 30 * grow} fill="none" stroke={color} strokeWidth={width} opacity={0.85 * (1 - p)} />
    </Svg>
  );
};

/**
 * A marker-pen highlight that sweeps under the words it wraps on `at`, and
 * fades again on `out`. Sized in em, so it fits the words in any face.
 */
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          bottom: "0.02em",
          height: "0.42em",
          width: `calc((100% + 0.24em) * ${p})`,
          background: color,
          opacity: 0.85 * (1 - o),
          borderRadius: 3,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
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
      <path d={`M${a},${y + t} L${a},${y} L${b},${y} L${b},${y + t}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
    </Svg>
  );
};

/** Two short slanted strokes across an axis: the scale breaks here. */
export const AxisBreak: React.FC<{ x: number; y: number; opacity?: number }> = ({ x, y, opacity = 1 }) => (
  <Svg opacity={opacity}>
    <rect x={x - 9} y={y - 14} width={18} height={28} fill={PAPER} />
    {[-5, 5].map((d) => (
      <line key={d} x1={x + d - 6} y1={y + 12} x2={x + d + 6} y2={y - 12} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    ))}
  </Svg>
);

/**
 * A label pinned to a point, centered on x: a value marker's name and number.
 * `knockout` paints the paper behind it so a line can pass under.
 */
export const Tag: React.FC<{
  x: number;
  y: number;
  opacity: number;
  color?: string;
  size?: number;
  bold?: boolean;
  align?: "center" | "left" | "right";
  knockout?: boolean;
  children: React.ReactNode;
}> = ({ x, y, opacity, color = INK, size = 22, bold = false, align = "center", knockout = false, children }) => {
  if (opacity <= 0) return null;
  const shift = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translateX(${shift})`,
        opacity,
        whiteSpace: "nowrap",
        fontFamily: label().fontFamily,
        fontSize: size,
        fontWeight: bold ? 700 : 560,
        // Lining figures only: tabular ones set Inter's hyphen a digit wide
        // ("Heavy - tailed"). A number that counts takes TABULAR on its span.
        fontVariantNumeric: "lining-nums",
        color,
        lineHeight: 1.2,
        ...(knockout ? { background: PAPER, padding: "0 6px", borderRadius: 4 } : {}),
      }}
    >
      {children}
    </div>
  );
};

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Nothing is drawn while the art is not in.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
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
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
