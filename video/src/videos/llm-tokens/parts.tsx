import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Cubic, type Pt, roundedPolyline, sampleCubic } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, shown, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: a part's kicker, a
 * two-ink headline, highlighter marks, a slow push on a finished figure, the
 * watercolor spots (after DbDesign-1's parts.tsx), and the one new thing, a
 * token chip: a piece of text on a pale blue ground, its id under it, which
 * every figure of the video draws its tokens with.
 */

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const KICKER_Y = 112;
export const HEAD_Y = 150;
export const FIG_Y = 300;

// ── Colors: one meaning each ─────────────────────────────────────────────────

/** A token: a pale blue ground, its edge the brand blue. */
export const TOKEN = BAR;
export const TOKEN_TINT = `color-mix(in srgb, ${BAR} 16%, ${PAPER})`;
/** The second of two neighbouring tokens, so their boundary shows. */
export const TOKEN_TINT_2 = `color-mix(in srgb, ${BAR} 32%, ${PAPER})`;
/** A byte: a small gray square, under the tokens. */
export const BYTE = ds("gray", 300);
/** What the narration is pointing at. */
export const FOCUS = ACCENT;
export const FOCUS_INK = ACCENT_INK;
export const FOCUS_TINT = `color-mix(in srgb, ${ACCENT} 18%, ${PAPER})`;
export const MARK = HIGHLIGHT;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

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

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
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

/** Fades its children to `to` opacity from `at`, for a figure that steps back
 *  while the next one is talked about. */
export const Dim: React.FC<{ at?: number; to?: number; children: React.ReactNode }> = ({ at, to = 0.3, children }) => {
  const frame = useCurrentFrame();
  const d = at === undefined ? 0 : ease(frame, at, 16);
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - d * (1 - to) }}>{children}</div>;
};

