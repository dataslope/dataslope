import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, drift, ease, pop } from "../../components/motion";
import { OK, OK_INK } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, headline, HIGHLIGHT, INK, INK_SOFT, label, note, PAPER, TABULAR } from "../../editorial/style";
import { Ink, OutlineBadge, type OutlineTone, outlineInk } from "../../editorial/ui";
import { ds } from "../../theme/brand";
import { MONO, SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture (Drift, Kicker, Headline,
 * Mark, Line) follows be-algorithms/parts.tsx, copied rather than imported so
 * this video does not move when that one is revised. What is local, after the
 * owner's 2026-11-20 badge review: a diagram box that is outlined, never
 * filled (2px near-black edge, black text, a highlight colors edge and text
 * together); filled shapes with no outline (an 8x8 digit, a weight image,
 * a bar, a kept activation); a ring, a log scale, and the spot art.
 */
export { OK, OK_INK };
export { ACCENT, ACCENT_INK, BAR, BLUE_INK, HAIRLINE, HIGHLIGHT, INK, INK_SOFT, PAPER };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
export const RIGHT = 1800;

/** Yellow as a stroke (an arrow, a ring): the 500 is too pale for a line on
 *  white, so lines take the 600, and type takes the outlined badge's ink. */
export const LOOK = ds("yellow", 600);
export const LOOK_INK = outlineInk("yellow");
/** A filled shape that must hold its shape on white: blue a step deeper. */
export const BLUE_FILL = ds("blue", 200);
export const GREY_FILL = ds("gray", 300);
export const GREY_INK = ds("gray", 600);

export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 26%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Mix two colors: `t` of `b` over `a`. */
export const mix = (a: string, b: string, t: number) =>
  t <= 0 ? a : t >= 1 ? b : `color-mix(in srgb, ${b} ${Math.round(t * 100)}%, ${a})`;

/** 0 → 1 → 0 over `dur` frames from `at`: a swell for a mark named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

/** "26,122": a count as it is set on screen. */
export const int = (x: number) => Math.round(x).toLocaleString("en-US");

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A slow push on the whole scene: a few percent over its life, up to speed
 *  in two seconds, so a long scene never sits still. */
export const Drift: React.FC<{ from: number; to: number; scale?: number; origin?: string; children: React.ReactNode }> = ({
  from,
  to,
  scale = 0.02,
  origin = "50% 45%",
  children,
}) => {
  const frame = useCurrentFrame();
  const s = 1 + scale * drift(frame, from, to);
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: origin }}>{children}</div>;
};

/** Fades its children in on `at` and out on `out`; `dim` sets them back. */
export const Fade: React.FC<{ at: number; out?: number; dim?: number; dur?: number; children: React.ReactNode }> = ({
  at,
  out,
  dim,
  dur = 10,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0 || o >= 1) return null;
  return <div style={{ position: "absolute", inset: 0, opacity: p * (1 - o) * (1 - d) }}>{children}</div>;
};

// ── Headings ─────────────────────────────────────────────────────────────────

/** A part's kicker, top left, in sentence case. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={{ ...label(26, ACCENT_INK), fontWeight: 500 }}>{children}</span>
    </Ink>
  );
};

/** A headline in two pieces on one line, each inked on its own cue. */
export const Headline: React.FC<{ lead: string; turn?: string; at: number; turnAt?: number; out?: number; size?: number }> = ({
  lead,
  turn,
  at,
  turnAt,
  out,
  size = 68,
}) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(150), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={at} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn ? (
        <Ink at={turnAt ?? at + 10} dur={18} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/** Code inside running text, at the text's own size (QMono's spacing). */
export const Mono: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color }) => (
  <span style={{ fontFamily: MONO, fontSize: "max(19px, 0.92em)", fontStyle: "normal", fontWeight: 500, color, fontVariantLigatures: "none", wordSpacing: "-0.3em" }}>
    {children}
  </span>
);

