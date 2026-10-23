import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, headline as headlineStyle, label, note, TABULAR } from "../../editorial/style";
import { H, Ink, W } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a part's kicker, a
 * two-ink headline, highlighter and strike marks, word chips that can be
 * struck out and collapse out of their row, a number cell tinted by its
 * value, a straight arrow with an arrowHead() head, a slow push on a finished
 * figure, and the watercolor spots.
 *
 * Color roles, one meaning each across the video:
 *   - words and counts: ink, with count cells tinted in the data blue (BAR);
 *   - the red accent: what the narration flags as lost or wrong (a dropped
 *     stopword, the column that scores zero, a wrong verdict);
 *   - the yellow highlight: the phrase being spoken about;
 *   - green and orange: positive and negative sentiment, in Part 4 only.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 278;

export const POS = ds("green", 500);
export const POS_INK = inkOf.green;
export const NEG = ds("orange", 500);
export const NEG_INK = inkOf.orange;
export const DATA = BAR;
export const LOST = ACCENT;
export const LOST_INK = ACCENT_INK;
export const CHIP_LINE = `color-mix(in srgb, ${INK} 28%, transparent)`;
export const SURFACE = ds("gray", 50);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell for something named
 *  again once it is already on the page. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** A cell's tint: the data blue, as strong as `heat` (0..1). */
export const tint = (heat: number, color: string = BAR, max = 34) =>
  `color-mix(in srgb, ${color} ${(clamp01(heat) * max).toFixed(1)}%, transparent)`;

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/** A two-ink headline line: the first phrase in ink, the second following it
 *  in italic accent, each on its own cue; both leave on `out`. The row takes
 *  the headline's own size, so the em gap between the halves is measured in
 *  that face. */
export const Headline: React.FC<{
  at: number;
  second?: number;
  out?: number;
  size?: number;
  top?: number;
  children: React.ReactNode;
  italic?: React.ReactNode;
}> = ({ at, second, out, size = 66, top = HEAD_Y, children, italic }) => {
  const { y } = useLayout();
  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        top: y(top),
        display: "flex",
        gap: "0.28em",
        whiteSpace: "nowrap",
        fontSize: headlineStyle(size).fontSize,
      }}
    >
      <Ink at={at} dur={20} out={out} style={{ position: "relative", ...headlineStyle(size) }}>
        {children}
      </Ink>
      {italic && second !== undefined ? (
        <Ink at={second} dur={18} out={out} style={{ position: "relative", ...headlineStyle(size, true), color: ACCENT_INK }}>
          {italic}
        </Ink>
      ) : null}
    </div>
  );
};

/** A highlighter stroke behind the words it wraps, swept on `at`, lifted on
 *  `out`. Sized in em to the words, in any face. */
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
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
          top: "0.08em",
          bottom: "-0.02em",
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

/** A line struck through the words it wraps, drawn left to right on `at`. */
export const Strike: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({ at, color = LOST, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.1em",
          top: "52%",
          width: `calc((100% + 0.2em) * ${p})`,
          height: "0.09em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: "rotate(-4deg)",
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

/** Inter at a chip's size is about this wide per character, in em. */
const CHAR_EM = 0.56;

/**
 * One token as a chip. It inks in on `at`; `strike` draws the accent through
 * it; `drop` fades it and closes its gap in the row (its width runs to
 * nothing), so the tokens after it slide up to meet the ones before; `mark`
 * lays the highlighter behind it; `tone` tints its box (a polarity).
 */
export const Chip: React.FC<{
  text: string;
  at: number;
  size?: number;
  strike?: number;
  drop?: number;
  mark?: number;
  markOut?: number;
  tone?: string;
  toneAt?: number;
  ink?: string;
  dim?: number;
  mono?: boolean;
  style?: React.CSSProperties;
}> = ({ text, at, size = 26, strike, drop, mark, markOut, tone, toneAt, ink = INK, dim, mono, style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const s = strike === undefined ? 0 : ease(frame, strike, 10);
  const d = drop === undefined ? 0 : ease(frame, drop, 16);
  const m = mark === undefined ? 0 : ease(frame, mark, 10) * (markOut === undefined ? 1 : 1 - ease(frame, markOut, 12));
  const tn = tone === undefined ? 0 : toneAt === undefined ? 1 : ease(frame, toneAt, 12);
  const dm = dim === undefined ? 0 : ease(frame, dim, 12);
  const est = (text.length * CHAR_EM + 1.4) * size + 4;
  const gone = d >= 1;
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flex: "none",
        maxWidth: gone ? 0 : d > 0 ? est * (1 - d) : undefined,
        marginRight: gone ? 0 : `${(1 - d) * 0.42}em`,
        overflow: d > 0 ? "hidden" : undefined,
        opacity: p * (1 - d) * (1 - dm * 0.6),
        transform: `translateY(${(1 - p) * 10}px)`,
        fontSize: size,
        ...style,
      }}
    >
      <span
        style={{
          position: "relative",
          display: "inline-block",
          padding: "0.12em 0.42em 0.18em",
          border: `1.5px solid ${CHIP_LINE}`,
          borderRadius: 6,
          background: tone && tn > 0 ? tint(tn, tone, 26) : m > 0 ? `color-mix(in srgb, ${HIGHLIGHT} ${(m * 100).toFixed(0)}%, ${PAPER})` : PAPER,
          ...note(size, ink),
          ...(mono ? { fontFamily: '"JetBrains Mono", ui-monospace, monospace' } : {}),
          fontWeight: 500,
          lineHeight: 1.15,
          whiteSpace: "nowrap",
        }}
      >
        {text}
        {s > 0 ? (
          <span
            style={{
              position: "absolute",
              left: "0.2em",
              top: "50%",
              width: `calc((100% - 0.4em) * ${s})`,
              height: 3,
              background: LOST,
              borderRadius: 2,
              transform: "rotate(-8deg)",
              transformOrigin: "0 50%",
            }}
          />
        ) : null}
      </span>
    </span>
  );
};