/** Fades its children out from `at` (and takes them off the page after). */
export const Out: React.FC<{ at?: number; dur?: number; children: React.ReactNode }> = ({ at, dur = 12, children }) => {
  const frame = useCurrentFrame();
  const o = at === undefined ? 0 : ease(frame, at, dur);
  if (o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>{children}</div>;
};

/** An arrow along a sampled line, drawn in from its start on `at`, its head
 *  built by arrowHead() on the line as drawn so far. */
export const PathArrow: React.FC<{
  line: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ line, at, dur = 16, out, color = INK, width = 2.4, head = 15 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const n = Math.max(2, Math.round(line.length * p));
  const drawn = line.slice(0, n);
  const len = drawn.slice(1).reduce((s, [x, y2], i) => s + Math.hypot(x - drawn[i][0], y2 - drawn[i][1]), 0);
  if (len < 6) return null;
  const h = Math.min(head, len * 0.5);
  const path = drawn.map(([x, y2], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y2.toFixed(1)}`).join(" ");
  return (
    <Svg opacity={1 - o}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={arrowHead(drawn, h, h * 0.6)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** A straight arrow from `from` to `to`. */
export const Arrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ from, to, ...rest }) => {
  const line: Pt[] = Array.from({ length: 41 }, (_, i) => [lerp(from[0], to[0], i / 40), lerp(from[1], to[1], i / 40)]);
  return <PathArrow line={line} {...rest} />;
};

/** A curved arrow along a cubic. */
export const CurveArrow: React.FC<{
  curve: Cubic;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ curve, ...rest }) => <PathArrow line={sampleCubic(curve, 160)} {...rest} />;

/** A polyline arrow with rounded corners. */
export const ElbowArrow: React.FC<{
  points: readonly Pt[];
  radius?: number;
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
}> = ({ points, radius = 18, ...rest }) => <PathArrow line={roundedPolyline(points, radius).samples} {...rest} />;

/** A short arrow set inline in a row of text, `width` px long. */
export const InlineArrow: React.FC<{ width?: number; color?: string; size?: number }> = ({
  width = 34,
  color = INK_SOFT,
  size = 22,
}) => {
  const h = 9;
  const mid = size * 0.55;
  const line: Pt[] = [
    [2, mid],
    [width - 2, mid],
  ];
  return (
    <svg width={width} height={size} style={{ display: "inline-block", overflow: "visible", flex: "none" }}>
      <line x1={2} y1={mid} x2={width - 3} y2={mid} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <path d={arrowHead(line, h, h * 0.6)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs, and
 * fades on `out` (or dims on `dim`). Nothing is drawn while the art is not in.
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
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.7;
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

/** Code or a token set inside running text, at the text's own size. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight = 500 }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: weight, color, fontVariantLigatures: "none" }}>
    {children}
  </span>
);

/** The ground a token chip is drawn on: tinted, or red when pointed at. */
export const chipGround = (focus: number, alt = false) =>
  focus > 0
    ? `color-mix(in srgb, ${FOCUS_TINT} ${Math.round(100 * Math.min(1, focus))}%, ${alt ? TOKEN_TINT_2 : TOKEN_TINT})`
    : alt
      ? TOKEN_TINT_2
      : TOKEN_TINT;

/** A token's edge: the brand blue, or red when pointed at. */
export const chipEdge = (focus: number) =>
  focus > 0 ? `color-mix(in srgb, ${ACCENT} ${Math.round(100 * Math.min(1, focus))}%, ${TOKEN})` : TOKEN;

/**
 * A run of text as its tokens: each on its own pale ground, neighbours in
 * two tints so every boundary shows, set in the code face. A token that ends
 * in a newline breaks the line there. `inkAt(i)` is when token i inks in
 * (before it, the text sits faint and unmarked).
 */
export const TokenRun: React.FC<{
  pieces: readonly { text: string }[];
  size?: number;
  width: number;
  inkAt: (i: number) => number;
  faint?: number;
  rowGap?: number;
  lineHeight?: number;
  /** 0..1 per token: a red ground for the tokens the narration points at. */
  focus?: (i: number) => number;
}> = ({ pieces, size = 30, width, inkAt, faint = 0.35, rowGap = 14, lineHeight = 1.45, focus }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", rowGap, width }}>
      {pieces.map((p, i) => {
        const t = ease(frame, inkAt(i), 6);
        const f = focus ? Math.min(1, focus(i)) : 0;
        const breaks = p.text.endsWith("\n");
        const text = breaks ? p.text.slice(0, -1) : p.text;
        return (
          <React.Fragment key={i}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: size,
                fontWeight: 500,
                lineHeight,
                whiteSpace: "pre",
                color: INK,
                padding: "0 1px",
                margin: "0 1px",
                borderRadius: 5,
                background: t > 0 ? chipGround(f, i % 2 === 1) : "transparent",
                boxShadow:
                  t > 0
                    ? `inset 0 -3px 0 color-mix(in srgb, ${f > 0 ? chipEdge(f) : TOKEN} ${Math.round(t * 70 + f * 30)}%, transparent)`
                    : undefined,
                opacity: faint + (1 - faint) * t,
                fontVariantLigatures: "none",
              }}
            >
              {text}
            </span>
            {breaks ? <span style={{ flexBasis: "100%", height: 0 }} /> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * A token: its text in the code face on a pale blue chip, a leading space
 * shown as a middle dot, and optionally its id under it. It inks in on `at`
 * (a short rise), `focus` (0..1) turns its edge and ground red, and `idAt`
 * brings the id in on its own word.
 */
export const Chip: React.FC<{
  text: string;
  at: number;
  x: number;
  y: number;
  size?: number;
  id?: number;
  idAt?: number;
  focus?: number;
  out?: number;
  dim?: number;
  alt?: boolean;
  width?: number;
  center?: boolean;
}> = ({ text, at, x, y, size = 30, id, idAt, focus = 0, out, dim, alt, width, center }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const idP = idAt === undefined ? 1 : ease(frame, idAt, 10);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        transform: `translate(${center ? "-50%" : "0"}, ${(1 - p) * 10}px)`,
        opacity: p * (1 - o) * (1 - d),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <ChipFace text={text} size={size} focus={focus} alt={alt} width={width} />
      {id !== undefined ? (
        <span
          style={{
            fontFamily: MONO,
            fontSize: Math.max(20, Math.round(size * 0.7)),
            fontWeight: 600,
            color: focus > 0.5 ? FOCUS_INK : INK_SOFT,
            opacity: idP,
            transform: `translateY(${(1 - idP) * -6}px)`,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {id}
        </span>
      ) : null}
    </div>
  );
};

/** Just the chip, for laying out in a flex row. */
export const ChipFace: React.FC<{ text: string; size?: number; focus?: number; alt?: boolean; width?: number }> = ({
  text,
  size = 30,
  focus = 0,
  alt,
  width,
}) => (
  <span
    style={{
      display: "inline-flex",
      justifyContent: "center",
      boxSizing: "border-box",
      width,
      padding: `${Math.round(size * 0.2)}px ${Math.round(size * 0.4)}px`,
      borderRadius: 8,
      border: `2px solid ${chipEdge(focus)}`,
      background: chipGround(focus, alt),
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 600,
      lineHeight: 1.15,
      color: INK,
      whiteSpace: "pre",
      fontVariantLigatures: "none",
    }}
  >
    <ChipText text={text} />
  </span>
);

/** A token's text with its leading space drawn as a soft middle dot. */
export const ChipText: React.FC<{ text: string }> = ({ text }) => {
  const s = shown(text);
  if (s === text) return <>{text}</>;
  return (
    <>
      <span style={{ color: INK_SOFT, opacity: 0.8 }}>{s[0]}</span>
      {s.slice(1)}
    </>
  );
};

/** A bracket under a span, drawn in from the middle, with a label below. */
export const UnderBracket: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  color?: string;
  out?: number;
}> = ({ x0, x1, y, at, color = INK_SOFT, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * p;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${mid - half},${y - 8} L${mid - half},${y} L${mid + half},${y} L${mid + half},${y - 8}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

