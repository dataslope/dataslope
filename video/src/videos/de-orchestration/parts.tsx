import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, type Pt, roundedPolyline } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, label, note } from "../../editorial/style";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (the slow push, kicker,
 * headline, highlighter, plot axes) is the Data Analyst statistics part's, as
 * the Data Scientist mechanism videos take it, and the listings are the Data
 * Analyst SQL and pandas parts' own, so the series looks like one family. What
 * is new here is the orchestration drawing: a task box that changes state as
 * a run goes through it, an edge between two tasks, and a cross for a failure.
 */
export {
  at,
  Axes,
  Drift,
  Headline,
  Kicker,
  Mark,
  MARK_BAD,
  MARK_OK,
  pulse,
  type Scale,
  Strike,
  Svg,
  X0,
} from "../da-statistics-communication/parts";
export { Listing as PyListing, listingHeight } from "../da-pandas/parts";
export { Listing as SqlListing } from "../da-sql/parts";
export { OK, OK_INK };

/** The highlighter, as a cell or line band: what the narration points at. */
export const MARK = HIGHLIGHT;

/**
 * The index of the listing line that holds `text`, so a highlight follows the
 * line it is about (ds-sql/parts.tsx). A reworded listing fails the render.
 */
export const lineOf = (lines: readonly string[], text: string): number => {
  const i = lines.findIndex((l) => l.includes(text));
  if (i < 0) throw new Error(`no listing line holds ${JSON.stringify(text)}`);
  return i;
};

/** The watercolor hero from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
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

// ── Task and asset boxes ─────────────────────────────────────────────────────

/**
 * A task's state, each a meaning the series keeps: plain ink before it runs,
 * data blue while it runs or holds data, green once it succeeded, red when it
 * failed or is the trap, yellow while the narration points at it, and quiet
 * (dashed, faded) when it never runs.
 */
export type Tone = "plain" | "data" | "ok" | "bad" | "lit" | "quiet";

const TONES: Record<Tone, { border: string; fill: string; ink: string }> = {
  plain: { border: INK, fill: PAPER, ink: INK },
  data: { border: BAR, fill: `color-mix(in srgb, ${BAR} 12%, ${PAPER})`, ink: BLUE_INK },
  ok: { border: OK, fill: `color-mix(in srgb, ${OK} 14%, ${PAPER})`, ink: OK_INK },
  bad: { border: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 12%, ${PAPER})`, ink: ACCENT_INK },
  lit: { border: INK, fill: HIGHLIGHT, ink: INK },
  quiet: { border: INK_SOFT, fill: PAPER, ink: INK_SOFT },
};

/** The tone a box has at `frame`, blended over 10 frames from the one before. */
const toneAt = (frame: number, tones: readonly { at: number; tone: Tone }[]) => {
  let prev: Tone = "plain";
  let cur: Tone = "plain";
  let since = -Infinity;
  for (const t of tones) {
    if (frame >= t.at) {
      prev = cur;
      cur = t.tone;
      since = t.at;
    }
  }
  const p = Number.isFinite(since) ? ease(frame, since, 10) : 1;
  const mix = (k: "border" | "fill" | "ink") =>
    p >= 1 ? TONES[cur][k] : `color-mix(in srgb, ${TONES[cur][k]} ${Math.round(p * 100)}%, ${TONES[prev][k]})`;
  const quiet = (cur === "quiet" ? p : 0) + (prev === "quiet" ? 1 - p : 0);
  return { border: mix("border"), fill: mix("fill"), ink: mix("ink"), quiet };
};

/**
 * A task (or asset) in a pipeline: a rounded box with its name, centred on
 * (`cx`, `cy`). It inks in on `at` and takes each tone in `tones` from its
 * frame. `mono` sets the name as code; `shape: "asset"` draws it as a table,
 * a header band over two faint rows.
 */
export const TaskBox: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  at: number;
  tones?: readonly { at: number; tone: Tone }[];
  mono?: boolean;
  size?: number;
  shape?: "task" | "asset";
  out?: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ cx, cy, w, h, at: from, tones = [], mono = false, size = 24, shape = "task", out, dim, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const t = toneAt(frame, tones);
  const band = shape === "asset" ? Math.round(h * 0.26) : 0;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2.4px ${t.quiet > 0.5 ? "dashed" : "solid"} ${t.border}`,
        borderRadius: shape === "asset" ? 8 : 12,
        background: t.fill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: band,
        opacity: p * (1 - o) * (1 - d) * (1 - 0.55 * t.quiet),
        transform: `scale(${0.92 + 0.08 * p})`,
        overflow: "hidden",
      }}
    >
      {shape === "asset" ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: band, background: t.border, opacity: 0.85 }} />
          <div style={{ position: "absolute", left: 10, right: 10, bottom: h * 0.18, height: 1.5, background: t.border, opacity: 0.25 }} />
        </>
      ) : null}
      <span
        style={{
          position: "relative",
          ...(mono
            ? { fontFamily: MONO, fontSize: size * 0.92, fontWeight: 600, fontVariantLigatures: "none", color: t.ink }
            : { ...note(size, t.ink), fontWeight: 650 }),
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </div>
  );
};

/**
 * An edge between two tasks: a polyline with rounded corners that draws
 * itself from its first point to its last on `at`, ending in a filled head
 * built by arrow.ts. `dash` draws it dashed (an edge that is inferred, or a
 * path that is not taken) and fades it in instead.
 */
export const Edge: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  out?: number;
  dim?: number;
  color?: string;
  width?: number;
  head?: number;
  dash?: string;
}> = ({ points, at: from, dur = 14, out, dim, color = INK, width = 2.4, head = 13, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const { d: path, samples } = roundedPolyline(points, 18);
  const len = lineLength(samples);
  const reach = (len - head + 1) / len;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) }}>
      {dash ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeDasharray={dash}
          strokeLinejoin="round"
          style={{ clipPath: `inset(-20px ${(1 - p) * 100}% -20px -20px)` }}
        />
      ) : (
        <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      )}
      <path d={arrowHead(samples, head, 7, { filled: true })} fill={color} opacity={ease(frame, from + dur - 4, 5)} />
    </svg>
  );
};

/** A cross, drawn stroke by stroke on `at`, in the error's red: a failure. */
export const Cross: React.FC<{ at: number; size?: number; color?: string }> = ({ at: from, size = 22, color = ACCENT }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, from, 7);
  const b = ease(frame, from + 5, 7);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", overflow: "visible" }}>
      <path d="M5 5 L19 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${a} 1`} />
      <path d="M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${b} 1`} />
    </svg>
  );
};

/** A small rounded tag on the page: a check's name, a setting, a state. */
export const Pill: React.FC<{
  x: number;
  y: number;
  at: number;
  ink?: string;
  fill?: string;
  size?: number;
  out?: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ x, y, at: from, ink = INK, fill = PAPER, size = 22, out, dim, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `${Math.round(size * 0.28)}px ${Math.round(size * 0.62)}px`,
        border: `2px solid ${ink}`,
        borderRadius: 999,
        background: fill,
        ...label(size, ink),
        whiteSpace: "nowrap",
        opacity: p * (1 - o) * (1 - d),
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};
