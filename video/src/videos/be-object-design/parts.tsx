import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label, note } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (Drift, Kicker, Headline,
 * Mark, Strike) is da-pandas/parts.tsx's, copied so the series reads alike;
 * the boxes and arrows are de-pipelines/parts.tsx's, which draw a system as
 * its parts. What is new: a box can hold rows (a class's jobs), a stamp marks
 * a box "not edited", and a gauge reads cohesion or coupling.
 *
 * No code is drawn anywhere in this video: a class is a box named in the
 * shop's words, a dependency is an arrow, and a run's outcome is a value.
 */

export { OK, OK_INK };

export const X0 = 120;
export const RIGHT = 1824;
export const KICKER_Y = 112;
export const HEAD_Y = 150;

export const MARK = HIGHLIGHT;
export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** A full-page SVG layer. */
export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on a finished figure (da-pandas/parts.tsx). */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.025,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(KICKER_Y), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/** A headline in two inks on one line: the lead in roman, the turn in italic accent ink. */
export const Headline: React.FC<{ lead: string; turn?: string; at: number; turnAt?: number; out?: number; size?: number; top?: number }> = ({
  lead,
  turn,
  at,
  turnAt,
  out,
  size = 66,
  top = HEAD_Y,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", ...headline(size, true), color: ACCENT_INK, whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A highlighter stroke laid under the words it wraps, swept left to right on
 * `at` and lifted on `out`. The band reaches 0.14em past the words on each
 * side, and the margin gives that back, so a neighbour keeps a full space.
 */
export const Mark: React.FC<{ at: number; out?: number; dur?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  dur = 12,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
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

const textOf = (node: React.ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : React.isValidElement<{ children?: React.ReactNode }>(node)
        ? textOf(node.props.children)
        : "";

/** A line struck through the words it wraps, drawn left to right on `at`,
 *  tilting less over a longer phrase (da-pandas/parts.tsx). */
export const Strike: React.FC<{ at: number; color?: string; top?: string; children: React.ReactNode }> = ({ at, color = ACCENT, top = "0.55em", children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const ems = Math.max(1, textOf(children).length * 0.5);
  const tilt = Math.min(2, (Math.atan(0.12 / ems) * 180) / Math.PI);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span
        style={{
          position: "absolute",
          left: "-0.06em",
          top,
          width: `calc((100% + 0.12em) * ${p})`,
          height: "0.08em",
          minHeight: 3,
          background: color,
          borderRadius: 2,
          transform: `rotate(${-tilt}deg)`,
          transformOrigin: "0 50%",
          opacity: p > 0 ? 1 : 0,
        }}
      />
    </span>
  );
};

// ── Boxes and arrows ─────────────────────────────────────────────────────────

/** What a box is: data (blue), the right answer (green), the trap (red), the
 *  thing the narration points at (yellow), or plain ink (a class, a part). */
export type Tone = "data" | "ok" | "bad" | "plain" | "look";
const TONE: Record<Tone, { line: string; fill: string; ink: string }> = {
  data: { line: BAR, fill: `color-mix(in srgb, ${BAR} 10%, ${PAPER})`, ink: BLUE_INK },
  ok: { line: OK, fill: `color-mix(in srgb, ${OK} 12%, ${PAPER})`, ink: OK_INK },
  bad: { line: ACCENT, fill: `color-mix(in srgb, ${ACCENT} 10%, ${PAPER})`, ink: ACCENT_INK },
  plain: { line: INK, fill: PAPER, ink: INK },
  look: { line: ds("yellow", 600), fill: `color-mix(in srgb, ${ds("yellow", 400)} 30%, ${PAPER})`, ink: INK },
};
export const toneInk = (t: Tone) => TONE[t].ink;
export const toneLine = (t: Tone) => TONE[t].line;
export const toneFill = (t: Tone) => TONE[t].fill;

/** A tone that changes over time: `tone`, then each of `tones` blended in
 *  over 12 frames from its frame. */
export const toneAt = (frame: number, tone: Tone, tones: readonly (readonly [number, Tone])[] = []) => {
  let c = { ...TONE[tone] };
  for (const [at, t] of tones) {
    const k = ease(frame, at, 12);
    if (k <= 0) continue;
    const mix = (u: string, v: string) => (k >= 1 ? v : `color-mix(in srgb, ${v} ${Math.round(k * 100)}%, ${u})`);
    c = { line: mix(c.line, TONE[t].line), fill: mix(c.fill, TONE[t].fill), ink: mix(c.ink, TONE[t].ink) };
  }
  return c;
};

/**
 * A box: a class, a part or a stage. It pops in on `at`, with a title and an
 * optional line under it. `tone` may change while it is up (`tones`). `lit` swells its border
 * for a box the narration names again.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  /** Later tones, each blended in over 12 frames from its frame. */
  tones?: readonly (readonly [number, Tone])[];
  size?: number;
  subSize?: number;
  dim?: number;
  undim?: number;
  out?: number;
  lit?: number;
  dashed?: boolean;
  align?: "center" | "left";
  radius?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, title, sub, tone = "plain", tones = [], size = 25, subSize = 21, dim, undim, out, lit = 0, dashed, align = "center", radius = 12, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.62 * (undim === undefined ? 1 : 1 - ease(frame, undim, 14));
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  const c = toneAt(frame, tone, tones);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `${2.5 + 2 * lit}px ${dashed ? "dashed" : "solid"} ${c.line}`,
        borderRadius: radius,
        background: c.fill,
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
      {title ? <span style={{ ...label(size, c.ink), fontWeight: 700, whiteSpace: "nowrap", textAlign: align }}>{title}</span> : null}
      {sub ? <span style={{ ...note(subSize, INK_SOFT), whiteSpace: "nowrap", textAlign: align }}>{sub}</span> : null}
      {children}
    </div>
  );
};

/**
 * An arrow along `points` (straight segments, corners rounded), drawn from
 * its tail on `at`, its head built by arrowHead() on the straight last
 * stretch. `head={0}` draws a plain connector with no head.
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
  const reach = head > 0 ? Math.max(0, (len - head + 1) / len) : 1;
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
      {head > 0 ? <path d={arrowHead(line, head, head * 0.53, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} /> : null}
    </svg>
  );
};

/** A short tag set as plain text in its tone's ink (no outline, no fill:
 *  the house sets tags as words, not pills), inking in. */
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
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  return (
    <Ink at={at} dur={12} out={out} style={{ left: x, top: y + 6, opacity: 1 - d }}>
      <span style={{ ...label(size, tone === "plain" ? INK_SOFT : TONE[tone].ink), fontWeight: 700, whiteSpace: "nowrap" }}>{children}</span>
    </Ink>
  );
};

/** A line of text that inks in at (x, y): the house note, in one size. */
export const Line: React.FC<{
  x: number;
  y: number;
  at: number;
  size?: number;
  color?: string;
  weight?: number;
  out?: number;
  dim?: number;
  align?: "left" | "center" | "right";
  width?: number;
  children: React.ReactNode;
}> = ({ x, y, at, size = 26, color = INK, weight = 500, out, dim, align = "left", width, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  return (
    <Ink
      at={at}
      dur={16}
      out={out}
      style={{
        left: align === "left" ? x : align === "center" ? x - (width ?? 0) / 2 : x - (width ?? 0),
        top: y,
        width,
        textAlign: align,
        whiteSpace: "nowrap",
        opacity: 1 - d,
        ...note(size, color),
        fontWeight: weight,
      }}
    >
      {children}
    </Ink>
  );
};

/** A value set large in its tone's ink, centered in a w x h slot: a count,
 *  a total. No box around it; `lit` swells it a little. */
export const Value: React.FC<{
  x: number;
  y: number;
  at: number;
  w?: number;
  h?: number;
  tone?: Tone;
  size?: number;
  lit?: number;
  out?: number;
  dim?: number;
  children: React.ReactNode;
}> = ({ x, y, at, w = 110, h = 62, tone = "data", size = 40, lit = 0, out, dim, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.62;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        opacity: Math.min(1, p) * (1 - d) * (1 - o),
        transform: `scale(${(0.9 + 0.1 * Math.min(1, p)) * (1 + 0.12 * lit)})`,
        transformOrigin: "0% 50%",
      }}
    >
      <span style={{ ...label(size, toneInk(tone)), fontWeight: 750, fontVariantNumeric: "tabular-nums lining-nums", whiteSpace: "nowrap" }}>{children}</span>
    </div>
  );
};

/**
 * A semicircular gauge: a track from "low" to "high", and a needle at
 * `value` (0 to 1) that swings between the values `steps` name, each from
 * its frame. The needle takes the tone of the step it settles on.
 */
export const Gauge: React.FC<{
  cx: number;
  cy: number;
  r: number;
  at: number;
  steps: readonly { at: number; value: number; tone: Tone }[];
  dim?: number;
}> = ({ cx, cy, r, at, steps, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  if (p <= 0) return null;
  let value = 0.5;
  let color = INK;
  for (const s of steps) {
    const k = ease(frame, s.at, 20);
    if (k <= 0) continue;
    value = lerp(value, s.value, k);
    color = k >= 1 ? toneLine(s.tone) : `color-mix(in srgb, ${toneLine(s.tone)} ${Math.round(k * 100)}%, ${color})`;
  }
  const ang = Math.PI * (1 - value);
  const tip: Pt = [cx + Math.cos(ang) * (r - 14), cy - Math.sin(ang) * (r - 14)];
  const arc = `M${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy}`;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - d) }}>
      <path d={arc} fill="none" stroke={ds("gray", 200)} strokeWidth={14} strokeLinecap="round" />
      <path d={arc} fill="none" stroke={ds("gray", 400)} strokeWidth={2} strokeDasharray="2 22" />
      <line x1={cx} y1={cy} x2={tip[0]} y2={tip[1]} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={8} fill={color} />
    </svg>
  );
};

