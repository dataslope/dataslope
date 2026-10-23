import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, body, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, PAPER } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The pieces this video needs beyond the editorial kit, most of them after
 * DbDesign-9's (db-relational-history/parts.tsx): a part's kicker, a
 * two-half headline, a highlighter mark and a strike, a watercolor spot, a
 * line that draws itself with an arrowhead, a tick, small Inter tags, and a
 * quotation card for the sources the narration quotes.
 *
 * Color roles, one meaning each: ink for the history's plain facts; the data
 * blue for counts and the counting ideas the course taught (Zipf, Shannon,
 * Spärck Jones, word2vec); the red accent for what the narration points at,
 * and for the two warnings (a demo that overpromised, a trick mistaken for
 * understanding); the yellow highlighter for a phrase as it is said.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const DATA = BAR;
export const DATA_INK = BLUE_INK;
export const DATA_WASH = `color-mix(in srgb, ${BAR} 16%, transparent)`;
export const WARN_WASH = `color-mix(in srgb, ${ACCENT} 14%, transparent)`;
export const SOFT = `color-mix(in srgb, ${INK} 22%, transparent)`;
export const LISTING_PAPER = ds("gray", 50);

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** 1 from `at` (easing in) until `out` (easing away). */
export const shown = (frame: number, at: number, out?: number, dur = 12) =>
  ease(frame, at, dur) * (out === undefined ? 1 : 1 - ease(frame, out, dur));

/** A slow drift from `at` on, in px, so a finished figure never holds dead
 *  still: it eases to `amount` over `dur` frames. */
export const drift = (frame: number, at: number, amount: number, dur = 150) => amount * ease(frame, at, dur);

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the year and the name. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * A headline: a lead in roman, then optionally a turn in italic in the accent
 * ink, following it on the same line. Each half has its own cue, and the
 * whole line lifts away on `out`.
 */
export const Headline: React.FC<{
  at: number;
  lead: React.ReactNode;
  turn?: React.ReactNode;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ at, lead, turn, turnAt, out, size = 72, top = 150 }) => {
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

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` and lifted on `out`. Sized in em and to the words.
 */
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
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top: "0.52em",
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

/**
 * A watercolor spot from illustrations.json: it pops in on `at` (sliding in
 * from `from`, in px), bobs gently, dims on `dim` and fades on `out`.
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
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={`${VIDEO}-${id}`}
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

// ── Lines between things ─────────────────────────────────────────────────────

const segLen = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** The first `len` px of a polyline. */
const partial = (points: readonly Pt[], len: number): Pt[] => {
  const out: Pt[] = [points[0]];
  let left = len;
  for (let i = 1; i < points.length; i++) {
    const s = segLen(points[i - 1], points[i]);
    if (left >= s) {
      out.push(points[i]);
      left -= s;
    } else {
      const f = s > 0 ? left / s : 0;
      out.push([lerp(points[i - 1][0], points[i][0], f), lerp(points[i - 1][1], points[i][1], f)]);
      break;
    }
  }
  return out;
};

/** Points every few px along one straight segment, for arrowHead(). */
const along = (a: Pt, b: Pt): Pt[] => {
  const n = Math.max(2, Math.ceil(segLen(a, b) / 3));
  return Array.from({ length: n + 1 }, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)] as Pt);
};

/**
 * A line through `points` that draws itself from its first point over `dur`
 * frames, with an arrowhead on its tip. The head rides the straight segment
 * it is on and is only drawn once that segment is longer than the head, so
 * it never sits across a corner.
 */
export const Wire: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  dash?: string;
  head?: boolean;
  opacity?: number;
}> = ({ points, at, dur = 14, out, dim, color = INK, width = 2.2, dash, head = true, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const total = points.slice(1).reduce((s, q, i) => s + segLen(points[i], q), 0);
  const drawn = partial(points, total * p);
  const tip = drawn[drawn.length - 1];
  const base = drawn[drawn.length - 2] ?? drawn[0];
  const HEAD = 13;
  const showHead = head && segLen(base, tip) >= HEAD + 3;
  const path = drawn.map(([x, v], i) => `${i ? "L" : "M"}${x.toFixed(1)},${v.toFixed(1)}`).join(" ");
  return (
    <Svg opacity={(1 - o) * (1 - d) * opacity}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      {showHead ? (
        <path
          d={arrowHead(along(base, tip), HEAD, 7)}
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

/**
 * A short arrow that sits in a row of text (a flex item between two words),
 * drawing itself left to right on `at`, head last, like a Wire.
 */
export const InlineArrow: React.FC<{ at: number; length?: number; color?: string; width?: number }> = ({
  at,
  length = 56,
  color = INK,
  width = 2.2,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  const HEAD = 12;
  const base: Pt = [2, 12];
  const tip: Pt = [2 + (length - 4) * p, 12];
  return (
    <svg width={length} height={24} style={{ flex: "none", overflow: "visible" }}>
      {p > 0 ? <line x1={base[0]} x2={tip[0]} y1={12} y2={12} stroke={color} strokeWidth={width} strokeLinecap="round" /> : null}
      {segLen(base, tip) >= HEAD + 3 ? (
        <path d={arrowHead(along(base, tip), HEAD, 6)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
};

/** A tick drawn as one stroke, centered on (x, y). */
export const Tick: React.FC<{ x: number; y: number; at: number; size?: number; color?: string; out?: number }> = ({
  x,
  y,
  at,
  size = 30,
  color = ds("green", 600),
  out,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const s = size / 30;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${x - 13 * s},${y + 1 * s} L${x - 3 * s},${y + 11 * s} L${x + 15 * s},${y - 11 * s}`}
        fill="none"
        stroke={color}
        strokeWidth={4.4 * s}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};