/** A row of chips, laid out by flex, so a dropped chip closes its gap. */
export const ChipRow: React.FC<{ x: number; y: number; width?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  x,
  y,
  width,
  children,
  style,
}) => (
  <div style={{ position: "absolute", left: x, top: y, width, display: "flex", flexWrap: "nowrap", alignItems: "center", ...style }}>
    {children}
  </div>
);

/** Tokens in a row, each a column of a chip and what sits under it (a
 *  polarity, a note), laid out by flex so the chips space themselves. */
export const TokenRow: React.FC<{ x: number; top: number; gap?: number; children: React.ReactNode }> = ({ x, top, gap = 12, children }) => (
  <div style={{ position: "absolute", left: x, top, display: "flex", alignItems: "flex-start", gap }}>{children}</div>
);

/** One column of a TokenRow: the chip, and under it, centred on it and free
 *  to run wider than it, whatever `below` holds. */
export const TokenCol: React.FC<{ chip: React.ReactNode; below?: React.ReactNode; belowGap?: number }> = ({ chip, below, belowGap = 8 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    {chip}
    <div style={{ position: "relative", height: 30, marginTop: belowGap, alignSelf: "stretch" }}>
      {below ? (
        <div style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", whiteSpace: "nowrap" }}>{below}</div>
      ) : null}
    </div>
  </div>
);

/** A number in a box tinted by `heat`, inked on `at`. */
export const NumCell: React.FC<{
  value: React.ReactNode;
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  heat?: number;
  color?: string;
  ink?: string;
  size?: number;
  bold?: boolean;
  faint?: boolean;
  outline?: string;
}> = ({ value, at, x, y, w, h, heat = 0, color = BAR, ink = INK, size = 30, bold, faint, outline }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        background: tint(heat, color),
        border: outline ? `3px solid ${outline}` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
        ...note(size, ink),
        ...TABULAR,
        fontWeight: bold ? 700 : faint ? 450 : 600,
      }}
    >
      <span style={{ opacity: faint ? 0.55 : 1 }}>{value}</span>
    </div>
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
 * A slow, eased push on a finished figure: its children scale up by `amount`
 * from `from` to `to`, so a figure being talked about is never quite frozen.
 */
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
      id={`${VIDEO}-${id}`}
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

/** Words inside a line that fade in on `at`, holding their place in the
 *  line from the first frame so nothing after them shifts. */
export const Reveal: React.FC<{ at: number; dur?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  at,
  dur = 12,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  return (
    <span style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 6}px)`, whiteSpace: "pre", ...style }}>
      {children}
    </span>
  );
};

/** A small rounded card with a label in it, for a pipeline station. */
export const Card: React.FC<{
  at: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dashed?: boolean;
  fill?: string;
  line?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, x, y, w, h, dashed, fill = PAPER, line = CHIP_LINE, children, style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${line}`,
        borderRadius: 10,
        background: fill,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px) scale(${0.96 + 0.04 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER };
