import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The result tables, headings, highlighter and
 * strike are the Data Analyst SQL videos' (da-sql/parts.tsx), re-exported as
 * de-sql-performance does, so the series' SQL videos look like one family.
 *
 * What is local: the listing and the query plan, copied from
 * de-sql-performance/parts.tsx with this video's keywords (its tokenizer
 * sets BEGIN, COMMIT, ROLLBACK, UPDATE, SET, RETURNING, NOWAIT, BETWEEN and
 * LIMIT as plain names); Postgres's error box (da-sql's prints DuckDB's
 * "Kind: message"); the boxes and arrows the mechanisms are drawn with
 * (de-pipelines/parts.tsx); a labelled bar; and the spot art, bound to this
 * video.
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
  MARK_OK,
  Mono,
  pulse,
  Strike,
  Svg,
  TableName,
  tableGeometry,
  Tag,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * Code inside a line of small type: the interview kit's QMono, never under
 * 19px.
 */
export const SmallMono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.84em)", fontStyle: "normal", fontWeight: 600, fontVariantLigatures: "none", wordSpacing: "-0.3em", color }}>
    {children}
  </span>
);

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

/** A mark's red band: the trap or the error. */
export const MARK_RED = `color-mix(in srgb, ${ds("red", 500)} 26%, transparent)`;
/** A mark's green band: the right answer. */
export const MARK_GREEN = `color-mix(in srgb, ${OK} 24%, transparent)`;

// ── SQL ──────────────────────────────────────────────────────────────────────

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT ALL CASE WHEN " +
    "THEN ELSE END DESC ASC DATE EXPLAIN ANALYZE CREATE INDEX INCLUDE USING INSERT INTO VALUES TABLE FOR " +
    "UPDATE SET RETURNING NOWAIT BEGIN COMMIT ROLLBACK PREPARE TRANSACTION BETWEEN LIMIT SHOW"
  ).split(" "),
);
const TABLES = new Set(["orders", "customers", "order_items", "items", "users", "accounts", "transfers"]);

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

/** The vertical middle of a listing's line `i`, in page pixels. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = geometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/** The x of character `col` of a listing line, in page pixels (a mono
 *  character is 0.6em). */
export const listingCharX = (x: number, col: number, size: number) => x + geometry(size).padX + col * 0.6 * size;

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
 * video's keywords). Marks find their line (and span) by text.
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
      {lines.map((line, i) =>
        frame >= (lineAt?.[i] ?? at + 4 + i * 3) - 1 ? (
          <Ink key={i} at={lineAt?.[i] ?? at + 4 + i * 3} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
            <Code line={line} size={size} />
          </Ink>
        ) : null,
      )}
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

/** Where a plan's body starts, below its "QUERY PLAN" header. */
const planBodyTop = (size: number) => Math.round(size * PLAN_HEAD) - geometry(size).padY + Math.round(size * 0.25);

/** A plan's full height: its "QUERY PLAN" header and its lines. */
export const planHeight = (lines: number, size: number) => Math.round(size * PLAN_HEAD) + listingHeight(lines, size) - 2 * geometry(size).padY + Math.round(size * 0.5);

/** The vertical middle of a plan's line `i`, in page pixels. */
export const planLineMid = (top: number, i: number, size: number) => {
  const g = geometry(size);
  return top + planBodyTop(size) + g.padY + i * g.lineH + g.lineH / 2;
};

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
  return (
    <div style={{ position: "absolute", left: x, top, width, height: planHeight(lines.length, size), opacity: (1 - d) * (1 - o) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: width * p, height: 2, background: INK }} />
      <div style={{ position: "absolute", left: 0, top: head - 1, width: width * p, height: 1, background: HAIRLINE }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: width * p, height: 1.5, background: INK }} />
      <Ink at={at + 2} dur={12} style={{ left: g.padX, top: 0, height: head, display: "flex", alignItems: "center" }}>
        <span style={{ fontFamily: MONO, fontSize: size, fontWeight: 600, color: INK_SOFT }}>QUERY PLAN</span>
      </Ink>
      <div style={{ position: "absolute", left: 0, top: planBodyTop(size), right: 0, bottom: 0 }}>
        {marks.map((m, k) => (
          <Band key={k} lines={lines} mark={m} size={size} {...g} />
        ))}
        {lines.map((line, i) =>
          frame >= at + 3 + i * step ? (
            <Ink key={i} at={at + 4 + i * step} dur={12} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
              <PlanText line={line} size={size} />
            </Ink>
          ) : null,
        )}
      </div>
    </div>
  );
};

