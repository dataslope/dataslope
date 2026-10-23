import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, fmt, headline as headlineStyle, HIGHLIGHT, INK, INK_SOFT, label, PAPER, TABULAR } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { type Family, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a part's kicker,
 * a two-ink headline, highlighter marks, a slow push, the watercolor spots,
 * and the unit's own vocabulary: a word tile (a token, set in mono on a
 * small card), a part-of-speech tag chip colored by its family, bars that
 * grow, and a number that counts.
 *
 * Color roles, one meaning each, for the whole video:
 * - counts and shares are the kit's data blue (BAR);
 * - what the narration points at takes the red accent (a word picked out, a
 *   lemma left untouched, the sliding window, the share that is rare);
 * - a spoken word is swept with the yellow highlighter;
 * - a tag's family is its color, by first letter, as the lesson decodes
 *   them: N nouns teal, V verbs purple, J adjectives orange, R adverbs
 *   green, every other tag grey.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for something named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI);
};

export const DATA = BAR;
/** A tint of the accent, for a wash behind words the narration points at. */
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;
/** A neutral wash for words that come back (repeats), so red stays for what
 *  the narration points at. */
export const REPEAT_WASH = `color-mix(in srgb, ${INK_SOFT} 18%, transparent)`;
/** Ink set back from the figure being talked about. */
export const FADED = `color-mix(in srgb, ${INK_SOFT} 34%, ${PAPER})`;
export const RULE = `color-mix(in srgb, ${INK} 22%, transparent)`;

export const FAMILY: Record<Family, { fill: string; ink: string; tint: string; name: string }> = {
  noun: { fill: ds("teal"), ink: inkOf.teal, tint: `color-mix(in srgb, ${ds("teal")} 18%, ${PAPER})`, name: "noun" },
  verb: { fill: ds("purple"), ink: inkOf.purple, tint: `color-mix(in srgb, ${ds("purple")} 16%, ${PAPER})`, name: "verb" },
  adj: { fill: ds("orange"), ink: inkOf.orange, tint: `color-mix(in srgb, ${ds("orange")} 16%, ${PAPER})`, name: "adjective" },
  adv: { fill: ds("green"), ink: inkOf.green, tint: `color-mix(in srgb, ${ds("green")} 16%, ${PAPER})`, name: "adverb" },
  other: { fill: ds("gray", 400), ink: INK_SOFT, tint: ds("gray", 50), name: "other" },
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

/** A two-ink headline line: the first phrase in ink, the second following it
 *  in italic accent, each on its own cue; both leave on `out`. The row takes
 *  the headline's own size, so the word space between the halves is measured
 *  in that face. */
export const Headline: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 64, top = 150, children, italic }) => {
  const { y } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        top: y(top),
        display: "flex",
        gap: "0.26em",
        whiteSpace: "nowrap",
        fontSize: headlineStyle(size).fontSize,
      }}
    >
      <Ink at={at} dur={20} out={out} style={{ position: "relative", ...headlineStyle(size) }}>
        {children}
      </Ink>
      {italic !== undefined && second !== undefined ? (
        <Ink at={second} dur={18} out={out} style={{ position: "relative", ...headlineStyle(size, true), color: ACCENT_INK }}>
          {italic}
        </Ink>
      ) : null}
    </div>
  );
};

/** A slow, eased push on a figure being talked about, so it never quite
 *  freezes. Keep illustrations outside it: they are drawn at their pixels. */
