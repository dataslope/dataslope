import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import type { Layout } from "../../editorial/layout";
import { INK, INK_SOFT, note } from "../../editorial/style";
import { H, W } from "../../editorial/ui";
import { BORDER_BOX, BOX, CONTENT_BOX, ROW } from "./data";
import { boxAt, BoxDrawing, type BoxShape, CONTENT_INK } from "./kit";

/**
 * The row of Fig. 3 and Fig. 4, shared so the two figures sit on exactly the
 * same spot and the cut between them is seamless: a 600px row at 1.6 times its
 * CSS size, under the same two-line listing.
 */
export const K = 1.6;
export const ROW_X = 120;
/** The row's top, before `y()`. */
const ROW_TOP = 540;
export const LIST_TOP = 268;
export const CODE = 26;
export const LIST_W = 980;
export const LINES = [
  `.row { display: flex; flex-wrap: wrap; width: ${ROW.width}px; }`,
  `.col { width: ${ROW.pct}%; padding: ${BOX.padding}px; border: ${BOX.border}px solid; }`,
] as const;
/** Where a phrase starts on a listing line, and how long it is: for marks. */
export const span = (line: 0 | 1, phrase: string) => ({ line, from: LINES[line].indexOf(phrase), chars: phrase.length });

export const rowGeometry = ({ y, h }: Layout) => {
  const top = y(ROW_TOP);
  const pad = BOX.padding * K;
  const border = BOX.border * K;
  // The content height is any height; padding and border keep true scale.
  const contentH = h(ROW.contentHeight * K);
  const colH = contentH + 2 * (pad + border);
  return {
    top,
    width: ROW.width * K,
    pad,
    border,
    contentH,
    colH,
    /** Each layout's columns, in page px: x of the border box, and the
     *  layout line each landed on, as Chromium placed them. */
    contentBox: CONTENT_BOX.cols.map((c) => ({ x: ROW_X + c.x * K, line: c.line, w: c.width * K, content: c.content * K })),
    borderBox: BORDER_BOX.cols.map((c) => ({ x: ROW_X + c.x * K, line: c.line, w: c.width * K, content: c.content * K })),
  };
};
export type RowGeometry = ReturnType<typeof rowGeometry>;

/** A column whose border box starts at (x, top). */
export const column = (g: RowGeometry, x: number, top: number, contentW: number): BoxShape =>
  boxAt(x, top, contentW, g.contentH, g.pad, g.border);

/** The row itself: a dashed outline as tall as its lines, lightly tinted. */
export const RowFrame: React.FC<{ g: RowGeometry; height: number; opacity: number }> = ({ g, height, opacity }) => {
  if (opacity <= 0) return null;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <rect
        x={ROW_X - 0.75}
        y={g.top - 0.75}
        width={g.width + 1.5}
        height={height + 1.5}
        fill={`color-mix(in srgb, ${INK} 4%, transparent)`}
        stroke={INK_SOFT}
        strokeWidth={1.5}
        strokeDasharray="6 6"
      />
    </svg>
  );
};

/** One column, drawn, with its content width printed inside it. */
export const Column: React.FC<{
  shape: BoxShape;
  layers?: number;
  opacity?: number;
  value: number;
  /** A second value that crossfades in, from `swapAt`. */
  next?: number;
  swapAt?: number;
}> = ({ shape, layers = 1, opacity = 1, value, next, swapAt }) => {
  const frame = useCurrentFrame();
  const s = next === undefined || swapAt === undefined ? 0 : ease(frame, swapAt, 10);
  const text = (v: number, o: number) => (
    <span
      style={{
        gridArea: "1 / 1",
        ...note(22, CONTENT_INK),
        fontWeight: 600,
        whiteSpace: "nowrap",
        opacity: o,
      }}
    >
      content {v}px
    </span>
  );
  return (
    <BoxDrawing shape={shape} padding={layers} border={layers} opacity={opacity}>
      <span style={{ display: "grid", justifyItems: "center", alignItems: "center" }}>
        {text(value, 1 - s)}
        {next !== undefined ? text(next, s) : null}
      </span>
    </BoxDrawing>
  );
};