/** A tick or a cross, drawn on `at`, in the right answer's green or the trap's red. */
export const Mark2: React.FC<{ at: number; kind: "tick" | "cross"; size?: number; style?: React.CSSProperties }> = ({ at, kind, size = 28, style }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 10);
  if (p <= 0) return null;
  const color = kind === "tick" ? OK : ACCENT;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute", overflow: "visible", ...style }}>
      {kind === "tick" ? (
        <path d="M4 12.5 L10 18 L20 6" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p} 1`} />
      ) : (
        <>
          <path d="M5 5 L19 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${Math.min(1, p * 2)} 1`} />
          <path d="M19 5 L5 19" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${Math.max(0, p * 2 - 1)} 1`} />
        </>
      )}
    </svg>
  );
};

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at`, bobs gently,
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
      id={`${VIDEO}-${id}`}
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame, 4, 110) + (1 - p) * 24}px)`,
      }}
    />
  );
};

export const WHITE = PAPER;
export const SOFT = INK_SOFT;
export const BLUE = BAR;
export { ACCENT, ACCENT_INK, BLUE_INK, INK };

/** Each watercolor's natural size (public/images/be-object-design/), so a
 *  spot is drawn at its own aspect and never past half its pixels at 4K. */
export const ART = {
  armadillo: [1492, 1003],
  multitool: [1014, 871],
  parcel: [1024, 850],
  plug: [1011, 943],
  "shopping-cart": [969, 1024],
} as const;
export type ArtId = keyof typeof ART;

/** A spot `h` px tall at its own aspect, with its top-left at (left, top). */
export const ArtSpot: React.FC<{ id: ArtId; at: number; out?: number; dim?: number; left: number; top: number; h: number }> = ({ id, h, ...rest }) => {
  const [nw, nh] = ART[id];
  return <Spot id={id} width={Math.round((h * nw) / nh)} height={h} {...rest} />;
};
/** The width of a spot `h` px tall. */
export const artW = (id: ArtId, h: number) => Math.round((h * ART[id][0]) / ART[id][1]);

/**
 * The vertical hairline between two columns set side by side (README, "No
 * cards"): 1px HAIRLINE from `top` to `bottom`, centred in the gap by the
 * caller, inking in on `at` with the column to its right.
 */
export const VRule: React.FC<{ x: number; top: number; bottom: number; at: number; dim?: number; out?: number }> = ({ x, top, bottom, at, dim, out }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.62;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: Math.round(x),
        top,
        width: 1,
        height: (bottom - top) * p,
        background: HAIRLINE,
        opacity: (1 - d) * (1 - o),
      }}
    />
  );
};
