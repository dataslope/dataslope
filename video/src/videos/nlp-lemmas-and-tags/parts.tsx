import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, copied from the
 * unit video nlp-cleaning-text (folders never import each other): a part's
 * kicker and a two-ink headline, and a token chip. A chip is a string in the
 * code face in a rounded box; its width is computed from its length, since
 * JetBrains Mono sets every character 0.6 em wide, so a row of chips is laid
 * out without measuring the DOM.
 *
 * Colors keep one meaning each through the video: yellow is the highlighter
 * on whatever the narration is saying, blue marks a real WordNet entry (a
 * form the dictionary has, under the part of speech asked for), and a faded
 * dashed chip is a candidate WordNet does not have. Red is only the figure
 * numbers' and headlines' accent.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
const KICKER_Y = 112;
const HEAD_Y = 150;

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * One headline line in two inks: the lead in roman on `at`, the turn in
 * italic accent on `turnAt`, laid out after it. `out` takes the whole line
 * away, so the next headline can take its place.
 */
export const Headline: React.FC<{
  lead: React.ReactNode;
  turn?: React.ReactNode;
  at: number;
  turnAt?: number;
  out?: number;
  size?: number;
}> = ({ lead, turn, at, turnAt, out, size = 72 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(HEAD_Y), display: "flex", gap: "0.26em", ...headline(size) }}>
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

/** A highlighter stroke laid under the words it wraps, swept on `at` and
 *  lifted on `out`. Sized in em and to the words, so it fits any face. */
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
          left: "-0.1em",
          top: "0.06em",
          bottom: "-0.02em",
          width: `calc((100% + 0.2em) * ${p})`,
          background: color,
          borderRadius: "0.1em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** Inline content that fades in on `at`. */
export const Fade: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  dur = 12,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  return <span style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 6}px)`, ...style }}>{children}</span>;
};

// ── Token chips ──────────────────────────────────────────────────────────────

export const CHIP_SIZE = 32;
const BORDER = 2;
const padX = (size: number) => Math.round(size * 0.36);
const padY = (size: number) => Math.round(size * 0.2);
/** JetBrains Mono's advance, in em, for every character. */
const ADVANCE = 0.6;

export const chipWidth = (text: string, size = CHIP_SIZE) => text.length * ADVANCE * size + 2 * padX(size) + 2 * BORDER;
export const chipHeight = (size = CHIP_SIZE) => Math.round(size * 1.25) + 2 * padY(size) + 2 * BORDER;

/** Left edges and widths of a row of chips from `x`, `gap` apart. */
export function rowLayout(tokens: readonly string[], x: number, size = CHIP_SIZE, gap = 14) {
  let cursor = x;
  return tokens.map((t) => {
    const w = chipWidth(t, size);
    const left = cursor;
    cursor += w + gap;
    return { x: left, w, mid: left + w / 2, right: left + w };
  });
}

export type Tone = "plain" | "good";
const TONE = {
  plain: { bg: ds("gray", 50), line: `color-mix(in srgb, ${INK} 38%, transparent)` },
  good: { bg: `color-mix(in srgb, ${BAR} 15%, ${PAPER})`, line: BAR },
} as const;

/** A tone that takes over from the one before at `at`. */
export type ToneStep = { at: number; tone: Tone };
/** A highlighter pass over the chip, laid on at `at` and lifted at `out`. */
export type MarkSpan = { at: number; out?: number };

/** The tone a chip shows at `frame`, as a background and a line color mixed
 *  between its last two steps. */
function toneAt(frame: number, steps: readonly ToneStep[]) {
  let from: Tone = "plain";
  let to: Tone = "plain";
  let p = 1;
  for (const s of steps) {
    if (frame < s.at) break;
    from = to;
    to = s.tone;
    p = ease(frame, s.at, 10);
  }
  const mix = (a: string, b: string) => (p >= 1 ? b : `color-mix(in srgb, ${b} ${(p * 100).toFixed(1)}%, ${a})`);
  return { bg: mix(TONE[from].bg, TONE[to].bg), line: mix(TONE[from].line, TONE[to].line) };
}

/**
 * One token: `text` in the code face, in a rounded box at (x, y), its top
 * left corner. It pops in at `at`. `tones` change its fill and line over
 * time, `marks` lay the highlighter over it, and `gone` fades it to a dashed
 * ghost (a candidate WordNet does not have). `content` is drawn in place of
 * the text, in the chip's face, while the width still follows `text`.
 */
export const Chip: React.FC<{
  text: string;
  x: number;
  y: number;
  at: number;
  size?: number;
  tones?: readonly ToneStep[];
  marks?: readonly MarkSpan[];
  gone?: number;
  out?: number;
  content?: React.ReactNode;
}> = ({ text, x, y, at, size = CHIP_SIZE, tones = [], marks = [], gone, out, content }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 15);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || o >= 1) return null;
  const g = gone === undefined ? 0 : ease(frame, gone, 14);
  const { bg, line } = toneAt(frame, tones);
  const mark = marks.reduce((m, s) => Math.max(m, ease(frame, s.at, 10) * (s.out === undefined ? 1 : 1 - ease(frame, s.out, 12))), 0);
  const w = chipWidth(text, size);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: chipHeight(size),
        boxSizing: "border-box",
        borderRadius: Math.round(size * 0.28),
        border: `${BORDER}px ${g > 0.5 ? "dashed" : "solid"} ${line}`,
        background: mark > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${(mark * 100).toFixed(1)}%, ${bg})` : bg,
        opacity: Math.min(1, p) * (1 - o) * (1 - g * 0.6),
        transform: `translateY(${(1 - Math.min(1, p)) * 12}px) scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 600,
        lineHeight: 1,
        color: g > 0 ? `color-mix(in srgb, ${INK_SOFT} ${(g * 100).toFixed(0)}%, ${INK})` : INK,
        whiteSpace: "pre",
        fontVariantLigatures: "none",
      }}
    >
      {content ?? text}
    </div>
  );
};

/** A small note in the label face, set under or beside a chip. */
export const Tag: React.FC<{
  at: number;
  x: number;
  y: number;
  color?: string;
  align?: "left" | "center" | "right";
  out?: number;
  size?: number;
  children: React.ReactNode;
}> = ({ at, x, y, color = ACCENT_INK, align = "left", out, size = 21, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tx = align === "center" ? "-50%" : align === "right" ? "-100%" : "0";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${tx}, ${(1 - p) * -6}px)`,
        opacity: p * (1 - o),
        ...note(size, color),
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

/** A straight arrow drawn from `from` to `to`, its head built by arrowHead()
 *  on the drawn line. */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 14, out, color = INK_SOFT, width = 2.2 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(13, len * 0.6);
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
  if (!ILLUSTRATIONS || frame < at || p <= 0.001 || o >= 1) return null;
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
