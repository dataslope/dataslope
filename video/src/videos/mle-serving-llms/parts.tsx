import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The headings, the drift, the highlighter and the
 * arrows follow be-scaling's parts (the highlighter takes its bleed back as
 * margin, as da-pandas's does); the boxes follow the owner's 2026-11-20
 * preferences: outlined, never filled, black text, a highlight coloring
 * outline and text together. Filled shapes (bars, cells, blocks) carry no
 * outline. What is this video's own: the memory bar of one node, cells of
 * cache, and a bracket over a stretch of time.
 */
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
/** The page's right margin. */
export const RIGHT = 1800;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const Q_SIZE = 56;
export const Q_W = 1700;

// ── Colors: brand ramps and the editorial palette only ───────────────────────

/** Data: weights, tokens, anything measured. */
export const DATA = BAR;
/** The KV cache, a lighter step of the data blue so it reads apart from the
 *  weights beside it. */
export const CACHE = ds("blue", 300);
/** What sits idle or empty: grey, never red (an idle slot is how static
 *  batching works, not an error). */
export const IDLE = ds("gray", 200);
export const IDLE_INK = ds("gray", 600);
export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;
export { ACCENT, ACCENT_INK, BLUE_INK, INK, INK_SOFT, PAPER };

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const commas = (v: number) => v.toLocaleString("en-US");
export const pct = (v: number) => `${Math.round(v * 100)}%`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** Visible from `at` (eased in) until `out` (eased out). */
export const shown = (frame: number, at: number, out?: number, dur = 12) =>
  Math.min(ease(frame, at, dur), out === undefined ? 1 : 1 - ease(frame, out, dur));

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on a finished figure (drift() in components/motion.ts). */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.015,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

/** Fades its children away from `at`, lifting them a little. */
export const Clear: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, at, 14);
  if (o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - o, transform: `translateY(${-o * 8}px)` }}>{children}</div>;
};

/** Fades its children in from `at`. */
export const Enter: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  if (p <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** The kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(26, ACCENT_INK)}>{children}</span>
    </Ink>
  );
};

