import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { OK, OK_INK, Tick } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, OutlineBadge } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { Mark } from "../da-pandas/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The plot pieces (linear scales, axes, dots,
 * reference lines, brackets) are the Data Analyst statistics video's, the
 * curve drawn along its length is the Data Scientist evaluation video's, and
 * the headings, highlighter and strike are da-pandas's, whose Mark takes its
 * bleed back as margin; so the series stay one family. What is local: the
 * map of the round's three movements (`PlanMap`), a ruled list that inks row
 * by row, a log scale for learning curves, a one-dimensional regression tree
 * for drawing one training set's fits, and the spot illustrations.
 */
export { at, Axes, Bracket, Dots, mulberry32, type Scale, VLine } from "../da-statistics-communication/parts";
export { type Box, Curve, Fade } from "../ds-ml-evaluation/parts";
export { Drift, Kicker, lerp, Mark, pulse, Strike, Svg } from "../da-pandas/parts";
export { OK, OK_INK };

// ── Page geometry, in the layout's coordinates (pass y through `y()`) ────────

export const X0 = 120;
/** The page's right edge for text and figures. */
export const RIGHT = 1800;
/** A question card's size: every question here fits one or two lines. */
export const Q_SIZE = 60;

// ── Colors: one meaning each (interview.tsx), plus two accents for the
//    decomposition's terms, which are neither right nor wrong ───────────────

export const MARK_BAD = `color-mix(in srgb, ${ACCENT} 24%, transparent)`;
export const MARK_OK = `color-mix(in srgb, ${OK} 24%, transparent)`;
/** Bias, in the decomposition and in the stumps that show it. */
export const BIAS_C = ds("purple", 500);
export const BIAS_INK = inkOf.purple;
/** Variance, in the decomposition and in the deep trees that show it. */
export const VAR_C = ds("orange", 500);
export const VAR_INK = inkOf.orange;
/** Noise: nothing removes it, so it is grey. */
export const NOISE_C = ds("gray", 400);
/** The yellow a bracket or a span is drawn in: the highlight's own hue, a
 *  step deep enough to hold a line on white. */
export const LIT_LINE = ds("yellow", 600);
export const LIT_INK = inkOf.yellow;
/** A second data series beside the blue one (recall beside precision). */
export const SERIES2 = ds("purple", 500);
export const SERIES2_INK = inkOf.purple;

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const commas = (v: number) => v.toLocaleString("en-US");

/** A log scale onto a span of the page, for sizes from 30 to 2,000 rows. */
export type LogScale = { lo: number; hi: number; a: number; b: number };
export const atLog = (s: LogScale, v: number) => s.a + ((Math.log(v) - Math.log(s.lo)) / (Math.log(s.hi) - Math.log(s.lo))) * (s.b - s.a);

/** Inter at a note's weight, never wrapping: most text on these pages. */
export const line = (size: number, color: string = INK, weight = 500): React.CSSProperties => ({
  ...note(size, color),
  fontWeight: weight,
  whiteSpace: "nowrap",
});

/**
 * A line of text that inks in on `at` and can dim or leave. `x` and `y` are
 * page positions (`y` already through the layout).
 */
export const Say: React.FC<{
  at: number;
  x: number;
  y: number;
  out?: number;
  dim?: number;
  width?: number;
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ at: from, x, y, out, dim, width, align = "left", style, children }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.6;
  const left = align === "right" && width ? x - width : align === "center" && width ? x - width / 2 : x;
  return (
    <Ink at={from} dur={16} out={out} style={{ left, top: y, width, textAlign: align, opacity: 1 - d, ...style }}>
      {children}
    </Ink>
  );
};

// ── A ruled list ─────────────────────────────────────────────────────────────

export type ListItem = { text: React.ReactNode; at: number; color?: string; lit?: number };

/**
 * A list read item by item: a hairline above each row, 28px of air under it,
 * and the row's words inking in on their cue. `lit` lays the highlighter
 * under a row from a frame on.
 */
