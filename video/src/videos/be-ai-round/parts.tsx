import React from "react";
import { getStaticFiles, useCurrentFrame, useVideoConfig } from "remotion";
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
 * kit (editorial/interview.tsx). The page furniture (kicker, headline,
 * highlighter, strike, the Python listing and its console) is the Data
 * Analyst pandas part's (da-pandas/parts.tsx, whose Mark already takes its
 * bleed back as margin and whose strike reads a <Code line>'s text),
 * re-exported so the four interview tracks read as one family. The boxes and
 * arrows a system is drawn with are copied from the Data Engineer pipelines
 * part (de-pipelines/parts.tsx), with a `lit` swell this video's flowchart
 * uses as each concern is named.
 *
 * What is new: the page's prompt as a listing whose highlights follow a span
 * of the text across line breaks (four ingredients, four colors), a cross to
 * stand beside the interview kit's tick, and a spot that can show another
 * part's hero only once that part's art is on disk.
 */
export {
  Console,
  consoleHeight,
  Drift,
  Headline,
  Kicker,
  Listing,
  listingHeight,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  pulse,
  RIGHT,
  Strike,
  Svg,
  X0,
} from "../da-pandas/parts";
export { OK, OK_INK };

/** The paler blue of a second data series (the output side of a bill). */
export const DATA_LIGHT = ds("blue", 300);

/** Everything inside fades off the page from `at` (ds-probability/parts.tsx),
 *  for a figure the scene has finished with before the next one takes its
 *  place. */
export const Clear: React.FC<{ at: number; children: React.ReactNode }> = ({ at: from, children }) => {
  const frame = useCurrentFrame();
  const o = ease(frame, from, 14);
  if (o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - o, transform: `translateY(${-o * 8}px)` }}>{children}</div>;
};

/**
 * The index of the listing line that holds `text`. A highlight finds its line
 * by what the line says, never by a number (ds-sql/parts.tsx).
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/**
 * The rule between two columns of text set side by side: 1px of HAIRLINE,
 * centred in the gap at `x`, the height of the columns' text, drawn down on
 * `at` (the column to its right's cue). README, "No cards unless the layout
 * needs one".
 */
export const ColumnRule: React.FC<{ x: number; top: number; height: number; at: number; dim?: number }> = ({ x, top, height, at, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left: Math.round(x), top, width: 1, height: height * p, background: HAIRLINE, opacity: 1 - d }} />;
};

/** A plain sentence on the page. */
export const line = (size = 26, color: string = INK): React.CSSProperties => ({ ...note(size, color), whiteSpace: "nowrap" });

// ── Ticks and crosses ────────────────────────────────────────────────────────

/** A cross, drawn on `at` in the trap's red: the interview kit's Tick's
 *  opposite. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, at, 7);
  const b = ease(frame, at + 5, 7);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M6 6 L18 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M18 6 L6 18" fill="none" stroke={color} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};

// ── Boxes and arrows (de-pipelines/parts.tsx) ────────────────────────────────

/** What a box is: data (blue), the right answer (green), the trap (red),
 *  plain ink (a tool, a process), or what the narration points at (yellow). */
