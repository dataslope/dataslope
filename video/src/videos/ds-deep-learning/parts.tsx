import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture and the plot pieces come
 * from the Data Analyst statistics video, and the clipped curve, the fade and
 * the panel title from Part 3 of this series, so the videos stay one family.
 * What is new here is a row or grid of numbered cells (a vector, a weight
 * matrix, a layer's activations, attention weights), which most figures in
 * this video are made of, and a log scale for gradients that shrink and grow
 * by powers.
 */
export {
  at,
  Axes,
  Bracket,
  chartLabel,
  Dots,
  Drift,
  ElbowArrow,
  Headline,
  Kicker,
  Mark,
  MARK_OK,
  OK,
  OK_INK,
  pulse,
  type Scale,
  Strike,
  Svg,
  VLine,
  WARM,
  WARM_INK,
  X0,
} from "../da-statistics-communication/parts";
export { type Box, Curve, Fade, PanelTitle } from "../ds-ml-evaluation/parts";

/** A log-10 map from data units onto a span of the page. */
export type LogScale = { lo: number; hi: number; a: number; b: number };
export const atLog = (s: LogScale, v: number) =>
  s.a + ((Math.log10(v) - Math.log10(s.lo)) / (Math.log10(s.hi) - Math.log10(s.lo))) * (s.b - s.a);

/** A cell's tint while the narration points at it, and the right answer's. */
export const CELL_MARK = HIGHLIGHT;
export const CELL_OK = `color-mix(in srgb, ${ds("green", 500)} 22%, transparent)`;
export const CELL_BAD = `color-mix(in srgb, ${ds("red", 500)} 18%, transparent)`;

export type CellLook = {
  /** Fill from `at` (a highlight, a verdict). */
  tint?: { color: string; at: number; out?: number };
  /** Ink for the number, from `at`. */
  ink?: { color: string; at: number };
  /** Struck through from `at` (a zeroed activation). */
  strikeAt?: number;
};

/**
 * Numbers in a grid of boxed cells: a vector (one column or one row), a
 * weight matrix, a layer's activations. The cells ink in from `at`, row by
 * row, and each can be tinted, re-inked or struck on its own frame.
 * `fill` gives a cell a background in proportion to its value (attention
 * weights), so a grid reads as a heat map as well as numbers.
 */
export const Cells: React.FC<{
  values: readonly (readonly (number | string)[])[];
  x: number;
  y: number;
  w?: number;
  h?: number;
  at: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  format?: (v: number) => string;
  look?: (row: number, col: number) => CellLook | undefined;
  fill?: { color: string; at: number; max?: number };
  bracket?: boolean;
}> = ({ values, x, y, w = 76, h = 50, at: from, out, dim, size = 26, color = INK, format = String, look, fill, bracket = true }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  if (o >= 1 || ease(frame, from, 10) <= 0) return null;
  const rows = values.length;
  const cols = values[0].length;
  const p = ease(frame, from, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: cols * w, height: rows * h, opacity: (1 - o) * (1 - d) }}>
      {bracket ? (
        <svg width={cols * w + 20} height={rows * h} style={{ position: "absolute", left: -10, top: 0, overflow: "visible", opacity: p }}>
          <path d={`M8,0 L0,0 L0,${rows * h} L8,${rows * h}`} fill="none" stroke={INK} strokeWidth={2} />
          <path d={`M${cols * w + 12},0 L${cols * w + 20},0 L${cols * w + 20},${rows * h} L${cols * w + 12},${rows * h}`} fill="none" stroke={INK} strokeWidth={2} />
        </svg>
      ) : null}
      {values.map((row, r) =>
        row.map((v, c) => {
          const q = ease(frame, from + r * 3 + c * 1.5, 10);
          if (q <= 0) return null;
          const lk = look?.(r, c);
          const tint = lk?.tint ? ease(frame, lk.tint.at, 10) * (lk.tint.out === undefined ? 1 : 1 - ease(frame, lk.tint.out, 10)) : 0;
          const ink = lk?.ink ? ease(frame, lk.ink.at, 10) : 0;
          const strike = lk?.strikeAt === undefined ? 0 : ease(frame, lk.strikeAt, 10);
          const heat = fill && typeof v === "number" ? (ease(frame, fill.at, 16) * v) / (fill.max ?? 1) : 0;
          const text = typeof v === "number" ? format(v) : v;
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: "absolute",
                left: c * w + 3,
                top: r * h + 3,
                width: w - 6,
                height: h - 6,
                borderRadius: 4,
                background:
                  tint > 0
                    ? lk?.tint?.color
                    : heat > 0 && fill
                      ? `color-mix(in srgb, ${fill.color} ${Math.round(heat * 70)}%, ${PAPER})`
                      : "transparent",
                opacity: q,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: size,
                fontWeight: 600,
                fontVariantLigatures: "none",
                color: ink > 0 && lk?.ink ? `color-mix(in srgb, ${lk.ink.color} ${ink * 100}%, ${color})` : color,
                ...TABULAR,
                transform: `translateY(${(1 - q) * 6}px)`,
              }}
            >
              <span style={{ position: "relative", opacity: 1 - strike * 0.55 }}>
                {text}
                {strike > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      left: -4,
                      right: -4,
                      top: "52%",
                      height: 3,
                      background: ds("red", 500),
                      transformOrigin: "left",
                      transform: `scaleX(${strike})`,
                    }}
                  />
                ) : null}
              </span>
            </div>
          );
        }),
      )}
    </div>
  );
};

/** A label over (or beside) a figure piece, in the chart face. */
export const Tagline: React.FC<{
  x: number;
  y: number;
  at: number;
  out?: number;
  dim?: number;
  size?: number;
  color?: string;
  weight?: number;
  align?: "left" | "center" | "right";
  width?: number;
  children: React.ReactNode;
}> = ({ x, y, at: from, out, dim, size = 21, color = INK_SOFT, weight = 650, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10)) * (dim === undefined ? 1 : 1 - ease(frame, dim, 12) * 0.65);
  if (o <= 0) return null;
  const left = align === "center" && width ? x - width / 2 : align === "right" && width ? x - width : x;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: y,
        width,
        textAlign: align,
        whiteSpace: "nowrap",
        opacity: o,
        transform: `translateY(${(1 - Math.min(1, o)) * 6}px)`,
        ...label(size, color),
        fontWeight: weight,
        ...TABULAR,
      }}
    >
      {children}
    </div>
  );
};

/** The watercolor hero from illustrations.json (or another video's spot):
 *  it pops in on `at`, bobs gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  // Another video's art is already on disk; only this video's own waits for import.
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={video}
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

/** A signed number the way the figures set it: a true minus sign, fixed places. */
export const num = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
/** The same for a whole or short number, without forcing places. */
export const sn = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`;
