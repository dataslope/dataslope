import type { LucideIcon } from "lucide-react";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, type Pt, roundedPolyline } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { badgeStyle, type BadgeTone, outlineBadgeStyle, outlineInk, type OutlineTone } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page furniture (the slow push, the kicker
 * and headline, the highlighter that takes its bleed back as margin, the
 * strike) is da-pandas's, as every interview track's is, and the clear is
 * ds-probability's. What is local: the outlined diagram box (no fill, a 2px
 * ink outline, black text, a highlight coloring outline and text together),
 * the arrow and the dot that rides it, the numbered disc, a cross, a line of
 * text that inks in, and the watercolor spot.
 */
export { Drift, Headline, Kicker, Mark, MARK_BAD, MARK_OK, Strike, X0 } from "../da-pandas/parts";
export { Clear } from "../ds-probability/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;

/** Data, the light series: the second of two data series (B, the paler
 *  half of a bar), a step deeper than a tint so a block holds its shape on
 *  white. */
export const DATA = BAR;
export const DATA_LIGHT = ds("blue", 200);
/** The yellow the narration points with, as a line or a ring rather than a
 *  wash: deep enough to see on white. */
export const POINT = ds("yellow", 500);
export const POINT_INK = outlineInk("yellow");

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at`, bobs gently,
 *  dims from `dim` and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  amp?: number;
}> = ({ id, at, out, dim, left, top, width, height, amp = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
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
        transform: `translateY(${bob(frame, amp, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

// ── Text ─────────────────────────────────────────────────────────────────────

/** A line of words at one size that inks in from the left by fading up and
 *  sliding a little, dims from `dim` and fades on `out`. */
export const Line: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  dimBy?: number;
  size?: number;
  color?: string;
  weight?: number;
  width?: number;
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, at, out, dim, dimBy = 0.62, size = 26, color = INK, weight = 500, width, align = "left", style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * dimBy;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: align === "right" ? undefined : align === "center" && width ? x - width / 2 : x,
        right: align === "right" ? 1920 - x : undefined,
        top: y,
        width,
        textAlign: align,
        ...note(size, color),
        fontWeight: weight,
        whiteSpace: width ? undefined : "nowrap",
        opacity: p * (1 - o) * (1 - d),
        transform: `translateX(${(1 - p) * -12}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Words that fade up on `at` inside a line already on the page. */
export const Fade: React.FC<{ at: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 10, children }) => {
  const frame = useCurrentFrame();
  return <span style={{ opacity: ease(frame, at - 2, dur) }}>{children}</span>;
};

/** Code in a line of text, in the mono face at 0.92em. */
export const Code: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500, fontVariantLigatures: "none", color }}>{children}</span>
);

// ── Badges and marks ─────────────────────────────────────────────────────────

/** A badge that inks in on `at`: outlined (`outline`, the default) or
 *  tinted. `size` is the line's own size. */
export const Tag: React.FC<{
  at: number;
  tone?: OutlineTone;
  tinted?: boolean;
  size?: number;
  out?: number;
  dim?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, tone = "ink", tinted = false, size = 24, out, dim, style, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const base = tinted && tone !== "ink" ? badgeStyle(tone as BadgeTone, size) : outlineBadgeStyle(tone, size);
  return (
    <span
      style={{
        ...base,
        opacity: p * (1 - o) * (1 - d),
        transform: `translateY(${(1 - p) * 8}px)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** A numbered disc: a tint of its hue with the numeral in the hue's ink, no
 *  ring (README, "a numbered badge is a tinted disc"). */
export const Disc: React.FC<{ n: React.ReactNode; size?: number; tone?: BadgeTone; lit?: number }> = ({ n, size = 44, tone = "gray", lit = 0 }) => {
  const base = badgeStyle(tone, 24);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: lit > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${Math.round(lit * 100)}%, ${base.background})` : base.background,
        color: base.color,
        fontFamily: label().fontFamily,
        fontSize: Math.round(size * 0.5),
        fontWeight: 600,
        lineHeight: 1,
        flex: "none",
      }}
    >
      {n}
    </span>
  );
};

/** A cross, drawn stroke by stroke on `at`, in the error's red. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 7);
  const b = ease(frame, at + 5, 7);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", flex: "none" }}>
      <path d="M5 5 L19 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};

// ── Boxes and arrows: the diagrams ───────────────────────────────────────────

/** A box's highlight: plain ink, data blue, the answer's green, the trap's
 *  red, or the yellow the narration points with. Outline and text take it
 *  together; the box is never filled (README, "A diagram's boxes are
 *  outlined, not filled"). */
export type Tone = "plain" | "data" | "ok" | "bad" | "lit" | "quiet";
const TONES: Record<Tone, string> = {
  plain: INK,
  data: BLUE_INK,
  ok: OK_INK,
  bad: ACCENT_INK,
  lit: POINT_INK,
  quiet: INK_SOFT,
};
export const toneInk = (t: Tone) => TONES[t];

/** The ink at `frame`, blended over 10 frames from the tone before. */
const inkAt = (frame: number, start: Tone, tones: readonly { at: number; tone: Tone }[]) => {
  let prev: Tone = start;
  let cur: Tone = start;
  let since = -Infinity;
  for (const t of tones) {
    if (frame >= t.at) {
      prev = cur;
      cur = t.tone;
      since = t.at;
    }
  }
  const p = Number.isFinite(since) ? ease(frame, since, 10) : 1;
  return p >= 1 ? TONES[cur] : `color-mix(in srgb, ${TONES[cur]} ${Math.round(p * 100)}%, ${TONES[prev]})`;
};

/** A box on the page, by its centre and size, in screen pixels. */
export type Rect = { cx: number; cy: number; w: number; h: number };

/** Where a line from `r`'s centre toward `to` leaves its border, `gap` out. */
export const boundary = (r: Rect, to: Pt, gap = 8): Pt => {
  const dx = to[0] - r.cx;
  const dy = to[1] - r.cy;
  const sx = dx === 0 ? Infinity : (r.w / 2 + gap) / Math.abs(dx);
  const sy = dy === 0 ? Infinity : (r.h / 2 + gap) / Math.abs(dy);
  const s = Math.min(sx, sy);
  return [r.cx + dx * s, r.cy + dy * s];
};

/**
 * A component in a diagram: a rounded, outlined box centred on (`cx`, `cy`)
 * that pops in on `at`, with an optional Lucide icon before its name and a
 * second, quieter line under it. `tones` recolor outline and text together.
 */
export const Box: React.FC<{
  r: Rect;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  tones?: readonly { at: number; tone: Tone }[];
  size?: number;
  subSize?: number;
  mono?: boolean;
  out?: number;
  dim?: number;
  dashed?: boolean;
}> = ({ r, at, title, sub, icon: Icon, tone = "plain", tones = [], size = 26, subSize = 21, mono, out, dim, dashed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  const ink = inkAt(frame, tone, tones);
  return (
    <div
      style={{
        position: "absolute",
        left: r.cx - r.w / 2,
        top: r.cy - r.h / 2,
        width: r.w,
        height: r.h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${ink}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: Math.round(size * 0.4),
          ...(mono
            ? { fontFamily: MONO, fontSize: size * 0.92, fontWeight: 500, fontVariantLigatures: "none", color: ink }
            : { ...note(size, ink), fontWeight: 500 }),
          whiteSpace: "nowrap",
          lineHeight: 1.15,
        }}
      >
        {Icon ? <Icon size={size} color={ink} strokeWidth={2} style={{ flex: "none" }} /> : null}
        {title}
      </span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", lineHeight: 1.15 }}>{sub}</span> : null}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded) that draws
 * itself from its tail on `at`, its head built by arrowHead() on the straight
 * last stretch. `head={0}` leaves a plain line.
 */
export const Arrow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  out?: number;
  dim?: number;
  radius?: number;
  glow?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 13, out, dim, radius = 22, glow = 0 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const straight = points.length === 2;
  const line: Pt[] = straight
    ? Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt)
    : roundedPolyline(points, radius).samples;
  const path = straight ? `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}` : roundedPolyline(points, radius).d;
  const len = lineLength(line);
  const reach = head ? Math.max(0, (len - head + 1) / len) : 1;
  const headIn = ease(frame, at + dur - 4, 5);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {glow > 0 ? <path d={path} fill="none" stroke={HIGHLIGHT} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" opacity={glow} /> : null}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="butt"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p * reach} 1`}
      />
      {head ? <path d={arrowHead(line, head, head * 0.55, { filled: true })} fill={color} opacity={headIn} /> : null}
    </svg>
  );
};

