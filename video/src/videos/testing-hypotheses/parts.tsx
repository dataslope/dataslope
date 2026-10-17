import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { SERIF } from "../../editorial/fonts";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, fmt, headline, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { SANS, waitForFonts } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

// α, β, χ and ρ are set in Inter on the charts, and @font-face only fetches
// Inter's Greek subset when something asks for it, so a frame could be
// captured in a fallback face. Hold the render until it is in.
waitForFonts("Greek for alpha and beta", [`500 48px ${SANS}`, `650 48px ${SANS}`, `700 48px ${SANS}`], "αβχρμ");

/**
 * The unit's color roles, as the earlier units set them: raw data in ink or
 * the kit's data blue; whatever the narration points at (an observed value, a
 * rejection, an error) in the red accent; the null, the claim, the truth in
 * dashed ink; power and detections in blue.
 */
export const DOT = `color-mix(in srgb, ${INK} 62%, transparent)`;
/** A crowd set back from what the narration points at. */
export const RAW = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;
export const DATA = BAR;
export const DATA_INK = BLUE_INK;
/** A pale wash of the data blue, for cells and bands. */
export const DATA_WASH = `color-mix(in srgb, ${ds("blue", 200)} 55%, transparent)`;
export const STAT_WASH = `color-mix(in srgb, ${ds("red", 200)} 60%, transparent)`;
export const OK_INK = "var(--ds-green-ink)";
/** The highlighter: the brand yellow, strong enough to read as a mark. */
export const MARK = `color-mix(in srgb, ${ds("yellow", 500)} 88%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell, for a point or a
 *  number being named. */
export const pulse = (frame: number, at: number, dur = 20) => {
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

/**
 * A headline on one line in two inks, the second following the first, as
 * the earlier units set them. `out` lifts both away (for a second headline
 * in the same place).
 */
export const Head: React.FC<{
  a: React.ReactNode;
  b?: React.ReactNode;
  at: number;
  bAt?: number;
  out?: number;
  top?: number;
  size?: number;
}> = ({ a, b, at, bAt, out, top = 150, size = 80 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {a}
      </Ink>
      {b !== undefined && bAt !== undefined ? (
        <Ink at={bAt} dur={18} out={out} style={{ position: "relative", ...headline(size, true), color: STAT_INK, whiteSpace: "nowrap" }}>
          {b}
        </Ink>
      ) : null}
    </div>
  );
};

/** The null hypothesis's symbol, with a real subscript (Inter's latin subset
 *  has no U+2080). Use it at 28px and up, so the zero stays over 19px. */
export const H0: React.FC<{ one?: boolean }> = ({ one }) => (
  <span style={{ whiteSpace: "nowrap" }}>
    H<span style={{ fontSize: "0.68em", position: "relative", top: "0.28em", marginLeft: "0.04em" }}>{one ? "1" : "0"}</span>
  </span>
);

/** Greek set in the serif, upright, from the subset editorial/fonts.ts waits for. */
export const Greek: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "normal", color }}>{children}</span>
);

/** A number that counts from `from` to `to` over `dur` frames, eased. */
export const Count: React.FC<{
  at: number;
  to: number;
  from?: number;
  dur?: number;
  format?: (v: number) => string;
  style?: React.CSSProperties;
}> = ({ at, to, from = 0, dur = 24, format = (v) => fmt(v, 0), style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  return <span style={{ fontVariantNumeric: "tabular-nums lining-nums", ...style }}>{format(lerp(from, to, p))}</span>;
};

/**
 * A highlighter stroke behind the words it wraps, swept left to right on
 * `at`, the way a reader marks the phrase being read. Sized in em, so it fits
 * the words in any face.
 */
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = MARK,
  children,
}) => {
  const frame = useCurrentFrame();
  // A quick stroke, the way a highlighter is drawn.
  const p = ease(frame, at, 8);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          bottom: "0.04em",
          height: "0.5em",
          width: `calc((100% + 0.24em) * ${p})`,
          background: color,
          borderRadius: "0.12em",
          opacity: p > 0 ? 1 - o : 0,
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
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

/** A vertical bracket from y0 to y1 at x, ticks pointing left (or right). */
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
  opacity?: number;
}> = ({ x, y0, y1, at, out, color = INK, tick = 12, width = 2.2, right = false, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (y0 + y1) / 2;
  const a = mid + (y0 - mid) * p;
  const b = mid + (y1 - mid) * p;
  const t = right ? tick : -tick;
  return (
    <Svg opacity={(1 - o) * opacity}>
      <path d={`M${x + t},${a} L${x},${a} L${x},${b} L${x + t},${b}`} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" />
    </Svg>
  );
};

/** A check mark that draws itself on `at`, centred on (x, y). */
export const Tick: React.FC<{ x: number; y: number; at: number; size?: number; color?: string; width?: number }> = ({
  x,
  y,
  at,
  size = 26,
  color = OK_INK,
  width = 4,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  const s = size / 2;
  return (
    <Svg>
      <path
        d={`M${x - s},${y} L${x - s * 0.25},${y + s * 0.7} L${x + s},${y - s * 0.75}`}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};

/**
 * A slow push on a finished figure: a few percent of scale over its life,
 * eased, around `origin`. It keeps a figure that is being talked about from
 * sitting dead still, and never jolts.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  dx?: number;
  dy?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, scale = 0.025, dx = 0, dy = 0, origin = "50% 50%", children }) => {
  const frame = useCurrentFrame();
  const t = to > from ? clamp01((frame - from) / (to - from)) : 0;
  // Smoothstep, so the push eases in and out.
  const s = t * t * (3 - 2 * t);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformOrigin: origin,
        transform: `translate(${dx * s}px, ${dy * s}px) scale(${1 + scale * s})`,
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

/** The standard normal density. */
export const phi = (z: number) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

/**
 * An SVG path for `f` over [lo, hi], mapped by `px` and `py`; with `closed`
 * it runs back along the baseline `base`, for a filled area.
 */
export const curvePath = (
  f: (x: number) => number,
  lo: number,
  hi: number,
  px: (x: number) => number,
  py: (v: number) => number,
  closed?: number,
  steps = 120,
) => {
  if (hi <= lo) return "";
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const x = lo + ((hi - lo) * i) / steps;
    return `${i ? "L" : "M"}${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`;
  });
  if (closed !== undefined) pts.push(`L${px(hi).toFixed(1)},${closed.toFixed(1)}`, `L${px(lo).toFixed(1)},${closed.toFixed(1)}Z`);
  return pts.join(" ");
};

/** "0.031", "3.1%": small probabilities the way the panels print them. */
export const pct = (p: number, digits = 1) => `${fmt(p * 100, digits)}%`;

/** Inline Inter for a figure's own text. */
export const Label: React.FC<{ size?: number; color?: string; weight?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({
  size = 22,
  color = INK,
  weight = 600,
  style,
  children,
}) => <span style={{ ...label(size, color), fontWeight: weight, whiteSpace: "nowrap", ...style }}>{children}</span>;
