import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HAIRLINE, INK, INK_SOFT, TABULAR, label } from "../../editorial/style";
import { ds, inkOf } from "../../theme/brand";
import { SANS } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture Part 2 already drew (the
 * slow push, headings, highlighter and strike, tables, arrows) comes from
 * da-pandas/parts.tsx, so the three parts stay one family; what is new here
 * is the statistics: linear scales, a plot's axes, scattered dots that can
 * change ink, and a reference line with its label.
 */
export {
  colsOf,
  DataTable,
  Drift,
  ElbowArrow,
  geoOf,
  Headline,
  Kicker,
  lerp,
  Mark,
  MARK_BAD,
  MARK_OK,
  Mono,
  OK,
  OK_INK,
  pulse,
  Strike,
  Svg,
  TableName,
  X0,
} from "../da-pandas/parts";

/** Hot days and anything else the narration singles out from the data. */
export const WARM = ds("orange", 500);
export const WARM_INK = inkOf.orange;

/** A linear map from data units onto a span of the page. */
export type Scale = { lo: number; hi: number; a: number; b: number };
export const at = (s: Scale, v: number) => s.a + ((v - s.lo) / (s.hi - s.lo)) * (s.b - s.a);

/** A small seeded generator, so a jitter is the same on every frame. */
export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const tickText = (size: number): React.CSSProperties => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: 500,
  fill: INK_SOFT,
  fontVariantNumeric: "tabular-nums",
});

/** A tick's text with a true minus sign. The ticks are set in tabular
 *  figures, which give a hyphen-minus a digit's width: "-4" read "- 4". */
const minus = (label: React.ReactNode): React.ReactNode => (typeof label === "string" ? label.replace(/-(?=[\d.])/g, "\u2212") : label);

/**
 * A plot's frame: a baseline with ticks under it, a left axis with faint
 * dotted gridlines, and each axis's title. Scales are in page pixels (`y`
 * already through the layout). It draws itself on `at`.
 *
 * A tick format or a title may be a node rather than a string: <tspan>s for
 * a superscript tick (10<tspan>¹⁰</tspan>), or a title that changes partway
 * through a scene.
 */
export const Axes: React.FC<{
  x: Scale;
  y: Scale;
  xTicks: readonly number[];
  yTicks?: readonly number[];
  xFormat?: (v: number) => React.ReactNode;
  yFormat?: (v: number) => React.ReactNode;
  xTitle?: React.ReactNode;
  yTitle?: React.ReactNode;
  at: number;
  out?: number;
  size?: number;
}> = ({ x, y, xTicks, yTicks = [], xFormat = String, yFormat = String, xTitle, yTitle, at: from, out, size = 20 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 16);
  const t = ease(frame, from + 6, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const base = y.a;
  const left = x.a;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
      <g opacity={t}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={left} x2={x.b} y1={at(y, v)} y2={at(y, v)} stroke={INK_SOFT} strokeWidth={1} strokeDasharray="2 6" opacity={0.5} />
            <text x={left - 14} y={at(y, v) + 7} textAnchor="end" style={tickText(size)}>
              {minus(yFormat(v))}
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <g key={v}>
            <line x1={at(x, v)} x2={at(x, v)} y1={base + 1} y2={base + 7} stroke={INK} strokeWidth={1.2} />
            <text x={at(x, v)} y={base + 30} textAnchor="middle" style={tickText(size)}>
              {minus(xFormat(v))}
            </text>
          </g>
        ))}
        {/* A title is words: tabular figures would set its hyphens a digit
            wide ("p - value"), so only the ticks take them. */}
        {xTitle ? (
          <text x={x.b} y={base + 58} textAnchor="end" style={{ ...tickText(19), fontWeight: 650, fontVariantNumeric: "normal" }}>
            {xTitle}
          </text>
        ) : null}
        {yTitle ? (
          <text x={left - 14} y={y.b - 26} textAnchor="start" style={{ ...tickText(19), fontWeight: 650, fontVariantNumeric: "normal" }}>
            {yTitle}
          </text>
        ) : null}
      </g>
      <line x1={left} x2={left + (x.b - left) * p} y1={base + 0.5} y2={base + 0.5} stroke={INK} strokeWidth={1.6} />
    </svg>
  );
};

