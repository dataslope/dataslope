import type { LucideIcon } from "lucide-react";
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
 * kit (editorial/interview.tsx). The headings, the highlighter (whose margin
 * gives its bleed back), the strike, the result table and the slow push are
 * the Data Analyst pandas video's (da-pandas/parts.tsx), re-exported as the
 * Data Engineer and Backend videos do.
 *
 * What is local: a SQL listing that also reads dbt's Jinja (be-databases'
 * listing, with `{{ }}` set soft), the diagram's boxes outlined in ink with
 * no fill (README, "A diagram's boxes are outlined, not filled"), arrows,
 * a storage cylinder drawn the same way, a file drawn as a bar of its bytes
 * with the highlighter of what a query read (de-warehousing/parts.tsx, copied
 * so this video does not move when that one is revised), a cog, and the
 * watercolors, bound to this video.
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
  TableName,
  tableGeometry,
  X0,
  type Col,
  type TableGeometry,
  type TableRow,
} from "../da-pandas/parts";
export { OK, OK_INK };

/** The series' kicker. */
export const SERIES = "Analytics engineer interview questions";

/** The page's right margin. */
export const RIGHT = 1800;

/** What a query read: the highlighter, laid round bytes. */
export const READ = ds("yellow", 400);

/**
 * The index of the line in `lines` that holds `text`: a highlight finds its
 * line by what it says, never by a number, so a reworded query fails the
 * render instead of marking the wrong line.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/**
 * Code inside a line of type, at 0.92em, so it stays within the 12% a line's
 * sizes may differ by, and never under 19px; a mono space brought back to
 * about a sans space.
 */
export const SmallMono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: 500, fontVariantLigatures: "none", wordSpacing: "-0.3em", color }}>
    {children}
  </span>
);

// ── SQL, with dbt's Jinja ───────────────────────────────────────────────────

const LISTING_PAPER = ds("gray", 50);
const KEYWORDS = new Set(
  (
    "SELECT FROM WHERE GROUP BY ORDER JOIN ON AND AS SUM COUNT UPDATE SET CREATE TABLE DATE BETWEEN DESC CLUSTER " +
    "PARTITION"
  ).split(" "),
);

type Token = { text: string; color: string; weight?: number };
const tokenize = (line: string): Token[] => {
  const out: Token[] = [];
  for (const m of line.matchAll(/(\{\{|\}\})|('(?:[^']|'')*')|(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(\s+)|(.)/g)) {
    const [text, jinja, str, num, word] = m;
    if (jinja) out.push({ text, color: INK_SOFT, weight: 500 });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word && KEYWORDS.has(word)) out.push({ text, color: inkOf.purple, weight: 500 });
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
  const marked = mark.text === undefined ? line.length - start : mark.text.length;
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
 * A printed SQL listing: tinted paper between a rule above and a hairline
 * below, each line inking in after the paper. Marks find their line (and
 * span) by text; `strikes` draw the trap's red line through a line's code.
 */
export const Listing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  marks?: readonly LineMark[];
  strikes?: readonly { line: string; at: number }[];
  dim?: number;
  out?: number;
}> = ({ lines, x, top, width, size = 22, at, marks = [], strikes = [], dim, out }) => {
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
        frame >= at + 3 + i * 3 ? (
          <Ink key={i} at={at + 4 + i * 3} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
            <Code line={line} size={size} />
          </Ink>
        ) : null,
      )}
      {strikes.map((s, k) => {
        const sp = ease(frame, s.at, 12);
        if (sp <= 0) return null;
        const i = lineOf(lines, s.line);
        const line = lines[i];
        const start = line.length - line.trimStart().length;
        const len = line.trimEnd().length - start;
        return (
          <div
            key={`s${k}`}
            style={{
              position: "absolute",
              left: g.padX + (start * 0.6 - 0.2) * size,
              top: g.padY + i * g.lineH + g.lineH / 2 - 1.5,
              width: (len * 0.6 + 0.4) * size * sp,
              height: 3,
              borderRadius: 2,
              background: ACCENT,
            }}
          />
        );
      })}
    </div>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** A box's highlight: data (blue), the right answer (green), the trap (red),
 *  what the narration points at (yellow), plain ink, or faded back. The
 *  color is the outline's and the text's together, never a fill. */
export type Tone = "plain" | "data" | "ok" | "bad" | "look" | "off";
const TONE: Record<Tone, string> = {
  plain: INK,
  data: BLUE_INK,
  ok: OK_INK,
  bad: ACCENT_INK,
  look: inkOf.yellow,
  off: ds("gray", 400),
};
export const toneInk = (t: Tone) => TONE[t];

/**
 * A diagram's box: no fill, a 2px outline and its text in ink (README, "A
 * diagram's boxes are outlined, not filled"), popping in on `at`. `tones`
 * changes its highlight on cue, outline and text together; a program or a
 * tool carries its lucide icon before its name.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  tones?: readonly { at: number; tone: Tone }[];
  icon?: LucideIcon;
  size?: number;
  subSize?: number;
  mono?: boolean;
  dim?: number;
  out?: number;
  dashed?: boolean;
  scale?: number;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", tones = [], icon: Icon, size = 23, subSize = 20, mono, dim, out, dashed, scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  // The latest tone whose cue has passed, cross-faded over 8 frames.
  let color = TONE[tone];
  for (const t of [...tones].sort((a, b) => a.at - b.at)) {
    const k = ease(frame, t.at, 8);
    if (k > 0) color = `color-mix(in srgb, ${TONE[t.tone]} ${Math.round(100 * k)}%, ${color})`;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "0 14px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${(0.9 + 0.1 * Math.min(1, p)) * scale})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span
        style={{
          ...label(size, color),
          ...(mono ? { fontFamily: MONO, fontVariantLigatures: "none" } : {}),
          fontWeight: 500,
          whiteSpace: "nowrap",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {Icon ? <Icon size={size} strokeWidth={2} color={color} style={{ flex: "none" }} /> : null}
        {title}
      </span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap" }}>{sub}</span> : null}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch (be-databases/parts.tsx).
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

/** A plain line, no head (a link from a box to the store it reads). */
export const Wire: React.FC<{ points: readonly Pt[]; at: number; color?: string; width?: number; dim?: number; out?: number; dash?: string }> = ({
  points,
  at,
  color = INK,
  width = 2,
  dim,
  out,
  dash,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const path = points.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" pathLength={1} strokeDasharray={dash ?? `${p} 1`} opacity={dash ? p : 1} />
    </svg>
  );
};

