import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, headline, HIGHLIGHT, INK, INK_SOFT, PAPER } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, IMAGES, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, after the two
 * unit videos it deepens (nlp-history/parts.tsx, nlp-counting-words/parts.tsx):
 * a two-half headline, a highlighter mark, small Inter tags, a bracket, a
 * watercolor spot, and a slow drift so a finished figure never holds still.
 *
 * Color roles, one meaning each, for the whole video:
 * - Emma's real counts and shares are the kit's data blue (DATA);
 * - what one over the rank predicts is grey and dashed (LAW);
 * - the words that appear only once are orange (ONCE), the one accent hue;
 * - what the narration points at takes the red accent (the near tie, the
 *   top hundred ranks on the two rank axes, a stopword struck out);
 * - a spoken word is swept with the yellow highlighter.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export const DATA = BAR;
export const DATA_INK = BLUE_INK;
export const DATA_WASH = `color-mix(in srgb, ${BAR} 18%, ${PAPER})`;
export const LAW = INK_SOFT;
export const LAW_FILL = `color-mix(in srgb, ${INK_SOFT} 22%, ${PAPER})`;
export const ONCE = ds("orange", 500);
export const ONCE_INK = inkOf.orange;
export const POINT = ACCENT;
export const POINT_INK = ACCENT_INK;
export const POINT_WASH = `color-mix(in srgb, ${ACCENT} 20%, transparent)`;
export const EMPTY = ds("gray", 50);
export const RULE = `color-mix(in srgb, ${INK} 22%, transparent)`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** 1 from `at` (easing in) until `out` (easing away). */
export const shown = (frame: number, at: number, out?: number, dur = 12) =>
  ease(frame, at, dur) * (out === undefined ? 1 : 1 - ease(frame, out, dur));

/** A slow drift from `at` on, in px: eases to `amount` over `dur` frames. */
export const drift = (frame: number, at: number, amount: number, dur = 150) => amount * ease(frame, at, dur);

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/**
 * A headline: a lead in roman, then optionally a turn in italic in the accent
 * ink on the same line. Each half has its own cue; the line lifts away on
 * `out`.
 */
export const Headline: React.FC<{
  at: number;
  lead: React.ReactNode;
  turn?: React.ReactNode;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ at, lead, turn, turnAt, out, size = 66, top = 150 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink
          at={turnAt ?? at + 10}
          dur={18}
          out={out}
          style={{ position: "relative", ...headline(size, true), color: ACCENT_INK, whiteSpace: "nowrap" }}
        >
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/** A highlighter stroke under the words it wraps, swept in on `at`. */
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
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

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = ACCENT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.08em",
          top: "0.56em",
          width: `calc((100% + 0.16em) * ${p})`,
          height: 3,
          background: color,
          borderRadius: 2,
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** A small label in Inter, placed by its left, centre or right edge. */
export const Tag: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  align?: "left" | "center" | "right";
  size?: number;
  color?: string;
  weight?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, at, out, dim, align = "left", size = 21, color = INK_SOFT, weight = 500, style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const shift = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${shift}, ${(1 - p) * 8}px)`,
        opacity: p * (1 - o) * (1 - d),
        whiteSpace: "nowrap",
        fontFamily: SANS,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: 1.3,
        fontVariantNumeric: "lining-nums",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** A square bracket over (or under, `up`) a span, opening from its middle. */
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
 * A watercolor spot: it pops in on `at` (sliding from `from`, in px), bobs
 * gently, dims on `dim` and fades on `out`. `id` is the file's name under
 * public/images/nlp-zipfs-law/.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  from?: readonly [number, number];
}> = ({ id, at, out, dim, left, top, width, height, from = [0, 30] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || !IMAGES.has(id) || p <= 0.001 || o >= 1) return null;
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
        transform: `translate(${(1 - p) * from[0]}px, ${bob(frame, 5, 110) + (1 - p) * from[1]}px)`,
      }}
    />
  );
};

/** A legend swatch for the right end of a figure label. */
export const Swatch: React.FC<{ color: string; dashed?: boolean }> = ({ color, dashed }) => (
  <span
    style={{
      display: "inline-block",
      width: 30,
      height: 14,
      borderRadius: 3,
      background: dashed ? LAW_FILL : color,
      border: dashed ? `2px dashed ${color}` : undefined,
      boxSizing: "border-box",
      flex: "none",
    }}
  />
);

/** Lead-in arrow-free pointer: a thin straight line ending in a dot. */
export const Pointer: React.FC<{ x0: number; y0: number; x1: number; y1: number; at: number; out?: number; color?: string }> = ({
  x0,
  y0,
  x1,
  y1,
  at,
  out,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <Svg opacity={1 - o}>
      <line x1={x0} y1={y0} x2={lerp(x0, x1, p)} y2={lerp(y0, y1, p)} stroke={color} strokeWidth={1.6} />
      <circle cx={x1} cy={y1} r={4} fill={color} opacity={ease(frame, at + 8, 6)} />
    </Svg>
  );
};
