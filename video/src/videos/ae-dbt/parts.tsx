import { LayoutDashboard } from "lucide-react";
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (the slow push, kicker,
 * headline, highlighter, strike) is the Data Analyst pandas part's
 * (da-pandas/parts.tsx), re-exported as the Backend and Data Engineer
 * videos do; the listing and the query plan are be-databases', with a
 * tokenizer that also reads Jinja, YAML and a shell line.
 *
 * What is new here is the lineage graph, the heart of the video: one set of
 * outlined boxes (models in ink, sources in a soft ink, the dashboard an
 * exposure with its lucide icon) and black joining lines with heads from
 * arrow.ts, routed from the boxes themselves, so a scene only says where
 * each box stands and what state it is in, and the same graph moves,
 * regroups, lights and loses an edge from scene to scene.
 */
export { Drift, Headline, Kicker, Mark, MARK, MARK_BAD, MARK_OK, pulse, Strike, X0 } from "../da-pandas/parts";
export { OK, OK_INK };

/** The series' kicker, the same on every scene that carries one. */
export const SERIES = "Analytics engineer interview questions";

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the line in `lines` that holds `text`: a highlight finds its
 * line by what it says, never by a number, so a changed listing fails the
 * render instead of marking the wrong line.
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

/**
 * Code inside a line of type, at 0.92em, so it stays within the 12% a line's
 * sizes may differ by, and never under 19px.
 */
export const Code: React.FC<{ children: React.ReactNode; color?: string; weight?: number }> = ({ children, color, weight = 500 }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: weight, fontVariantLigatures: "none", wordSpacing: "-0.3em", color }}>
    {children}
  </span>
);

// ── Listings: SQL, Jinja, YAML and a shell line ──────────────────────────────

export const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT CASE WHEN THEN ELSE END " +
    "CREATE VIEW TABLE INSERT INTO VALUES EXPLAIN TIMESTAMP"
  ).split(" "),
);
/** Jinja's own words, set in teal with the braces around them. */
const JINJA = new Set(["ref", "source", "config", "var", "macro", "endmacro", "this"]);

type Token = { text: string; color: string; weight?: number };

