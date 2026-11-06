import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HAIRLINE, INK, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { type Col, LISTING_PAPER, tableGeometry } from "../da-sql/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx), as in Part 4 (da-advanced-sql/parts.tsx):
 * the SQL listing, DuckDB's tables and the page furniture are Part 1's
 * (da-sql/parts.tsx), so the series stays one family. What is local is the
 * columns and geometry helpers for a result, a plain-text panel (a prompt, a
 * report sentence), and the spot illustration bound to this video.
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

/** Code inside a line of prose, in the mono face at 0.92em: within the 12%
 *  a line's sizes may differ by (`check:frames`), where the 0.88em of the
 *  Mono this video used to take from Parts 1 and 2 is not. */
export const Mono: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight }) => (
  <span style={{ fontFamily: MONO, fontSize: "0.92em", fontStyle: "normal", fontWeight: weight ?? 600, color, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);

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

// ── Plain text, set like a listing ───────────────────────────────────────────

/**
 * Text that is not SQL (a prompt to an assistant, a line of a report), on the
 * listing's tinted paper with the same rules, each line inking in on its cue.
 */
export const TextPanel: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  at: number;
  size?: number;
  mono?: boolean;
  lineAt?: readonly number[];
  out?: number;
  children?: React.ReactNode;
}> = ({ lines, x, top, width, at, size = 24, mono = false, lineAt, out, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const lineH = Math.round(size * (mono ? 1.7 : 1.5));
  const pad = Math.round(size * 0.8);
  return (
    <div style={{ position: "absolute", left: x, top, width, height: pad * 2 + lines.length * lineH, opacity: 1 - o }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: LISTING_PAPER,
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {lines.map((line, i) => {
        const q = ease(frame, lineAt?.[i] ?? at + 4 + i * 3, 10);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pad,
              top: pad + i * lineH,
              height: lineH,
              display: "flex",
              alignItems: "center",
              whiteSpace: "pre",
              opacity: q,
              fontFamily: mono ? MONO : undefined,
              fontVariantLigatures: "none",
              ...(mono ? { fontSize: size, color: INK } : note(size, INK)),
            }}
          >
            {line}
          </div>
        );
      })}
      {children}
    </div>
  );
};

// ── Hairlines between columns ───────────────────────────────────────────────

/** A vertical hairline between columns of text set side by side: centred in
 *  their gap, as tall as their text, inking in with the column to its right
 *  (`at`). */
export const ColumnRule: React.FC<{ x: number; top: number; height: number; at: number; out?: number }> = ({ x, top, height, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left: Math.round(x), top, width: 1, height, background: HAIRLINE, opacity: p }} />;
};

/** The same hairline as an item of the columns' flex row, as tall as the
 *  row's text: spread the row with `space-between`, or give it an even
 *  `gap`, to centre it in its gap. */
export const FlexRule: React.FC<{ at: number; out?: number }> = ({ at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12) * (out === undefined ? 1 : 1 - ease(frame, out, 10));
  return <div style={{ width: 1, alignSelf: "stretch", flexShrink: 0, background: HAIRLINE, opacity: Math.max(0, p) }} />;
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