/**
 * An error as Postgres prints it, "ERROR:" and the message, on a red-ruled
 * tint, wrapping within `width`.
 */
export const PgError: React.FC<{
  x: number;
  top: number;
  width: number;
  at: number;
  message: string;
  size?: number;
  dim?: number;
  out?: number;
}> = ({ x, top, width, at, message, size = 20, dim, out }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const text = message.replace(/^ERROR:\s*/, "");
  return (
    <Ink at={at} dur={16} out={out} style={{ left: x, top, width, opacity: 1 - d }}>
      <div
        style={{
          borderLeft: `4px solid ${ACCENT}`,
          background: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`,
          padding: "12px 18px 14px",
          fontFamily: MONO,
          fontSize: size,
          lineHeight: 1.45,
          whiteSpace: "pre-wrap",
          color: INK,
          fontVariantLigatures: "none",
        }}
      >
        <span style={{ color: ACCENT_INK, fontWeight: 700 }}>ERROR:</span> {text}
      </div>
    </Ink>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** What a box is: data (blue), the right answer (green), the trap (red),
 *  what the narration points at (yellow), or plain ink. */
export type Tone = "data" | "ok" | "bad" | "plain" | "look" | "off";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  plain: { line: INK, fill: PAPER, ink: INK },
  look: { line: inkOf.yellow, fill: `color-mix(in srgb, ${ds("yellow", 400)} 30%, ${PAPER})`, ink: INK },
  off: { line: ds("gray", 400), fill: ds("gray", 50), ink: INK_SOFT },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/**
 * A rounded box that pops in on `at`, with a title and an optional line under
 * it (de-pipelines' Node). `lit` swells its border, for a box named again.
 */
export const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  lit?: number;
  dashed?: boolean;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "data", size = 24, subSize = 21, dim, out, lit = 0, dashed, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const t = TONE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${2.5 + 2 * lit}px ${dashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 12,
        background: t.fill,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "0 16px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span style={{ ...label(size, t.ink), fontWeight: 700, whiteSpace: "nowrap", textAlign: "center" }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: "center" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `dash` draws it dashed, revealed by a clip that follows the tip.
 */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
  dim?: number;
  out?: number;
  opacity?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dash, dim, out, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } = points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = Math.max(0, (len - head + 1) / len);
  const [sx, sy] = points[0];
  const [tx, ty] = points[points.length - 1];
  const across = Math.abs(tx - sx) >= Math.abs(ty - sy);
  const hide = `${(1 - p) * 100}%`;
  const clip = across
    ? tx >= sx
      ? `inset(-40px ${hide} -40px -40px)`
      : `inset(-40px -40px -40px ${hide})`
    : ty >= sy
      ? `inset(-40px -40px ${hide} -40px)`
      : `inset(${hide} -40px -40px -40px)`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      <path d={arrowHead(line, head, 8, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

/** A small rounded label on the page, in its tone's ink, that inks in. */
export const Pill: React.FC<{
  x: number;
  y: number;
  at: number;
  tone?: Tone;
  size?: number;
  out?: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "data", size = 22, out, dim, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const t = TONE[tone];
  return (
    <Ink at={at} dur={12} out={out} style={{ left: x, top: y, opacity: 1 - d }}>
      <span
        style={{
          display: "inline-block",
          padding: "5px 14px 6px",
          borderRadius: 8,
          border: `2px solid ${t.line}`,
          background: t.fill,
          ...label(size, t.ink),
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </Ink>
  );
};

/**
 * A labelled horizontal bar: the label above, the bar growing from `at` to
 * its share of `max`, the value at its end (de-sql-performance's Bar).
 * `segments` stacks several values in one bar, each its own color.
 */
export const Bar: React.FC<{
  x: number;
  y: number;
  width: number;
  max: number;
  at: number;
  label: React.ReactNode;
  shown: React.ReactNode;
  segments: readonly { value: number; color: string; at?: number }[];
  ink?: string;
  dim?: number;
  out?: number;
}> = ({ x, y, width, max, at, label: text, shown, segments, ink = BLUE_INK, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 20);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const end = segments.reduce((s, seg) => s + (seg.value / max) * width * ease(frame, seg.at ?? at, 20), 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) * (1 - o) * (1 - d) }}>
      <div style={{ ...note(22, INK), whiteSpace: "nowrap" }}>{text}</div>
      <div style={{ position: "relative", marginTop: 10, height: 30, display: "flex", alignItems: "center" }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            style={{
              width: (seg.value / max) * width * ease(frame, seg.at ?? at, 20),
              height: 30,
              background: seg.color,
              borderRadius: 3,
              marginRight: i < segments.length - 1 ? 3 : 0,
            }}
          />
        ))}
        <span style={{ ...label(24, ink), ...TABULAR, marginLeft: 14, whiteSpace: "nowrap", opacity: ease(frame, at + 12, 10), position: "absolute", left: end + segments.length * 3 }}>
          {shown}
        </span>
      </div>
    </div>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/be-databases/),
 *  so a spot is drawn at its own aspect and at most half its pixels across
 *  on the 1080p layout (a 4K render doubles it). */
export const ART = {
  chipmunk: { id: "be-databases-chipmunk", w: 1227, h: 1024 },
  phoneBook: { id: "be-databases-phone-book", w: 1024, h: 745 },
  coins: { id: "be-databases-coins", w: 896, h: 895 },
} as const;
export type ArtName = keyof typeof ART;

/**
 * A watercolor from illustrations.json, `width` wide at its own aspect: it
 * pops in on `at` (with `<Sfx name="el-pop">` on the same frame, placed by
 * the scene), bobs gently, and fades on `out`.
 */
export const Spot: React.FC<{
  art: ArtName;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
}> = ({ art, at, out, dim, left, top, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = ART[art];
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={a.id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: (width * a.h) / a.w,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};

/** The height a spot `width` wide takes. */
export const spotH = (art: ArtName, width: number) => (width * ART[art].h) / ART[art].w;

/**
 * A database drawn as the usual cylinder, popping in on `at`, its name in
 * the middle (a swap to `swapTo` on `swapAt`).
 */
export const Cylinder: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  swapTo?: React.ReactNode;
  swapAt?: number;
  tone?: Tone;
  size?: number;
  dim?: number;
  out?: number;
}> = ({ x, y, w, h, at, title, swapTo, swapAt, tone = "data", size = 24, dim, out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const t = TONE[tone];
  const ry = Math.min(26, h * 0.13);
  const swap = swapAt === undefined ? 0 : ease(frame, swapAt, 12);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: Math.min(1, p) * (1 - d) * (1 - o), transform: `scale(${0.9 + 0.1 * Math.min(1, p)})` }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={`M1.5,${ry} L1.5,${h - ry} A${w / 2 - 1.5},${ry} 0 0 0 ${w - 1.5},${h - ry} L${w - 1.5},${ry}`}
          fill={t.fill}
          stroke={t.line}
          strokeWidth={2.5}
        />
        <ellipse cx={w / 2} cy={ry} rx={w / 2 - 1.5} ry={ry - 1} fill={`color-mix(in srgb, ${t.line} 22%, ${PAPER})`} stroke={t.line} strokeWidth={2.5} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: ry * 2, bottom: ry, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ ...label(size, t.ink), fontWeight: 700, whiteSpace: "nowrap", opacity: 1 - swap, position: "absolute" }}>{title}</span>
        {swapTo ? <span style={{ ...label(size, t.ink), fontWeight: 700, whiteSpace: "nowrap", opacity: swap, position: "absolute" }}>{swapTo}</span> : null}
      </div>
    </div>
  );
};

/**
 * A table drawn as its pages, `cols` x `rows` small squares in page order,
 * as two SVG patterns so seven thousand squares cost two rectangles. The
 * squares fill in from `at`; each sweep tints them page by page from
 * `from` to `to` (a scan reading them), and `lit` squares light on their
 * own cue.
 */
export const PageGrid: React.FC<{
  x: number;
  top: number;
  cols: number;
  rows: number;
  pitch?: number;
  cell?: number;
  at: number;
  sweeps?: readonly { from: number; to: number; color: string; out?: number }[];
  lit?: readonly { index: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
  id: string;
}> = ({ x, top, cols, rows, pitch = 5, cell = 4, at, sweeps = [], lit = [], dim, out, id }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 24);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const W = cols * pitch;
  const H = rows * pitch;
  const fillPattern = (key: string, color: string) => (
    <pattern key={key} id={`${id}-${key}`} width={pitch} height={pitch} patternUnits="userSpaceOnUse">
      <rect width={cell} height={cell} rx={0.8} fill={color} />
    </pattern>
  );
  // A region read in page order: the whole rows done, and part of the next.
  const swept = (share: number, fill: string, key: string) => {
    const pages = share * cols * rows;
    const full = Math.floor(pages / cols);
    const part = pages - full * cols;
    return (
      <g key={key}>
        {full > 0 ? <rect x={0} y={0} width={W} height={full * pitch} fill={fill} /> : null}
        {part > 0 && full < rows ? <rect x={0} y={full * pitch} width={Math.ceil(part) * pitch} height={pitch} fill={fill} /> : null}
      </g>
    );
  };
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: x, top, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <defs>
        {fillPattern("base", `color-mix(in srgb, ${BAR} 28%, ${PAPER})`)}
        {sweeps.map((s, k) => fillPattern(`sweep${k}`, s.color))}
      </defs>
      {swept(p, `url(#${id}-base)`, "base")}
      {sweeps.map((s, k) => {
        const share = ease(frame, s.from, s.to - s.from);
        const so = s.out === undefined ? 0 : ease(frame, s.out, 12);
        if (share <= 0 || so >= 1) return null;
        return (
          <g key={k} opacity={1 - so}>
            {swept(share, `url(#${id}-sweep${k})`, `s${k}`)}
          </g>
        );
      })}
      {sweeps.map((s, k) => {
        const share = ease(frame, s.from, s.to - s.from);
        if (share <= 0 || share >= 1) return null;
        const row = Math.min(rows - 1, Math.floor(share * rows));
        return <rect key={`front${k}`} x={-5} y={row * pitch - 3} width={W + 10} height={pitch + 6} rx={3} fill="none" stroke={inkOf.yellow} strokeWidth={2.5} />;
      })}
      {lit.map((l, k) => {
        const lp = ease(frame, l.at, 10) * (l.out === undefined ? 1 : 1 - ease(frame, l.out, 10));
        if (lp <= 0) return null;
        const cx = (l.index % cols) * pitch;
        const cy = Math.floor(l.index / cols) * pitch;
        return (
          <g key={`lit${k}`} opacity={lp}>
            <rect x={cx - 1} y={cy - 1} width={cell + 2} height={cell + 2} fill={l.color ?? inkOf.yellow} />
            <circle cx={cx + cell / 2} cy={cy + cell / 2} r={9 + 4 * (1 - lp)} fill="none" stroke={l.color ?? inkOf.yellow} strokeWidth={2.5} />
          </g>
        );
      })}
    </svg>
  );
};