export const Drift: React.FC<{
  from: number;
  to: number;
  amount?: number;
  origin?: string;
  children: React.ReactNode;
}> = ({ from, to, amount = 0.016, origin = "50% 55%", children }) => {
  const frame = useCurrentFrame();
  const t = clamp01((frame - from) / Math.max(1, to - from));
  const e = t * t * (3 - 2 * t);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${1 + amount * e})`, transformOrigin: origin }}>
      {children}
    </div>
  );
};

/** A highlighter stroke behind the words it wraps, swept on `at`. */
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
          top: "0.1em",
          bottom: "0.02em",
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

/** A horizontal bracket from x0 to x1, its end ticks pointing at what it
 *  spans (down, or up with `up`). It opens from its middle. */
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

/** A number counting from `from` to `to` over `dur` frames from `at`, in
 *  digits of one width. Place it only where it is moving or done. */
export const Count: React.FC<{ at: number; to: number; from?: number; dur?: number; digits?: number }> = ({
  at,
  to,
  from = 0,
  dur = 16,
  digits = 0,
}) => {
  const frame = useCurrentFrame();
  const v = lerp(from, to, ease(frame, at, dur));
  return <span style={TABULAR}>{fmt(v, digits)}</span>;
};

/** Text that inks in on `at` but holds its place in a flex row from the first
 *  frame, so the words after it never shift when it arrives. */
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

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Nothing is drawn while the art is not in.
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
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.65;
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
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

// ── Word tiles ───────────────────────────────────────────────────────────────

/** JetBrains Mono's advance, in em. */
const ADVANCE = 0.6;
export const tilePad = (size: number) => Math.round(size * 0.46);
export const tileH = (size: number) => Math.round(size * 1.72);
/** A tile's width for its text at `size`: the glyphs plus its padding. */
export const tileW = (text: string, size: number) => Math.ceil(text.length * ADVANCE * size + 2 * tilePad(size) + 3);

export type Placed = { text: string; x: number; y: number; w: number };

/** Lays words out as tiles, left to right from `x`, wrapping before `maxX`;
 *  each row `rowStep` below the last. */
export const flow = (words: readonly string[], x: number, y: number, maxX: number, size: number, gap: number, rowStep: number): Placed[] => {
  const out: Placed[] = [];
  let cx = x;
  let cy = y;
  for (const text of words) {
    const w = tileW(text, size);
    if (cx > x && cx + w > maxX) {
      cx = x;
      cy += rowStep;
    }
    out.push({ text, x: cx, y: cy, w });
    cx += w + gap;
  }
  return out;
};

/** Tiles in one row with fixed column widths (for words that line up across
 *  rows): each column as wide as the widest of its words. */
export const columns = (rows: readonly (readonly string[])[], x: number, size: number, gap: number) => {
  const n = rows[0].length;
  const widths = Array.from({ length: n }, (_, j) => Math.max(...rows.map((r) => tileW(r[j], size))));
  const xs = widths.map((_, j) => x + widths.slice(0, j).reduce((a, b) => a + b + gap, 0));
  return { widths, xs, right: xs[n - 1] + widths[n - 1] };
};

export type TileMark = { at: number; out?: number; color?: string };

/**
 * One token on a small card, set in mono. It arrives on `at` (a short rise),
 * can take highlighter marks, a tint and a border color, dims on `dim` and
 * leaves on `out`. With `to`, it glides from (x, y) to a new place between
 * `to.at` and `to.at + to.dur`.
 */
export const Tile: React.FC<{
  text: string;
  x: number;
  y: number;
  at: number;
  size?: number;
  w?: number;
  marks?: readonly TileMark[];
  tint?: string;
  border?: string;
  ink?: string;
  dim?: number;
  undim?: number;
  out?: number;
  to?: { x: number; y: number; at: number; dur?: number };
  lift?: number;
}> = ({ text, x, y, at, size = 26, w, marks = [], tint, border, ink = INK, dim, undim, out, to, lift = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d0 = dim === undefined ? 0 : ease(frame, dim, 12);
  const d1 = undim === undefined ? 0 : ease(frame, undim, 12);
  const d = Math.max(0, d0 - d1) * 0.7;
  if (p <= 0 || o >= 1) return null;
  const m = to ? ease(frame, to.at, to.dur ?? 18) : 0;
  const left = to ? lerp(x, to.x, m) : x;
  const top = to ? lerp(y, to.y, m) : y;
  const arc = to ? -Math.sin(m * Math.PI) * 26 : 0;
  const width = w ?? tileW(text, size);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: top + (1 - p) * 10 + arc - lift,
        width,
        height: tileH(size),
        boxSizing: "border-box",
        borderRadius: Math.round(size * 0.3),
        border: `1.5px solid ${border ?? `color-mix(in srgb, ${INK} 30%, transparent)`}`,
        background: tint ?? PAPER,
        opacity: p * (1 - o) * (1 - d),
        overflow: "hidden",
      }}
    >
      {marks.map((mk, k) => {
        const s = ease(frame, mk.at, 10);
        const g = mk.out === undefined ? 0 : ease(frame, mk.out, 12);
        if (s <= 0 || g >= 1) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              inset: 0,
              background: mk.color ?? HIGHLIGHT,
              clipPath: `inset(0 ${(1 - s) * 100}% 0 0)`,
              opacity: 1 - g,
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: size,
          color: ink,
          whiteSpace: "pre",
          fontVariantLigatures: "none",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** A tag chip's width for its text. */
export const chipW = (tag: string, size = 21) => Math.ceil(Math.max(2, tag.length) * ADVANCE * size + 22);

/**
 * A Penn Treebank tag on a small chip in its family's color, centered on
 * `cx`, arriving on `at` with a short drop. `gloss` (what the tag means)
 * writes in under it on `glossAt`.
 */
export const TagChip: React.FC<{
  tag: string;
  family: Family;
  cx: number;
  y: number;
  at: number;
  size?: number;
  gloss?: string;
  glossAt?: number;
  glossSize?: number;
  dim?: number;
  out?: number;
  glow?: number;
}> = ({ tag, family, cx, y, at, size = 21, gloss, glossAt, glossSize = 20, dim, out, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const f = FAMILY[family];
  const w = chipW(tag, size);
  const g = glossAt === undefined ? 0 : ease(frame, glossAt, 12);
  return (
    <div style={{ position: "absolute", left: cx - 120, top: y, width: 240, opacity: (1 - o) * (1 - d) }}>
      <div
        style={{
          margin: "0 auto",
          width: w,
          height: Math.round(size * 1.6),
          boxSizing: "border-box",
          borderRadius: 6,
          border: `2px solid ${f.fill}`,
          background: f.tint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: size,
          color: f.ink,
          opacity: p,
          transform: `translateY(${(1 - p) * -12}px) scale(${1 + glow * 0.12})`,
        }}
      >
        {tag}
      </div>
      {gloss ? (
        <div
          style={{
            marginTop: 8,
            textAlign: "center",
            ...label(glossSize, f.ink),
            fontWeight: 600,
            whiteSpace: "nowrap",
            opacity: g,
            transform: `translateY(${(1 - g) * 6}px)`,
          }}
        >
          {gloss}
        </div>
      ) : null}
    </div>
  );
};

// ── Bars ─────────────────────────────────────────────────────────────────────

/** A horizontal bar from `x` growing to `w` on `at`; `w` may change frame to
 *  frame (a tally). */
export const HBar: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  dur?: number;
  color?: string;
  dim?: number;
  out?: number;
}> = ({ x, y, w, h, at, dur = 16, color = DATA, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{ position: "absolute", left: x, top: y, width: Math.max(0, w * p), height: h, background: color, opacity: (1 - o) * (1 - d) }}
    />
  );
};

/** Inter, set for a number beside a bar. */
export const numStyle = (size = 22, color: string = INK): React.CSSProperties => ({
  ...label(size, color),
  fontWeight: 600,
  ...TABULAR,
  whiteSpace: "nowrap",
});

/** Mono, for a token written into a figure label or a list. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; size?: number; weight?: number }> = ({
  children,
  color = INK,
  size,
  weight = 500,
}) => <span style={{ fontFamily: MONO, fontSize: size, color, fontWeight: weight, fontVariantLigatures: "none" }}>{children}</span>;

/** Python as the page prints it: a tinted panel between a rule above and a
 *  hairline below, each line inking in on its own cue. `y` is a page y. */
export const CodePanel: React.FC<{
  x: number;
  y: number;
  width: number;
  lines: readonly { text: string; at: number; color?: string }[];
  size?: number;
  at: number;
  out?: number;
}> = ({ x, y, width, lines, size = 22, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const lineH = Math.round(size * 1.7);
  const padY = Math.round(size * 0.6);
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height: padY * 2 + lines.length * lineH, opacity: 1 - o }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ds("gray", 50),
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid color-mix(in srgb, ${INK} 45%, transparent)`,
        }}
      />
      {lines.map((l, i) => (
        <Ink key={i} at={l.at} dur={14} style={{ left: Math.round(size * 0.8), top: padY + i * lineH, height: lineH, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: size, color: l.color ?? INK, whiteSpace: "pre", fontVariantLigatures: "none" }}>{l.text}</span>
        </Ink>
      ))}
    </div>
  );
};