/** A point `t` of the way along a polyline, by length. */
export const along = (pts: readonly Pt[], t: number): Pt => {
  const lens = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let left = Math.max(0, Math.min(1, t)) * lens.reduce((s, l) => s + l, 0);
  for (let i = 0; i < lens.length; i++) {
    if (left <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, left / lens[i]) : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    left -= lens[i];
  }
  return pts[pts.length - 1];
};

/** A short arrow that sits in a line of words, pointing right, drawn on
 *  `at`: the "then" between two steps. Its head is arrow.ts's. */
export const InlineArrow: React.FC<{ at: number; w?: number; color?: string; size?: number }> = ({ at, w = 44, color = INK, size = 26 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 8);
  const h = Math.round(size * 0.8);
  const line: Pt[] = Array.from({ length: 21 }, (_, i) => [2 + ((w - 4) * i) / 20, h / 2] as Pt);
  return (
    <svg width={w} height={h} style={{ display: "block", flex: "none", overflow: "visible", opacity: p }}>
      <path d={`M2,${h / 2} L${w - 12},${h / 2}`} stroke={color} strokeWidth={2.2} fill="none" />
      <path d={arrowHead(line, 11, 6, { filled: true })} fill={color} />
    </svg>
  );
};

/** A paper-ringed dot: a request riding the loop. */
export const Dot: React.FC<{ at: Pt; color?: string; r?: number; opacity?: number }> = ({ at: [x, y], color = BAR, r = 9, opacity = 1 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    <circle cx={x} cy={y} r={r + 4} fill={PAPER} />
    <circle cx={x} cy={y} r={r} fill={color} />
  </svg>
);

/** The red of a wrong line of text, and its ink. */
export const BAD = ACCENT;
export const BAD_INK = ACCENT_INK;
export const GOOD_INK = OK_INK;
export const DATA_INK = BLUE_INK;
/** A label in the chart face. */
export const chartLabel = (size = 21, color: string = INK_SOFT): React.CSSProperties => ({ ...label(size, color), whiteSpace: "nowrap" });