/** A headline on one line: the lead, then the turn inking in after it. */
export const Headline: React.FC<{ lead: string; turn?: string; at: number; turnAt?: number; out?: number; size?: number; top?: number }> = ({
  lead,
  turn,
  at,
  turnAt,
  out,
  size = 64,
  top = HEAD_Y,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A highlighter stroke under the words it wraps, swept left to right on `at`.
 * It reaches 0.14em past the words on each side and takes that back as
 * margin, so a neighbour keeps a full space.
 */
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
    <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
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

/** The highlighter at a given amount (0 to 1, the sweep and the fade
 *  together), for a mark that comes and goes more than once. */
export const MarkAt: React.FC<{ amount: number; color?: string; children: React.ReactNode }> = ({ amount, color = HIGHLIGHT, children }) => (
  <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
    <span
      style={{
        position: "absolute",
        left: "-0.14em",
        top: "0.04em",
        bottom: "-0.06em",
        width: `calc((100% + 0.28em) * ${Math.max(0, Math.min(1, amount))})`,
        background: color,
        borderRadius: "0.14em",
        opacity: amount > 0 ? 1 : 0,
      }}
    />
    <span style={{ position: "relative" }}>{children}</span>
  </span>
);

/** A red line struck through the words it wraps, drawn on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = ACCENT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top: "0.55em",
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

/** A line of Inter at one size that inks in on `at`: the page's notes. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: "left" | "right" | "center";
  width?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({ at, x, y, out, dim, size = 24, color = INK, weight = 500, align = "left", width, opacity = 1, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const w = width ?? 0;
  const left = align === "left" ? x : align === "right" ? x - w : x - w / 2;
  return (
    <Ink at={at} dur={14} out={out} style={{ left, top: y, width, textAlign: align, opacity: (1 - d) * opacity }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap" }}>{children}</span>
    </Ink>
  );
};

// ── Boxes, arrows, brackets ──────────────────────────────────────────────────

/** A box's highlight: none (ink), the narration's pointer (yellow), data
 *  (blue), the right answer (green) or the trap (red). */
export type Tone = "plain" | "lit" | "data" | "ok" | "bad";
const TONE_LINE: Record<Tone, string> = { plain: INK, lit: ds("yellow", 700), data: BAR, ok: OK, bad: ACCENT };
const TONE_INK: Record<Tone, string> = { plain: INK, lit: INK, data: BLUE_INK, ok: OK_INK, bad: ACCENT_INK };
export const toneLine = (t: Tone) => TONE_LINE[t];
export const toneInk = (t: Tone) => TONE_INK[t];

/**
 * A diagram's box: outlined, never filled (the owner, 2026-11-12 and
 * 2026-11-20), 2px, radius 8, black text; a tone colors the outline and the
 * text together. It pops in on `at`.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  dashed?: boolean;
  radius?: number;
  opacity?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", size = 24, subSize = 21, dim, out, dashed, radius = 8, opacity = 1, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${TONE_LINE[tone]}`,
        borderRadius: radius,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        opacity: Math.min(1, p) * (1 - d) * (1 - o) * opacity,
        transform: `scale(${0.92 + 0.08 * Math.min(1, p)})`,
      }}
    >
      {title ? <span style={{ ...label(size, TONE_INK[tone]), fontWeight: 500, whiteSpace: "nowrap" }}>{title}</span> : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from its
 * tail on `at`, its head built by arrowHead() on the straight last stretch.
 * `head={0}` draws a plain line.
 */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  dim?: number;
  out?: number;
  opacity?: number;
  radius?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out, opacity = 1, radius = 18 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, radius) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = head > 0 ? Math.max(0, (len - head + 1) / len) : 1;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {dash ? (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} opacity={p} />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      {head > 0 ? <path d={arrowHead(line, head, head * 0.53, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/**
 * A bracket under (or over) a stretch from x1 to x2 at `y`: a line with a
 * short tick at each end, drawn out from its middle.
 */
export const Bracket: React.FC<{ x1: number; x2: number; y: number; at: number; color?: string; up?: boolean; out?: number; dim?: number }> = ({
  x1,
  x2,
  y,
  at,
  color = INK,
  up = false,
  out,
  dim,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const mid = (x1 + x2) / 2;
  const half = ((x2 - x1) / 2) * p;
  const tick = up ? 12 : -12;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <path
        d={`M${mid - half},${y + tick} L${mid - half},${y} L${mid + half},${y} L${mid + half},${y + tick}`}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each watercolor's natural size in pixels, after the import's trim. At 4K
 *  an image may be drawn at most half that on the 1080p layout. */
export const SPOTS = {
  kingfisher: [911, 1024],
  hourglass: [613, 1024],
  tiles: [1023, 230],
  pencil: [905, 866],
} as const satisfies Record<string, readonly [number, number]>;
export type SpotId = keyof typeof SPOTS;

/** A spot's drawn height at width `w`, from its natural aspect. */
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/**
 * A watercolor from illustrations.json, `w` wide at (x, y): it pops in on
 * `at` (the scene cues an `el-pop` on the same frame), bobs gently, and fades
 * on `out`.
 */
export const Spot: React.FC<{ id: SpotId; at: number; out?: number; x: number; y: number; w: number; phase?: number }> = ({
  id,
  at,
  out,
  x,
  y,
  w,
  phase = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={`${VIDEO}-${id}`}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: spotH(id, w),
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame + phase, 4, 100) + (1 - p) * 24}px) scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    />
  );
};

/** The vertical hairline between two columns of text. */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number }> = ({ x, top, bottom, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: Math.round(x), top, width: 1, height: (bottom - top) * p, background: HAIRLINE, opacity: 1 - o }} />;
};


/** A token's tint and ink, by what it is: data (blue), a draft not yet
 *  checked (pale blue), accepted (green), rejected (red), idle (grey). */
export type TokenTone = "data" | "pale" | "ok" | "bad" | "idle" | "lit";
export const tokenStyle = (tone: TokenTone, size: number): React.CSSProperties => {
  const tint =
    tone === "lit"
      ? HIGHLIGHT
      : tone === "ok"
        ? `color-mix(in srgb, ${ds("green", 400)} 24%, transparent)`
        : tone === "bad"
          ? `color-mix(in srgb, ${ds("red", 400)} 24%, transparent)`
          : tone === "idle"
            ? `color-mix(in srgb, ${ds("gray", 400)} 18%, transparent)`
            : tone === "pale"
              ? `color-mix(in srgb, ${ds("blue", 400)} 12%, transparent)`
              : `color-mix(in srgb, ${ds("blue", 400)} 24%, transparent)`;
  const ink =
    tone === "lit" ? INK : tone === "ok" ? OK_INK : tone === "bad" ? ACCENT_INK : tone === "idle" ? IDLE_INK : tone === "pale" ? ds("blue", 500) : BLUE_INK;
  return {
    display: "inline-block",
    padding: `${Math.round(size * 0.21)}px ${Math.round(size * 0.45)}px`,
    borderRadius: Math.round(size / 3),
    background: tint,
    ...label(size, ink),
    fontWeight: 500,
    lineHeight: 1.15,
    whiteSpace: "nowrap",
  };
};

export type RowToken = { text: React.ReactNode; at: number; tone?: TokenTone; out?: number };

/**
 * Tokens in a row, each popping in on its own frame. The row is laid out in
 * full from the start (tokens not yet here hold their place unseen), so a
 * token never shifts the ones before it.
 */
export const TokenRow: React.FC<{ x: number; y: number; tokens: readonly RowToken[]; size?: number; gap?: number; dim?: number }> = ({
  x,
  y,
  tokens,
  size = 24,
  gap = 10,
  dim,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap, fontSize: size, opacity: 1 - d }}>
      {tokens.map((t, i) => {
        const p = Math.min(1, pop(frame, t.at, fps, 15));
        const o = t.out === undefined ? 0 : ease(frame, t.out, 10);
        return (
          <span key={i} style={{ ...tokenStyle(t.tone ?? "data", size), opacity: p * (1 - o), transform: `translateY(${(1 - p) * 10}px)` }}>
            {t.text}
          </span>
        );
      })}
    </div>
  );
};