/** Code or a sample set inside running text or a label, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.94em", fontWeight: weight ?? 600, color }}>{children}</span>
);

/** A small label in Inter. */
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
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A quotation from a source: a rule down its left side, the words in the
 * serif italic, and who said it, where, on a line beneath. It inks in on
 * `at`, its credit a moment later.
 */
export const Quote: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  creditAt?: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  credit: React.ReactNode;
  children: React.ReactNode;
}> = ({ x, top, width, at, creditAt, out, dim, size = 40, color = INK, credit, children }) => {
  const frame = useCurrentFrame();
  const rule = ease(frame, at - 4, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (rule <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, opacity: (1 - o) * (1 - d) }}>
      <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, background: ACCENT, transform: `scaleY(${rule})`, transformOrigin: "50% 0" }} />
      <Ink at={at} dur={22} style={{ position: "relative", marginLeft: 28, width: width - 28 }}>
        <div style={{ ...body(size, true), color, lineHeight: 1.2 }}>{children}</div>
      </Ink>
      <Ink at={creditAt ?? at + 14} dur={14} style={{ position: "relative", marginLeft: 28, marginTop: 18, width: width - 28 }}>
        <div style={{ ...label(21, INK_SOFT), fontWeight: 560, lineHeight: 1.35 }}>{credit}</div>
      </Ink>
    </div>
  );
};

/** A rounded chip with a word in it: a token, a word on the plane. */
export const Chip: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  align?: "left" | "center";
  size?: number;
  color?: string;
  fill?: string;
  border?: string;
  mono?: boolean;
  swell?: number;
  children: React.ReactNode;
}> = ({ x, y, at, out, dim, align = "center", size = 24, color = INK, fill = PAPER, border = HAIRLINE, mono = false, swell = 0, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = Math.min(1, pop(frame, at, fps, 14));
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${align === "center" ? "-50%" : "0"}, -50%) scale(${(0.85 + 0.15 * p) * (1 + swell * 0.06)})`,
        opacity: p * (1 - o) * (1 - d),
        padding: "6px 16px 8px",
        borderRadius: 10,
        border: `2px solid ${border}`,
        background: fill,
        whiteSpace: "nowrap",
        fontFamily: mono ? MONO : SANS,
        fontSize: size,
        fontWeight: mono ? 500 : 600,
        color,
        lineHeight: 1.2,
      }}
    >
      {children}
    </div>
  );
};