export const RuledList: React.FC<{
  items: readonly ListItem[];
  x: number;
  top: number;
  width: number;
  pitch: number;
  size?: number;
  out?: number;
  dim?: number;
}> = ({ items, x, top, width, pitch, size = 30, out, dim }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.55;
  if (o >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: (1 - o) * (1 - d) }}>
      {items.map((it, i) => {
        const top0 = top + i * pitch;
        const r = ease(frame, it.at - 6, 14);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: x, top: top0, width: width * r, height: 1, background: HAIRLINE }} />
            <Ink at={it.at} dur={14} style={{ left: x, top: top0 + 28, whiteSpace: "nowrap" }}>
              <span style={line(size, it.color ?? INK)}>{it.lit === undefined ? it.text : <Mark at={it.lit}>{it.text}</Mark>}</span>
            </Ink>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── The map of the round ─────────────────────────────────────────────────────

/** The three movements the ten worked questions run in, and the quick two. */
export const GROUPS = [
  { title: "Why models fail on new data", qs: [1, 2, 3, 4] },
  { title: "Measuring it honestly", qs: [5, 6, 7] },
  { title: "Which number to report", qs: [8, 9, 10] },
] as const;

/**
 * The round as three ruled groups, each its question numbers as outlined
 * badges over its title, and the quick two in grey under them. Each group can
 * ink in on its own cue (`groupAt`), be lit (the highlighter on its title) and
 * be ticked done. The opening reads it, and each movement's turn lights the
 * next one.
 */
export const PlanMap: React.FC<{
  x: number;
  top: number;
  width: number;
  /** Each group's (and then the quick line's) entrance. */
  groupAt: readonly [number, number, number, number];
  /** Group index → the frame its title is highlighted. */
  lit?: Partial<Record<0 | 1 | 2, number>>;
  /** Group index → the frame it is ticked done. */
  done?: Partial<Record<0 | 1 | 2, number>>;
  quickLit?: number;
  out?: number;
}> = ({ x, top, width, groupAt, lit = {}, done = {}, quickLit, out }) => {
  const frame = useCurrentFrame();
  const { h } = useLayout();
  const pitch = h(148);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (o >= 1) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - o }}>
      {GROUPS.map((g, i) => {
        const gTop = top + i * pitch;
        const at0 = groupAt[i];
        const r = ease(frame, at0 - 6, 16);
        const doneAt = done[i as 0 | 1 | 2];
        const tick = doneAt !== undefined && frame >= doneAt;
        const litAt = lit[i as 0 | 1 | 2];
        const dim = doneAt === undefined ? 0 : ease(frame, doneAt + 4, 14) * 0.45;
        return (
          <React.Fragment key={g.title}>
            <div style={{ position: "absolute", left: x, top: gTop, width: width * r, height: 1, background: HAIRLINE }} />
            <Ink at={at0} dur={14} style={{ left: x, top: gTop + 28, whiteSpace: "nowrap", opacity: 1 - dim }}>
              <div style={{ display: "flex", gap: 10, ...label(22, INK) }}>
                {g.qs.map((q) => (
                  <OutlineBadge key={q} tone={litAt !== undefined && frame >= litAt ? "yellow" : "ink"} size={22}>
                    {q}
                  </OutlineBadge>
                ))}
              </div>
            </Ink>
            <Ink at={at0 + 4} dur={16} style={{ left: x, top: gTop + 28 + h(50), whiteSpace: "nowrap", opacity: 1 - dim }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 36 }}>
                <span style={line(36, INK)}>{litAt === undefined ? g.title : <Mark at={litAt}>{g.title}</Mark>}</span>
                {tick && doneAt !== undefined ? <Tick at={doneAt} size={30} /> : null}
              </div>
            </Ink>
          </React.Fragment>
        );
      })}
      <Ink at={groupAt[3]} dur={14} style={{ left: x, top: top + 3 * pitch + 6, whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, ...label(24, INK_SOFT) }}>
          <span style={line(24, INK_SOFT)}>{quickLit === undefined ? "Quick:" : <Mark at={quickLit}>Quick:</Mark>}</span>
          <OutlineBadge tone="gray" size={22}>
            11
          </OutlineBadge>
          <OutlineBadge tone="gray" size={22}>
            12
          </OutlineBadge>
        </div>
      </Ink>
    </div>
  );
};

// ── A one-dimensional regression tree, for drawing one training set ─────────

/** Points drawn the way check.mjs draws each training set: x uniform on
 *  [0, 1], y = sin(2πx) plus Gaussian noise of sd `sigma`. Seeded, so the
 *  set is the same on every frame. */
export const trainingSet = (n: number, sigma: number, seed: number): [number, number][] => {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  return Array.from({ length: n }, () => {
    const x = rand();
    return [x, Math.sin(2 * Math.PI * x) + sigma * gauss()];
  });
};

/** A fitted tree as steps: [x from, x to, value], left to right. */
export type Steps = [number, number, number][];

/**
 * CART on one input, as scikit-learn's DecisionTreeRegressor grows it with
 * its defaults (squared error, best split at the midpoint between sorted
 * values, a leaf of one point allowed), to `depth`. Returns the step
 * function it predicts over [0, 1].
 */
