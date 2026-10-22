import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { BAR, INK_SOFT } from "../../editorial/style";
import { type Col, type TableGeometry as Geometry, tableGeometry } from "../da-sql/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The SQL listing, DuckDB's error box and the
 * result tables are Part 1's (da-sql/parts.tsx), and the page furniture is
 * shared with the other parts, so the series stays one family; what is local
 * is the columns and geometry helpers for a result, and the spot illustration
 * bound to this video.
 */
export {
  DataTable,
  Drift,
  ElbowArrow,
  ErrorBox,
  Headline,
  Kicker,
  KeyArrow,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_KEY,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  TableName,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";

const NUMBER = /^-?\d[\d,_]*(\.\d+)?$/;

/**
 * Columns for a result: every column whose cells are all numbers (or null)
 * set flush right, and `extra` added to a column by name.
 */
export const colsOf = (t: { cols: readonly string[]; rows: readonly (readonly string[])[] }, extra: Record<string, Partial<Col>> = {}): Col[] =>
  t.cols.map((name, j) => ({
    name,
    numeric: t.rows.length > 0 && t.rows.every((r) => NUMBER.test(r[j] ?? "") || r[j] === "null") && t.rows.some((r) => NUMBER.test(r[j] ?? "")),
    ...extra[name],
  }));

/** A result's geometry at (x, top): `top` a page position (through `y()`),
 *  the row heights through `h()`. */
export const geoOf = (
  t: { cols: readonly string[]; rows: readonly (readonly string[])[] },
  x: number,
  top: number,
  h: (v: number) => number,
  opts: { headH?: number; rowH?: number; bodySize?: number; headSize?: number; extra?: readonly (readonly string[])[] } = {},
) =>
  tableGeometry({
    x,
    top,
    cols: t.cols.map((name) => ({ name })),
    rows: t.rows,
    extra: opts.extra,
    headH: h(opts.headH ?? 46),
    rowH: h(opts.rowH ?? 50),
    bodySize: opts.bodySize ?? 24,
    headSize: opts.headSize ?? 21,
  });

/** Rows inking in one after another from `at`. */
export const rowsAt = (rows: readonly (readonly string[])[], at: number, step = 2) => rows.map((cells, i) => ({ cells, at: at + i * step }));

/** Soft ink, for the notes that explain rather than assert. */
export const SOFT = INK_SOFT;

// ── The frame, drawn beside a table ─────────────────────────────────────────

export type FrameStep = {
  /** From this frame on, the bracket spans rows `from` to `to` (inclusive). */
  at: number;
  from: number;
  to: number;
  /** The current row, if not the last of the span (a centred frame). */
  current?: number;
};

/**
 * A window frame as a bracket down the left of a table: it spans the rows a
 * function can see for the current row, and glides to each new span on its
 * cue, so a frame sliding down the rows is a bracket moving with it. The
 * current row (each step's `current`, else its `to`) gets a dot.
 */
export const RowBracket: React.FC<{
  g: Geometry;
  steps: readonly FrameStep[];
  out?: number;
  color?: string;
  /** Pixels left of the table. */
  gap?: number;
}> = ({ g, steps, out, color = BAR, gap = 16 }) => {
  const frame = useCurrentFrame();
  const first = steps[0];
  if (!first || frame < first.at) return null;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  // Glide from each step to the next over 10 frames.
  let top = g.rowTop(first.from) + 6;
  let bottom = g.rowTop(first.to + 1) - 6;
  for (const st of steps.slice(1)) {
    const t = ease(frame, st.at, 10);
    top += (g.rowTop(st.from) + 6 - top) * t;
    bottom += (g.rowTop(st.to + 1) - 6 - bottom) * t;
  }
  const appear = ease(frame, first.at, 10);
  const x = g.x - gap;
  const cur = steps.filter((st) => frame >= st.at).pop() ?? first;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: appear * (1 - o) }}>
      <path d={`M${x + 10},${top} L${x},${top} L${x},${bottom} L${x + 10},${bottom}`} fill="none" stroke={color} strokeWidth={3.2} strokeLinejoin="round" />
      <circle cx={x - 12} cy={g.rowMid(cur.current ?? cur.to)} r={5} fill={color} />
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares. */
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  // Another video's art is always there; this video's waits for its file.
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