/** One line, colored: a comment soft, SQL keywords purple, Jinja and its
 *  braces teal, strings green, numbers orange, a YAML key or the `dbt`
 *  command heavier. */
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  const yamlKey = line.match(/^(\s*-?\s*)([A-Za-z_][\w]*)(:)(\s|$)/);
  if (/^\s*(--|#)/.test(line)) return [{ text: line, color: INK_SOFT }];
  let rest = line;
  if (yamlKey && !/^\s*(SELECT|FROM|WHERE|WITH)\b/.test(line)) {
    out.push({ text: yamlKey[1], color: INK_SOFT }, { text: yamlKey[2], color: INK, weight: 600 }, { text: yamlKey[3], color: INK_SOFT });
    rest = line.slice(yamlKey[1].length + yamlKey[2].length + 1);
  }
  for (const m of rest.matchAll(/(--\s.*$)|(\{\{|\}\}|\{%|%\})|('(?:[^']|'')*'|"(?:[^"\\]|\\.)*")|(\d+(?:\.\d+)*)|((?<=^|\s)--?[a-z][\w-]*)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, brace, str, num, flag, word] = m;
    if (comment) out.push({ text, color: INK_SOFT });
    else if (brace) out.push({ text, color: inkOf.teal, weight: 600 });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (flag) out.push({ text, color: INK, weight: 600 });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 600 });
    else if (word && JINJA.has(word)) out.push({ text, color: inkOf.teal, weight: 600 });
    else if (word === "dbt") out.push({ text, color: INK, weight: 600 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** One line of code, colored, in the mono face; `color` sets every token in
 *  one ink. */
export const CodeLine: React.FC<{ line: string; size: number; color?: string }> = ({ line, size, color }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: color ?? t.color, fontWeight: t.weight ?? 400 }}>
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

/** The x of character `col` of a listing line (a mono character is 0.6em). */
export const listingCharX = (x: number, col: number, size: number) => x + geometry(size).padX + col * 0.6 * size;

/** The width a listing needs for its longest line. */
export const listingWidth = (lines: readonly string[], size: number) => Math.ceil(Math.max(...lines.map((l) => l.length)) * 0.6 * size + 2 * geometry(size).padX + 4);

/** A highlight on one line, found by text; `text` narrows it to a span. */
export type LineMark = { line: string; text?: string; at: number; out?: number; color?: string };

/** The band a mark draws: the whole line from its indent, or one span. */
const Band: React.FC<{ lines: readonly string[]; mark: LineMark; size: number; padX: number; padY: number; lineH: number }> = ({ lines, mark, size, padX, padY, lineH }) => {
  const frame = useCurrentFrame();
  const w = ease(frame, mark.at, 12);
  const o = mark.out === undefined ? 0 : ease(frame, mark.out, 10);
  if (w <= 0 || o >= 1) return null;
  const i = lineOf(lines, mark.text ?? mark.line);
  const line = lines[i];
  const start = mark.text === undefined ? line.length - line.trimStart().length : line.indexOf(mark.text);
  if (start < 0) throw new Error(`line ${JSON.stringify(line)} has no ${JSON.stringify(mark.text)}`);
  const chars = mark.text === undefined ? line.length - start : mark.text.length;
  // A third of an em either side of the characters, but only into a space
  // or past the line's end; against another character the band stops at
  // the cell's edge.
  const open = (c: string | undefined) => c === undefined || c === " ";
  const padL = open(line[start - 1]) ? 0.32 : 0.04;
  const padR = open(line[start + chars]) ? 0.32 : 0.04;
  return (
    <div
      style={{
        position: "absolute",
        left: padX + (start * 0.6 - padL) * size,
        top: padY + i * lineH + lineH * 0.12,
        height: lineH * 0.76,
        width: (chars * 0.6 + padL + padR) * size * w,
        background: mark.color ?? HIGHLIGHT,
        opacity: 1 - o,
      }}
    />
  );
};

/**
 * A printed listing: tinted paper between a rule above and a hairline below,
 * each line inking in on its own cue. Marks find their line (and span) by
 * text. `ink` sets a line's every token in one color (a red line, a
 * swapped one).
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
  ink?: Readonly<Record<number, string>>;
  dim?: number;
  out?: number;
  /** The rule above in another color (a listing that is the trap). */
  rule?: string;
}> = ({ lines, x, top, width, size = 21, at, lineAt, marks = [], ink = {}, dim, out, rule = INK }) => {
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
          borderTop: `2px solid ${rule}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {marks.map((m, k) => (
        <Band key={k} lines={lines} mark={m} size={size} {...g} />
      ))}
      {lines.map((line, i) =>
        frame >= (lineAt?.[i] ?? at + 4 + i * 3) - 1 ? (
          <Ink key={i} at={lineAt?.[i] ?? at + 4 + i * 3} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
            <CodeLine line={line} size={size} color={ink[i]} />
          </Ink>
        ) : null,
      )}
    </div>
  );
};

// ── Query plans (be-databases/parts.tsx) ─────────────────────────────────────

const NODE = /^(\s*(?:->\s+)?)([A-Z][A-Za-z ]*?)(?=\s+on\s|\s+using\s|\s*\(|$)/;

/** One plan line: a node's name in ink, the rest soft, a detail's value in
 *  ink; `hot` colors a span (a row count the narration names). */
const PlanText: React.FC<{ line: string; size: number; hot?: { text: string; color: string } }> = ({ line, size, hot }) => {
  const base: React.CSSProperties = { fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", color: INK_SOFT };
  const paint = (s: string) => {
    if (!hot || !s.includes(hot.text)) return s;
    const i = s.indexOf(hot.text);
    return (
      <>
        {s.slice(0, i)}
        <span style={{ color: hot.color, fontWeight: 600 }}>{hot.text}</span>
        {s.slice(i + hot.text.length)}
      </>
    );
  };
  const node = line.match(NODE);
  const detail = line.match(/^(\s*)([A-Za-z ]+:)(.*)$/);
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
        <span style={{ color: INK, fontWeight: 600 }}>{node[2]}</span>
        {paint(line.slice(node[0].length))}
      </span>
    );
  }
  return <span style={base}>{paint(line)}</span>;
};

const PLAN_HEAD = 1.7;
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
 * hairline, then the plan, a line at a time. `hot` colors a span of one
 * line by text.
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
  hot?: readonly { text: string; color: string }[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 20, at, step = 3, marks = [], hot = [], dim, out }) => {
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
              <PlanText line={line} size={size} hot={hot.find((h) => line.includes(h.text))} />
            </Ink>
          ) : null,
        )}
      </div>
    </div>
  );
};

// ── The lineage graph ────────────────────────────────────────────────────────

/**
 * What a box is saying, one meaning per color (editorial/interview.tsx):
 * plain ink; a soft ink for a source dbt reads but does not build; gold for
 * what the narration points at (with ink type, as yellow type does not read);
 * blue for a model that has been built (data); green for a passed test or
 * the right answer; red for the trap or a failure; a grey dashed box for one
 * that is not there (never built, or not stored).
 */
export type Tone = "plain" | "soft" | "lit" | "data" | "ok" | "bad" | "off";
const TONE: Record<Tone, { line: string; ink: string }> = {
  plain: { line: INK, ink: INK },
  soft: { line: INK_SOFT, ink: INK_SOFT },
  lit: { line: ds("yellow", 600), ink: INK },
  data: { line: BAR, ink: BLUE_INK },
  ok: { line: OK, ink: OK_INK },
  bad: { line: ACCENT, ink: ACCENT_INK },
  off: { line: ds("gray", 400), ink: INK_SOFT },
};
export const toneLine = (t: Tone) => TONE[t].line;
export const toneInk = (t: Tone) => TONE[t].ink;

export type ToneCue = { at: number; tone: Tone };

/** The tone a box has at `frame`, blended over 10 frames from the one before. */
const toneAt = (frame: number, base: Tone, tones: readonly ToneCue[]) => {
  let prev: Tone = base;
  let cur: Tone = base;
  let since = -Infinity;
  for (const t of [...tones].sort((a, b) => a.at - b.at)) {
    if (frame >= t.at) {
      prev = cur;
      cur = t.tone;
      since = t.at;
    }
  }
  const p = Number.isFinite(since) ? ease(frame, since, 10) : 1;
  const mix = (k: "line" | "ink") => (p >= 1 ? TONE[cur][k] : `color-mix(in srgb, ${TONE[cur][k]} ${Math.round(p * 100)}%, ${TONE[prev][k]})`);
  const lit = (cur === "lit" ? p : 0) + (prev === "lit" ? 1 - p : 0);
  const off = (cur === "off" ? p : 0) + (prev === "off" ? 1 - p : 0);
  return { line: mix("line"), ink: mix("ink"), lit, off };
};

/** A graph's node as the scene places it this frame: its left edge, its
 *  vertical middle and its width. */
export type Slot = { x: number; cy: number; w: number };

export const BOX_H = 52;
export const BOX_SIZE = 21;

/** The box widths the slice's names need at 21px mono (0.6em a character
 *  and 20px either side), so every model box is one width. */
export const MODEL_W = 206;
export const DASH_W = 262;

/** The page's lineage slice, read from the page (GRAPH in data.ts), and the
 *  dashboard its one exposure names. */
export type NodeId = "raw.orders" | "raw.customers" | "stg_orders" | "stg_customers" | "dim_customer" | "fct_orders" | "dashboard";
export const MODELS = ["stg_orders", "stg_customers", "dim_customer", "fct_orders"] as const;

/**
 * The slice laid out in build order, left to right: sources, then the two
 * staging models (step 1), the customer dimension (step 2), the orders fact
 * (step 3) and the dashboard. The orders row runs along the top and the
 * customers row along the bottom; the fact and the dashboard sit between
 * them, where both branches meet. `sources: false` drops the sources'
 * column and moves everything one column left.
 */
export const sliceLayout = ({
  left,
  top,
  pitch = 296,
  row = 84,
  sources = true,
  w = MODEL_W,
}: {
  left: number;
  top: number;
  pitch?: number;
  row?: number;
  sources?: boolean;
  w?: number;
}): Record<NodeId, Slot> => {
  const c = (i: number) => left + (sources ? i : i - 1) * pitch;
  return {
    "raw.orders": { x: c(0), cy: top, w },
    "raw.customers": { x: c(0), cy: top + 2 * row, w },
    stg_orders: { x: c(1), cy: top, w },
    stg_customers: { x: c(1), cy: top + 2 * row, w },
    dim_customer: { x: c(2), cy: top + 2 * row, w },
    fct_orders: { x: c(3), cy: top + row, w },
    dashboard: { x: c(4), cy: top + row, w: DASH_W },
  };
};

/** One layout part way to another, slot by slot. */
export const lerpLayout = <K extends string>(a: Record<K, Slot>, b: Record<K, Slot>, t: number): Record<K, Slot> => {
  const out = {} as Record<K, Slot>;
  for (const k of Object.keys(a) as K[]) {
    out[k] = { x: a[k].x + (b[k].x - a[k].x) * t, cy: a[k].cy + (b[k].cy - a[k].cy) * t, w: a[k].w + (b[k].w - a[k].w) * t };
  }
  return out;
};

export type GNode = {
  id: string;
  slot: Slot;
  at: number;
  out?: number;
  /** The box's tone before any cue (default plain). */
  base?: Tone;
  tones?: readonly ToneCue[];
  /** Drawn dashed (an ephemeral model, one that is not there): always, or
   *  from the first frame to the second. */
  dashed?: boolean | readonly [number, number];
  /** The text, if not the id in mono. */
  title?: React.ReactNode;
  /** Set the title in Inter with the dashboard's lucide icon. */
  exposure?: boolean;
  /** Set the title in Inter (a box that is not named in code). */
  sans?: boolean;
  size?: number;
  h?: number;
  dim?: number;
};

/** Where an edge leaves its first box and reaches its second. */
type Port = { side: "left" | "right" | "top" | "bottom"; d?: number };

export type GEdge = {
  from: string;
  to: string;
  at: number;
  dur?: number;
  out?: number;
  /** The edge's color, and the cues that change it. */
  color?: string;
  tones?: readonly { at: number; color: string }[];
  dash?: string;
  /** Where it leaves and arrives (default: the right side, the left side). */
  fromPort?: Port;
  toPort?: Port;
  /** The x where an elbow turns (default 44px short of the box it reaches). */
  turnX?: number;
  /** The whole route, in page pixels, instead of one worked out from the boxes. */
  points?: readonly Pt[];
  /** The edge lifts off from this frame, leaving a red dashed gap. */
  gone?: number;
  /** The gap fills back in with the edge from this frame. */
  back?: number;
  width?: number;
  dim?: number;
};

const portPoint = (s: Slot, h: number, p: Port): Pt => {
  const d = p.d ?? 0;
  if (p.side === "right") return [s.x + s.w + 4, s.cy + d];
  if (p.side === "left") return [s.x - 5, s.cy + d];
  if (p.side === "top") return [s.x + s.w / 2 + d, s.cy - h / 2 - 5];
  return [s.x + s.w / 2 + d, s.cy + h / 2 + 5];
};

/** The route between two boxes: straight when the ports line up; else an
 *  elbow that runs along the first box's row and turns into the second
 *  near it, so the last stretch, where the head sits, is straight. */
export const route = (a: Slot, b: Slot, h: number, e: Pick<GEdge, "fromPort" | "toPort" | "turnX">): Pt[] => {
  const fp = e.fromPort ?? { side: "right" };
  const tp = e.toPort ?? { side: "left" };
  const s = portPoint(a, h, fp);
  const t = portPoint(b, h, tp);
  if (tp.side === "left" || tp.side === "right") {
    if (Math.abs(s[1] - t[1]) < 0.5) return [s, t];
    const xm = e.turnX ?? t[0] - 44;
    return [s, [xm, s[1]], [xm, t[1]], t];
  }
  // Into a box's top or bottom: along the row, then straight up or down.
  if (Math.abs(s[0] - t[0]) < 0.5) return [s, t];
  return [s, [t[0], s[1]], t];
};

/** One edge, drawn from its tail on `at`, its head built by arrowHead() on
 *  the straight last stretch. */
const EdgePath: React.FC<{ points: readonly Pt[]; e: GEdge }> = ({ points, e }) => {
  const frame = useCurrentFrame();
  const dur = e.dur ?? 14;
  const p = ease(frame, e.at, dur);
  const o = e.out === undefined ? 0 : ease(frame, e.out, 10);
  const d = e.dim === undefined ? 0 : ease(frame, e.dim, 12) * 0.6;
  const gone = e.gone === undefined ? 0 : ease(frame, e.gone, 12) * (e.back === undefined ? 1 : 1 - ease(frame, e.back, 12));
  if (p <= 0 || o >= 1) return null;
  const head = 13;
  const { d: path, samples } = points.length > 2 ? roundedPolyline(points, 16) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = Math.max(0, (len - head + 1) / len);
  let color = e.color ?? INK;
  for (const t of [...(e.tones ?? [])].sort((a, b) => a.at - b.at)) {
    const k = ease(frame, t.at, 10);
    if (k > 0) color = k >= 1 ? t.color : `color-mix(in srgb, ${t.color} ${Math.round(k * 100)}%, ${color})`;
  }
  const width = e.width ?? 2.4;
  const [sx, sy] = points[0];
  const [tx, ty] = points[points.length - 1];
  const across = Math.abs(tx - sx) >= Math.abs(ty - sy);
  const hide = `${(1 - p) * 100}%`;
  const clip = across ? (tx >= sx ? `inset(-40px ${hide} -40px -40px)` : `inset(-40px -40px -40px ${hide})`) : ty >= sy ? `inset(-40px -40px ${hide} -40px)` : `inset(${hide} -40px -40px -40px)`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <g opacity={1 - gone}>
        {e.dash ? (
          <g style={{ clipPath: clip }}>
            <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={e.dash} strokeLinejoin="round" />
          </g>
        ) : (
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
        )}
        <path d={arrowHead(line, head, 7, { filled: true })} fill={color} opacity={ease(frame, e.at + dur - 4, 5)} />
      </g>
      {gone > 0 ? <path d={path} fill="none" stroke={ACCENT} strokeWidth={width} strokeDasharray="7 9" strokeLinecap="round" opacity={gone} /> : null}
    </svg>
  );
};

/** An arrow along `points` (corners rounded), drawn from its tail on `at`,
 *  its head built by arrowHead() on the straight last stretch. */
export const Arrow: React.FC<Omit<GEdge, "from" | "to" | "points"> & { points: readonly Pt[] }> = ({ points, ...e }) => <EdgePath points={points} e={{ from: "", to: "", ...e }} />;

/** One box of the graph. */
const GBox: React.FC<{ n: GNode }> = ({ n }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, n.at, fps, 16);
  const o = n.out === undefined ? 0 : ease(frame, n.out, 10);
  const d = n.dim === undefined ? 0 : ease(frame, n.dim, 12) * 0.6;
  if (frame < n.at || p <= 0.001 || o >= 1) return null;
  const h = n.h ?? BOX_H;
  const size = n.size ?? BOX_SIZE;
  const t = toneAt(frame, n.base ?? "plain", n.tones ?? []);
  const dashed = (Array.isArray(n.dashed) ? frame >= n.dashed[0] && frame < n.dashed[1] : n.dashed === true) || t.off > 0.5;
  const text: React.CSSProperties = n.exposure || n.sans
    ? { ...note(size, t.ink), fontWeight: 600 }
    : { fontFamily: MONO, fontSize: size, fontWeight: 600, fontVariantLigatures: "none", color: t.ink };
  return (
    <div
      style={{
        position: "absolute",
        left: n.slot.x,
        top: n.slot.cy - h / 2,
        width: n.slot.w,
        height: h,
        boxSizing: "border-box",
        border: `${2 + 1.2 * t.lit}px ${dashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: Math.min(1, p) * (1 - o) * (1 - d) * (1 - 0.35 * t.off),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      {n.exposure ? <LayoutDashboard size={size + 2} strokeWidth={2} color={t.ink} style={{ flex: "none" }} /> : null}
      <span style={{ ...text, whiteSpace: "nowrap" }}>{n.title ?? n.id}</span>
    </div>
  );
};

/**
 * The lineage graph: outlined boxes where the scene puts them this frame,
 * and the edges between them routed from the boxes, so a box that moves
 * takes its edges with it.
 */
export const Graph: React.FC<{ nodes: readonly GNode[]; edges: readonly GEdge[] }> = ({ nodes, edges }) => {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return (
    <>
      {edges.map((e, i) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!e.points && (!a || !b)) throw new Error(`edge ${e.from} -> ${e.to} names a box the graph does not have`);
        const pts = e.points ?? route(a!.slot, b!.slot, a!.h ?? BOX_H, e);
        return <EdgePath key={`${e.from}-${e.to}-${i}`} points={pts} e={e} />;
      })}
      {nodes.map((n) => (
        <GBox key={n.id} n={n} />
      ))}
    </>
  );
};