/**
 * Storage, drawn as a cylinder outlined in ink with no fill, its name on its
 * front, popping in on `at`.
 */
export const Cylinder: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  tones?: readonly { at: number; tone: Tone }[];
  size?: number;
  dim?: number;
  out?: number;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", tones = [], size = 23, dim, out }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (frame < at || p <= 0.001 || o >= 1) return null;
  let color = TONE[tone];
  for (const t of [...tones].sort((a, b) => a.at - b.at)) {
    const k = ease(frame, t.at, 8);
    if (k > 0) color = `color-mix(in srgb, ${TONE[t.tone]} ${Math.round(100 * k)}%, ${color})`;
  }
  const ry = Math.min(22, h * 0.16);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: Math.min(1, p) * (1 - d) * (1 - o), transform: `scale(${0.9 + 0.1 * Math.min(1, p)})` }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d={`M1,${ry} L1,${h - ry} A${w / 2 - 1},${ry} 0 0 0 ${w - 1},${h - ry} L${w - 1},${ry}`} fill="none" stroke={color} strokeWidth={2} />
        <ellipse cx={w / 2} cy={ry} rx={w / 2 - 1} ry={ry - 1} fill="none" stroke={color} strokeWidth={2} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: ry * 2, bottom: ry * 0.6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
        <span style={{ ...label(size, color), fontWeight: 500, whiteSpace: "nowrap" }}>{title}</span>
        {sub ? <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>{sub}</span> : null}
      </div>
    </div>
  );
};

// ── Bytes ────────────────────────────────────────────────────────────────────

/**
 * A file drawn as a bar of its bytes, `width` px long, growing from the left
 * on `at`; with `pattern`, a row store's interleaved fields; otherwise a
 * plain tint (de-warehousing's FileBar).
 */
export const FileBar: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  at: number;
  out?: number;
  dim?: number;
  pattern?: readonly string[];
  fill?: string;
}> = ({ x, y, width, height, at, out, dim, pattern, fill = ds("blue", 300) }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const stripe = pattern ? `repeating-linear-gradient(90deg, ${pattern.map((c, i) => `${c} ${i * 4}px ${(i + 1) * 4}px`).join(", ")})` : undefined;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
        opacity: (1 - o) * (1 - d),
        background: stripe ?? fill,
        borderRadius: 3,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${INK} 22%, transparent)`,
      }}
    />
  );
};

/**
 * The highlighter round part of a bar, swept in on `at`: the bytes a query
 * read. It sits behind the bar (z-index -1, inside the scene's Drift), so
 * the bytes keep their tints and the color shows as a band round them.
 */
export const ReadMark: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  at: number;
  out?: number;
  color?: string;
}> = ({ x, y, width, height, at, out, color = READ }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 7,
        width: (width + 14) * p,
        height: height + 14,
        background: color,
        borderRadius: 5,
        zIndex: -1,
        opacity: 1 - o,
      }}
    />
  );
};

/** The six columns of the sales table, each a step of the data blue, so a
 *  column keeps one tint wherever its values are drawn (de-warehousing). */
export const COLUMN_TINT: Record<string, string> = {
  sale_id: ds("blue", 100),
  sale_date: ds("blue", 200),
  region: ds("blue", 300),
  category: ds("blue", 400),
  units: ds("blue", 550),
  amount: ds("blue", 700),
};

/** A soft yellow, red and green for a read band laid round bytes. */
export const READ_BAD = `color-mix(in srgb, ${ACCENT} 45%, transparent)`;
export const READ_OK = `color-mix(in srgb, ${OK} 45%, transparent)`;

/** A cog, turning from `at` while `spin` is on, in `color`. */
export const Cog: React.FC<{ x: number; y: number; r: number; at: number; color?: string; out?: number }> = ({ x, y, r, at, color = INK, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const teeth = 8;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    pts.push(`${Math.cos(a0) * rr},${Math.sin(a0) * rr}`, `${Math.cos(a1) * rr},${Math.sin(a1) * rr}`);
  }
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) }}>
      <g transform={`translate(${x},${y}) rotate(${(frame - at) * 3})`}>
        <polygon points={pts.join(" ")} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
        <circle r={r * 0.32} fill="none" stroke={color} strokeWidth={2.4} />
      </g>
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each illustration's trimmed size in pixels (public/images/ae-warehousing/),
 *  so a spot is drawn at its own aspect and at most half its pixels across
 *  on the 1080p layout (a 4K render doubles it). */
export const ART = {
  camel: { id: "ae-warehousing-camel", w: 1138, h: 1024 },
  receipt: { id: "ae-warehousing-receipt", w: 990, h: 998 },
  stopwatch: { id: "ae-warehousing-stopwatch", w: 789, h: 965 },
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

/** A bar's color for each meaning. */
export const BAR_INK = { data: BAR, bad: ACCENT, ok: OK } as const;
