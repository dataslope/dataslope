import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, TOKENS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit. The token colors,
 * Tok, Mono, Marked and Struck are LlmTemperature's (its kit.tsx), copied so
 * the two videos draw the lesson's example alike; Kicker, Headline, Drift,
 * Arrow, Spot and pulse follow DbWhyDesign's parts.tsx.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 108;
export const HEAD_Y = 146;

// ── Colors: one meaning each, through the whole video ────────────────────────

/** Each of the lesson's four tokens keeps one color through Part 1. The
 *  unlikely one, rock, takes the red accent: it is what gets cut. */
export const FILL = [ds("blue", 500), ds("green", 500), ds("yellow", 600), ACCENT] as const;
export const TEXT = [BLUE_INK, inkOf.green, inkOf.yellow, ACCENT_INK] as const;
export const TINT = FILL.map((c) => `color-mix(in srgb, ${c} 26%, ${PAPER})`);
/** Green: what holds up (grounded, checked, kept). Red: what goes wrong. */
export const GOOD = ds("green", 500);
export const GOOD_INK = inkOf.green;
/** Purple: a reasoning model's thinking, hidden working rather than a verdict. */
export const THINK = ds("purple", 500);
export const THINK_INK = inkOf.purple;
export const tint = (c: string, share = 22) => `color-mix(in srgb, ${c} ${share}%, ${PAPER})`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell for something named
 *  again once it is already on the page. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A token of the lesson's example, in the code face and its own ink. */
export const Tok: React.FC<{ i: number; size?: number; weight?: number; style?: React.CSSProperties }> = ({
  i,
  size = 34,
  weight = 600,
  style,
}) => (
  <span style={{ fontFamily: MONO, fontSize: size, fontWeight: weight, color: TEXT[i], whiteSpace: "nowrap", ...style }}>
    {TOKENS[i]}
  </span>
);

/** Code set inside running text, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight = 500 }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight, color, fontVariantLigatures: "none" }}>
    {children}
  </span>
);

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: X0, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, ACCENT_INK)}>{children}</span>
    </Ink>
  );
};

/**
 * One headline line in two inks: the lead in roman on `at`, the turn in
 * italic accent on `turnAt`, laid out after the lead in the flow. `out` takes
 * the whole line away, so the next headline can take its place.
 */
export const Headline: React.FC<{
  lead: React.ReactNode;
  turn?: React.ReactNode;
  at: number;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, turn, at, turnAt, out, size = 60, top = HEAD_Y }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: X0 - 4, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink
          at={turnAt ?? at + 12}
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

/** A highlighter stroke behind the words it wraps, wiped in from the left;
 *  it follows the text's own box, so it fits any face. */
export const Marked: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  return (
    <span style={{ position: "relative", whiteSpace: "nowrap" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.18em",
          top: "0.02em",
          bottom: "-0.04em",
          width: `calc(${p} * (100% + 0.36em))`,
          background: color,
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A strike through the words it wraps, drawn across from the left. */
export const Struck: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = ACCENT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", whiteSpace: "nowrap" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          top: "52%",
          height: 3,
          width: `calc(${p} * (100% + 0.24em))`,
          background: color,
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/**
 * A slow, eased push on a figure: its children scale up by `amount` between
 * `from` and `to`, so a figure being talked about is never quite frozen.
 * Keep illustrations outside it: they are drawn at their pixels' size.
 */
export const Drift: React.FC<{ from: number; to: number; amount?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  amount = 0.02,
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

/** A straight arrow from `from` to `to`, drawn in on `at`; its head is built
 *  along the drawn line by arrowHead() (components/arrow.ts). */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ from, to, at, dur = 14, out, color = INK, width = 2.4, head = 16 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(head, len * 0.6);
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

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs, and
 * fades on `out`. Nothing is drawn while the art is not in.
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

/** A small rounded tag in a hue, for a label that sits on a figure. */
export const Tag: React.FC<{ color: string; ink: string; children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  color,
  ink,
  children,
  size = 21,
  style,
}) => (
  <span
    style={{
      display: "inline-block",
      padding: "4px 12px 5px",
      borderRadius: 8,
      background: tint(color, 20),
      border: `1.5px solid ${color}`,
      ...note(size, ink),
      fontWeight: 650,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </span>
);

/** Soft ink for the notes that say a figure's numbers are the lesson's
 *  illustration rather than a measurement. */
export const Illustrative: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={note(20, INK_SOFT)}>{children}</span>
);