export const fitTree = (pts: readonly [number, number][], depth: number): Steps => {
  const grow = (sorted: [number, number][], lo: number, hi: number, d: number): Steps => {
    const mean = sorted.reduce((a, p) => a + p[1], 0) / sorted.length;
    if (d === 0 || sorted.length < 2) return [[lo, hi, mean]];
    let best = -1;
    let bestSse = Infinity;
    let sumL = 0;
    let sqL = 0;
    const total = sorted.reduce((a, p) => a + p[1], 0);
    const totalSq = sorted.reduce((a, p) => a + p[1] * p[1], 0);
    for (let i = 0; i < sorted.length - 1; i++) {
      sumL += sorted[i][1];
      sqL += sorted[i][1] ** 2;
      if (sorted[i][0] === sorted[i + 1][0]) continue;
      const nl = i + 1;
      const nr = sorted.length - nl;
      const sse = sqL - (sumL * sumL) / nl + (totalSq - sqL) - ((total - sumL) ** 2) / nr;
      if (sse < bestSse - 1e-12) {
        bestSse = sse;
        best = i;
      }
    }
    if (best < 0) return [[lo, hi, mean]];
    const cut = (sorted[best][0] + sorted[best + 1][0]) / 2;
    return [...grow(sorted.slice(0, best + 1), lo, cut, d - 1), ...grow(sorted.slice(best + 1), cut, hi, d - 1)];
  };
  return grow([...pts].sort((a, b) => a[0] - b[0]), 0, 1, depth);
};

/** A step function as points for a polyline, vertical risers included. */
export const stepPoints = (steps: Steps): [number, number][] =>
  steps.flatMap(([a, b, v]) => [
    [a, v],
    [b, v],
  ]);

// ── Spot illustrations ───────────────────────────────────────────────────────

/** Each image's trimmed size in pixels (public/images/mle-generalization/),
 *  so a spot is drawn at its own aspect and never past half its pixels. */
export const SPOTS = {
  "mle-generalization-flamingo": [648, 1024],
  "mle-generalization-target": [1023, 990],
  "mle-generalization-faucet": [993, 1024],
} as const;
export type SpotId = keyof typeof SPOTS;
export const spotH = (id: SpotId, w: number) => Math.round((w * SPOTS[id][1]) / SPOTS[id][0]);

/**
 * A watercolor from illustrations.json, `w` wide at its own aspect: it pops
 * in on `at` (the word that names it), bobs gently, and fades on `out`.
 */
export const Spot: React.FC<{ id: SpotId; at: number; out?: number; x: number; y: number; w: number; phase?: number }> = ({
  id,
  at: from,
  out,
  x,
  y,
  w,
  phase = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
  return (
    <Illustration
      video={VIDEO}
      id={id}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: spotH(id, w),
        opacity: Math.min(1, p) * (1 - o),
        transform: `translateY(${bob(frame + phase, 4, 120) + (1 - p) * 26}px)`,
      }}
    />
  );
};

/** A legend swatch and its words, for a chart whose lines are named in a
 *  row under its title. */
export const Key: React.FC<{ color: string; dash?: boolean; band?: boolean; children: React.ReactNode; size?: number }> = ({
  color,
  dash,
  band,
  children,
  size = 22,
}) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: size }}>
    {band ? (
      <span style={{ width: 26, height: 14, background: color, borderRadius: 3, display: "inline-block" }} />
    ) : (
      <svg width={30} height={10} style={{ display: "block" }}>
        <line x1={1} x2={29} y1={5} y2={5} stroke={color} strokeWidth={3.4} strokeDasharray={dash ? "6 5" : undefined} />
      </svg>
    )}
    <span style={{ ...label(size, INK_SOFT), whiteSpace: "nowrap" }}>{children}</span>
  </span>
);

export { ACCENT, ACCENT_INK };

/**
 * A straight arrow from `from` to `to`, drawn from its tail on `at`, with its
 * head built by arrowHead() (components/arrow.ts) on the line itself, so the
 * head sits on a straight end. The tip lands on `to`: aim it at an edge.
 */
export const StraightArrow: React.FC<{
  from: Pt;
  to: Pt;
  at: number;
  out?: number;
  color?: string;
  width?: number;
  head?: number;
}> = ({ from: a, to: b, at: start, out, color = INK, width = 2.6, head = 14 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, start, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const samples: Pt[] = Array.from({ length: 41 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / 40, a[1] + ((b[1] - a[1]) * i) / 40]);
  const len = lineLength(samples);
  const reach = Math.max(0, (len - head + 1) / len);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={a[0] + (b[0] - a[0]) * reach * p}
        y2={a[1] + (b[1] - a[1]) * reach * p}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <path d={arrowHead(samples, head, 7.5, { filled: true })} fill={color} opacity={ease(frame, start + 10, 5)} />
    </svg>
  );
};