export type Tone = "data" | "ok" | "bad" | "plain" | "lit";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  plain: { line: INK, fill: PAPER, ink: INK },
  lit: { line: inkOf.yellow, fill: HIGHLIGHT, ink: INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/**
 * A box: a rounded rectangle that pops in on `at`, with a title and an
 * optional line under it. `lit` (a frame) washes it in the highlighter's
 * yellow from then on, `litOut` lifts the wash again: the part of the
 * drawing the narration is on.
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
  litOut?: number;
  dashed?: boolean;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "data", size = 24, subSize = 20, dim, out, lit, litOut, dashed, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const l = (lit === undefined ? 0 : ease(frame, lit, 12)) * (litOut === undefined ? 1 : 1 - ease(frame, litOut, 14));
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
        border: `${2.5 + 1.5 * l}px ${dashed ? "dashed" : "solid"} ${t.line}`,
        borderRadius: 12,
        background: `color-mix(in srgb, ${HIGHLIGHT} ${l * 100}%, ${t.fill})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "0 14px",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
        transformOrigin: "50% 50%",
      }}
    >
      <span style={{ ...label(size, t.ink), fontWeight: 600, whiteSpace: "nowrap", textAlign: "center" }}>{title}</span>
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: "center" }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `dash` draws it dashed; `lit` swells it in the highlighter's
 * yellow underneath, for the edge the narration is on.
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
  lit?: number;
  litOut?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dash, dim, out, lit, litOut }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  const l = (lit === undefined ? 0 : ease(frame, lit, 12)) * (litOut === undefined ? 1 : 1 - ease(frame, litOut, 14));
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } =
    points.length > 2 ? roundedPolyline(points, 18) : { d: `M${points[0][0]},${points[0][1]} L${points[1][0]},${points[1][1]}`, samples: [...points] };
  // A straight two-point line still needs samples along it for the head.
  const sampled: Pt[] =
    samples.length > 2
      ? samples
      : Array.from(
          { length: 41 },
          (_, i) => [points[0][0] + ((points[1][0] - points[0][0]) * i) / 40, points[0][1] + ((points[1][1] - points[0][1]) * i) / 40] as Pt,
        );
  const len = lineLength(sampled);
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
      {l > 0 ? <path d={path} fill="none" stroke={HIGHLIGHT} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" opacity={l} /> : null}
      {dash ? (
        <g style={{ clipPath: clip }}>
          <path d={path} fill="none" stroke={color} strokeWidth={width} strokeDasharray={dash} />
        </g>
      ) : (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width + 1.2 * l}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${p * reach} 1`}
        />
      )}
      <path d={arrowHead(sampled, head, 8, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />
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
}> = ({ x, y, at, tone = "data", size = 21, out, dim, solid, children }) => {
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
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </Ink>
  );
};

// ── The prompt, with its ingredients marked ─────────────────────────────────

/** The four ingredients of a good prompt, a color each: the brand's
 *  categorical hues, so none of them borrows red, green or yellow, which keep
 *  their meanings in this series. */
export const INGREDIENT_INK = {
  context: inkOf.blue,
  interface: inkOf.purple,
  constraints: inkOf.orange,
  check: inkOf.teal,
} as const;
export const ingredientBand = (role: keyof typeof INGREDIENT_INK) => {
  const hue = { context: "blue", interface: "purple", constraints: "orange", check: "teal" } as const;
  return `color-mix(in srgb, ${ds(hue[role], 400)} 34%, transparent)`;
};

/**
 * Where a span of the joined text sits in the printed lines: one
 * [line, from, to) run per line it crosses. `lines` are printed as they are,
 * and the joined text is each line trimmed and joined by single spaces, which
 * is how check.mjs joins the page's fence (results.json's `better`).
 */
export const spanRuns = (lines: readonly string[], span: string): { line: number; from: number; to: number }[] => {
  const pos: { line: number; col: number }[] = [];
  let joined = "";
  lines.forEach((l, i) => {
    const start = l.length - l.trimStart().length;
    const text = l.trim();
    if (!text) return;
    if (joined) {
      joined += " ";
      pos.push({ line: -1, col: -1 });
    }
    for (let k = 0; k < text.length; k++) pos.push({ line: i, col: start + k });
    joined += text;
  });
  const at = joined.indexOf(span);
  if (at < 0) throw new Error(`the prompt does not say ${JSON.stringify(span)}`);
  const runs: { line: number; from: number; to: number }[] = [];
  for (let k = at; k < at + span.length; k++) {
    const p = pos[k];
    if (p.line < 0) continue;
    const last = runs[runs.length - 1];
    if (last && last.line === p.line && last.to === p.col) last.to = p.col + 1;
    else runs.push({ line: p.line, from: p.col, to: p.col + 1 });
  }
  return runs;
};

/** JetBrains Mono's advance: every glyph is 0.6em wide. */
const ADVANCE = 0.6;

export const promptGeometry = (size: number) => ({ lineH: Math.round(size * 1.75), padY: Math.round(size * 0.7), padX: Math.round(size * 0.85) });
export const promptHeight = (lines: number, size: number) => {
  const g = promptGeometry(size);
  return g.padY * 2 + lines * g.lineH;
};

export type SpanMark = { span: string; at: number; color: string; out?: number };

/**
 * A prompt printed as the page prints it, in the listing face on tinted
 * paper, plain text with no syntax colors (it is English, not code), every
 * line inking in from `at`. Each mark lays a band under a span of the text,
 * found by what it says and followed across line breaks, swept on its frame.
 */
export const PromptListing: React.FC<{
  lines: readonly string[];
  x: number;
  top: number;
  width: number;
  size?: number;
  at: number;
  marks?: readonly SpanMark[];
  dim?: number;
  ink?: string;
}> = ({ lines, x, top, width, size = 22, at, marks = [], dim, ink = INK }) => {
  const frame = useCurrentFrame();
  const g = promptGeometry(size);
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (p <= 0) return null;
  const ch = size * ADVANCE;
  return (
    <div style={{ position: "absolute", left: x, top, width, height: promptHeight(lines.length, size), opacity: 1 - d }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ds("gray", 50),
          clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
          borderTop: `2px solid ${INK}`,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      />
      {marks.flatMap((m, mi) => {
        const runs = spanRuns(lines, m.span);
        const total = runs.reduce((s, r) => s + (r.to - r.from), 0);
        // The sweep runs through the span's runs in reading order, so a band
        // that crosses a line break finishes one line before it starts the next.
        const w = ease(frame, m.at, 10 + Math.min(22, total / 6)) * total;
        const o = m.out === undefined ? 0 : ease(frame, m.out, 12);
        let before = 0;
        return runs.map((r, ri) => {
          const len = r.to - r.from;
          const shown = Math.max(0, Math.min(len, w - before));
          before += len;
          if (shown <= 0 || o >= 1) return null;
          return (
            <div
              key={`${mi}-${ri}`}
              style={{
                position: "absolute",
                left: g.padX + r.from * ch - size * 0.12,
                top: g.padY + r.line * g.lineH + g.lineH * 0.1,
                width: shown * ch + size * 0.24,
                height: g.lineH * 0.8,
                background: m.color,
                borderRadius: 4,
                opacity: 1 - o,
              }}
            />
          );
        });
      })}
      {lines.map((l, i) => (
        <Ink key={i} at={at + 4 + i * 3} dur={14} style={{ left: g.padX, top: g.padY + i * g.lineH, height: g.lineH, display: "flex", alignItems: "center" }}>
          <span style={{ fontFamily: MONO, fontSize: size, whiteSpace: "pre", fontVariantLigatures: "none", color: ink }}>{l}</span>
        </Ink>
      ))}
    </div>
  );
};

/** Where a span's first run starts and its last run ends, in page pixels,
 *  for a note or a ring placed against it. */
export const spanBox = (lines: readonly string[], span: string, x: number, top: number, size: number) => {
  const g = promptGeometry(size);
  const ch = size * ADVANCE;
  const runs = spanRuns(lines, span);
  const first = runs[0];
  const last = runs[runs.length - 1];
  return {
    x0: x + g.padX + first.from * ch,
    y0: top + g.padY + first.line * g.lineH,
    x1: x + g.padX + last.to * ch,
    y1: top + g.padY + (last.line + 1) * g.lineH,
    lineH: g.lineH,
  };
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Whether a file is in public/: another part's art may not be generated yet
 *  while the series is being built, and an <Img> that 404s fails the render.
 *  The file list is the bundle's, read once. */
const ON_DISK = (() => {
  try {
    return new Set(getStaticFiles().map((f) => f.name));
  } catch {
    return null;
  }
})();
export const hasArt = (video: string, id: string) => (ON_DISK ? ON_DISK.has(`images/${video}/${id}.webp`) : video === VIDEO);

/** A watercolor spot from illustrations.json (or another part's hero, by
 *  `video`): it pops in on `at`, bobs gently, dims from `dim` and fades on
 *  `out`. `phase` staggers the bob, so a row of heroes doesn't move as one. */
export const Spot: React.FC<{
  id: string;
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  phase?: number;
  amp?: number;
}> = ({ id, video = VIDEO, at, out, dim, left, top, width, height, phase = 0, amp = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || !hasArt(video, id) || p <= 0.001 || o >= 1) return null;
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
        transform: `translateY(${bob(frame + phase, amp, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** The hero: 937x1024 pixels, so at 4K it is drawn at most half that. */
export const HERO = { id: "be-ai-round-lemur", w: 937, h: 1024 };
