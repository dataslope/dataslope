import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, TABULAR, label, note, svgText } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { COST, fullRows, ILLUSTRATIONS, incrementalRows, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The result tables, highlighter, strike and
 * page furniture are the Data Analyst SQL videos' (da-sql/parts.tsx), and the
 * arrow and Postgres's error box are Backend Part 4's (be-databases), so the
 * series' SQL videos read as one family.
 *
 * What is local: a listing that can change a line in place (the filter's `>`
 * becoming `>=`, an overlap line opening under it) and knows dbt's Jinja
 * delimiters; an event drawn as an outlined cell (the house's diagram box:
 * 2px ink, no fill, a highlight coloring the outline and the number
 * together); the cost chart, drawn from the dbt page's model
 * (charts/incremental-vs-full-refresh.mjs, as Data Engineer Part 10 drew it);
 * and the spot art, bound to this video.
 */
export {
  DataTable,
  Drift,
  Headline,
  Kicker,
  Mark,
  MARK,
  MARK_BAD,
  MARK_OK,
  pulse,
  Strike,
  Svg,
  tableGeometry,
  TableName,
  X0,
  type Col,
  type TableGeometry,
  type TableRow,
} from "../da-sql/parts";
export { Flow, PgError, SmallMono } from "../be-databases/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the line that holds `text`. A highlight finds its line by
 * what the line says, never by a number, so a reworded listing fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/** A mark's red band: the trap or the error. */
export const MARK_RED = `color-mix(in srgb, ${ds("red", 500)} 24%, transparent)`;

// ── SQL, and dbt's Jinja around it ──────────────────────────────────────────

export const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY ORDER AS AND NOT EXISTS IN INTO INSERT VALUES MERGE USING ON WHEN MATCHED " +
    "THEN UPDATE SET CREATE TABLE DROP IF BEGIN COMMIT ROLLBACK INTERVAL HAVING DELETE"
  ).split(" "),
);
const TABLES = new Set(["raw_events", "fct_events", "dim_customer", "staged_customers", "customer_events", "batch"]);
/** dbt's own words inside a Jinja block. */
const JINJA = new Set(["if", "endif"]);
const JINJA_INK = inkOf.teal;

