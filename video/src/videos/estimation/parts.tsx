import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { SERIF } from "../../editorial/fonts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, fmt, headline as headlineStyle, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The unit's color roles, as Unit 5 set them: raw data (each user, each wait,
 * each visitor) in the kit's data blue; an estimate computed from it (an
 * average, a rate, a median) in the red accent; an interval in ink, with its
 * estimate in red at its center; the truth (a population's mean) in dashed
 * ink. In the coverage figure the misses take the accent, as in the lesson's
 * own chart.
 */
export const DATA = BAR;
export const EST = ACCENT;
export const EST_INK = ACCENT_INK;
/** Data set back from what the narration points at. */
export const FADED = `color-mix(in srgb, ${INK_SOFT} 30%, ${PAPER})`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a pulse for the thing being named. */
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
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A slow, eased push on a finished figure: its children scale up by `amount`
 * from `from` to `to`, about a point of origin, so a figure being talked about
 * is never quite frozen.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, amount = 0.02, origin = "50% 55%", children }) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/**
 * An interval: a line between two x positions with an upright tick at each
 * end, opening from its middle on `at`. `x0`/`x1` may change frame to frame,
 * so an interval can widen or narrow as it is talked about.
 */
export const IntervalBar: React.FC<{
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
  dash?: string;
}> = ({ x0, x1, y, at, dur = 16, out, color = INK, width = 3.2, tick = 11, opacity = 1, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const a = mid - (mid - x0) * p;
  const b = mid + (x1 - mid) * p;
  return (
    <Svg opacity={opacity * (1 - o)}>
      <g stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash}>
        <line x1={a} x2={b} y1={y} y2={y} />
        <line x1={a} x2={a} y1={y - tick} y2={y + tick} strokeDasharray={undefined} />
        <line x1={b} x2={b} y1={y - tick} y2={y + tick} strokeDasharray={undefined} />
      </g>
    </Svg>
  );
};

/** A vertical rule, drawn from `y0` toward `y1` on `at`. */
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
    <Svg opacity={opacity * (1 - o)}>
      <line x1={x} x2={x} y1={y0} y2={y0 + (y1 - y0) * p} stroke={color} strokeWidth={width} strokeDasharray={dash} />
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
    <Svg opacity={opacity * (1 - o)}>
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
}> = ({ from, to, at, dur = 14, out, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={1 - o}>
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

/** A marker stroke behind a word: grows left to right on `at`, behind the
 *  text it wraps, sized to it in any face. */
export const Marked: React.FC<{ at: number; color: string; out?: number; children: React.ReactNode }> = ({
  at,
  color,
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
          left: "-0.08em",
          right: "-0.08em",
          top: "0.16em",
          bottom: "0.02em",
          background: color,
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
          opacity: 1 - o,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  top = "0.55em",
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
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
          transform: "rotate(-1.5deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** A number counting from `from` to `to` over `dur` frames from `at`. */
export const Count: React.FC<{
  at: number;
  to: number;
  from?: number;
  dur?: number;
  digits?: number;
  prefix?: string;
  suffix?: string;
}> = ({ at, to, from = 0, dur = 16, digits = 2, prefix = "", suffix = "" }) => {
  const frame = useCurrentFrame();
  const v = lerp(from, to, ease(frame, at, dur));
  return (
    <>
      {prefix}
      {fmt(v, digits)}
      {suffix}
    </>
  );
};

/** Symbols, set in the serif whatever face surrounds them. */
export const XBar: React.FC<{ color?: string }> = ({ color }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "italic", color }}>{"x̄"}</span>
);
export const Mu: React.FC<{ color?: string }> = ({ color }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "normal", color }}>μ</span>
);
export const PHat: React.FC<{ color?: string }> = ({ color }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "italic", color }}>{"p̂"}</span>
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

/** A two-ink headline line: the first phrase in ink, the second following it
 *  in italic accent, each on its own cue; both leave on `out`. */
export const Headline: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 72, top = 150, children, italic }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", whiteSpace: "nowrap" }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", ...headlineStyle(size) }}>
        {children}
      </Ink>
      {italic && second !== undefined ? (
        <Ink at={second} dur={18} out={out} style={{ position: "relative", ...headlineStyle(size, true), color: EST_INK }}>
          {italic}
        </Ink>
      ) : null}
    </div>
  );
};


/**
 * Text that inks in on `at` but holds its place in a flex row from the first
 * frame, so the words after it never shift when it arrives.
 */
export const Slot: React.FC<{ at: number; dur?: number; out?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  dur = 16,
  out,
  style,
  children,
}) => (
  <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
    <span style={{ visibility: "hidden" }}>{children}</span>
    <Ink at={at} dur={dur} out={out} style={{ left: 0, top: 0, whiteSpace: "nowrap" }}>
      {children}
    </Ink>
  </span>
);
