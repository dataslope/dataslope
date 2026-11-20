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
import { Mark as MarkInline } from "../da-sql/parts";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The result tables, table names, key arrows,
 * headings, highlighter, strike and slow push are the Data Analyst SQL
 * video's (da-sql/parts.tsx), re-exported as be-databases does, so the
 * series' SQL videos look like one family; the fan-out join this video
 * zooms into is the one da-sql's Question 4 drew, on the same two orders.
 *
 * What is local: the SQL listing (be-databases' Listing, whose marks find
 * their line by text, with this video's keywords, its `--` comments set soft,
 * and an outline around a run of lines), the page's MetricFlow YAML printed
 * the same way, the diagram boxes (outlined in ink, no fill: README, "A
 * diagram's boxes are outlined, not filled") and the arrows between them,
 * the dashboard tile the opening and Question 1 read revenue from, and the
 * spot art, bound to this video.
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
  X0,
  type Col,
  type TableGeometry,
  type TableRow,
} from "../da-sql/parts";
export { OK, OK_INK };

/** The series' kicker. */
export const SERIES = "Analytics engineer interview questions";

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the line that holds `text`. A highlight finds its line by
 * what the line says, never by a number, so a reworded query fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/**
 * Code inside a line of type, at 0.92em (QMono's 0.84em would put a 21px
 * label's code under 19px, and further than 12% from its line's size).
 */
export const SmallMono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: 500, fontVariantLigatures: "none", wordSpacing: "-0.3em", color }}>
    {children}
  </span>
);

