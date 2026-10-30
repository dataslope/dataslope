import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ACCENT_INK, BLUE_INK, HAIRLINE, INK, INK_SOFT, PAPER, TABULAR, label } from "../../editorial/style";
import { ds, inkOf } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture Part 2 already drew (the
 * slow push, headings, highlighter and strike, arrows) comes from
 * da-pandas/parts.tsx, so the parts stay one family; what is new here is the
 * spreadsheet itself: a grid with its column letters and row numbers whose
 * cells fill, change and can take a new column, the colored outline a
 * formula draws around the range it reads, and the formula bar.
 */
export {
  Drift,
  ElbowArrow,
  Headline,
  Kicker,
  lerp,
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
  X0,
} from "../da-pandas/parts";

// ── The grid ─────────────────────────────────────────────────────────────────

/** A spreadsheet's chrome: the header row and the row-number gutter. */
const GRID = ds("gray", 300);
const HEADER_BG = ds("gray", 100);
const GUTTER = 46;

export const colLetter = (c: number) => String.fromCharCode(65 + c);

export type SheetGeometry = ReturnType<typeof sheetGeometry>;

/**
 * Where a sheet's cells fall. Columns are 0-based from A, rows are the
 * sheet's own 1-based numbers starting at `firstRow`. `top` and `rowH` are
 * page values (through `y()` and `h()`).
 */
export const sheetGeometry = ({
  x,
  top,
  widths,
  rows,
  rowH,
  firstRow = 1,
  firstCol = 0,
}: {
  x: number;
  top: number;
  widths: readonly number[];
  rows: number;
  rowH: number;
  firstRow?: number;
  /** The first column's letter, 0 for A: a grid that starts at F draws F, G… */
  firstCol?: number;
}) => {
  const headH = Math.round(rowH * 0.78);
  const xs = widths.map((_, c) => x + GUTTER + widths.slice(0, c).reduce((a, b) => a + b, 0));
  const width = GUTTER + widths.reduce((a, b) => a + b, 0);
  const rowTop = (r: number) => top + headH + (r - firstRow) * rowH;
  return {
    x,
    top,
    widths,
    rows,
    rowH,
    headH,
    firstRow,
    firstCol,
    xs,
    width,
    right: x + width,
    bottom: rowTop(firstRow + rows),
    rowTop,
    rowMid: (r: number) => rowTop(r) + rowH / 2,
    colMid: (c: number) => xs[c] + widths[c] / 2,
  };
};

/** A cell filled from `at` to `out`; `inserted` fills the opened column's cell instead. */
export type CellFill = { r: number; c: number; at: number; out?: number; color: string; inserted?: boolean };
export type CellSwap = { r: number; c: number; at: number; value: string; color?: string };
/** A column insert's timing: it opens on `at`; with `replay` it closes on
 *  `close` and opens again on `open`, for a figure that shows the sheet as it
 *  was before the insert and then the insert again. */
export type InsertTiming = { at: number; replay?: { close: number; open: number } };
/** A column that opens between two others, pushing the rest right. */
export type ColumnInsert = InsertTiming & { c: number; width: number; values: readonly string[] };

/** How far an insert is open at `frame`, 0 to 1. */
export const insertOpen = (frame: number, t: InsertTiming) =>
  Math.max(0, Math.min(1, ease(frame, t.at, 18) - (t.replay ? ease(frame, t.replay.close, 16) - ease(frame, t.replay.open, 18) : 0)));

const NUMERIC = /^[−-]?[$]?\d[\d,]*(\.\d+)?%?$/;

/**
 * A sheet drawn as a spreadsheet draws it: column letters across the top,
 * row numbers down the side, light gridlines, text left and numbers right.
 * `values[i][c]` is row `firstRow + i`. Each cell inks in on `cellAt`, can be
 * filled (a highlight, the conditional-format fill), swap its value, or take
 * its own ink. `insert` opens a new column at `c`, and every column from
 * there on moves right and takes the next letter, as Excel's insert does.
 */
