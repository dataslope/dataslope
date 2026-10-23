import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, cubicPath, sampleCubic, type Cubic, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, headline, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a part's kicker, a
 * two-ink headline, highlighter marks, a slow push, the watercolor spots, and
 * a token chip (a word as a program holds it) that can be struck, flashed or
 * dimmed, with the geometry to lay chips out in rows and columns.
 *
 * One meaning per color, all video long: blue is a token (structure a program
 * holds), red is where text goes wrong (a glued mark, a dropped word, the
 * order bug), green is the right result, and the yellow highlighter is the
 * phrase being spoken.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 270;

// ── Colors ───────────────────────────────────────────────────────────────────

export const TOKEN = BAR;
export const TOKEN_INK = BLUE_INK;
export const TOKEN_FILL = `color-mix(in srgb, ${BAR} 10%, ${PAPER})`;
export const BAD = ACCENT;
export const BAD_INK = ACCENT_INK;
export const BAD_FILL = `color-mix(in srgb, ${ACCENT} 14%, ${PAPER})`;
export const GOOD = ds("green", 500);
export const GOOD_INK = inkOf.green;
export const GOOD_FILL = `color-mix(in srgb, ${ds("green", 500)} 14%, ${PAPER})`;
export const PIECE_FILL = ds("gray", 50);
export const MARK = HIGHLIGHT;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

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
 * italic accent on `turnAt`, the second laid out after the first. `out` takes
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
}> = ({ lead, turn, at, turnAt, out, size = 72, top = HEAD_Y }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
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

/** A highlighter stroke laid under the words it wraps, swept on `at` and
 *  lifted on `out`. Sized in em and to the words. */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = MARK,
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
          left: "-0.12em",
          top: "0.06em",
          bottom: "-0.04em",
          width: `calc((100% + 0.24em) * ${p})`,
          background: color,
          borderRadius: "0.12em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/**
 * A slow, eased push on a figure: its children scale up by `amount` from
 * `from` to `to` about `origin`, so a figure being talked about is never
 * quite frozen. Keep illustrations outside it: they are drawn at their
 * pixels' size.
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

/** A straight arrow drawn from `from` to `to`, its head built by arrowHead()
 *  on the drawn line. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  opacity?: number;
}> = ({ from, to, at, dur = 14, out, color = INK, width = 2.4, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: Pt = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(14, len * 0.6);
  return (
    <Svg opacity={(1 - o) * opacity}>
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

/** A curved arrow along a cubic, drawn on from its start; the head sits on
 *  the last stretch of the drawn samples. Shape the cubic so it has stopped
 *  turning before its end (README, "An arrowhead sits on a straight end"). */
export const CurvedArrow: React.FC<{
  curve: Cubic;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ curve, at, dur = 18, out, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const all = sampleCubic(curve, 240);
  const head = 14;
  return (
    <Svg opacity={1 - o}>
      <path d={cubicPath(curve)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} />
      {p > 0.92 ? (
        <path
          d={arrowHead(all, head, head * 0.6)}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={ease(frame, at + dur * 0.92, 4)}
        />
      ) : null}
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
  drift?: number;
  driftDur?: number;
}> = ({ id, at, out, dim, left, top, width, height, drift = 0, driftDur = 300 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  const t = clamp01((frame - at) / driftDur);
  const dx = drift * (1 - (1 - t) * (1 - t));
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
        transform: `translate(${dx}px, ${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

// ── Token chips ──────────────────────────────────────────────────────────────

/** JetBrains Mono's advance, in em. */
export const ADVANCE = 0.6;
/** A chip's horizontal padding, in em of its type. */
const PAD_EM = 0.42;
export const chipWidth = (text: string, size: number) => Math.round(text.length * ADVANCE * size + 2 * PAD_EM * size);
export const chipHeight = (size: number) => Math.round(size * 1.72);

/** Left edges for boxes of `widths` laid out from `x0` with `gap` between. */
export const rowXs = (widths: readonly number[], x0: number, gap: number) => {
  const xs: number[] = [];
  let x = x0;
  for (const w of widths) {
    xs.push(x);
    x += w + gap;
  }
  return xs;
};
export const rowWidth = (widths: readonly number[], gap: number) => widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, widths.length - 1);

export type ChipKind = "token" | "piece" | "plain";

/**
 * One token as a program holds it: monospace, in a rounded box. It pops in
 * on `at`; `bad` turns it red (from that frame), `good` green; `flash` swells
 * it red briefly; `strike` draws a red line through it and fades it to a
 * ghost; `hl` sweeps the highlighter under its text; `dim` and `out` fade it.
 */
export const Chip: React.FC<{
  text: string;
  x: number;
  y: number;
  at: number;
  size?: number;
  kind?: ChipKind;
  width?: number;
  bad?: number;
  good?: number;
  flash?: number;
  strike?: number;
  hl?: number;
  hlOut?: number;
  dim?: number;
  out?: number;
  /** Characters within the text to ink red, from `badChars.at`. */
  badChars?: { from: number; to: number; at: number };
}> = ({ text, x, y, at, size = 26, kind = "token", width, bad, good, flash, strike, hl, hlOut, dim, out, badChars }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 15);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const b = bad === undefined ? 0 : ease(frame, bad, 10);
  const g = good === undefined ? 0 : ease(frame, good, 10);
  const f = flash === undefined ? 0 : pulse(frame, flash, 20);
  const s = strike === undefined ? 0 : ease(frame, strike, 12);
  const gone = strike === undefined ? 0 : ease(frame, strike + 10, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const h = hl === undefined ? 0 : ease(frame, hl, 12);
  const ho = hlOut === undefined ? 0 : ease(frame, hlOut, 12);
  const w = width ?? chipWidth(text, size);
  const ht = chipHeight(size);
  const base =
    kind === "token"
      ? { border: TOKEN, fill: TOKEN_FILL }
      : kind === "piece"
        ? { border: INK_SOFT, fill: PIECE_FILL }
        : { border: "transparent", fill: "transparent" };
  const mix = (a: string, c: string, t: number) => (t <= 0 ? a : t >= 1 ? c : `color-mix(in srgb, ${c} ${Math.round(t * 100)}%, ${a})`);
  const red = Math.max(b, f, s);
  const border = mix(mix(base.border, GOOD, g), BAD, red);
  const fill = mix(mix(base.fill, GOOD_FILL, g), BAD_FILL, red);
  const chars = badChars
    ? (() => {
        const bc = ease(frame, badChars.at, 10);
        return (
          <>
            {text.slice(0, badChars.from)}
            <span style={{ color: mix(INK, BAD_INK, bc), fontWeight: bc > 0.5 ? 700 : 500 }}>{text.slice(badChars.from, badChars.to)}</span>
            {text.slice(badChars.to)}
          </>
        );
      })()
    : text;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: ht,
        boxSizing: "border-box",
        border: `2px solid ${border}`,
        borderRadius: 8,
        background: fill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: MONO,
        fontSize: size,
        fontWeight: 500,
        whiteSpace: "pre",
        fontVariantLigatures: "none",
        color: INK,
        opacity: Math.min(1, p) * (1 - o) * (1 - d) * (1 - gone * 0.72),
        transform: `translateY(${(1 - p) * 10}px) scale(${0.9 + 0.1 * Math.min(1, p) + f * 0.06})`,
      }}
    >
      {h > 0 && ho < 1 ? (
        <span
          style={{
            position: "absolute",
            left: 4,
            top: 4,
            bottom: 4,
            width: `calc((100% - 8px) * ${h})`,
            background: MARK,
            borderRadius: 4,
            opacity: 1 - ho,
          }}
        />
      ) : null}
      <span style={{ position: "relative" }}>{chars}</span>
      {s > 0 ? (
        <span
          style={{
            position: "absolute",
            left: 6,
            top: "50%",
            width: `calc((100% - 12px) * ${s})`,
            height: 3,
            marginTop: -1.5,
            background: BAD,
            borderRadius: 2,
          }}
        />
      ) : null}
    </div>
  );
};

/** A number that inks on its word, in tabular figures, with a unit after it. */
export const Count: React.FC<{
  value: number;
  unit?: string;
  at: number;
  x: number;
  y: number;
  color?: string;
  size?: number;
  align?: "left" | "right";
  out?: number;
}> = ({ value, unit, at, x, y, color = INK, size = 26, align = "left", out }) => (
  <Ink
    at={at}
    dur={14}
    out={out}
    style={{
      left: align === "left" ? x : undefined,
      right: align === "right" ? 1920 - x : undefined,
      top: y,
      whiteSpace: "nowrap",
      display: "flex",
      alignItems: "baseline",
      gap: "0.3em",
    }}
  >
    <span style={{ ...label(size, color), fontWeight: 700, ...TABULAR }}>{value}</span>
    {unit ? <span style={{ ...label(Math.round(size * 0.8), INK_SOFT), fontWeight: 600 }}>{unit}</span> : null}
  </Ink>
);

// ── Python, one line at a time ───────────────────────────────────────────────

const PY_KEYWORDS = new Set(["for", "in", "if", "not", "import", "from", "def", "return"]);
const PY_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  fn: inkOf.blue,
  punct: INK_SOFT,
  name: INK,
  comment: INK_SOFT,
} as const;

/** One line of Python, colored. */
export const Py: React.FC<{ line: string; size?: number }> = ({ line, size }) => {
  const parts: { text: string; color: string; weight?: number }[] = [];
  for (const mm of line.matchAll(/(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_]\w*)(?=\()|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, fn, word] = mm;
    if (comment) parts.push({ text, color: PY_INK.comment });
    else if (str) parts.push({ text, color: PY_INK.string });
    else if (fn) parts.push({ text, color: PY_INK.fn });
    else if (word && PY_KEYWORDS.has(word)) parts.push({ text, color: PY_INK.keyword, weight: 700 });
    else if (word) parts.push({ text, color: PY_INK.name });
    else parts.push({ text, color: PY_INK.punct });
  }
  return (
    <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
      {parts.map((t, i) => (
        <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
          {t.text}
        </span>
      ))}
    </span>
  );
};

/** A line of code on the listing's tinted paper, a rule above, inked on `at`. */
export const CodeStrip: React.FC<{
  line: string;
  x: number;
  y: number;
  at: number;
  size?: number;
  out?: number;
  dim?: number;
}> = ({ line, x, y, at, size = 26, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.5;
  if (p <= 0 || o >= 1) return null;
  const w = line.length * ADVANCE * size + size * 1.6;
  const h = Math.round(size * 2.1);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: (1 - o) * (1 - d) }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: PIECE_FILL,
          borderTop: `2px solid ${INK}`,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        }}
      />
      <Ink at={at + 3} dur={14} style={{ left: size * 0.8, top: 0, height: h, display: "flex", alignItems: "center" }}>
        <Py line={line} size={size} />
      </Ink>
    </div>
  );
};
