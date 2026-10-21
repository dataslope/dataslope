import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { sx, type XScale } from "../../editorial/charts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, fmt, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles. A named distribution, and data drawn from one, is
 * the kit's data blue; the probability a question asks for (the bars or the
 * area it covers, and its number) is the red accent, as is a model laid over
 * data; a mean or a center is dashed ink.
 */
export const DIST = BAR;
export const ASK = ACCENT;
export const ASK_INK = ACCENT_INK;
/** A distribution set back from what the narration points at. */
export const SOFT = `color-mix(in srgb, ${BAR} 38%, ${PAPER})`;
export const ASK_FILL = `color-mix(in srgb, ${ACCENT} 30%, transparent)`;
export const DIST_FILL = `color-mix(in srgb, ${BAR} 22%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a highlight that comes and goes. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI);
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

/** One headline phrase in the house style, inked in on `at`. */
export type HeadPart = { text: string; at: number; italic?: boolean; color?: string };

/**
 * A headline of one or two phrases on one line, the second following the
 * first in the flow (so it works in any face), the whole line easing out on
 * `out`.
 */
export const Head: React.FC<{ parts: readonly HeadPart[]; out?: number; size?: number; top?: number }> = ({
  parts,
  out,
  size = 76,
  top = 150,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      {parts.map((p, i) => (
        <Ink
          key={i}
          at={p.at}
          dur={i ? 18 : 20}
          out={out}
          style={{
            position: "relative",
            whiteSpace: "nowrap",
            ...(p.italic ? { ...headline(size, true), color: p.color ?? ASK_INK } : null),
          }}
        >
          {p.text}
        </Ink>
      ))}
    </div>
  );
};

/** Code, set in the site's mono. */
export const code = (size = 24, color: string = INK): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: size,
  fontWeight: 600,
  color,
  whiteSpace: "nowrap",
});

/** A number counting from `from` to `to` over `dur` frames from `at`. */
export const Count: React.FC<{
  at: number;
  to: number;
  from?: number;
  dur?: number;
  digits?: number;
  prefix?: string;
  suffix?: string;
}> = ({ at, to, from = 0, dur = 20, digits = 1, prefix = "", suffix = "" }) => {
  const frame = useCurrentFrame();
  const v = lerp(from, to, ease(frame, at, dur));
  // Hidden until it starts, so a number never sits on screen at its start value.
  return (
    <span style={{ opacity: ease(frame, at - 3, 5) }}>
      {prefix}
      <span style={TABULAR}>{fmt(v, digits)}</span>
      {suffix}
    </span>
  );
};

/**
 * A finished figure's slow push: the drawing grows by `amount` of its size
 * over [from, to], eased, around `origin`. Calm by design, never a jolt.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, amount = 0.025, origin = "50% 55%", children }) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const s = 1 + amount * (t * t * (3 - 2 * t));
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>
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
  const headLen = Math.min(16, len * 0.6);
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
  opacity?: number;
}> = ({ x0, x1, y, at, out, color = INK, tick = 12, width = 2.2, up = false, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid + (x0 - mid) * p;
  const b = mid + (x1 - mid) * p;
  const t = up ? -tick : tick;
  return (
    <Svg opacity={(1 - o) * opacity}>
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

/** A marker-pen sweep behind the words it wraps, drawn left to right. */
export const Sweep: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
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
          top: "0.12em",
          bottom: "0.02em",
          width: `calc((100% + 0.24em) * ${p})`,
          background: color,
          borderRadius: 3,
          opacity: 1 - o,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/**
 * Bars for a discrete distribution: one bar per whole number k, centred on
 * it, `unit` px tall per unit of probability, standing on `base` (both
 * already through the layout). `grow` and `fill` take the bar's index.
 */
export const KBars: React.FC<{
  ks: readonly number[];
  values: readonly number[];
  scale: XScale;
  base: number;
  unit: number;
  grow: (i: number) => number;
  fill?: (i: number) => string;
  lift?: (i: number) => number;
  width?: number;
  opacity?: number;
}> = ({ ks, values, scale, base, unit, grow, fill = () => DIST, lift, width = 0.72, opacity = 1 }) => {
  const step = sx(scale, 1) - sx(scale, 0);
  return (
    <Svg opacity={opacity}>
      {ks.map((k, i) => {
        const g = grow(i);
        if (g <= 0) return null;
        const hgt = values[i] * unit * g;
        const w = step * width;
        const x = sx(scale, k) - w / 2;
        const up = lift ? lift(i) : 0;
        return <rect key={k} x={x} y={base - hgt - up} width={w} height={Math.max(0, hgt)} fill={fill(i)} rx={1.5} />;
      })}
    </Svg>
  );
};

/** Tick labels up a value axis, with faint gridlines across the plot. */
export const YTicks: React.FC<{
  ticks: readonly number[];
  py: (v: number) => number;
  x0: number;
  x1: number;
  at: number;
  format?: (v: number) => string;
  opacity?: number;
}> = ({ ticks, py, x0, x1, at, format = (v) => String(v), opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14) * opacity;
  if (p <= 0) return null;
  return (
    <>
      <Svg opacity={p}>
        {ticks.map((v) => (
          <line key={v} x1={x0} x2={x1} y1={py(v)} y2={py(v)} stroke={INK} strokeWidth={1} opacity={0.13} />
        ))}
      </Svg>
      {ticks.map((v) => (
        <div
          key={v}
          style={{ position: "absolute", right: 1920 - (x0 - 14), top: py(v) - 13, opacity: p, ...note(20, INK_SOFT) }}
        >
          {format(v)}
        </div>
      ))}
    </>
  );
};

/** The path of y = f(x) from a to b, in frame pixels. */
export const curveD = (f: (x: number) => number, a: number, b: number, X: XScale, py: (v: number) => number, steps = 160) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const v = a + ((b - a) * i) / steps;
    return `${i ? "L" : "M"}${sx(X, v).toFixed(1)},${py(f(v)).toFixed(1)}`;
  }).join(" ");

/** The area under y = f(x) from a to b, down to the value 0. */
export const areaD = (f: (x: number) => number, a: number, b: number, X: XScale, py: (v: number) => number, steps = 120) => {
  if (b <= a) return "";
  const top = curveD(f, a, b, X, py, steps);
  return `${top} L${sx(X, b).toFixed(1)},${py(0).toFixed(1)} L${sx(X, a).toFixed(1)},${py(0).toFixed(1)} Z`;
};

/** A histogram's outline over whole numbers 0, 1, 2…: a step at each k's
 *  height, from k - 0.5 to k + 0.5, down to the axis at both ends. */
export const stepD = (values: readonly number[], scale: XScale, py: (v: number) => number) => {
  const pts = values.flatMap((v, k) => [
    [sx(scale, k - 0.5), py(v)],
    [sx(scale, k + 0.5), py(v)],
  ]);
  const first = [sx(scale, -0.5), py(0)];
  const last = [sx(scale, values.length - 0.5), py(0)];
  return [first, ...pts, last].map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
};

/** A curve that draws itself from left to right on `at`. */
export const Curve: React.FC<{
  d: string;
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ d, at, dur = 26, color = DIST, width = 3.2, dash, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  return (
    <Svg opacity={opacity}>
      {dash ? (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={dash}
          strokeLinejoin="round"
          style={{ clipPath: `inset(-20px ${(1 - p) * 100}% -20px -20px)` }}
        />
      ) : (
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
      )}
    </Svg>
  );
};

/** A dashed vertical rule that draws itself upward: a mean, a center, a cut. */
export const VRule: React.FC<{
  x: number;
  bottom: number;
  top: number;
  at: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ x, bottom, top, at, out, color = INK, width = 2.2, dash = "7 6", opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={(1 - o) * opacity}>
      <line x1={x} x2={x} y1={bottom} y2={bottom + (top - bottom) * p} stroke={color} strokeWidth={width} strokeDasharray={dash} />
    </Svg>
  );
};

/** A label centred on x, at y: a figure annotation. */
export const Centered: React.FC<{ x: number; y: number; opacity?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  x,
  y,
  opacity = 1,
  style,
  children,
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: "translateX(-50%)",
      whiteSpace: "nowrap",
      opacity,
      ...style,
    }}
  >
    {children}
  </div>
);

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

/** Shorthand for the house annotation in the ask color, bold. */
export const askNote = (size = 23): React.CSSProperties => ({ ...note(size, ASK_INK), fontWeight: 700 });