export const Sheet: React.FC<{
  g: SheetGeometry;
  values: readonly (readonly (string | null)[])[];
  at: number;
  cellAt?: (r: number, c: number) => number;
  fills?: readonly CellFill[];
  swaps?: readonly CellSwap[];
  ink?: (r: number, c: number) => string | undefined;
  bold?: (r: number, c: number) => boolean;
  /** Overrides text-left, numbers-right: a number stored as text sits left. */
  align?: (r: number, c: number) => "left" | "right" | undefined;
  insert?: ColumnInsert;
  size?: number;
  dim?: number;
  out?: number;
}> = ({ g, values, at, cellAt, fills = [], swaps = [], ink, bold, align, insert, size = 22, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;

  const ins = insert ? insertOpen(frame, insert) : 0;
  const shift = (c: number) => (insert && c >= insert.c ? insert.width * ins : 0);
  const xOf = (c: number) => g.xs[c] + shift(c);
  const totalW = g.width + (insert ? insert.width * ins : 0);
  const letter = (c: number) => colLetter(g.firstCol + (insert && c >= insert.c && ins > 0.5 ? c + 1 : c));
  const rowNums = Array.from({ length: g.rows }, (_, i) => g.firstRow + i);
  const cellStyle = (left: number, width: number, top: number): React.CSSProperties => ({
    position: "absolute",
    left,
    top,
    width,
    height: g.rowH,
    boxSizing: "border-box",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    whiteSpace: "pre",
    overflow: "hidden",
  });

  return (
    <div style={{ position: "absolute", inset: 0, opacity: p * (1 - d) * (1 - o) }}>
      {/* The header row and the gutter. */}
      <div style={{ position: "absolute", left: g.x, top: g.top, width: totalW, height: g.headH, background: HEADER_BG }} />
      <div style={{ position: "absolute", left: g.x, top: g.top, width: GUTTER, height: g.bottom - g.top, background: HEADER_BG }} />
      {/* Gridlines. */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {[...rowNums, g.firstRow + g.rows].map((r) => (
          <line key={r} x1={g.x} x2={g.x + totalW} y1={g.rowTop(r)} y2={g.rowTop(r)} stroke={GRID} strokeWidth={1} />
        ))}
        <line x1={g.x} x2={g.x + totalW} y1={g.top} y2={g.top} stroke={GRID} strokeWidth={1} />
        {[...g.widths.map((_, c) => xOf(c)), g.x, g.x + totalW].map((x, i) => (
          <line key={i} x1={x} x2={x} y1={g.top} y2={g.bottom} stroke={GRID} strokeWidth={1} />
        ))}
        {insert && ins > 0 ? (
          <line x1={g.xs[insert.c]} x2={g.xs[insert.c]} y1={g.top} y2={g.bottom} stroke={GRID} strokeWidth={1} />
        ) : null}
      </svg>
      {/* Letters and numbers. */}
      {g.widths.map((w, c) => (
        <div key={c} style={{ ...cellStyle(xOf(c), w, g.top), height: g.headH, justifyContent: "center", ...label(19, INK_SOFT) }}>
          {letter(c)}
        </div>
      ))}
      {insert && ins > 0 ? (
        <div
          style={{
            ...cellStyle(g.xs[insert.c], insert.width * ins, g.top),
            height: g.headH,
            justifyContent: "center",
            ...label(19, INK_SOFT),
            opacity: ins,
          }}
        >
          {colLetter(g.firstCol + insert.c)}
        </div>
      ) : null}
      {rowNums.map((r) => (
        <div key={r} style={{ ...cellStyle(g.x, GUTTER, g.rowTop(r)), justifyContent: "center", ...label(19, INK_SOFT) }}>
          {r}
        </div>
      ))}
      {/* Fills, under the values. */}
      {fills.map((f, i) => {
        const fp = ease(frame, f.at, 12) * (f.out === undefined ? 1 : 1 - ease(frame, f.out, 10));
        if (fp <= 0) return null;
        const inCol = f.inserted && insert;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (inCol ? g.xs[insert.c] : xOf(f.c)) + 1,
              top: g.rowTop(f.r) + 1,
              width: (inCol ? insert.width : g.widths[f.c]) - 2,
              height: g.rowH - 2,
              background: f.color,
              opacity: fp,
            }}
          />
        );
      })}
      {/* Values. */}
      {values.map((row, i) =>
        row.map((v, c) => {
          const r = g.firstRow + i;
          const swap = swaps.find((s) => s.r === r && s.c === c && frame >= s.at);
          const text = swap ? swap.value : v;
          if (text === null || text === "") return null;
          const vp = ease(frame, cellAt ? cellAt(r, c) : at, 10);
          if (vp <= 0) return null;
          const side = align?.(r, c) ?? (NUMERIC.test(text) ? "right" : "left");
          return (
            <div
              key={`${r}-${c}`}
              style={{
                ...cellStyle(xOf(c), g.widths[c], g.rowTop(r)),
                justifyContent: side === "right" ? "flex-end" : "flex-start",
                fontFamily: SANS,
                fontSize: size,
                fontWeight: bold?.(r, c) ? 650 : 450,
                color: swap?.color ?? ink?.(r, c) ?? INK,
                opacity: vp * (swap ? ease(frame, swap.at, 10) : 1),
                // Tabular figures only on a number: over "P-101" or a date
                // they set the hyphen a digit wide.
                ...(NUMERIC.test(text) ? TABULAR : {}),
              }}
            >
              {text}
            </div>
          );
        }),
      )}
      {insert && ins > 0
        ? insert.values.map((v, i) => (
            <div
              key={`ins-${i}`}
              style={{
                ...cellStyle(g.xs[insert.c], insert.width, g.rowTop(g.firstRow + i)),
                fontFamily: SANS,
                fontSize: size,
                fontWeight: i === 0 ? 650 : 450,
                color: INK,
                // A replayed insert takes its values with it as it closes.
                opacity: ease(frame, insert.at + 10 + i * 2, 10) * ins,
              }}
            >
              {v}
            </div>
          ))
        : null}
    </div>
  );
};