/** The ports and turns the slice's edges take in `sliceLayout`, so two
 *  edges that reach one box arrive apart, each on its own straight. */
export const SLICE_EDGE: Record<string, Pick<GEdge, "fromPort" | "toPort" | "turnX">> = {
  "stg_orders>fct_orders": { toPort: { side: "left", d: -12 } },
  "dim_customer>fct_orders": { toPort: { side: "left", d: 12 } },
  "dim_customer>dashboard": { toPort: { side: "bottom", d: -40 } },
};
export const edgeKey = (from: string, to: string) => `${from}>${to}`;

/** The edge's own name for the exposure's node: the page's
 *  weekly_revenue_dashboard is drawn as the dashboard it declares. */
export const nodeOf = (name: string) => (name === "weekly_revenue_dashboard" ? "dashboard" : name);

// ── Small marks ──────────────────────────────────────────────────────────────

/** A cross, drawn stroke by stroke on `at`, in the trap's red. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 8);
  const b = ease(frame, at + 5, 8);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};

/**
 * The separator between two columns of text set side by side: a vertical
 * 1px hairline in the gap, drawn down on `at` (the cue of the column to its
 * right) and gone on `out`.
 */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; out?: number; dim?: number }> = ({ x, top, bottom, at, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: Math.round(x), top, width: 1, height: (bottom - top) * p, background: HAIRLINE, opacity: (1 - o) * (1 - d) }} />;
};

