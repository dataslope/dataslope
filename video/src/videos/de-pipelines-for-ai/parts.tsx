import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ACCENT, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the editorial kit and the interview kit
 * (editorial/interview.tsx). The page furniture and plotting pieces come from
 * the Data Analyst statistics part, the chip and the made-up label from the
 * Data Scientist product-sense part, the clear and the math face from its
 * probability part, the Python and SQL listings from the Data Analyst pandas
 * and SQL parts, and the arrows from the How LLMs Work course video on
 * embeddings (llm-meaning), so the series stays one family. What is new is
 * this round's own vocabulary: a step in a pipeline as a box, a document
 * drawn as lines to be cut into chunks, and points in a space.
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
  mulberry32,
  OK,
  OK_INK,
  type Scale,
  Strike,
  Svg,
  X0,
} from "../da-statistics-communication/parts";
export { Clear, math } from "../ds-probability/parts";
export { BAD, Chip, DATA, DATA_LIGHT, madeUp } from "../ds-product-sense/parts";
export { Console, consoleHeight, Listing, listingHeight } from "../da-pandas/parts";
export { Listing as SqlListing, listingHeight as sqlListingHeight } from "../da-sql/parts";
export { Arrow, PathArrow } from "../llm-meaning/parts";

/** What the narration has moved past: the paper-grey of a faded box. */
export const QUIET = ds("gray", 300);
/** A pale wash of the data blue, for a box or a band of data. */
export const DATA_TINT = `color-mix(in srgb, ${ds("blue", 500)} 10%, ${PAPER})`;

/**
 * The index of the listing line that holds `text` (after ds-sql/parts.tsx):
 * a highlight finds its line by what the line says, never by a number.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** A watercolor spot from illustrations.json (after ds-sql/parts.tsx): it
 *  pops in on `at`, bobs gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
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
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/**
 * A step in a pipeline, or any named thing in a diagram: a rounded box with
 * its name centred, inking in on `at`. `lit` washes it in the highlighter
 * while the narration is on it (until `litOut`); `tone` colors its border and
 * text (the data blue for a store, green for the answer that works, red for
 * the trap); `dim` sets it back; `dashed` draws a box that is planned or
 * gone.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  lit?: number;
  litOut?: number;
  dim?: number;
  out?: number;
  tone?: string;
  fill?: string;
  dashed?: boolean;
  size?: number;
  weight?: number;
  mono?: boolean;
  children: React.ReactNode;
}> = ({ x, y, w, h, at: from, lit, litOut, dim, out, tone = INK_SOFT, fill, dashed, size = 23, weight = 600, mono, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const l = lit === undefined ? 0 : ease(frame, lit, 10) * (litOut === undefined ? 1 : 1 - ease(frame, litOut, 12));
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const ink = tone === INK_SOFT ? INK : tone;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        padding: "0 12px",
        borderRadius: 12,
        border: `2px ${dashed ? "dashed" : "solid"} ${tone}`,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${100 * l}%, ${fill ?? PAPER})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        ...note(size, ink),
        fontFamily: mono ? MONO : note(size).fontFamily,
        fontVariantLigatures: mono ? "none" : undefined,
        fontWeight: weight,
        lineHeight: 1.18,
        opacity: p * (1 - d) * (1 - o),
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A straight arrow from `from` to `to` that draws itself on `at`, solid or
 * dashed, its head built by arrowHead() on the straight line.
 */