type Token = { text: string; color: string; weight?: number };
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\{\{|\}\}|\{%|%\})|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, jinja, str, num, word] = m;
    if (jinja) out.push({ text, color: JINJA_INK, weight: 500 });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && JINJA.has(word)) out.push({ text, color: JINJA_INK, weight: 500 });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 500 });
    else if (word && TABLES.has(word)) out.push({ text, color: INK, weight: 500 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** One line of SQL (or dbt), colored. */
export const Code: React.FC<{ line: string; size: number }> = ({ line, size }) => (
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

/** The vertical middle of a listing's line `i` (every line open), in page px. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = geometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/** The x of character `col` of a listing line, in page px (a mono
 *  character is 0.6em). */
export const listingCharX = (x: number, col: number, size: number) => x + geometry(size).padX + col * 0.6 * size;

/**
 * A listing line: its text, the texts it changes to (`swaps`, each from a
 * frame on), and `growAt` for a line that opens on that frame, pushing the
 * lines under it down.
 */
export type ListingLine = string | { text: string; swaps?: readonly { at: number; text: string }[]; growAt?: number };
const textOfLine = (l: ListingLine) => (typeof l === "string" ? l : l.text);
const versions = (l: ListingLine) => (typeof l === "string" ? [{ at: -Infinity, text: l }] : [{ at: -Infinity, text: l.text }, ...(l.swaps ?? [])]);
/** The text a line shows at `frame`. */
const shownText = (l: ListingLine, frame: number) => {
  const v = versions(l);
  let t = v[0].text;
  for (const s of v) if (frame >= s.at) t = s.text;
  return t;
};

/** A highlight on one line, found by text (in any of the line's versions);
 *  `text` narrows it to a span of what the line shows when the mark starts. */
export type LineMark = { line: string; text?: string; at: number; out?: number; color?: string };

const findLine = (lines: readonly ListingLine[], text: string) => {
  const i = lines.findIndex((l) => versions(l).some((v) => v.text.includes(text)));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/**
 * A printed listing: tinted paper between a rule above and a hairline below,
 * each line inking in after `at`. A line can change in place (`swaps`) or
 * open between two others (`growAt`); marks find their line and span by text;
 * `dims` sets lines back (a branch that does not run).
 */
export const SqlListing: React.FC<{
  lines: readonly ListingLine[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  step?: number;
  marks?: readonly LineMark[];
  dims?: readonly { line: string; at: number; out?: number }[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 20, at, step = 3, marks = [], dims = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = geometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const open = lines.map((l) => (typeof l !== "string" && l.growAt !== undefined ? ease(frame, l.growAt, 14) : 1));
  const tops = open.map((_, i) => g.padY + open.slice(0, i).reduce((s, v) => s + v * g.lineH, 0));
  const height = g.padY * 2 + open.reduce((s, v) => s + v * g.lineH, 0);
  return (
    <div style={{ position: "absolute", left: x, top, width, height, opacity: (1 - d) * (1 - o) }}>
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
      {marks.map((m, k) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        const i = findLine(lines, m.line);
        const line = shownText(lines[i], Math.max(frame, m.at));
        const start = m.text === undefined ? line.length - line.trimStart().length : line.indexOf(m.text);
        if (start < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(m.text)}`);
        const chars = m.text === undefined ? line.trimEnd().length - start : m.text.length;
        // A third of an em either side, but only into a space or past the
        // line's end: where a character touches the band it stops at the
        // cell's edge, or it would half cover that character.
        const free = (c: string | undefined) => c === undefined || c === " ";
        const padL = free(line[start - 1]) ? 0.32 : 0.04;
        const padR = free(line[start + chars]) ? 0.32 : 0.04;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: g.padX + (start * 0.6 - padL) * size,
              top: tops[i] + g.lineH * 0.12,
              height: g.lineH * 0.76 * open[i],
              width: (chars * 0.6 + padL + padR) * size * w,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((l, i) => {
        const lineAt = at + 4 + i * step;
        if (frame < lineAt - 1 || open[i] <= 0.02) return null;
        const vs = versions(l);
        const dimmed = dims
          .filter((dm) => textOfLine(l).includes(dm.line) || vs.some((v) => v.text.includes(dm.line)))
          .reduce((s, dm) => Math.max(s, ease(frame, dm.at, 14) * (dm.out === undefined ? 1 : 1 - ease(frame, dm.out, 14))), 0);
        return vs.map((v, k) => {
          const next = vs[k + 1]?.at ?? Infinity;
          // Each version fades out as the next comes in, over six frames.
          const inP = k === 0 ? 1 : ease(frame, v.at, 10);
          const outP = Number.isFinite(next) ? 1 - ease(frame, next - 2, 6) : 1;
          const op = inP * outP;
          if (op <= 0) return null;
          return (
            <Ink
              key={`${i}-${k}`}
              at={k === 0 ? lineAt : v.at}
              dur={14}
              style={{ left: g.padX, top: tops[i], height: g.lineH * open[i], display: "flex", alignItems: "center", opacity: op * (1 - 0.62 * dimmed), overflow: "visible" }}
            >
              <Code line={v.text} size={size} />
            </Ink>
          );
        });
      })}
    </div>
  );
};

// ── Events drawn as cells ───────────────────────────────────────────────────

/** What a cell is: plain ink; the right answer (green); the trap (red); what
 *  the narration points at (yellow); read and set aside (grey); data (blue). */
export type CellTone = "plain" | "ok" | "bad" | "look" | "off" | "data";
const TONE_LINE: Record<CellTone, string> = {
  plain: INK,
  ok: OK,
  bad: ACCENT,
  look: inkOf.yellow,
  off: ds("gray", 400),
  data: BAR,
};
const TONE_INK: Record<CellTone, string> = {
  plain: INK,
  ok: OK_INK,
  bad: ACCENT_INK,
  look: inkOf.yellow,
  off: INK_SOFT,
  data: BLUE_INK,
};

/** The color a cell has at `frame`, blended over 10 frames from the tone
 *  before. */
const toneMix = (frame: number, tones: readonly { at: number; tone: CellTone }[], table: Record<CellTone, string>) => {
  let prev: CellTone = "plain";
  let cur: CellTone = "plain";
  let since = -Infinity;
  for (const t of [...tones].sort((a, b) => a.at - b.at)) {
    if (frame >= t.at) {
      prev = cur;
      cur = t.tone;
      since = t.at;
    }
  }
  const p = Number.isFinite(since) ? ease(frame, since, 10) : 1;
  return p >= 1 ? table[cur] : `color-mix(in srgb, ${table[cur]} ${Math.round(p * 100)}%, ${table[prev]})`;
};

export const CELL = 38;

/**
 * One event (or row) as an outlined box with its id in it: the house's
 * diagram box, 2px ink and no fill, a tone coloring the outline and the
 * number together. Centred on `x`, its top at `y`. `dashed` draws a slot that
 * is empty (a row the table should hold and does not).
 */
export const Cell: React.FC<{
  x: number;
  y: number;
  at: number;
  label?: React.ReactNode;
  tones?: readonly { at: number; tone: CellTone }[];
  size?: number;
  dashed?: boolean;
  out?: number;
  dim?: number;
  opacity?: number;
}> = ({ x, y, at, label: text, tones = [], size = CELL, dashed, out, dim, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 18);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y,
        width: size,
        height: size,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${toneMix(frame, tones, TONE_LINE)}`,
        borderRadius: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...note(20, toneMix(frame, tones, TONE_INK)),
        ...TABULAR,
        lineHeight: 1,
        opacity: Math.min(1, p) * (1 - o) * (1 - d) * opacity,
        transform: `scale(${0.8 + 0.2 * Math.min(1, p)})`,
      }}
    >
      {text}
    </div>
  );
};

/** A count beside a strip or a table: "24 rows", which can change to another
 *  count on a cue, its number in tabular figures. */
export const Count: React.FC<{
  x: number;
  y: number;
  at: number;
  steps: readonly { at: number; text: React.ReactNode; color?: string }[];
  size?: number;
  out?: number;
}> = ({ x, y, at, steps, size = 22, out }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const p = ease(frame, at, 12);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: p * (1 - o) }}>
      {steps.map((s, k) => {
        const next = steps[k + 1]?.at ?? Infinity;
        const op = (k === 0 ? 1 : ease(frame, s.at, 10)) * (Number.isFinite(next) ? 1 - ease(frame, next - 4, 6) : 1);
        if (op <= 0) return null;
        return (
          <div key={k} style={{ position: "absolute", left: 0, top: 0, ...note(size, s.color ?? INK_SOFT), fontWeight: 500, whiteSpace: "nowrap", opacity: op }}>
            {s.text}
          </div>
        );
      })}
    </div>
  );
};

// ── The cost chart (charts/incremental-vs-full-refresh.mjs) ──────────────────

const LOG_LO = Math.log10(4_000);
/** A lit spike's band: the highlighter's yellow, a step stronger, since a
 *  spike is a hairline and the usual wash vanishes beside it. */
const SPIKE_LIT = `color-mix(in srgb, ${ds("yellow", 400)} 75%, transparent)`;
const LOG_HI = Math.log10(12_000_000);

/** The chart's scales: days across, rows on a log scale. */
export const costScale = (x0: number, x1: number, top: number, bottom: number) => ({
  dx: (d: number) => x0 + (d / COST.days) * (x1 - x0),
  ly: (v: number) => bottom - ((Math.log10(v) - LOG_LO) / (LOG_HI - LOG_LO)) * (bottom - top),
});

/** The incremental model's run on every day, as one path: flat at a day's
 *  arrivals, a one-day spike to a full rebuild every 60 days. */
const incrementalPath = (s: ReturnType<typeof costScale>, grow = 1) => {
  // A spike's height, grown from a day's rows (0) to the rebuild (1) in log
  // space, so it rises at an even pace on the log scale.
  const at = (d: number) => 10 ** (Math.log10(COST.daily) + grow * (Math.log10(incrementalRows(d)) - Math.log10(COST.daily)));
  const pts: string[] = [`M${s.dx(0)},${s.ly(COST.daily)}`];
  for (const d of COST.refreshDays) {
    pts.push(`L${s.dx(d - 1)},${s.ly(at(d - 1))}`, `L${s.dx(d)},${s.ly(at(d))}`, `L${s.dx(d + 1)},${s.ly(at(d + 1))}`);
  }
  pts.push(`L${s.dx(COST.days)},${s.ly(COST.daily)}`);
  return pts.join(" ");
};

const fullPath = (s: ReturnType<typeof costScale>) =>
  Array.from({ length: 74 }, (_, k) => (k / 73) * COST.days)
    .map((d, k) => `${k ? "L" : "M"}${s.dx(d)},${s.ly(fullRows(d))}`)
    .join(" ");

/**
 * Rows one run processes, per day, over two years, on a log scale: the dbt
 * page's chart, drawn from data.ts's model. The rebuild line (red) draws on
 * `fullAt`, the incremental line (blue, its twelve refresh spikes included)
 * on `incAt`, its spikes rising on `growAt` when given (drawn whole with the
 * line otherwise); `spikesAt` lights every spike, `lastAt` the last one alone;
 * `dotAt` marks day 730's one day of arrivals before the line exists.
 */
export const CostChart: React.FC<{
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  at: number;
  fullAt?: number;
  fullDur?: number;
  incAt?: number;
  incDur?: number;
  growAt?: number;
  dotAt?: number;
  spikesAt?: number;
  spikesOut?: number;
  lastAt?: number;
  dayAt?: number;
  out?: number;
}> = ({ x0, x1, top, bottom, at, fullAt, fullDur = 40, incAt, incDur = 36, growAt, dotAt, spikesAt, spikesOut, lastAt, dayAt, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const s = costScale(x0, x1, top, bottom);
  const fullP = fullAt === undefined ? 0 : ease(frame, fullAt, fullDur);
  const incP = incAt === undefined ? 0 : ease(frame, incAt, incDur);
  const grow = growAt === undefined ? 1 : ease(frame, growAt, 24);
  const spikes = spikesAt === undefined ? 0 : ease(frame, spikesAt, 14) * (spikesOut === undefined ? 1 : 1 - ease(frame, spikesOut, 12));
  const last = lastAt === undefined ? 0 : ease(frame, lastAt, 14);
  const dot = dotAt === undefined ? 0 : ease(frame, dotAt, 10) * (1 - incP);
  const day = dayAt === undefined ? 0 : ease(frame, dayAt, 12);
  const tick = svgText({ ...label(19, INK_SOFT), fontWeight: 500 });
  const id = `cost-${Math.round(x0)}-${Math.round(top)}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) }}>
      <defs>
        <clipPath id={`${id}-full`}>
          <rect x={x0 - 4} y={top - 40} width={(x1 - x0) * fullP + 4} height={bottom - top + 80} />
        </clipPath>
        <clipPath id={`${id}-inc`}>
          <rect x={x0 - 4} y={top - 40} width={(x1 - x0) * incP + 4} height={bottom - top + 80} />
        </clipPath>
      </defs>
      {[10_000, 100_000, 1_000_000, 10_000_000].map((v) => (
        <g key={v}>
          <line x1={x0} x2={x1} y1={s.ly(v)} y2={s.ly(v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
          <text x={x0 - 14} y={s.ly(v) + 7} textAnchor="end" style={tick}>
            {v >= 1e6 ? `${v / 1e6}M` : `${v / 1000}k`}
          </text>
        </g>
      ))}
      <line x1={x0} x2={x1} y1={bottom} y2={bottom} stroke={INK} strokeWidth={1.6} />
      {[0, 365, 730].map((d) => (
        <text key={d} x={s.dx(d)} y={bottom + 30} textAnchor="middle" style={d === 730 && day > 0 ? svgText({ ...label(19, INK), fontWeight: 600 }) : tick}>
          day {d}
        </text>
      ))}
      {/* "Two years in": day 730, lit under its tick. */}
      {day > 0 ? <rect x={s.dx(730) - 44} y={bottom + 10} width={88 * day} height={28} rx={4} fill={HIGHLIGHT} /> : null}
      {day > 0 ? (
        <text x={s.dx(730)} y={bottom + 30} textAnchor="middle" style={svgText({ ...label(19, INK), fontWeight: 600 })}>
          day 730
        </text>
      ) : null}
      {/* The twelve scheduled refreshes, lit behind their spikes. */}
      {COST.refreshDays.map((d) => {
        const lit = d === COST.lastRefresh.day ? Math.max(spikes, last) : spikes;
        if (lit <= 0 || incP <= 0 || grow < 1) return null;
        return <rect key={d} x={s.dx(d) - 9} y={s.ly(fullRows(d)) - 8} width={18} height={(s.ly(COST.daily) - s.ly(fullRows(d)) + 12) * lit} rx={6} fill={SPIKE_LIT} />;
      })}
      {fullP > 0 ? <path d={fullPath(s)} fill="none" stroke={ACCENT} strokeWidth={3.2} clipPath={`url(#${id}-full)`} /> : null}
      {incP > 0 ? <path d={incrementalPath(s, grow)} fill="none" stroke={BAR} strokeWidth={2.6} strokeLinejoin="round" clipPath={`url(#${id}-inc)`} /> : null}
      {dot > 0 ? <circle cx={s.dx(730)} cy={s.ly(COST.daily)} r={6} fill={BAR} opacity={dot} /> : null}
      {fullP >= 1 ? <circle cx={s.dx(730)} cy={s.ly(COST.fullAtEnd)} r={5} fill={ACCENT} /> : null}
    </svg>
  );
};

/** A bracket on the chart's right, from one value to another at day 730. */
export const Gap: React.FC<{ x: number; y0: number; y1: number; at: number; out?: number }> = ({ x, y0, y1, at, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <path d={`M${x},${y0} l10,0 L${x + 10},${y0 + (y1 - y0) * p} l-10,0`} fill="none" stroke={INK} strokeWidth={2} />
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/ae-incremental/),
 *  so a spot is drawn at its own aspect and at most half its pixels across on
 *  the 1080p layout (a 4K render doubles it). */
export const ART = {
  snail: { id: "ae-incremental-snail", w: 1485, h: 864 },
  key: { id: "ae-incremental-key", w: 1024, h: 1018 },
} as const;
export type ArtName = keyof typeof ART;

/** The height a spot `width` wide takes. */
export const spotH = (art: ArtName, width: number) => (width * ART[art].h) / ART[art].w;

/**
 * A watercolor from illustrations.json, `width` wide at its own aspect: it
 * pops in on `at` (with `<Sfx name="el-pop">` on the same frame, placed by
 * the scene), bobs gently, and fades on `out`.
 */
export const Spot: React.FC<{ art: ArtName; at: number; out?: number; left: number; top: number; width: number }> = ({ art, at, out, left, top, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={ART[art].id}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: spotH(art, width),
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};

/** The page color, for a halo or a mask. */
export { PAPER };
