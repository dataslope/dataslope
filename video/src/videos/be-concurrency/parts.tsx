import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { Sfx } from "../../sound/Sfx";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The headings, the highlighter, the strike,
 * the slow push and the Python listing are the Data Analyst pandas video's
 * (da-pandas/parts.tsx), which already give a highlight's bleed back as
 * margin. The boxes, arrows and pills are copied from the Data Engineer
 * pipelines video (de-pipelines/parts.tsx) rather than imported from it, so a
 * revision there can't move this video.
 *
 * What is local: the threads' colors, the blocks a schedule is drawn with,
 * a padlock and a key drawn small enough to sit inside a figure (the
 * watercolor ones are spots beside it), and the spot bound to this video.
 */
export { Code, Drift, Headline, Kicker, lerp, Listing, listingHeight, Mark, MARK_BAD, MARK_OK, Mono, pulse, Strike } from "../da-pandas/parts";
export { OK, OK_INK };

/** The page's left and right margins. */
export const X0 = 120;
export const RIGHT = 1824;

/** The kicker every scene carries: the series' name. */
export const SERIES = "Backend engineer interview questions";

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, never by a number (ds-sql/parts.tsx).
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** `color` mixed into the page at `pct` percent: a tint for a fill. */
export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, ${PAPER})`;

// ── Threads ──────────────────────────────────────────────────────────────────

/**
 * Threads (and the tasks of question 1) are told apart by the accent hues,
 * which carry no meaning of their own, so red, green, yellow and blue keep
 * theirs: the error, the right answer, what the narration points at, data.
 */
export const THREAD = [
  { name: "T1", fill: ds("teal", 500), ink: inkOf.teal },
  { name: "T2", fill: ds("purple", 500), ink: inkOf.purple },
  { name: "T3", fill: ds("orange", 500), ink: inkOf.orange },
] as const;

// ── Shapes ───────────────────────────────────────────────────────────────────

/** What a box is: data (blue), the right answer (green), the trap (red), or
 *  plain ink (a tool, a process). */
export type Tone = "data" | "ok" | "bad" | "plain" | "soft";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: tint(BAR, 10), ink: BLUE_INK },
  ok: { line: OK, fill: tint(OK, 12), ink: OK_INK },
  bad: { line: ACCENT, fill: tint(ACCENT, 10), ink: ACCENT_INK },
  plain: { line: INK, fill: PAPER, ink: INK },
  soft: { line: ds("gray", 400), fill: ds("gray", 50), ink: INK_SOFT },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/**
 * A box: rounded, bordered, popping in on `at`, with a title and an optional
 * line under it (de-pipelines' Node). `lit` swells its border.
 */
export const Node: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  fill?: string;
  line?: string;
  titleInk?: string;
  size?: number;
  subSize?: number;
  dim?: number;
  out?: number;
  lit?: number;
  dashed?: boolean;
  radius?: number;
  align?: "center" | "left";
  justify?: "center" | "flex-start";
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "data", fill, line, titleInk, size = 25, subSize = 21, dim, out, lit = 0, dashed, radius = 12, align = "center", justify = "center", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.62;
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
        border: `${2.5 + 2 * lit}px ${dashed ? "dashed" : "solid"} ${line ?? t.line}`,
        borderRadius: radius,
        background: fill ?? t.fill,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: justify,
        gap: 4,
        padding: "0 16px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      {title !== undefined ? <span style={{ ...label(size, titleInk ?? t.ink), fontWeight: 700, whiteSpace: "nowrap", textAlign: align }}>{title}</span> : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: align }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch (de-pipelines' Flow). `dash` draws it dashed, revealed by a clip
 * that follows the tip.
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
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
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
  solid?: boolean;
  children: React.ReactNode;
}> = ({ x, y, at, tone = "data", size = 22, out, dim, solid, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
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

/**
 * A solid block that slides between two places: a task's turn on a core, a
 * request's bar, a step of a thread. It grows in from its left edge on `at`
 * and moves from `from` to `to` over `moveDur` frames starting at `moveAt`.
 */
export const Block: React.FC<{
  at: number;
  from: { x: number; y: number; w: number };
  to?: { x: number; y: number; w: number };
  moveAt?: number;
  moveDur?: number;
  h: number;
  fill: string;
  line?: string;
  radius?: number;
  grow?: number;
  out?: number;
  dim?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ at, from, to, moveAt = Infinity, moveDur = 22, h, fill, line, radius = 6, grow = 10, out, dim, children, style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, grow);
  const m = to ? ease(frame, moveAt, moveDur) : 0;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  if (p <= 0 || o >= 1) return null;
  const b = to ?? from;
  const x = from.x + (b.x - from.x) * m;
  const y = from.y + (b.y - from.y) * m;
  const w = from.w + (b.w - from.w) * m;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w * p,
        height: h,
        boxSizing: "border-box",
        background: fill,
        border: line ? `2px solid ${line}` : undefined,
        borderRadius: radius,
        overflow: "hidden",
        opacity: (1 - o) * (1 - d),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A padlock drawn in the figure's own ink, for a lock that is part of the
 * diagram (the watercolor padlock is a spot beside it). `open` lifts the
 * shackle off one side.
 */
export const LockGlyph: React.FC<{ size?: number; color?: string; open?: number; style?: React.CSSProperties }> = ({ size = 26, color = INK, open = 0, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible", ...style }}>
    <path d={`M7.5 ${11 - open * 3} V7.5 a4.5 4.5 0 0 1 9 0 V${11 - open * 0}`} fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" transform={open ? `translate(0 ${-open * 3})` : undefined} />
    <rect x={4.5} y={10.5} width={15} height={11} rx={2.4} fill={color} />
    <circle cx={12} cy={15.6} r={1.6} fill={PAPER} />
  </svg>
);

/** A key drawn in the figure's ink: the GIL as a thing a thread holds. */
export const KeyGlyph: React.FC<{ size?: number; color?: string; style?: React.CSSProperties }> = ({ size = 30, color = INK, style }) => (
  <svg width={size} height={size * 0.5} viewBox="0 0 40 20" style={{ display: "block", overflow: "visible", ...style }}>
    <circle cx={8} cy={10} r={6} fill="none" stroke={color} strokeWidth={3} />
    <path d="M14 10 H36 M30 10 V15.5 M35 10 V14" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

/** A highlighter band behind a block of text, as wide as it, swept in on `at`. */
export const Band: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({ at, out, color = HIGHLIGHT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block", margin: "0 0.14em" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.14em",
          top: "0.04em",
          bottom: "-0.06em",
          width: `calc((100% + 0.28em) * ${p})`,
          background: color,
          borderRadius: "0.14em",
          opacity: p > 0 ? 1 - o : 0,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at` with the
 *  house pop (el-pop at -30, on the same frame), bobs gently, and fades on
 *  `out`. Its box is the most it may cover; the image keeps its own shape
 *  inside it. */
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
  if (!ILLUSTRATIONS) return null;
  return (
    <>
      <Sfx name="el-pop" at={at} level={-30} />
      {p <= 0.001 || o >= 1 ? null : (
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
      )}
    </>
  );
};
