import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { Ink } from "../../editorial/ui";
import { BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The result tables, headings and marks are the Data Analyst SQL videos'
 * (da-sql/parts.tsx, and the column helpers from da-advanced-sql/parts.tsx),
 * as ds-sql does, so the series' SQL videos look like one family. What is
 * local: a listing whose tokenizer knows the DDL and EXPLAIN keywords this
 * video prints (da-sql's sets CREATE, INDEX and EXPLAIN as plain names), a
 * query plan printed under psql's "QUERY PLAN" header, the table drawn as a
 * thousand squares or as its run of pages, a labelled bar, and the spot.
 */
export {
  DataTable,
  Drift,
  Headline,
  KeyArrow,
  Kicker,
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
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";

/** A mark's red, a trap or the wrong answer, as a band under text. */
const BAD = `color-mix(in srgb, ${ds("red", 500)} 26%, transparent)`;

/**
 * The index of the line that holds `text`. A highlight finds its line by
 * what the line says, never by a number, so a reworded query or a changed
 * plan fails the render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

// ── SQL ──────────────────────────────────────────────────────────────────────

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT ALL CASE WHEN " +
    "THEN ELSE END DESC ASC OVER PARTITION DATE INTERVAL EXPLAIN ANALYZE CREATE INDEX INCLUDE CLUSTER USING " +
    "MATERIALIZED VIEW REFRESH INSERT INTO VALUES EXTRACT MONTH TABLE RANGE FOR OF TO"
  ).split(" "),
);
const TABLES = new Set(["orders", "customers", "employees", "daily_revenue", "dept_avgs"]);

type Token = { text: string; color: string; weight?: number };
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, str, num, word] = m;
    if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 700 });
    else if (word && TABLES.has(word)) out.push({ text, color: INK, weight: 600 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

const Code: React.FC<{ line: string; size: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const geometry = (size: number) => ({ lineH: Math.round(size * 1.8), padY: Math.round(size * 0.66), padX: Math.round(size * 0.8) });

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = geometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** A highlight on one line, found by text; `text` narrows it to a span. */
export type LineMark = { line: string; text?: string; at: number; out?: number; color?: string };

/** The band a mark draws: the whole line from its indent, or one span. */
const Band: React.FC<{ lines: readonly string[]; mark: LineMark; size: number; padX: number; padY: number; lineH: number }> = ({
  lines,
  mark,
  size,
  padX,
  padY,
  lineH,
}) => {
  const frame = useCurrentFrame();
  const w = ease(frame, mark.at, 12);
  const o = mark.out === undefined ? 0 : ease(frame, mark.out, 10);
  if (w <= 0 || o >= 1) return null;
  const i = lineOf(lines, mark.line);
  const line = lines[i];
  const start = mark.text === undefined ? line.length - line.trimStart().length : line.indexOf(mark.text);
  if (start < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(mark.text)}`);
  const chars = mark.text === undefined ? line.length - start : mark.text.length;
  // A mono character is 0.6em.
  return (
    <div
      style={{
        position: "absolute",
        left: padX - size * 0.2 + start * 0.6 * size,
        top: padY + i * lineH + lineH * 0.12,
        height: lineH * 0.76,
        width: (chars * 0.6 + 0.4) * size * w,
        background: mark.color ?? HIGHLIGHT,
        opacity: 1 - o,
      }}
    />
  );
};

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, each line inking in on its own cue (da-sql's Listing, with this
 * video's keywords).
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt?: readonly number[];
  marks?: readonly LineMark[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 22, at, lineAt, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = geometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: listingHeight(lines.length, size), opacity: (1 - d) * (1 - o) }}>
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
      {marks.map((m, k) => (
        <Band key={k} lines={lines} mark={m} size={size} {...g} />
      ))}
      {lines.map((line, i) => (
        <Ink key={i} at={lineAt?.[i] ?? at + 4 + i * 3} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

// ── Query plans ──────────────────────────────────────────────────────────────

/** A plan node's name: what a line says before " on ", " using " or its
 *  first parenthesis, after the "->" that nests it. */
const NODE = /^(\s*(?:->\s+)?)([A-Z][A-Za-z ]*?)(?=\s+on\s|\s+using\s|\s*\(|$)/;

/** One plan line: a node's name in ink, the rest soft, a detail's key soft
 *  and its value in ink. */
const PlanText: React.FC<{ line: string; size: number }> = ({ line, size }) => {
  const node = line.match(NODE);
  const detail = line.match(/^(\s*)([A-Za-z ]+:)(.*)$/);
  const base: React.CSSProperties = { fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", color: INK_SOFT };
  if (detail && !line.includes("->")) {
    return (
      <span style={base}>
        {detail[1]}
        {detail[2]}
        <span style={{ color: INK }}>{detail[3]}</span>
      </span>
    );
  }
  if (node && node[2].trim()) {
    return (
      <span style={base}>
        {node[1]}
        <span style={{ color: INK, fontWeight: 700 }}>{node[2]}</span>
        {line.slice(node[0].length)}
      </span>
    );
  }
  return <span style={base}>{line}</span>;
};

const PLAN_HEAD = 1.7;

/** A plan's full height: its "QUERY PLAN" header and its lines. */
export const planHeight = (lines: number, size: number) => Math.round(size * PLAN_HEAD) + listingHeight(lines, size) - 2 * geometry(size).padY + Math.round(size * 0.5);

/**
 * A query plan as psql prints it: the "QUERY PLAN" column title over a
 * hairline, then the plan, a line at a time, under a rule like a result
 * table's. Marks find their line (and span) by text.
 */
export const PlanBox: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  step?: number;
  marks?: readonly LineMark[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 20, at, step = 3, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = geometry(size);
  const head = Math.round(size * PLAN_HEAD);
  const p = ease(frame, at, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const bodyTop = head;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: planHeight(lines.length, size), opacity: (1 - d) * (1 - o) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: 0, top: head - 1, width: width * p, height: 1, background: HAIRLINE }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: width * p,
          height: 1.5,
          background: INK,
        }}
      />
      <Ink at={at + 2} dur={12} style={{ left: g.padX, top: 0, height: head, display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, color: INK_SOFT }}>QUERY PLAN</span>
      </Ink>
      <div style={{ position: "absolute", left: 0, top: bodyTop - g.padY + Math.round(size * 0.25), right: 0, bottom: 0 }}>
        {marks.map((m, k) => (
          <Band key={k} lines={lines} mark={m} size={size} {...g} />
        ))}
        {lines.map((line, i) => (
          <Ink key={i} at={at + 4 + i * step} dur={12} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
            <PlanText line={line} size={size} />
          </Ink>
        ))}
      </div>
    </div>
  );
};

/** A mark's red band, for a plan line or span that is the trap. */
export const MARK_RED = BAD;

// ── The table, drawn ─────────────────────────────────────────────────────────

/**
 * A table of a million rows as a grid of squares, each a thousand of them,
 * in row order. The squares ink in from `at`; a scan sweeps through them
 * from `sweep.from` to `sweep.to`, each square tinting as it is read; `hits`
 * (square indices) light on `hitAt`.
 */
export const RowGrid: React.FC<{
  x: number;
  top: number;
  cols?: number;
  rows?: number;
  cell?: number;
  gap?: number;
  at: number;
  sweep?: { from: number; to: number; out?: number };
  hits?: readonly number[];
  hitAt?: number;
  hitOut?: number;
  dim?: number;
  out?: number;
}> = ({ x, top, cols = 50, rows = 20, cell = 15, gap = 3, at, sweep, hits = [], hitAt, hitOut, dim, out }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (frame < at || o >= 1) return null;
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const n = cols * rows;
  // The fill sweeps in row by row over 30 frames.
  const filled = ease(frame, at, 30) * n;
  const scanned = sweep ? ease(frame, sweep.from, sweep.to - sweep.from) * n : 0;
  const scanOut = sweep?.out === undefined ? 0 : ease(frame, sweep.out, 14);
  const hitSet = new Set(hits);
  const hitP = hitAt === undefined ? 0 : ease(frame, hitAt, 12) * (hitOut === undefined ? 1 : 1 - ease(frame, hitOut, 12));
  const pitch = cell + gap;
  return (
    <svg width={cols * pitch} height={rows * pitch} style={{ position: "absolute", left: x, top, overflow: "visible", opacity: (1 - d) * (1 - o) }}>
      {Array.from({ length: n }, (_, i) => {
        if (i >= filled) return null;
        const cx = (i % cols) * pitch;
        const cy = Math.floor(i / cols) * pitch;
        const read = i < scanned ? 1 - scanOut : 0;
        const hit = hitSet.has(i) ? hitP : 0;
        const fill = hit > 0 ? `color-mix(in srgb, ${ds("yellow", 500)} ${hit * 100}%, ${BAR})` : read > 0 ? `color-mix(in srgb, ${BAR} ${30 + 45 * read}%, ${PAPER})` : `color-mix(in srgb, ${BAR} 30%, ${PAPER})`;
        return <rect key={i} x={cx} y={cy} width={cell} height={cell} rx={2} fill={fill} />;
      })}
      {/* The scan's front: a line across the row being read. */}
      {sweep && scanned > 0 && scanned < n ? (
        <rect x={-6} y={Math.floor(scanned / cols) * pitch - 2} width={cols * pitch + 9} height={cell + 4} rx={3} fill="none" stroke={inkOf.yellow} strokeWidth={2.5} />
      ) : null}
    </svg>
  );
};

/**
 * A table as its run of pages, first to last, a thin band with a tick on
 * each page that holds a row the narration names. Ticks ink in on `at`; with
 * `moveTo`, they glide together onto one page.
 */
export const PageStrip: React.FC<{
  x: number;
  y: number;
  width: number;
  pages: number;
  at: number;
  ticks?: readonly { pages: readonly number[]; at: number; out?: number; color?: string; moveTo?: { page: number; at: number } }[];
  sweep?: { from: number; to: number; out?: number };
  out?: number;
  height?: number;
}> = ({ x, y, width, pages, at, ticks = [], sweep, out, height = 46 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  const px = (page: number) => x + ((page + 0.5) / pages) * width;
  const scanned = sweep ? ease(frame, sweep.from, sweep.to - sweep.from) : 0;
  const scanOut = sweep?.out === undefined ? 0 : ease(frame, sweep.out, 12);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <rect x={x} y={y} width={width * p} height={height} fill={`color-mix(in srgb, ${BAR} 14%, ${PAPER})`} stroke={`color-mix(in srgb, ${BAR} 45%, ${PAPER})`} strokeWidth={1.5} />
      {scanned > 0 && scanOut < 1 ? <rect x={x} y={y} width={width * scanned} height={height} fill={`color-mix(in srgb, ${BAR} 45%, ${PAPER})`} opacity={1 - scanOut} /> : null}
      {ticks.map((t, k) => {
        const tp = ease(frame, t.at, 12) * (t.out === undefined ? 1 : 1 - ease(frame, t.out, 10));
        if (tp <= 0) return null;
        const m = t.moveTo === undefined ? 0 : ease(frame, t.moveTo.at, 24);
        return t.pages.map((page, i) => {
          const tx = px(page) + (t.moveTo === undefined ? 0 : (px(t.moveTo.page) - px(page)) * m);
          return <rect key={`${k}-${i}`} x={tx - 2.5} y={y - 8} width={5} height={(height + 16) * tp} rx={1.5} fill={t.color ?? inkOf.yellow} />;
        });
      })}
    </svg>
  );
};

/**
 * A labelled horizontal bar: the label above, the bar growing from `at` to
 * its share of `max`, the value at its end.
 */
export const Bar: React.FC<{
  x: number;
  y: number;
  width: number;
  value: number;
  max: number;
  at: number;
  label: React.ReactNode;
  shown: React.ReactNode;
  color?: string;
  ink?: string;
  out?: number;
}> = ({ x, y, width, value, max, at, label: text, shown, color = BAR, ink = BLUE_INK, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 20);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const w = (value / max) * width * p;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) * (1 - o) }}>
      <div style={{ ...note(22, INK), whiteSpace: "nowrap" }}>{text}</div>
      <div style={{ position: "relative", marginTop: 10, height: 30, display: "flex", alignItems: "center" }}>
        <div style={{ width: w, height: 30, background: color, borderRadius: 3 }} />
        <span style={{ ...label(24, ink), ...TABULAR, marginLeft: 14, whiteSpace: "nowrap", opacity: ease(frame, at + 12, 10) }}>{shown}</span>
      </div>
    </div>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

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
}> = ({ id, at, out, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
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