export type Dot = {
  x: number;
  y: number;
  /** When it pops in. */
  at: number;
  /** Its ink, and from when (it starts in `color`). */
  turn?: { color: string; at: number };
};

/**
 * Data points in page pixels: each pops in on its own frame, in the data
 * blue unless told otherwise, and can take another ink later (a group the
 * narration picks out). `dim` fades the lot back.
 */
export const Dots: React.FC<{
  dots: readonly Dot[];
  r?: number;
  color?: string;
  opacity?: number;
  dim?: number;
  out?: number;
}> = ({ dots, r = 7, color = ds("blue", 500), opacity = 0.75, dim, out }) => {
  const frame = useCurrentFrame();
  const d = dim === undefined ? 0 : ease(frame, dim, 14) * 0.7;
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (o >= 1) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: (1 - d) * (1 - o) }}>
      {dots.map((p, i) => {
        const s = ease(frame, p.at, 8);
        if (s <= 0) return null;
        const turned = p.turn ? ease(frame, p.turn.at, 12) : 0;
        const fill = turned > 0 && p.turn ? `color-mix(in srgb, ${p.turn.color} ${turned * 100}%, ${color})` : color;
        return <circle key={i} cx={p.x} cy={p.y} r={r * s * (1 + 0.15 * turned)} fill={fill} opacity={opacity + (1 - opacity) * turned} />;
      })}
    </svg>
  );
};

/**
 * A vertical reference line across a plot (a mean, a median, the truth),
 * drawn down from its top on `at`, with an optional label above it set to
 * either side so two close lines can be told apart.
 */
export const VLine: React.FC<{
  x: number;
  top: number;
  bottom: number;
  at: number;
  out?: number;
  color: string;
  dash?: string;
  width?: number;
  label?: React.ReactNode;
  side?: "left" | "right";
  labelY?: number;
}> = ({ x, top, bottom, at: from, out, color, dash, width = 3, label: text, side = "right", labelY }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 16);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
        <line x1={x} x2={x} y1={top} y2={top + (bottom - top) * p} stroke={color} strokeWidth={width} strokeDasharray={dash} />
      </svg>
      {text ? (
        <div
          style={{
            position: "absolute",
            left: side === "right" ? x + 12 : undefined,
            right: side === "left" ? 1920 - x + 12 : undefined,
            top: (labelY ?? top) - 6,
            whiteSpace: "nowrap",
            opacity: ease(frame, from + 6, 10) * (1 - o),
            ...TABULAR,
          }}
        >
          {text}
        </div>
      ) : null}
    </>
  );
};

/**
 * A square bracket under (or over) a span, with its label centred on it:
 * the gap between two lines, an interquartile range.
 */
export const Bracket: React.FC<{
  x0: number;
  x1: number;
  y: number;
  at: number;
  out?: number;
  color?: string;
  up?: boolean;
  children?: React.ReactNode;
}> = ({ x0, x1, y, at: from, out, color = INK, up = false, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, from, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tick = up ? 10 : -10;
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * p;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity: 1 - o }}>
        <path
          d={`M${mid - half},${y + tick} L${mid - half},${y} L${mid + half},${y} L${mid + half},${y + tick}`}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            left: mid - 300,
            width: 600,
            top: up ? y - 40 : y + 10,
            textAlign: "center",
            whiteSpace: "nowrap",
            opacity: ease(frame, from + 8, 10) * (1 - o),
          }}
        >
          {children}
        </div>
      ) : null}
    </>
  );
};

/** A label in the chart face, for axis notes and legends. */
export const chartLabel = (size = 21, color: string = INK_SOFT): React.CSSProperties => ({ ...label(size, color), whiteSpace: "nowrap" });

/** The hairline the page uses for rules, for a divider between two panels. */
export const RULE = HAIRLINE;

// ── Spot illustrations ───────────────────────────────────────────────────────

/** A watercolor spot from illustrations.json: it pops in on `at`, bobs
 *  gently, and fades on `out`. */
export const Spot: React.FC<{
  id: string;
  /** Another video's folder, for art the series shares (Part 1's mousetrap
   *  and stopwatch mark the traps and the rapid round in every part). */
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  if (!ILLUSTRATIONS || p <= 0.001 || o >= 1) return null;
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
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
