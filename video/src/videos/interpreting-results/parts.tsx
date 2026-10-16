import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, headline, HIGHLIGHT, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles, as Unit 1 sets them: raw data (each person, each
 * month) in ink and neutral tones or the kit's data blue; a statistic computed
 * from it (a gap, a p-value, a correlation) in the red accent; the truth (a
 * fixed effect, a level) in dashed ink. Two groups compared are blue and
 * orange, as in the SimpsonsParadox video; four age bands add green and
 * purple.
 */
export const DOT = `color-mix(in srgb, ${INK} 62%, transparent)`;
/** A crowd of raw values, set back from what the narration points at. */
export const RAW = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;
export const DATA = BAR;
export const DATA_INK = BLUE_INK;
export const GROUP_COLOR = { men: ds("blue", 500), women: ds("orange", 500) } as const;
export const GROUP_INK = { men: BLUE_INK, women: ds("orange", 700) } as const;
export const BAND_COLOR = [ds("blue", 500), ds("green", 600), ds("orange", 500), ds("purple", 500)] as const;
export const BAND_INK = [BLUE_INK, ds("green", 800), ds("orange", 700), ds("purple", 700)] as const;

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

/** One headline line in up to three inks, each part following the one before
 *  in the flow, each inked on its own cue. */
export const Headline: React.FC<{
  top: number;
  size?: number;
  left?: number;
  out?: number;
  parts: readonly { text: string; at: number; italic?: boolean; color?: string }[];
}> = ({ top, size = 80, left = 92, out, parts }) => (
  <div style={{ position: "absolute", left, top, display: "flex", gap: "0.26em", ...headline(size) }}>
    {parts.map((p) => (
      <Ink
        key={p.text}
        at={p.at}
        dur={p.italic ? 18 : 20}
        out={out}
        style={{
          position: "relative",
          whiteSpace: "nowrap",
          ...(p.italic ? { ...headline(size, true), color: p.color ?? STAT_INK } : p.color ? { color: p.color } : {}),
        }}
      >
        {p.text}
      </Ink>
    ))}
  </div>
);

/** A dashed rule that draws itself from (x0, y0) to (x1, y1): where the
 *  truth is, or a reference nothing moved from. */
export const Dashed: React.FC<{
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
  opacity?: number;
}> = ({ x0, y0, x1, y1, at, dur = 16, out, color = INK, width = 2, dash = "7 6", opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={(1 - o) * opacity}>
      <line x1={x0} y1={y0} x2={lerp(x0, x1, p)} y2={lerp(y0, y1, p)} stroke={color} strokeWidth={width} strokeDasharray={dash} />
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
      <path d={`M${a},${y + t} L${a},${y} L${b},${y} L${b},${y + t}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
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
 * A highlighter stroke swept behind the words it wraps on `at`, left to
 * right, and lifted again on `off`: the phrase the narration is reading.
 * Sized to the words, in em.
 */
export const Marker: React.FC<{ at: number; off?: number; color?: string; children: React.ReactNode }> = ({
  at,
  off,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = off === undefined ? 0 : ease(frame, off, 12);
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
          opacity: (p > 0 ? 0.85 : 0) * (1 - o),
          borderRadius: "0.12em",
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A value easing from `from` to `to` over `dur` frames from `at`. */
export const Count: React.FC<{
  from: number;
  to: number;
  at: number;
  dur?: number;
  format: (v: number) => string;
}> = ({ from, to, at, dur = 24, format }) => {
  const frame = useCurrentFrame();
  return <>{format(lerp(from, to, ease(frame, at, dur)))}</>;
};

/** A ring that swells out from a point and fades: the thing just named. */
export const Ring: React.FC<{ x: number; y: number; at: number; r0?: number; r1?: number; color?: string; dur?: number }> = ({
  x,
  y,
  at,
  r0 = 10,
  r1 = 46,
  color = STAT,
  dur = 22,
}) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / dur;
  if (t <= 0 || t >= 1) return null;
  const e = 1 - (1 - t) ** 2;
  return (
    <Svg opacity={(1 - t) * 0.9}>
      <circle cx={x} cy={y} r={lerp(r0, r1, e)} fill="none" stroke={color} strokeWidth={3} />
    </Svg>
  );
};

/**
 * A gentle push on a finished figure: its children scale up by `amount` and
 * drift by `dx`, `dy` over [from, to], eased at both ends, about a fixed
 * point. Calm by design: a few percent over many seconds.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  dx?: number;
  dy?: number;
  origin?: readonly [number, number];
  children: React.ReactNode;
}> = ({ from, to, amount = 0.03, dx = 0, dy = 0, origin = [960, 600], children }) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
        transform: `translate(${dx * e}px, ${dy * e}px) scale(${1 + amount * e})`,
      }}
    >
      {children}
    </div>
  );
};

/** The first fraction `p` of a polyline, as a path (for lines that draw in). */
export const partial = (pts: readonly (readonly [number, number])[], p: number) => {
  const n = pts.length - 1;
  const k = clamp01(p) * n;
  const whole = Math.floor(k);
  const out = pts.slice(0, whole + 1).map(([a, b]) => [a, b] as [number, number]);
  if (whole < n) {
    const f = k - whole;
    const [ax, ay] = pts[whole];
    const [bx, by] = pts[whole + 1];
    if (f > 0) out.push([lerp(ax, bx, f), lerp(ay, by, f)]);
  }
  return out.map(([a, b], i) => `${i ? "L" : "M"}${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
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

