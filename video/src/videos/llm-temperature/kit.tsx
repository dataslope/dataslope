import React from "react";
import { useCurrentFrame } from "remotion";
import { arrowHead } from "../../components/arrow";
import { ease } from "../../components/motion";
import { ACCENT, ACCENT_INK, BLUE_INK, HIGHLIGHT, INK, PAPER, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { TOKENS } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit: one color per
 * token, kept through every figure, a token set in the code face, and an
 * arrowhead built from its line's own direction.
 */

/** Each token keeps one color through every figure. The unlikely one, rock,
 *  takes the page's red accent, because it is what the narration points at. */
export const FILL = [ds("blue", 500), ds("green", 500), ds("yellow", 600), ACCENT] as const;
/** The same hues at their ink steps, for type on paper. */
export const TEXT = [BLUE_INK, ds("green", 800), ds("yellow", 800), ACCENT_INK] as const;
/** A pale wash of each, for tiles and segments that carry type. */
export const TINT = FILL.map((c) => `color-mix(in srgb, ${c} 26%, ${PAPER})`);

/** A token in the code face, in its own ink. */
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
export const Mono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontWeight: 500, color, fontVariantLigatures: "none" }}>
    {children}
  </span>
);

/** A legend swatch: a square in the token's color. */
export const Swatch: React.FC<{ i: number; size?: number }> = ({ i, size = 16 }) => (
  <span style={{ display: "inline-block", width: size, height: size, background: FILL[i], flex: "none" }} />
);

/** "■ cat  ■ dog  ■ bird  ■ rock", for the right end of a figure label. */
export const Legend: React.FC = () => (
  <span style={{ ...note(21), display: "inline-flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
    {TOKENS.map((t, i) => (
      <React.Fragment key={t}>
        {i > 0 ? <span style={{ width: 12 }} /> : null}
        <Swatch i={i} />
        <span style={{ color: TEXT[i], fontWeight: 600 }}>{t}</span>
      </React.Fragment>
    ))}
  </span>
);

/** A highlighter stroke behind a word, wiped in from the left; it follows
 *  the text's own box, so it fits any face. */
export const Marked: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
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
          background: HIGHLIGHT,
          opacity: 1 - o,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A strike through a word, drawn across it from the left. */
export const Struck: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({
  at,
  color = ACCENT,
  children,
}) => {
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
        }}
      />
    </span>
  );
};

/**
 * A straight arrow from `from` to `to`, drawn in on `at`. Its head is built
 * along the line (components/arrow.ts).
 */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
}> = ({ from, to, at, dur = 14, color = INK, width = 2.4 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const len = Math.hypot(dx, dy);
  const [ux, uy] = [dx / len, dy / len];
  const end: [number, number] = [from[0] + dx * p, from[1] + dy * p];

  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <line x1={from[0]} y1={from[1]} x2={end[0] - ux * 2} y2={end[1] - uy * 2} stroke={color} strokeWidth={width} />
      <path
        d={arrowHead([from, end], 16, 9)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
