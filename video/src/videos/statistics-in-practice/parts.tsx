import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, sampleCubic, type Cubic, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles, as Unit 1 sets them: raw data (each bill, each
 * user) in neutral ink or the kit's data blue; a statistic computed from it
 * (an average, a lift, an interval) in the red accent; the line nothing may
 * cross (the wall, zero, the planned size) in ink.
 */
export const DOT = `color-mix(in srgb, ${INK} 62%, transparent)`;
/** Raw values set back from what the narration points at. */
export const RAW = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;

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
 * A headline of one line in two inks, the second following the first: a
 * roman lead and an italic turn in the accent. Each half inks in on its own
 * cue, and the whole line lifts away on `out`.
 */
export const Headline: React.FC<{
  lead: React.ReactNode;
  turn?: React.ReactNode;
  at: number;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, turn, at, turnAt, out, size = 80, top = 150 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink
          at={turnAt ?? at + 14}
          dur={18}
          out={out}
          style={{ position: "relative", ...headline(size, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/** A straight arrow that draws from `from` to `to`, its head built by
 *  arrowHead() on the drawn line. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
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

/**
 * A curved arrow along a cubic, drawn from its start on `at`. The line is
 * sampled densely and the head is built by arrowHead() on the part drawn so
 * far, so it sits on the line's last stretch. Shape the cubic so its last
 * control point is well back along the arrival direction.
 */
export const CurveArrow: React.FC<{
  curve: Cubic;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
}> = ({ curve, at, dur = 20, out, color = INK, width = 2.6, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const all = sampleCubic(curve, 240);
  const drawn = all.slice(0, Math.max(2, Math.round(p * (all.length - 1)) + 1));
  const d = drawn.map(([x, v], i) => `${i ? "L" : "M"}${x.toFixed(1)},${v.toFixed(1)}`).join(" ");
  const headLen = 18;
  return (
    <Svg opacity={1 - o}>
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} />
      {p > 0.25 ? (
        <path
          d={arrowHead(drawn, headLen, headLen * 0.6)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
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

/** A line struck through the words it wraps, drawn left to right on `at`.
 *  Sized in em and to the words, so it fits in any face. */
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  top = "0.55em",
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block", lineHeight: 1.1 }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top,
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.08em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-2deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** A highlighter stroke swept behind the words it wraps on `at`, and lifted
 *  on `off`: the phrase the narration is reading. Sized to the words, in em. */
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
          left: "-0.14em",
          top: "0.08em",
          bottom: "0.02em",
          width: `calc((100% + 0.28em) * ${p})`,
          background: color,
          opacity: (p > 0 ? 0.9 : 0) * (1 - o),
          borderRadius: "0.12em",
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A value easing from `from` to `to` over `dur` frames from `at`. */
export const Count: React.FC<{ from?: number; to: number; at: number; dur?: number; format: (v: number) => string }> = ({
  from = 0,
  to,
  at,
  dur = 24,
  format,
}) => {
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
 * point. A few percent over many seconds, never a jolt.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  dx?: number;
  dy?: number;
  origin?: readonly [number, number];
  children: React.ReactNode;
}> = ({ from, to, amount = 0.025, dx = 0, dy = 0, origin = [960, 600], children }) => {
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
export const partial = (pts: readonly Pt[], p: number) => {
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
 * The wall between exploring and confirming: a thick ink rule that draws
 * itself downward on `at` (or stands from the start with `at` in the past).
 */
export const Wall: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number; width?: number }> = ({
  x,
  top,
  bottom,
  at,
  out,
  width = 9,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 22);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={1 - o}>
      <line x1={x} x2={x} y1={top} y2={top + (bottom - top) * p} stroke={INK} strokeWidth={width} strokeLinecap="round" />
    </Svg>
  );
};

/** A tick mark that draws itself: a check for "yes". */
export const Check: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({
  x,
  y,
  at,
  size = 28,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const pts: Pt[] = [
    [x, y],
    [x + size * 0.36, y + size * 0.4],
    [x + size, y - size * 0.5],
  ];
  return (
    <Svg>
      <path d={partial(pts, p)} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
};

/** A cross that draws itself, stroke by stroke: a "no". */
export const Cross: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({
  x,
  y,
  at,
  size = 24,
  color = STAT,
}) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 8);
  const b = ease(frame, at + 6, 8);
  if (a <= 0) return null;
  const s = size / 2;
  return (
    <Svg>
      <line x1={x - s} y1={y - s} x2={x - s + size * a} y2={y - s + size * a} stroke={color} strokeWidth={4} strokeLinecap="round" />
      {b > 0 ? (
        <line x1={x + s} y1={y - s} x2={x + s - size * b} y2={y - s + size * b} stroke={color} strokeWidth={4} strokeLinecap="round" />
      ) : null}
    </Svg>
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
  opacity?: number;
}> = ({ id, at, out, left, top, width, height, opacity = 1 }) => {
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
        opacity: Math.min(1, p) * (1 - o) * opacity,
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
