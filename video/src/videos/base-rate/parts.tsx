import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { ACCENT_INK, headline } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { BLOCK_COLS, BLOCK_ROWS } from "./data";

/** The pulled-out positives, ten to a row: where Fig. 2 and Fig. 5 draw them. */
export const BLOCK = { x0: 200, top: 286, pitch: 34, r: 11 } as const;
export const BLOCK_RIGHT = BLOCK.x0 + BLOCK_COLS * BLOCK.pitch;
export const BLOCK_BOTTOM = BLOCK.top + BLOCK_ROWS * BLOCK.pitch;

/** Centre of a slot in the block, in page px. */
export const useBlockXY = () => {
  const { y, h } = useLayout();
  return (slot: number) =>
    [
      BLOCK.x0 + BLOCK.pitch * ((slot % BLOCK_COLS) + 0.5),
      y(BLOCK.top) + h(BLOCK.pitch * (Math.floor(slot / BLOCK_COLS) + 0.5)),
    ] as const;
};

/**
 * Two phrases of one headline, set as a single flowing line: the second, in
 * italic and the accent, inks in after the first, at its own cue, and sits
 * a word space after it in any face.
 */
export const Headline: React.FC<{
  top: number;
  left?: number;
  size?: number;
  first: string;
  second?: string;
  firstAt: number;
  secondAt?: number;
  out?: number;
  secondColor?: string;
}> = ({ top, left = 116, size = 60, first, second, firstAt, secondAt, out, secondColor = ACCENT_INK }) => (
  <div style={{ position: "absolute", left, top, display: "flex", gap: "0.26em", ...headline(size) }}>
    <Ink at={firstAt} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
      {first}
    </Ink>
    {second && secondAt !== undefined ? (
      <Ink
        at={secondAt}
        dur={18}
        out={out}
        style={{ position: "relative", ...headline(size, true), color: secondColor, whiteSpace: "nowrap" }}
      >
        {second}
      </Ink>
    ) : null}
  </div>
);

/** Inks in over a hidden copy of itself, so a phrase inside a flowing layout
 *  holds its place before it appears and nothing beside it moves. */
export const Held: React.FC<{
  at: number;
  out?: number;
  dur?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at, out, dur = 16, style, children }) => (
  <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
    <span style={{ visibility: "hidden" }}>{children}</span>
    <Ink at={at} dur={dur} out={out} style={{ left: 0, top: 0, whiteSpace: "nowrap" }}>
      {children}
    </Ink>
  </span>
);

/** A legend dot. `hollow` draws the ring of someone a test cleared. */
export const Dot: React.FC<{ color: string; size?: number; hollow?: boolean }> = ({ color, size = 16, hollow }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: hollow ? "transparent" : color,
      border: hollow ? `2px solid ${color}` : undefined,
      boxSizing: "border-box",
      flex: "none",
    }}
  />
);

/**
 * A bracket down the right of a run of block rows, from `fromRow` to `toRow`
 * inclusive, drawn in on `at`.
 */
export const RowBracket: React.FC<{ fromRow: number; toRow: number; at: number; color: string; out?: number }> = ({
  fromRow,
  toRow,
  at,
  color,
  out,
}) => {
  const frame = useCurrentFrame();
  const { y, h } = useLayout();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const x = BLOCK_RIGHT + 14;
  const top = y(BLOCK.top) + h(BLOCK.pitch * fromRow) + 4;
  const bottom = y(BLOCK.top) + h(BLOCK.pitch * (toRow + 1)) - 4;
  const mid = top + (bottom - top) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      <path
        d={`M${x - 8},${top} L${x},${top} L${x},${mid}${p >= 1 ? ` L${x - 8},${bottom}` : ""}`}
        fill="none"
        stroke={color}
        strokeWidth={2.4}
      />
    </svg>
  );
};