/**
 * A highlighter stroke under the words it wraps, swept on `at`, lifted on
 * `out`. It reaches 0.14em past the words on each side and takes that back as
 * margin, so a neighbour keeps a full space (da-pandas/parts.tsx).
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

/** One line of Inter at one size that inks in on `at`: the scene's notes. */
export const Line: React.FC<{
  at: number;
  x: number;
  y: number;
  size?: number;
  color?: string;
  weight?: number;
  out?: number;
  dim?: number;
  width?: number;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}> = ({ at, x, y, size = 24, color = INK, weight = 500, out, dim, width, align = "left", children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  return (
    <Ink
      at={at}
      dur={14}
      out={out}
      style={{
        left: align === "left" ? x : align === "center" ? x - (width ?? 0) / 2 : x - (width ?? 0),
        top: y,
        width,
        textAlign: align,
        whiteSpace: "nowrap",
        opacity: 1 - d,
      }}
    >
      <span style={{ ...note(size, color), fontWeight: weight }}>{children}</span>
    </Ink>
  );
};

// ── Diagram boxes and arrows ─────────────────────────────────────────────────

export type Hue = "blue" | "green" | "red" | "yellow" | "gray";
/** A hue as a box's edge and text. */
export const hueInk = (hue: Hue) => outlineInk(hue);

/**
 * A diagram's box: no fill, black text, a 2px near-black outline, corners of
 * 8 (the owner, 2026-11-20). A highlight (`hue` from `hueAt`) colors the
 * outline and the text together, never a fill. It pops in on `at`.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  hue?: Hue;
  hueAt?: number;
  hueOut?: number;
  size?: number;
  out?: number;
  dim?: number;
  dashed?: boolean;
  mono?: boolean;
  radius?: number;
  children: React.ReactNode;
}> = ({ x, y, w, h, at, hue, hueAt, hueOut, size = 24, out, dim, dashed, mono, radius = 8, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  const t = hue ? ease(frame, hueAt ?? at, 10) * (hueOut === undefined ? 1 : 1 - ease(frame, hueOut, 10)) : 0;
  const ink = hue ? mix(INK, hueInk(hue), t) : INK;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${ink}`,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.3em",
        ...label(size, ink),
        fontWeight: 500,
        ...(mono ? { fontFamily: MONO } : {}),
        whiteSpace: "nowrap",
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `scale(${0.9 + 0.1 * Math.min(1, p)})`,
      }}
    >
      {children}
    </div>
  );
};

/** A round node: an outlined circle around its name, popping in on `at`. */
export const Node: React.FC<{
  x: number;
  y: number;
  r: number;
  at: number;
  hue?: Hue;
  hueAt?: number;
  size?: number;
  out?: number;
  dim?: number;
  children?: React.ReactNode;
}> = ({ x, y, r, at, hue, hueAt, size = 24, out, dim, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  if (p <= 0.001 || o >= 1) return null;
  const t = hue ? ease(frame, hueAt ?? at, 10) : 0;
  const ink = hue ? mix(INK, hueInk(hue), t) : INK;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: 2 * r,
        height: 2 * r,
        boxSizing: "border-box",
        border: `2px solid ${ink}`,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(size, ink),
        fontWeight: 500,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `scale(${0.85 + 0.15 * Math.min(1, p)})`,
      }}
    >
      {children}
    </div>
  );
};

