import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";
import { Mark, Strike } from "../da-pandas/parts";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The headings, the highlighter (whose margin
 * gives its bleed back), the strike (which reads a code line's length), the
 * table and the slow push are the Data Analyst pandas video's
 * (da-pandas/parts.tsx), re-exported as the Data Engineer videos do.
 *
 * What is local: an HTTP message drawn as a short card (method and path, or
 * the status line, then only the headers that matter and a body of a line or
 * two), colored by what each piece is; the boxes, arrows and pills a request
 * travels between, copied from de-pipelines/parts.tsx so this video does not
 * move when that one is revised; a drawn cross beside the kit's tick; and the
 * spot art, bound to this video.
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
  Mono,
  pulse,
  Strike,
  Svg,
  tableGeometry,
  Tag,
  X0,
  type Col,
  type TableGeometry,
  type TableRow,
} from "../da-pandas/parts";
export { OK, OK_INK };

/** The series' kicker, the same on every scene that carries one. */
export const SERIES = "Backend engineer interview questions";

/** The page's right margin. */
export const RIGHT = 1824;

/**
 * The index of the line in `lines` that holds `text`: a highlight finds its
 * line by what it says, never by a number (ds-sql/parts.tsx).
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no line holds ${JSON.stringify(text)}`);
  return i;
};

/** "$150.00" from 15000 cents. */
export const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Tones: one meaning per color (editorial/interview.tsx) ──────────────────

/** Data (blue), the right answer (green), the trap or the error (red), plain
 *  ink (a client, a process), or what the narration points at (yellow). */
export type Tone = "data" | "ok" | "bad" | "plain" | "lit";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: `color-mix(in srgb, ${BAR} 9%, ${PAPER})`, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 11%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 9%, ${PAPER})`, ink: ACCENT_INK },
  plain: { line: INK, fill: PAPER, ink: INK },
  lit: { line: ds("yellow", 600), fill: `color-mix(in srgb, ${ds("yellow", 400)} 30%, ${PAPER})`, ink: INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/** The HTTP methods, in the code listings' keyword purple. */
export const METHOD_INK = inkOf.purple;
const METHODS = /^(GET|POST|PUT|PATCH|DELETE)\b/;

type Tok = { text: string; color: string; weight?: number };

/** Colors one line of an HTTP message: a request line's method, a status
 *  line's code, a header's name, a JSON body's strings and numbers. */
const tokens = (line: string, statusInk: string): Tok[] => {
  const method = line.match(METHODS);
  if (method) return [{ text: method[1], color: METHOD_INK, weight: 700 }, { text: line.slice(method[1].length), color: INK, weight: 500 }];
  const status = line.match(/^(\d{3})(\b.*)$/);
  if (status) return [{ text: status[1], color: statusInk, weight: 700 }, { text: status[2], color: statusInk, weight: 600 }];
  const header = line.match(/^([A-Z][A-Za-z-]*):( .*)$/);
  if (header) return [{ text: `${header[1]}:`, color: INK_SOFT, weight: 600 }, { text: header[2], color: INK, weight: 500 }];
  const out: Tok[] = [];
  for (const m of line.matchAll(/("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?)|([A-Za-z_][\w.-]*)|(\s+)|(.)/g)) {
    const [text, str, colon, num, word] = m;
    if (str && colon) out.push({ text: str, color: INK, weight: 600 }, { text: colon, color: INK_SOFT });
    else if (str) out.push({ text, color: inkOf.green });
    else if (num) out.push({ text, color: inkOf.orange });
    else if (word) out.push({ text, color: INK });
    else out.push({ text, color: INK_SOFT });
  }
  return out;
};

/** One line of HTTP, colored, in the mono face. */
export const Http: React.FC<{ line: string; size?: number; statusInk?: string; color?: string }> = ({ line, size, statusInk = INK, color }) => (
  <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none" }}>
    {tokens(line, statusInk).map((t, i) => (
      <span key={i} style={{ color: color ?? t.color, fontWeight: t.weight ?? 500 }}>
        {t.text}
      </span>
    ))}
  </span>
);

export type MsgLine = {
  t: string;
  /** When the line inks in (default: just after the card). */
  at?: number;
  /** The line's row opens on this frame, growing the card. */
  rowIn?: number;
  /** A highlight behind the line, from `at` (to `out`). */
  mark?: { at: number; out?: number; color?: string };
  /** A strike through it. */
  strike?: number;
  /** Every token in one ink (a soft line, a red one). */
  color?: string;
  /** Faded back from this frame. */
  dim?: number;
};

const msgGeometry = (size: number) => ({ lineH: Math.round(size * 1.6), padY: Math.round(size * 0.55), padX: Math.round(size * 0.8) });

/** A message card's full height. */
export const msgHeight = (lines: number, size = 22) => {
  const g = msgGeometry(size);
  return 2 * g.padY + lines * g.lineH;
};

/** The middle of a card's line `i`, in page pixels. */
export const msgLineMid = (top: number, i: number, size = 22) => {
  const g = msgGeometry(size);
  return top + g.padY + i * g.lineH + g.lineH / 2;
};

/**
 * An HTTP request or response as a short card: its first line (the method
 * and path, or the status), then the headers that matter and a line or two
 * of body. The card pops in on `at`; each line inks in on its own cue.
 * `tone` washes the card (data, the right answer, the trap); `lit` swells
 * its border for a card the narration names again.
 */
export const Msg: React.FC<{
  x: number;
  y: number;
  w: number;
  at: number;
  lines: readonly MsgLine[];
  tone?: Tone;
  size?: number;
  statusInk?: string;
  out?: number;
  dim?: number;
  lit?: number;
  dashed?: boolean;
}> = ({ x, y, w, at, lines, tone = "plain", size = 22, statusInk, out, dim, lit = 0, dashed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = msgGeometry(size);
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  const t = TONE[tone];
  const open = lines.map((l) => (l.rowIn === undefined ? 1 : ease(frame, l.rowIn, 12)));
  const rowTop = open.map((_, i) => g.padY + open.slice(0, i).reduce((a, b) => a + b, 0) * g.lineH);
  const height = 2 * g.padY + open.reduce((a, b) => a + b, 0) * g.lineH;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height,
        boxSizing: "border-box",
        border: `${2.5 + 2 * lit}px ${dashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 10,
        background: t.fill,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `scale(${0.94 + 0.06 * Math.min(1, p)})`,
        transformOrigin: "0 50%",
      }}
    >
      {lines.map((l, i) => {
        const la = ease(frame, l.at ?? at + 6 + i * 4, 12);
        const ld = l.dim === undefined ? 0 : ease(frame, l.dim, 12) * 0.6;
        if (la <= 0 || open[i] <= 0.02) return null;
        const body = <Http line={l.t} size={size} statusInk={statusInk ?? t.ink} color={l.color} />;
        const marked = l.mark ? (
          <Mark at={l.mark.at} out={l.mark.out} color={l.mark.color}>
            {body}
          </Mark>
        ) : (
          body
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: g.padX - 2,
              top: rowTop[i] - 2,
              height: g.lineH,
              display: "flex",
              alignItems: "center",
              fontSize: size,
              opacity: la * (1 - ld) * Math.min(1, open[i] * 1.4),
              transform: `translateX(${(1 - la) * -10}px)`,
            }}
          >
            {l.strike === undefined ? marked : <Strike at={l.strike}>{marked}</Strike>}
          </div>
        );
      })}
    </div>
  );
};

