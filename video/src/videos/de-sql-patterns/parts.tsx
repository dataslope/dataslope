import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { useLayout } from "../../editorial/layout";
import { BAR, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The SQL listing, DuckDB's error box and the result tables are the Data
 * Analyst SQL videos' (da-sql/parts.tsx, and the column, geometry and frame
 * helpers from da-advanced-sql/parts.tsx), re-exported the way
 * ds-sql/parts.tsx does, so the three series' SQL videos look like one
 * family. What is local: `lineOf` and `Spot` (after ds-sql), and the strip
 * of days that the opening, the moving average and the spine share.
 */
export {
  DataTable,
  Drift,
  ElbowArrow,
  ErrorBox,
  Headline,
  KEY_INK,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  Mono,
  NoRows,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  TableName,
  tableGeometry,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, RowBracket, rowsAt, type FrameStep } from "../da-advanced-sql/parts";

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, not by a number (the Data Scientist review found
 * four index-based highlights one line off their clause). A query reworded so
 * the text is gone fails the render instead.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** A watercolor spot: it pops in on `at`, bobs gently, and fades on `out`. */
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

// ── A strip of days ─────────────────────────────────────────────────────────

/** One day of the strip: present (a row exists) or missing. */
export type StripDay = {
  /** "2024-01-07". */
  date: string;
  present: boolean;
  /** Printed in the cell, if the strip carries values. */
  value?: string;
};

/** Text that replaces a cell's own on a cue: a missing day's null, then 0. */
export type StripFill = { index: number; at: number; text: string; color: string; italic?: boolean };
/** A tint over a cell, on a cue (MARK, MARK_BAD, MARK_OK). */
export type StripMark = { index: number; at: number; out?: number; color: string };
/** A span of days, drawn as a bracket under the strip with its label below. */
export type StripSpan = { from: number; to: number; at: number; out?: number; color: string; ink?: string; label: React.ReactNode };

export type StripGeometry = ReturnType<typeof stripGeometry>;

/** Where a strip's cells fall: `top` is a page position (through `y()`). */
export const stripGeometry = (x: number, top: number, n: number, cell = 92, gap = 10, cellH = 74) => ({
  x,
  top,
  n,
  cell,
  gap,
  cellH,
  left: (i: number) => x + i * (cell + gap),
  right: (i: number) => x + i * (cell + gap) + cell,
  mid: (i: number) => x + i * (cell + gap) + cell / 2,
  width: n * cell + (n - 1) * gap,
  /** Below the day numbers: where a span's bracket starts. */
  under: top + cellH + 46,
});

/**
 * The days of one stretch of the calendar as a row of cells: a day with a
 * row is a filled cell (with its value, if the strip has values), a day with
 * none is an empty dashed one. Day numbers sit under the cells, "Jan" before
 * the first. Cells ink in one after another from `at`; `fills` write into a
 * missing cell on their cue (null, then 0 once the spine fills it), `marks`
 * tint a cell, `rings` circle one, and `spans` bracket a run of days under
 * the numbers, their label beneath the bracket so no line crosses it.
 */
