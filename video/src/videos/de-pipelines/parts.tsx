import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The table, the error box, the headings, the
 * highlighter and the strike are the Data Analyst SQL videos' (da-sql and
 * da-advanced-sql parts.tsx), re-exported the way ds-sql does it, so the
 * series' SQL looks alike.
 *
 * What is local: the SQL listing, copied from da-sql/parts.tsx because its
 * tokenizer has no INSERT, INTO, MERGE or ON CONFLICT and this video prints
 * all four (the kit would want those keywords added); the boxes and arrows a
 * pipeline is drawn with; and the hero, bound to this video.
 */
export {
  DataTable,
  Drift,
  ErrorBox,
  Headline,
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
  Tag,
  X0,
  type Col,
  type TableGeometry,
} from "../da-sql/parts";
export { colsOf, geoOf, rowsAt } from "../da-advanced-sql/parts";
export { OK, OK_INK };

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, never by a number (ds-sql/parts.tsx): a statement
 * reworded so the text is gone fails the render instead of marking the wrong
 * line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

// ── The SQL listing (da-sql/parts.tsx, with this video's keywords) ──────────

export const LISTING_PAPER = ds("gray", 50);
const TOKEN_INK = {
  keyword: inkOf.purple,
  string: inkOf.green,
  number: inkOf.orange,
  punct: INK_SOFT,
  name: INK,
} as const;
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY HAVING ORDER LIMIT JOIN LEFT ON AND OR NOT IN IS NULL AS WITH DISTINCT " +
    "DELETE DESC ASC DATE INSERT INTO UPDATE SET MERGE USING MATCHED THEN WHEN CONFLICT DO EXCLUDED " +
    "BEGIN COMMIT ROLLBACK TRANSACTION VALUES TABLE CREATE ALTER ADD COLUMN COUNT true"
  ).split(" "),
);
const TABLES = new Set(["events", "events_stage", "orders", "orders_stage", "orders_raw", "orders_clean"]);

type Token = { text: string; color: string; weight?: number };

/** A small SQL tokenizer: enough for the statements this video prints. */
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(--.*$)|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, comment, str, num, word] = m;
    if (comment) out.push({ text, color: INK_SOFT });
    else if (str) out.push({ text, color: TOKEN_INK.string });
    else if (num) out.push({ text, color: TOKEN_INK.number });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: TOKEN_INK.keyword, weight: 700 });
    else if (word && TABLES.has(word)) out.push({ text, color: TOKEN_INK.name, weight: 600 });
    else if (word) out.push({ text, color: TOKEN_INK.name });
    else out.push({ text, color: TOKEN_INK.punct });
  }
  return out;
};

/** One line of SQL, colored. */
export const Code: React.FC<{ line: string; size?: number }> = ({ line, size }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokenize(line).map((t, i) => (
      <span key={i} style={{ color: t.color, fontWeight: t.weight ?? 400 }}>
        {t.text}
      </span>
    ))}
  </span>
);

const listingGeometry = (size: number) => ({
  lineH: Math.round(size * 1.8),
  padY: Math.round(size * 0.66),
  padX: Math.round(size * 0.8),
});

/** The full height of a listing of `lines` lines. */
export const listingHeight = (lines: number, size: number) => {
  const g = listingGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

/** The middle of a listing's line `i`, in page pixels, for a note beside it. */
export const listingLineMid = (top: number, i: number, size: number) => {
  const g = listingGeometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/**
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below. Each line inks in on its own cue; `dim` sets the listing back.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  lineAt?: readonly number[];
  marks?: readonly { line: number; at: number; out?: number; color?: string }[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 24, at, lineAt, marks = [], dim, out }) => {
  const frame = useCurrentFrame();
  const g = listingGeometry(size);
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
      {marks.map((m, i) => {
        const w = ease(frame, m.at, 12);
        const mo = m.out === undefined ? 0 : ease(frame, m.out, 10);
        if (w <= 0 || mo >= 1) return null;
        const indent = lines[m.line].length - lines[m.line].trimStart().length;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.padX - size * 0.2 + indent * 0.6 * size,
              top: g.padY + m.line * g.lineH + g.lineH * 0.12,
              height: g.lineH * 0.76,
              width: `${((lines[m.line].length - indent) * 0.6 + 0.4) * w}em`,
              fontSize: size,
              background: m.color ?? HIGHLIGHT,
              opacity: 1 - mo,
            }}
          />
        );
      })}
      {lines.map((line, i) => (
        <Ink
          key={i}
          at={lineAt?.[i] ?? at + 4 + i * 4}
          dur={14}
          style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}
        >
          <Code line={line} size={size} />
        </Ink>
      ))}
    </div>
  );
};

// ── Boxes and arrows: a pipeline drawn as its stages ────────────────────────

/** What a box is: data (blue), the right answer (green), the trap (red), or
 *  plain ink (a tool, a process). */
export type Tone = "data" | "ok" | "bad" | "plain";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  plain: { line: INK, fill: PAPER, ink: INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;

/**
 * A stage of a pipeline: a rounded box that pops in on `at`, with a title and
 * an optional line under it. `fill` overrides the tone's tint (the medallion
 * layers' ramp); `lit` swells its border, for a box the narration names again.
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
  fill?: string;
  titleInk?: string;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  lit?: number;
  dashed?: boolean;
  align?: "center" | "left";
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "data", fill, titleInk, size = 26, subSize = 21, dim, out, lit = 0, dashed, align = "center", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
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
        background: fill ?? t.fill,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "center",
        gap: 4,
        padding: "0 18px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span style={{ ...label(size, titleInk ?? t.ink), fontWeight: 700, whiteSpace: "nowrap", textAlign: align }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: align }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `dash` draws it dashed (revealed by a clip that follows the tip).
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
  tail?: boolean;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dash, dim, out, tail = false }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } = points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  // A straight two-point line still needs samples along it for the head.
  const line: Pt[] =
    samples.length > 2
      ? samples
      : Array.from({ length: 41 }, (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt);
  const len = lineLength(line);
  const reach = Math.max(0, (len - head + 1) / len);
  // A dashed line can't use the draw-on trick (it needs pathLength 1), so it
  // is revealed by a clip that follows its tip along its main direction.
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
      {tail ? <circle cx={points[0][0]} cy={points[0][1]} r={4.5} fill={color} /> : null}
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
  solid?: boolean;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "data", size = 22, out, dim, solid, children }) => {
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
          background: solid ? t.line : t.fill,
          ...label(size, solid ? PAPER : t.ink),
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </Ink>
  );
};

// ── The hero ─────────────────────────────────────────────────────────────────

/** The watercolor from illustrations.json: it pops in on `at`, bobs gently,
 *  and fades on `out`. */
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

/** The hero: 1457x790 pixels, so at 4K it is drawn at most half that. */
export const HERO = { id: "de-pipelines-mole", w: 1457, h: 790 };