/**
 * The colored outline Excel draws around a range a formula reads, from row
 * r0 to r1 and column c0 to c1 (inclusive), traced on `at`. `insert` keeps it
 * on the same cells when a column opens to its left.
 */
export const RangeBox: React.FC<{
  g: SheetGeometry;
  r0: number;
  r1: number;
  c0: number;
  c1: number;
  at: number;
  out?: number;
  color?: string;
  dash?: boolean;
  shiftAt?: InsertTiming & { c: number; width: number };
}> = ({ g, r0, r1, c0, c1, at: from, out, color = ds("blue", 500), dash, shiftAt }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const ins = shiftAt ? insertOpen(frame, shiftAt) : 0;
  const sx = (c: number) => g.xs[c] + (shiftAt && c >= shiftAt.c ? shiftAt.width * ins : 0);
  const x0 = sx(c0) + 1;
  const x1 = sx(c1) + g.widths[c1] - 1;
  const y0 = g.rowTop(r0) + 1;
  const y1 = g.rowTop(r1) + g.rowH - 1;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <rect
        x={x0}
        y={y0}
        width={x1 - x0}
        height={y1 - y0}
        fill="none"
        stroke={color}
        strokeWidth={3}
        pathLength={dash ? undefined : 1}
        strokeDasharray={dash ? "8 6" : `${p} 1`}
        opacity={dash ? p : 1}
      />
    </svg>
  );
};

/** The ink a formula's parts take: a reference in blue, a string in green, a
 *  function name in the ink, and everything else soft. */
const TOKEN = /("[^"]*")|(\$?[A-Z]{1,2}\$?\d+(?::\$?[A-Z]{1,2}\$?\d+)?)|([A-Z][A-Z.]*(?=\())|([A-Za-z_]\w*)|(\d+(?:\.\d+)?)|(\s+)|(.)/g;

export type FormulaMark = { text: string; color: string; at?: number };

/** One formula, colored the way the formula bar colors it. A mark lays its
 *  color under every token that reads exactly its text, from `at` if given. */
export const FormulaText: React.FC<{ formula: string; upto?: number; size?: number; marks?: readonly FormulaMark[] }> = ({
  formula,
  upto,
  size,
  marks = [],
}) => {
  const frame = useCurrentFrame();
  const shown = upto === undefined ? formula : formula.slice(0, Math.max(0, Math.floor(upto)));
  const parts: { text: string; color: string; weight: number; bg?: string }[] = [];
  for (const m of shown.matchAll(TOKEN)) {
    const [text, str, ref, fn, name, number] = m;
    const mark = marks.find((k) => k.text === text);
    const mp = mark === undefined ? 0 : mark.at === undefined ? 1 : ease(frame, mark.at, 10);
    const bg = mark && mp > 0 ? (mp >= 1 ? mark.color : `color-mix(in srgb, ${mark.color} ${Math.round(mp * 100)}%, transparent)`) : undefined;
    if (str) parts.push({ text, color: inkOf.green, weight: 500, bg });
    else if (ref) parts.push({ text, color: BLUE_INK, weight: 600, bg });
    else if (fn) parts.push({ text, color: INK, weight: 700, bg });
    else if (name) parts.push({ text, color: inkOf.purple, weight: 600, bg });
    else if (number) parts.push({ text, color: inkOf.orange, weight: 500, bg });
    else parts.push({ text, color: INK_SOFT, weight: 500 });
  }
  return (
    <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
      {parts.map((t, i) => (
        <span key={i} style={{ color: t.color, fontWeight: t.weight, background: t.bg, borderRadius: 3 }}>
          {t.text}
        </span>
      ))}
    </span>
  );
};