export const DayStrip: React.FC<{
  g: StripGeometry;
  days: readonly StripDay[];
  at: number;
  step?: number;
  out?: number;
  fills?: readonly StripFill[];
  marks?: readonly StripMark[];
  spans?: readonly StripSpan[];
  /** Missing cells take a solid fill from this frame (a spine has filled them). */
  solidAt?: number;
  valueSize?: number;
}> = ({ g, days, at, step = 2, out, fills = [], marks = [], spans = [], solidAt, valueSize = 26 }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const gone = out === undefined ? 0 : ease(frame, out, 10);
  if (gone >= 1 || frame < at) return null;
  const solid = solidAt === undefined ? 0 : ease(frame, solidAt, 14);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - gone }}>
      {days.map((d, i) => {
        const p = ease(frame, at + i * step, 10);
        if (p <= 0) return null;
        const fill = [...fills].filter((f) => f.index === i && frame >= f.at).pop();
        const fillP = fill ? ease(frame, fill.at, 10) : 0;
        const filled = d.present ? 1 : solid;
        const tints = marks.filter((m) => m.index === i);
        return (
          <React.Fragment key={d.date}>
            <div
              style={{
                position: "absolute",
                left: g.left(i),
                top: g.top,
                width: g.cell,
                height: g.cellH,
                boxSizing: "border-box",
                borderRadius: 8,
                border: `2.5px ${d.present || solid > 0.5 ? "solid" : "dashed"} ${d.present || solid > 0.5 ? BAR : INK_SOFT}`,
                background: `color-mix(in srgb, ${BAR} ${18 * filled}%, ${PAPER})`,
                opacity: p,
                transform: `scale(${0.85 + 0.15 * p})`,
                overflow: "hidden",
              }}
            >
              {tints.map((m, k) => {
                const w = ease(frame, m.at, 12) * (m.out === undefined ? 1 : 1 - ease(frame, m.out, 10));
                return w > 0 ? <div key={k} style={{ position: "absolute", inset: 0, background: m.color, opacity: w }} /> : null;
              })}
              {d.value !== undefined && !fill ? <CellText text={d.value} size={valueSize} color={INK} /> : null}
              {fill ? (
                <div style={{ position: "absolute", inset: 0, opacity: fillP }}>
                  <CellText text={fill.text} size={valueSize} color={fill.color} italic={fill.italic} />
                </div>
              ) : null}
            </div>
            <div
              style={{
                position: "absolute",
                left: g.left(i),
                top: g.top + g.cellH + h(8),
                width: g.cell,
                textAlign: "center",
                ...label(20, INK_SOFT),
                fontVariantNumeric: "tabular-nums",
                opacity: p,
              }}
            >
              {i === 0 ? "Jan " : ""}
              {Number(d.date.slice(8))}
            </div>
          </React.Fragment>
        );
      })}
      {spans.map((s, k) => (
        <Span key={k} g={g} span={s} />
      ))}
    </div>
  );
};

const CellText: React.FC<{ text: string; size: number; color: string; italic?: boolean }> = ({ text, size, color, italic }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: MONO,
      fontSize: size,
      fontWeight: 600,
      fontStyle: italic ? "italic" : undefined,
      color,
      fontVariantLigatures: "none",
    }}
  >
    {text}
  </div>
);

/** A span's bracket under the day numbers, drawn from the left, its label
 *  centred beneath it. */
const Span: React.FC<{ g: StripGeometry; span: StripSpan }> = ({ g, span }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const p = ease(frame, span.at, 14);
  const o = span.out === undefined ? 0 : ease(frame, span.out, 10);
  if (p <= 0 || o >= 1) return null;
  const x0 = g.left(span.from) + 4;
  const x1 = g.right(span.to) - 4;
  const y = g.under;
  const tick = h(12);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={`M${x0},${y - tick} L${x0},${y} L${x1},${y} L${x1},${y - tick}`}
          fill="none"
          stroke={span.color}
          strokeWidth={3}
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${p} 1`}
        />
      </svg>
      <Ink at={span.at + 6} dur={12} style={{ left: x0, top: y + h(10), width: x1 - x0, textAlign: "center", whiteSpace: "nowrap" }}>
        <span style={{ ...note(22, span.ink ?? INK), fontWeight: 650 }}>{span.label}</span>
      </Ink>
    </div>
  );
};

/** The strip's days from a list of present dates, first to last day. */
export const daysBetween = (first: string, last: string, values: ReadonlyMap<string, string> | readonly string[]): StripDay[] => {
  const present = Array.isArray(values) ? new Map(values.map((d) => [d, ""])) : (values as ReadonlyMap<string, string>);
  const out: StripDay[] = [];
  for (let t = Date.parse(`${first}T00:00:00Z`); t <= Date.parse(`${last}T00:00:00Z`); t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10);
    const v = present.get(date);
    out.push({ date, present: v !== undefined, value: v === "" ? undefined : v });
  }
  return out;
};