// ── SQL and YAML listings ────────────────────────────────────────────────────

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT ALL CASE WHEN " +
    "THEN ELSE END DESC ASC USING"
  ).split(" "),
);
const TABLES = new Set(["orders", "order_items", "customers", "customer", "payments", "refunds", "order_summary", "daily"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: strings, numbers, keywords, table names, and a
 *  `--` comment to the line's end, set soft. */
const tokenizeSql = (line: string): Token[] => {
  const out: Token[] = [];
  const cut = line.indexOf("--");
  const code = cut < 0 ? line : line.slice(0, cut);
  for (const m of code.matchAll(/('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, str, num, word] = m;
    if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 500 });
    else if (word && TABLES.has(word)) out.push({ text, color: INK, weight: 500 });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  if (cut >= 0) out.push({ text: line.slice(cut), color: INK_SOFT });
  return out;
};

/** YAML as the page prints it: keys in ink, values in the data blue, a `#`
 *  comment soft. */
const tokenizeYaml = (line: string): Token[] => {
  const hash = line.indexOf(" #");
  const body = hash < 0 ? line : line.slice(0, hash);
  const tail = hash < 0 ? "" : line.slice(hash);
  const m = body.match(/^(\s*-?\s*)([\w.]+)(:)(.*)$/);
  const out: Token[] = m
    ? [
        { text: m[1], color: INK_SOFT },
        { text: m[2], color: INK, weight: 500 },
        { text: m[3], color: INK_SOFT },
        { text: m[4], color: BLUE_INK },
      ]
    : [{ text: body, color: INK }];
  if (tail) out.push({ text: tail, color: INK_SOFT });
  return out;
};

const Code: React.FC<{ line: string; size: number; yaml?: boolean }> = ({ line, size, yaml }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {(yaml ? tokenizeYaml(line) : tokenizeSql(line)).map((t, i) => (
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

/** The x of character `col` of a listing line (a mono character is 0.6em). */
export const listingCharX = (x: number, col: number, size: number) => x + geometry(size).padX + col * 0.6 * size;

/** A highlight on one line, found by text; `text` narrows it to a span. */
export type LineMark = { line: string; text?: string; at: number; out?: number; color?: string };

/** An outline around a run of lines (from the one holding `from` to the one
 *  holding `to`), in a tone's color: a CTE and the table it reads. */
export type LineOutline = { from: string; to: string; at: number; out?: number; color: string };

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
  const marked = mark.text === undefined ? line.trimEnd().length - start : mark.text.length;
  const chars = /[;,]/.test(line[start + marked] ?? "") ? marked + 1 : marked;
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
 * text; outlines ring a run of lines. `yaml` colors it as YAML.
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
  outlines?: readonly LineOutline[];
  yaml?: boolean;
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 22, at, lineAt, marks = [], outlines = [], yaml, dim, out }) => {
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
            <Code line={line} size={size} yaml={yaml} />
          </Ink>
        ) : null,
      )}
      {outlines.map((r, k) => {
        const a = ease(frame, r.at, 12);
        const ro = r.out === undefined ? 0 : ease(frame, r.out, 10);
        if (a <= 0 || ro >= 1) return null;
        const i0 = lineOf(lines, r.from);
        const i1 = lineOf(lines, r.to);
        const chars = Math.max(...lines.slice(i0, i1 + 1).map((l) => l.trimEnd().length));
        return (
          <div
            key={`o${k}`}
            style={{
              position: "absolute",
              left: g.padX - 10,
              width: chars * 0.6 * size + 22,
              top: g.padY + i0 * g.lineH + 3,
              height: (i1 - i0 + 1) * g.lineH - 6,
              boxSizing: "border-box",
              border: `2px solid ${r.color}`,
              borderRadius: 6,
              opacity: a * (1 - ro),
            }}
          />
        );
      })}
    </div>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** What a box is: plain ink, data (blue), the right answer (green), the trap
 *  (red), or what the narration points at (yellow). A tone colors the
 *  outline and the text together; boxes are never filled. */
export type Tone = "plain" | "data" | "ok" | "bad" | "look" | "off";
const TONE: Record<Tone, { line: string; ink: string }> = {
  plain: { line: INK, ink: INK },
  data: { line: BAR, ink: BLUE_INK },
  ok: { line: OK, ink: OK_INK },
  bad: { line: ACCENT, ink: ACCENT_INK },
  look: { line: inkOf.yellow, ink: INK },
  off: { line: ds("gray", 400), ink: INK_SOFT },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;

/**
 * A diagram's box: a 2px outline in its tone, no fill, a title and an
 * optional line under it, popping in on `at`. `toneAt` moves it to
 * `toneTo` on a later cue (the outline and the text together).
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
  toneTo?: Tone;
  toneAt?: number;
  size?: number;
  subSize?: number;
  mono?: boolean;
  dim?: number;
  out?: number;
  dashed?: boolean;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", toneTo, toneAt, size = 24, subSize = 21, mono, dim, out, dashed, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const s = toneTo !== undefined && toneAt !== undefined && frame >= toneAt ? TONE[toneTo] : TONE[tone];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${s.line}`,
        borderRadius: 8,
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
      <span style={{ ...label(size, s.ink), fontWeight: 500, whiteSpace: "nowrap", textAlign: "center", ...(mono ? { fontFamily: MONO } : {}) }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, s.ink === INK ? INK_SOFT : s.ink), whiteSpace: "nowrap", textAlign: "center" }}>{sub}</span> : null}
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
}> = ({ points, at, dur = 14, color = INK, width = 2.4, head = 14, dash, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
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
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      <path d={arrowHead(line, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
    </svg>
  );
};

/** A cross, drawn on `at`, in the trap's red. */
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
 * A dashboard tile, drawn as a diagram's box (an ink outline, no fill): its
 * title, then its number on a line of its own. `swap` changes the number on
 * a cue, wiping the old one off and the new one on; `tone` colors the number
 * (and the outline) from a cue.
 */
export const Tile: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: string;
  value: string;
  valueAt?: number;
  swap?: { at: number; value: string };
  tones?: readonly { at: number; tone: Tone; out?: number }[];
  /** A highlight on the title, from `at` to `out`. */
  titleMark?: { at: number; out?: number };
  dim?: number;
  out?: number;
}> = ({ x, y, w, h, at, title, value, valueAt, swap, tones = [], titleMark, dim, out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  const current = [...tones].reverse().find((t) => frame >= t.at && (t.out === undefined || frame < t.out));
  const t = TONE[current?.tone ?? "plain"];
  const swapped = swap !== undefined && frame >= swap.at;
  const v = ease(frame, valueAt ?? at + 6, 14);
  const fadeOld = swap === undefined ? 1 : 1 - ease(frame, swap.at - 8, 8);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px solid ${t.line}`,
        borderRadius: 8,
        padding: "22px 28px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.92 + 0.08 * Math.min(1, p)})`,
      }}
    >
      <div style={{ ...label(24, INK_SOFT), fontWeight: 500, whiteSpace: "nowrap" }}>
        {titleMark ? (
          <MarkInline at={titleMark.at} out={titleMark.out}>
            {title}
          </MarkInline>
        ) : (
          title
        )}
      </div>
      <div style={{ position: "relative", marginTop: 18, height: 64 }}>
        {!swapped ? (
          <span style={{ position: "absolute", left: 0, top: 0, ...label(58, t.ink), fontWeight: 600, fontVariantNumeric: "tabular-nums lining-nums", opacity: v * fadeOld, whiteSpace: "nowrap", lineHeight: 1.1 }}>
            {value}
          </span>
        ) : (
          <Ink at={swap.at} dur={14} style={{ left: 0, top: 0 }}>
            <span style={{ ...label(58, t.ink), fontWeight: 600, fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap", lineHeight: 1.1 }}>{swap.value}</span>
          </Ink>
        )}
      </div>
    </div>
  );
};

/**
 * A small badge-like word on the page in a tone's ink, inking in: plain bold
 * text, not a pill (no cards); "look" sits on the highlighter's yellow.
 */
export const Word: React.FC<{
  x: number;
  y: number;
  at: number;
  tone?: Tone;
  size?: number;
  out?: number;
  dim?: number;
  mono?: boolean;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "plain", size = 22, out, dim, mono, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <Ink at={at} dur={12} out={out} style={{ left: x, top: y, opacity: 1 - d, fontSize: size }}>
      <span style={{ ...label(size, TONE[tone].ink), fontWeight: 500, whiteSpace: "nowrap", ...(mono ? { fontFamily: MONO } : {}) }}>{children}</span>
    </Ink>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/ae-metrics/),
 *  so a spot is drawn at its own aspect and at most half its pixels across
 *  on the 1080p layout (a 4K render doubles it). */
export const ART = {
  pelican: { id: "ae-metrics-pelican", w: 852, h: 1013 },
  dials: { id: "ae-metrics-dials", w: 1024, h: 534 },
  coins: { id: "ae-metrics-coins", w: 944, h: 851 },
  stamp: { id: "ae-metrics-stamp", w: 856, h: 1006 },
} as const;
export type ArtName = keyof typeof ART;

/** The height a spot `width` wide takes. */
export const spotH = (art: ArtName, width: number) => (width * ART[art].h) / ART[art].w;

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
        height: spotH(art, width),
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};

/** A note's style: the annotation face, one line. */
export const noteLine = (size = 23, color: string = INK): React.CSSProperties => ({ ...note(size, color), whiteSpace: "nowrap" });
