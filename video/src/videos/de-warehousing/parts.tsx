import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HAIRLINE, INK, INK_SOFT, PAPER, label } from "../../editorial/style";
import { ds } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { COLUMNS, FILES, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The SQL listing, the result table and the page furniture are the Data
 * Analyst SQL videos' (da-sql/parts.tsx, and the column helpers from
 * da-advanced-sql/parts.tsx), as DS Part 10 (ds-sql/parts.tsx) takes them, so
 * the series' SQL looks like one family. What is local: the hero, a file drawn
 * as a bar of bytes, DuckDB's plan lines, and the six columns' tints.
 */
export {
  DataTable,
  Drift,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Svg,
  TableName,
  X0,
  LISTING_PAPER,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";

/**
 * The index of the listing line that holds `text`, so a highlight finds its
 * line by what it says (ds-sql/parts.tsx). A query reworded so the text is
 * gone fails the render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/**
 * The six columns of the sales table, each a step of the data blue, so a
 * column keeps one tint wherever its bytes are drawn: in the table's header,
 * in a row store and a column store, in a file.
 */
export const COLUMN_TINT: Record<string, string> = {
  sale_id: ds("blue", 100),
  sale_date: ds("blue", 200),
  region: ds("blue", 300),
  category: ds("blue", 400),
  units: ds("blue", 550),
  amount: ds("blue", 700),
};

/** The Parquet file as six column blocks, each its share of the file. */
export const PARQUET_SEGMENTS = COLUMNS.map((c) => ({ key: c.name, share: c.parquet / FILES.parquet, color: COLUMN_TINT[c.name] }));
/** Where a column's block starts in the file, and how long it is, as shares. */
export const segmentOf = (names: readonly string[]) => {
  const start = PARQUET_SEGMENTS.findIndex((s) => names.includes(s.key));
  const before = PARQUET_SEGMENTS.slice(0, start).reduce((a, s) => a + s.share, 0);
  const share = PARQUET_SEGMENTS.filter((s) => names.includes(s.key)).reduce((a, s) => a + s.share, 0);
  return { before, share };
};

/** What a query read: the narration's highlighter, laid over bytes. */
export const READ = ds("yellow", 400);

/** The watercolor hero from illustrations.json: pops in on `at`, bobs, fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
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
 * A file drawn as a bar of its bytes, `width` px long, growing from the left
 * on `at`. `segments` split it into the columns it stores (a column store),
 * each with its share of the length; with none, the bar is filled with
 * `pattern` (a row store's interleaved fields) or a plain tint.
 */
export const FileBar: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  at: number;
  out?: number;
  dim?: number;
  segments?: readonly { key: string; share: number; color: string }[];
  pattern?: readonly string[];
  fill?: string;
}> = ({ x, y, width, height, at, out, dim, segments, pattern, fill = ds("blue", 300) }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const stripe = pattern ? `repeating-linear-gradient(90deg, ${pattern.map((c, i) => `${c} ${i * 4}px ${(i + 1) * 4}px`).join(", ")})` : undefined;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        opacity: (1 - o) * (1 - d),
        display: "flex",
        background: segments ? undefined : (stripe ?? fill),
        borderRadius: 3,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 22%, transparent)`,
      }}
    >
      {segments?.map((s) => (
        <div key={s.key} style={{ width: width * s.share, height: "100%", background: s.color, boxShadow: `inset -1px 0 0 ${PAPER}` }} />
      ))}
    </div>
  );
};

/**
 * The highlighter round part of a bar, from `x` for `width` px, swept in on
 * `at`: the bytes a query read. It sits behind the bar (z-index -1, inside
 * the scene's Drift), so the bytes keep their own tints and the yellow shows
 * as a band round them; laid over them, it mixed blue and yellow into green,
 * the right answer's color.
 */
export const ReadMark: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  at: number;
  out?: number;
  color?: string;
}> = ({ x, y, width, height, at, out, color = READ }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 7,
        width: (width + 14) * p,
        height: height + 14,
        background: color,
        borderRadius: 5,
        zIndex: -1,
        opacity: 1 - o,
      }}
    />
  );
};

/**
 * Lines of DuckDB's EXPLAIN ANALYZE, as it prints its scan operator, on the
 * listing paper: each line inks in on its cue, and `mark` lines carry the
 * highlighter from a frame on.
 */
export const PlanBox: React.FC<{
  x: number;
  top: number;
  width: number;
  lines: readonly { text: string; at: number; mark?: number; markColor?: string; strong?: boolean }[];
  at: number;
  out?: number;
  dim?: number;
  size?: number;
  title?: string;
}> = ({ x, top, width, lines, at, out, dim, size = 21, title = "EXPLAIN ANALYZE, the scan" }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0 || o >= 1) return null;
  const lineH = Math.round(size * 1.7);
  return (
    <div style={{ position: "absolute", left: x, top, width, opacity: p * (1 - o) * (1 - d) }}>
      <div style={{ ...label(19, INK_SOFT), marginBottom: 10, whiteSpace: "nowrap" }}>{title}</div>
      <div
        style={{
          background: ds("gray", 50),
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
          padding: `${Math.round(size * 0.6)}px ${Math.round(size * 0.8)}px`,
        }}
      >
        {lines.map((l, i) => {
          const q = ease(frame, l.at, 12);
          const m = l.mark === undefined ? 0 : ease(frame, l.mark, 12);
          return (
            <div key={i} style={{ position: "relative", height: lineH, display: "flex", alignItems: "center", opacity: q }}>
              <span
                style={{
                  position: "absolute",
                  left: -6,
                  top: lineH * 0.12,
                  height: lineH * 0.76,
                  width: `calc(${l.text.length * 0.6 + 0.5}em * ${m})`,
                  fontSize: size,
                  background: l.markColor ?? READ,
                }}
              />
              <span
                style={{
                  position: "relative",
                  fontFamily: MONO,
                  fontSize: size,
                  whiteSpace: "pre",
                  color: INK,
                  fontWeight: l.strong ? 700 : 400,
                  fontVariantLigatures: "none",
                }}
              >
                {l.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