// ── Boxes, arrows and pills (de-pipelines/parts.tsx) ────────────────────────

/**
 * A box on the page: a rounded rectangle that pops in on `at`, with a title
 * and an optional line under it. `lit` swells its border, for a box the
 * narration names again.
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
  mono?: boolean;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "data", fill, titleInk, size = 26, subSize = 21, dim, out, lit = 0, dashed, mono, children }) => {
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
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "0 16px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span style={{ ...label(size, titleInk ?? t.ink), fontWeight: 700, whiteSpace: "nowrap", ...(mono ? { fontFamily: MONO, fontWeight: 600 } : {}) }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `dash` draws it dashed, revealed by a clip that follows the tip.
 * `cut` (0 to 1) stops the line part way, with no head: a message lost.
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
  cut?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dash, dim, out, cut }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur) * (cut ?? 1);
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
  const reach = cut === undefined ? Math.max(0, (len - head + 1) / len) : 1;
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
      {cut === undefined ? <path d={arrowHead(line, head, 8, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
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
  mono?: boolean;
  lit?: number;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "data", size = 22, out, dim, solid, mono, lit = 0, children }) => {
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
          border: `${2 + 2 * lit}px solid ${t.line}`,
          background: solid ? t.line : t.fill,
          ...label(size, solid ? PAPER : t.ink),
          fontWeight: 700,
          whiteSpace: "nowrap",
          ...(mono ? { fontFamily: MONO, fontWeight: 700 } : {}),
        }}
      >
        {children}
      </span>
    </Ink>
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

/** A yellow wash behind a span, for a term the narration names: the
 *  highlighter's color as a solid band, with its bleed given back. */
export const Lit: React.FC<{ on: number; children: React.ReactNode }> = ({ on, children }) => (
  <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
    <span style={{ position: "absolute", left: "-0.14em", right: "-0.14em", top: "0.04em", bottom: "-0.06em", background: HIGHLIGHT, borderRadius: "0.14em", opacity: on }} />
    <span style={{ position: "relative" }}>{children}</span>
  </span>
);

// ── The art ─────────────────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at`, bobs gently,
 *  and fades on `out`. Each pops with an el-pop placed beside it. */
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

/** Each image's own pixels, so a box can keep its shape and stay under half
 *  of them (a 4K render draws the 1080p layout at twice the size). */
export const ART = {
  puffin: [872, 1024],
  key: [1016, 1006],
  bookmark: [961, 941],
  bucket: [893, 1024],
} as const;

/** A box `width` wide for an image, at its own aspect ratio. */
export const artBox = (id: keyof typeof ART, width: number) => ({ width, height: Math.round((width * ART[id][1]) / ART[id][0]) });