/** An arrow along `points` (corners rounded), drawn from its tail on `at`,
 *  its head from arrowHead() on the straight last stretch. */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  dim?: number;
  out?: number;
  opacity?: number;
  noHead?: boolean;
}> = ({ points, at, dur = 14, color = INK, width = 2.6, head = 15, dim, out, opacity = 1, noHead = false }) => {
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
  const reach = noHead ? 1 : Math.max(0, (len - head + 1) / len);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - o) * (1 - d) * opacity }}>
      <path d={path} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${p * reach} 1`} />
      {noHead ? null : <path d={arrowHead(line, head, head * 0.47, { filled: true })} fill={color} opacity={ease(frame, at + dur - 4, 5)} />}
    </svg>
  );
};

/** A ring drawn around a point on `at`: the trap's red, or a pointer's yellow. */
export const Ring: React.FC<{ x: number; y: number; r: number; at: number; out?: number; color?: string; width?: number }> = ({
  x,
  y,
  r,
  at,
  out,
  color = ACCENT,
  width = 3,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={width} pathLength={1} strokeDasharray={`${p} 1`} transform={`rotate(-90 ${x} ${y})`} />
    </svg>
  );
};

// ── Images made of pixels ────────────────────────────────────────────────────

/** A pixel's fill: blue in proportion to its value, over a pale grey so the
 *  8x8 frame holds its shape where the digit is blank. A filled shape, so
 *  no outline. */
export const pixelFill = (v: number, hue: string = BAR) =>
  `color-mix(in srgb, ${hue} ${Math.round(Math.max(0, Math.min(1, v)) * 100)}%, ${ds("gray", 100)})`;

/**
 * An 8x8 image (64 values from 0 to 1, row by row) as filled squares. `pick`
 * lights one pixel with a yellow outline; `shift` slides it right by whole
 * cells. It inks in on `at`.
 */
export const Pixels: React.FC<{
  values: readonly number[];
  x: number;
  y: number;
  cell: number;
  at: number;
  out?: number;
  dim?: number;
  gap?: number;
  hue?: string;
  pick?: { index: number; at: number; out?: number; color?: string };
  opacity?: number;
}> = ({ values, x, y, cell, at, out, dim, gap = 1, hue = BAR, pick, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.65;
  if (p <= 0 || o >= 1) return null;
  const k = pick ? ease(frame, pick.at, 10) * (pick.out === undefined ? 1 : 1 - ease(frame, pick.out, 10)) : 0;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: p * (1 - o) * (1 - d) * opacity }}>
      {values.map((v, i) => (
        <rect key={i} x={x + (i % 8) * cell} y={y + Math.floor(i / 8) * cell} width={cell - gap} height={cell - gap} rx={Math.min(3, cell / 6)} fill={pixelFill(v, hue)} />
      ))}
      {pick && k > 0 ? (
        <rect
          x={x + (pick.index % 8) * cell - 2}
          y={y + Math.floor(pick.index / 8) * cell - 2}
          width={cell - gap + 4}
          height={cell - gap + 4}
          rx={3}
          fill="none"
          stroke={pick.color ?? LOOK}
          strokeWidth={3}
          opacity={k}
        />
      ) : null}
    </svg>
  );
};

// ── Bars ─────────────────────────────────────────────────────────────────────

/**
 * A count drawn as a horizontal bar: its label on a line of its own above,
 * the bar growing from `x` on `at` to `width` px, the value at its end in the
 * label's size. A sliver stays visible for a value too small to see.
 */
export const HBar: React.FC<{
  x: number;
  y: number;
  width: number;
  at: number;
  dur?: number;
  color?: string;
  ink?: string;
  label: React.ReactNode;
  valueText: React.ReactNode;
  size?: number;
  barH?: number;
  out?: number;
  dim?: number;
}> = ({ x, y, width, at, dur = 22, color = BAR, ink = INK, label: name, valueText, size = 23, barH = 26, out, dim }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 12) * 0.6;
  if (p <= 0 || o >= 1) return null;
  const bw = Math.max(3, width) * p;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, p * 2) * (1 - o) * (1 - d) }}>
      <div style={{ ...note(size, INK), fontWeight: 500, whiteSpace: "nowrap" }}>{name}</div>
      <div style={{ position: "relative", height: barH, marginTop: 12 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: bw, height: barH, background: color, borderRadius: 3 }} />
        <div
          style={{
            position: "absolute",
            left: bw + 14,
            top: barH / 2,
            transform: "translateY(-50%)",
            ...note(size, ink),
            fontWeight: 500,
            whiteSpace: "nowrap",
            opacity: ease(frame, at + dur * 0.6, 8),
          }}
        >
          {valueText}
        </div>
      </div>
    </div>
  );
};

// ── Scales ───────────────────────────────────────────────────────────────────

/** A linear map from data units onto a span of the page. */
export type Scale = { lo: number; hi: number; a: number; b: number };
export const at = (s: Scale, v: number) => s.a + ((v - s.lo) / (s.hi - s.lo)) * (s.b - s.a);
/** A log-10 map. */
export const atLog = (s: Scale, v: number) => s.a + ((Math.log10(v) - Math.log10(s.lo)) / (Math.log10(s.hi) - Math.log10(s.lo))) * (s.b - s.a);

/** The tick text of a chart, in the chart face and tabular figures. */
export const tickStyle = (size = 20, color: string = INK_SOFT): React.CSSProperties => ({
  ...label(size, color),
  fill: color,
  fontWeight: 500,
  ...TABULAR,
});

/** A power of ten as SVG text: "10" with the exponent raised, a true minus. */
export const Pow10: React.FC<{ e: number; size?: number }> = ({ e, size = 20 }) =>
  e === 0 ? (
    <>1</>
  ) : (
    <>
      10
      <tspan dy={-size * 0.4} style={{ fontSize: size * 0.72 }}>
        {e < 0 ? `−${-e}` : e}
      </tspan>
    </>
  );

// ── The spot art ─────────────────────────────────────────────────────────────

/** A watercolor from illustrations.json: it pops in on `at` (cue an el-pop on
 *  the same frame), bobs gently, and fades on `out`. */
export const Spot: React.FC<{ id: string; at: number; out?: number; left: number; top: number; width: number; height: number }> = ({
  id,
  at,
  out,
  left,
  top,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
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
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame, 4, 120) + (1 - Math.min(1, p)) * 24}px)`,
      }}
    />
  );
};

/** Each watercolor's id and its pixel size after the import trim, so a spot
 *  is drawn at its own aspect and at most half its pixels (4K). */
export const ART = {
  orangutan: { id: "mle-deep-learning-orangutan", w: 924, h: 1024 },
  dice: { id: "mle-deep-learning-dice", w: 1024, h: 676 },
  dominoes: { id: "mle-deep-learning-dominoes", w: 1024, h: 590 },
  magnifier: { id: "mle-deep-learning-magnifier", w: 970, h: 1019 },
} as const;
export type ArtName = keyof typeof ART;

/** A spot of `name` whose box is `h` tall at its own aspect. */
export const Art: React.FC<{ name: ArtName; at: number; out?: number; left: number; top: number; h: number }> = ({ name, at, out, left, top, h }) => {
  const a = ART[name];
  return <Spot id={a.id} at={at} out={out} left={left} top={top} width={Math.round((h * a.w) / a.h)} height={h} />;
};

/** The outlined badge, set in Inter whatever it sits in (a badge in a plain
 *  div otherwise takes the page's default face). */
export const Tag: React.FC<{ tone?: OutlineTone; size?: number; children: React.ReactNode }> = ({ tone = "ink", size = 24, children }) => (
  <OutlineBadge tone={tone} size={size} style={{ fontFamily: SANS }}>
    {children}
  </OutlineBadge>
);
