import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ACCENT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page furniture and the plotting pieces come
 * from the Data Analyst statistics part, the bridge's clear and the fraction
 * from the probability part, and the chip, step and made-up label from the
 * product-sense part, so the series stays one family. What is new is this
 * round's own material: a model's reply on a card, and a hundred graded
 * items as a grid.
 */
export {
  at,
  Axes,
  Drift,
  Headline,
  Kicker,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  type Scale,
  Strike,
  Svg,
  WARM,
  WARM_INK,
  X0,
} from "../da-statistics-communication/parts";
export { Clear, Frac, math } from "../ds-probability/parts";
export { BAD, Chip, DATA, DATA_LIGHT, madeUp, Step } from "../ds-product-sense/parts";

/** The paper-grey of what the narration has moved past. */
export const QUIET = ds("blue", 100);

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at: from, out, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
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
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/**
 * A model's reply on a card: a small heading ("Run 1"), the reply in the
 * text face, and a border in `ink`. `verdict` inks the card in on its own
 * frame: green for the reply that matches, red for the one that doesn't.
 */
export const ReplyCard: React.FC<{
  x: number;
  y: number;
  width: number;
  at: number;
  title: string;
  ink?: string;
  verdict?: { at: number; ok: boolean };
  dim?: number;
  size?: number;
  children: React.ReactNode;
}> = ({ x, y, width, at: from, title, ink = INK_SOFT, verdict, dim, size = 27, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const v = verdict ? ease(frame, verdict.at, 12) : 0;
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0) return null;
  const tone = verdict ? (verdict.ok ? ds("green", 600) : ACCENT) : ink;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        boxSizing: "border-box",
        padding: "18px 24px 20px",
        borderRadius: 14,
        border: `2.2px solid color-mix(in srgb, ${tone} ${30 + 70 * v}%, ${ink})`,
        background: `color-mix(in srgb, ${tone} ${8 * v}%, ${PAPER})`,
        opacity: p * (1 - d),
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div style={{ ...label(19, INK_SOFT), fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ ...note(size, INK), lineHeight: 1.35 }}>{children}</div>
    </div>
  );
};

/**
 * A hundred graded items as a ten-by-ten grid, filled in order: each item
 * one cell, its fill from `color(i)`, inking in from `at` a row at a time.
 * `slash(i)` draws a white diagonal across a cell at that opacity, to tell
 * apart two kinds of item that share a color.
 */
export const Grid100: React.FC<{
  x: number;
  y: number;
  cell: number;
  gap: number;
  at: number;
  color: (i: number) => string;
  ring?: (i: number) => string | null;
  slash?: (i: number) => number;
  dim?: number;
}> = ({ x, y, cell, gap, at: from, color, ring, slash, dim }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - d }}>
      {Array.from({ length: 100 }, (_, i) => {
        const r = Math.floor(i / 10);
        const c = i % 10;
        const p = ease(frame, from + r * 2 + c * 0.4, 8);
        if (p <= 0) return null;
        const cx = x + c * (cell + gap);
        const cy = y + r * (cell + gap);
        const edge = ring?.(i) ?? null;
        const s = slash?.(i) ?? 0;
        const inset = cell * 0.22;
        return (
          <g key={i}>
            <rect
              x={cx + (cell / 2) * (1 - p)}
              y={cy + (cell / 2) * (1 - p)}
              width={cell * p}
              height={cell * p}
              rx={5}
              fill={color(i)}
              stroke={edge ?? "none"}
              strokeWidth={edge ? 3 : 0}
            />
            {s > 0 ? (
              <line
                x1={cx + inset}
                y1={cy + cell - inset}
                x2={cx + cell - inset}
                y2={cy + inset}
                stroke={PAPER}
                strokeWidth={4}
                strokeLinecap="round"
                opacity={s * p}
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
};

/** A plain sentence on the page, in the text face. */
export const line = (size = 28, color: string = INK): React.CSSProperties => ({ ...note(size, color), whiteSpace: "nowrap" });