export const LineArrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  dur?: number;
  dim?: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
}> = ({ from, to, at: start, dur = 12, dim, out, color = INK_SOFT, width = 2.2, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, dur);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: Pt = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const head = Math.min(13, len * 0.5);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - d) * (1 - o) }}>
      <line x1={from[0]} y1={from[1]} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={width} strokeDasharray={dash} strokeLinecap="round" />
      <path d={arrowHead([from, tip], head, head * 0.62)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** A label set in Inter on one line, for notes on the page. */
export const say = (size = 24, color: string = INK, weight = 500): React.CSSProperties => ({
  ...note(size, color),
  fontWeight: weight,
  whiteSpace: "nowrap",
});

/** A small heading over a part of a figure ("Offline ingestion"). */
export const head = (size = 22, color: string = INK_SOFT): React.CSSProperties => ({
  ...label(size, color),
  fontWeight: 700,
  whiteSpace: "nowrap",
});

/** A document drawn as lines of text: `rows` lists each row as a heading
 *  ("h") or a line of text of a given width (0 to 1). */
export type DocRow = { kind: "h" | "t"; w: number; topic?: number };

/** Three topics' inks, for a document whose sections are about different
 *  things (the accents, which carry no meaning elsewhere here). */
export const TOPIC = [ds("blue", 300), ds("teal", 300), ds("purple", 300)] as const;

export const DOC_ROW = 22;

/**
 * A page of a document: a light sheet with its rows drawn as bars, headings
 * darker and shorter. `tint` colors each text row by its topic, for a
 * figure about what one chunk covers.
 */
export const Doc: React.FC<{
  x: number;
  y: number;
  w: number;
  rows: readonly DocRow[];
  at: number;
  tint?: number;
  dim?: number;
}> = ({ x, y, w, rows, at: from, tint, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const t = tint === undefined ? 0 : ease(frame, tint, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0) return null;
  const pad = 16;
  const height = rows.length * DOC_ROW + 2 * pad - 8;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - d) }}>
      <rect x={x} y={y} width={w} height={height} rx={8} fill={PAPER} stroke={INK_SOFT} strokeWidth={1.6} />
      {rows.map((r, i) => {
        const ry = y + pad + i * DOC_ROW;
        const inner = w - 2 * pad;
        const color =
          r.kind === "h" ? INK : t > 0 && r.topic !== undefined ? `color-mix(in srgb, ${TOPIC[r.topic]} ${100 * t}%, ${QUIET})` : QUIET;
        return (
          <rect key={i} x={x + pad} y={ry} width={inner * r.w * Math.min(1, p * 1.4)} height={r.kind === "h" ? 11 : 8} rx={3} fill={color} />
        );
      })}
    </svg>
  );
};

/** Where row `i` of a Doc at `y` sits, top and bottom of its bar. */
export const docRowY = (y: number, i: number) => y + 16 + i * DOC_ROW;

/**
 * A chunk's span beside a document: a square bracket from row `r0` to row
 * `r1` (inclusive), drawn down on `at`, in `color`, `dx` px right of the
 * sheet's edge. `band` also lays a wash across the rows it covers.
 */
export const ChunkBracket: React.FC<{
  x: number;
  docY: number;
  r0: number;
  r1: number;
  at: number;
  color?: string;
  dim?: number;
  out?: number;
  band?: { x: number; w: number; color: string };
}> = ({ x, docY, r0, r1, at: from, color = BLUE_INK, dim, out, band }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.65;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const top = docRowY(docY, r0) - 5;
  const bottom = docRowY(docY, r1) + 13;
  const yb = top + (bottom - top) * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - d) * (1 - o) }}>
      {band ? <rect x={band.x} y={top} width={band.w} height={(bottom - top) * p} rx={4} fill={band.color} /> : null}
      <path d={`M${x - 10},${top} L${x},${top} L${x},${yb} L${x - 10},${yb}`} fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
    </svg>
  );
};

/** A point on a figure of a space: a dot that pops in on `at`, in its own
 *  ink, with an optional ring (a nearest neighbour, a hit). */
export type SpacePoint = { x: number; y: number; color: string; at: number; ring?: { at: number; color: string; out?: number }; out?: number };

export const Points: React.FC<{ points: readonly SpacePoint[]; r?: number; dim?: number }> = ({ points, r = 7, dim }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - d }}>
      {points.map((pt, i) => {
        const s = ease(frame, pt.at, 8);
        const o = pt.out === undefined ? 0 : ease(frame, pt.out, 10);
        if (s <= 0 || o >= 1) return null;
        const ring = pt.ring ? ease(frame, pt.ring.at, 8) * (pt.ring.out === undefined ? 1 : 1 - ease(frame, pt.ring.out, 10)) : 0;
        return (
          <g key={i} opacity={1 - o}>
            {ring > 0 && pt.ring ? <circle cx={pt.x} cy={pt.y} r={r + 6} fill="none" stroke={pt.ring.color} strokeWidth={2.6} opacity={ring} /> : null}
            <circle cx={pt.x} cy={pt.y} r={r * s} fill={pt.color} />
          </g>
        );
      })}
    </svg>
  );
};

/** The query, drawn as a ringed star-like mark in ink, so it never reads as
 *  one of the data points. */
export const QueryMark: React.FC<{ x: number; y: number; at: number; size?: number; color?: string }> = ({
  x,
  y,
  at: from,
  size = 13,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 10);
  if (p <= 0) return null;
  const s = size * p;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <circle cx={x} cy={y} r={s + 5} fill={PAPER} stroke={color} strokeWidth={2.4} />
      <path d={`M${x - s * 0.6},${y} L${x + s * 0.6},${y} M${x},${y - s * 0.6} L${x},${y + s * 0.6}`} stroke={color} strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
};

/** The trap's red, for a cell or a mark that shows what goes wrong. */
export const TRAP = ACCENT;