/**
 * A formula bar: the cell's name, "fx", and the formula typed in from `at`,
 * then, on `resultAt`, an arrow and what the cell shows, in the right
 * answer's green, the trap's red, or the ink. `rewrite` changes the formula
 * in place, as Excel does to a range when a column opens inside it, and can
 * change what the cell shows on its own cue.
 */
export const FormulaBar: React.FC<{
  x: number;
  top: number;
  width: number;
  cell?: string;
  formula: string;
  at: number;
  /** Frames to type the whole formula. */
  typeDur?: number;
  result?: string;
  resultAt?: number;
  tone?: "ok" | "bad" | "plain";
  marks?: readonly FormulaMark[];
  rewrite?: { at: number; formula: string; marks?: readonly FormulaMark[]; result?: string; resultAt?: number; tone?: "ok" | "bad" | "plain" };
  size?: number;
  dim?: number;
  out?: number;
}> = ({ x, top, width, cell, formula, at: from, typeDur, result, resultAt, tone = "plain", marks, rewrite, size = 22, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from - 4, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const dur = typeDur ?? Math.min(30, Math.max(10, formula.length * 0.5));
  const typed = Math.min(formula.length, ((frame - from) / dur) * formula.length);
  const h = Math.round(size * 2);
  const ink = (t: "ok" | "bad" | "plain") => (t === "ok" ? inkOf.green : t === "bad" ? ACCENT_INK : INK);
  const rw = rewrite ? ease(frame, rewrite.at, 8) : 0;
  // What the cell shows: the first result, then the rewrite's, each faded in on its own cue.
  const late = rewrite?.result !== undefined && rewrite.resultAt !== undefined ? ease(frame, rewrite.resultAt, 12) : 0;
  const results = [
    { text: result, on: resultAt === undefined ? 0 : ease(frame, resultAt, 12) * (1 - late), tone },
    { text: rewrite?.result, on: late, tone: rewrite?.tone ?? tone },
  ].filter((r) => r.text !== undefined && r.on > 0);
  const layer: React.CSSProperties = { gridArea: "1 / 1", whiteSpace: "nowrap" };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width,
        height: h,
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxSizing: "border-box",
        border: `1.5px solid ${HAIRLINE}`,
        borderRadius: 6,
        background: PAPER,
        padding: "0 14px",
        opacity: p * (1 - d) * (1 - o),
      }}
    >
      {cell ? <span style={{ ...label(19, INK_SOFT), minWidth: 34 }}>{cell}</span> : null}
      <span style={{ fontFamily: SANS, fontStyle: "italic", fontSize: Math.max(19, size * 0.85), color: INK_SOFT, fontWeight: 600 }}>fx</span>
      <span style={{ flex: "0 1 auto", overflow: "hidden", display: "grid" }}>
        <span style={{ ...layer, opacity: 1 - rw }}>
          <FormulaText formula={formula} upto={typed} size={size} marks={marks} />
        </span>
        {rewrite && rw > 0 ? (
          <span style={{ ...layer, opacity: rw }}>
            <FormulaText formula={rewrite.formula} size={size} marks={rewrite.marks ?? marks} />
          </span>
        ) : null}
      </span>
      {results.length ? (
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <span style={{ fontFamily: SANS, fontSize: size, color: INK_SOFT, opacity: Math.max(...results.map((r) => r.on)) }}>→</span>
          <span style={{ display: "grid", justifyItems: "end" }}>
            {results.map((r, i) => (
              <span
                key={i}
                style={{
                  ...layer,
                  opacity: r.on,
                  fontFamily: SANS,
                  fontSize: size * 1.05,
                  fontWeight: 700,
                  color: ink(r.tone),
                  ...(NUMERIC.test(String(r.text)) ? TABULAR : {}),
                }}
              >
                {r.text}
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </div>
  );
};

/** The height of a formula bar at `size`. */
export const barHeight = (size = 22) => Math.round(size * 2);

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
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
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
