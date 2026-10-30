import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { Entity, type EntityLayout } from "../../editorial/erd";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { OK_INK as OK_INK_LOCAL, tableGeometry, type Col } from "../da-sql/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit, the interview kit
 * (editorial/interview.tsx) and the ERD kit (editorial/erd.tsx). The SQL
 * listing, the result tables, the arrows, the highlighter and the strike are
 * the Data Analyst SQL videos' (da-sql/parts.tsx, and the column helpers from
 * da-advanced-sql/parts.tsx), as ds-sql takes them, so every SQL figure in
 * the three interview series is one family. What is local: the spot bound
 * to this video, `lineOf`, a table chip (an ERD box with no columns, for the
 * small schemas), and the verdict line that closes most figures.
 */
export {
  DataTable,
  Drift,
  ElbowArrow,
  Headline,
  KEY,
  KEY_INK,
  KeyArrow,
  Kicker,
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
  tableGeometry,
  Tag,
  X0,
  type CellMark,
  type CellSwap,
  type Col,
  type RowBand,
  type TableGeometry,
  type TableRow,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";

/**
 * A result's geometry with its own columns, tags included: geoOf sizes each
 * column by its name and values only, so a column given a "PK" tag came out
 * too narrow and its name was cut off on the left.
 */
export const geoWith = (
  t: { rows: readonly (readonly string[])[] },
  cols: readonly Col[],
  x: number,
  top: number,
  h: (v: number) => number,
  opts: { headH?: number; rowH?: number; bodySize?: number; headSize?: number; extra?: readonly (readonly string[])[] } = {},
) =>
  tableGeometry({
    x,
    top,
    cols,
    rows: t.rows,
    extra: opts.extra,
    headH: h(opts.headH ?? 46),
    rowH: h(opts.rowH ?? 50),
    bodySize: opts.bodySize ?? 24,
    headSize: opts.headSize ?? 21,
  });

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, not by a number (the Data Scientist review found
 * four hard-coded indices one line off). A query reworded so the text is gone
 * fails the render instead.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. Copied from ds-sql/parts.tsx. */
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

/**
 * A table as a name only: an ERD box with no columns, for a schema drawn
 * small (OLTP against OLAP, the conformed dimension). It is the kit's own
 * `<Entity>`, so the boxes read the same as every full one.
 */
export const Chip: React.FC<{ layout: EntityLayout; at: number; dim?: number; out?: number }> = ({ layout, at, dim, out }) => (
  <Entity layout={layout} at={at} dim={dim} out={out} />
);

/** A small rule-and-label heading over a panel. */
export const PanelHead: React.FC<{
  at: number;
  x: number;
  y: number;
  width: number;
  children: React.ReactNode;
  sub?: React.ReactNode;
  subAt?: number;
  color?: string;
  out?: number;
}> = ({ at, x, y, width, children, sub, subAt, color = INK, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width, opacity: 1 - o }}>
      <div style={{ height: 2, width: width * p, background: color === INK ? INK : color }} />
      <div style={{ ...label(26, color), fontWeight: 700, marginTop: 12, opacity: p, whiteSpace: "nowrap" }}>{children}</div>
      {sub ? (
        <div style={{ ...note(22, INK_SOFT), marginTop: 6, opacity: ease(frame, subAt ?? at + 8, 12), whiteSpace: "nowrap" }}>{sub}</div>
      ) : null}
    </div>
  );
};

/**
 * A result a query printed, as one figure: the label it answers to and the
 * value, set in the face listings use. `tone` colors the value: green for
 * the right answer, red for the wrong one, ink for neither.
 */
export const Verdict: React.FC<{
  at: number;
  x: number;
  y: number;
  label: React.ReactNode;
  value: React.ReactNode;
  tone?: "ok" | "bad" | "ink";
  strikeAt?: number;
  out?: number;
  dim?: number;
  size?: number;
}> = ({ at, x, y, label: what, value, tone = "ink", strikeAt, out, dim, size = 30 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const ink = tone === "ok" ? OK_INK_LOCAL : tone === "bad" ? ACCENT_INK : INK;
  const s = strikeAt === undefined ? 0 : ease(frame, strikeAt, 12);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "baseline",
        gap: 14,
        whiteSpace: "nowrap",
        opacity: p * (1 - o) * (1 - d),
        transform: `translateX(${(1 - p) * -14}px)`,
      }}
    >
      <span style={{ ...note(23, INK_SOFT) }}>{what}</span>
      <span style={{ position: "relative", fontFamily: MONO, fontSize: size, fontWeight: 700, color: ink, fontVariantLigatures: "none" }}>
        {value}
        {s > 0 ? (
          <span
            style={{
              position: "absolute",
              left: "-0.06em",
              top: "0.55em",
              width: `calc((100% + 0.12em) * ${s})`,
              height: 3,
              background: ACCENT,
              borderRadius: 2,
            }}
          />
        ) : null}
      </span>
    </div>
  );
};

/** A hairline across a figure, drawing itself from the left on `at`. */
export const Rule: React.FC<{ at: number; x: number; y: number; width: number; out?: number }> = ({ at, x, y, width, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: width * p, height: 1, background: HAIRLINE, opacity: 1 - o }} />;
};

/** A soft paper card behind a group of notes, for a figure that needs a box. */
export const Card: React.FC<{ at: number; x: number; y: number; w: number; h: number; tone?: "ok" | "bad" | "ink"; out?: number; children?: React.ReactNode }> = ({
  at,
  x,
  y,
  w,
  h,
  tone = "ink",
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const edge = tone === "ok" ? OK_INK_LOCAL : tone === "bad" ? ACCENT : INK;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px solid ${edge}`,
        borderRadius: 10,
        background: PAPER,
        opacity: p * (1 - o),
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      {children}
    </div>
  );
};