/** A horizontal rule that draws left to right on `at`: a column's heading
 *  rule, or a short rule under a group. */
export const HRule: React.FC<{ x: number; y: number; width: number; at: number; out?: number; color?: string; weight?: number }> = ({ x, y, width, at, out, color = HAIRLINE, weight = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", left: x, top: y, width: width * p, height: weight, background: color, opacity: 1 - o }} />;
};

/** A run of text that inks in, as a label line (`size`, `color`, weight 500). */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  out?: number;
  dim?: number;
  weight?: number;
  width?: number;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}> = ({ at, x, y, size = 22, color = INK, out, dim, weight = 500, width, align = "left", children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <Ink at={at} dur={14} out={out} style={{ left: x, top: y, width, opacity: 1 - d, textAlign: align }}>
      <span style={{ ...note(size, color), fontWeight: weight, whiteSpace: "nowrap" }}>{children}</span>
    </Ink>
  );
};

/** A label's style at a size, as a block. */
export const labelStyle = (size: number, color: string = INK): React.CSSProperties => ({ ...label(size, color), whiteSpace: "nowrap" });

// ── The art ──────────────────────────────────────────────────────────────────

/** Each image's own pixels (public/images/ae-dbt/), so a box keeps its
 *  shape and stays under half of them on the 1080p layout. */
export const ART = {
  "weaver-bird": [1059, 1014],
  dashboard: [928, 812],
  parcel: [905, 926],
  plug: [1021, 793],
} as const;
export type ArtName = keyof typeof ART;

/** A box `width` wide for an image, at its own aspect ratio. */
export const artBox = (id: ArtName, width: number) => ({ width, height: Math.round((width * ART[id][1]) / ART[id][0]) });

/** A watercolor from illustrations.json: it pops in on `at` (with an el-pop
 *  the scene places on the same frame), bobs gently, and fades on `out`. */
export const Spot: React.FC<{ id: ArtName; at: number; out?: number; dim?: number; left: number; top: number; width: number; height: number }> = ({ id, at, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || frame < at || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={`${VIDEO}-${id}`}
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
