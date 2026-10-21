import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ENTITY, type EntityLayout } from "../../editorial/erd";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HIGHLIGHT, INK, INK_SOFT, PAPER, headline, label } from "../../editorial/style";
import { Ink } from "../../editorial/ui";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * This video's own pieces, on top of the editorial kit and the ERD kit
 * (editorial/erd.tsx). The color roles: entities and rows in the kit's ink and
 * box fill, keys in the data blue, the accent for what the narration points
 * at (a circled noun, a refused value), and the page's yellow for a fact being
 * read.
 */

export const STAT = ACCENT;
export const STAT_INK = ACCENT_INK;
/** Accepted: a row the narrow domain lets in. */
export const OK_WASH = `color-mix(in srgb, ${ds("green", 500)} 20%, transparent)`;
export const OK_INK = inkOf.green;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0 → 1 → 0 over `dur` frames from `at`: a brief swell for something named again. */
export const pulse = (frame: number, at: number, dur = 18) => {
  const t = (frame - at) / dur;
  return t <= 0 || t >= 1 ? 0 : Math.sin(t * Math.PI) ** 2;
};

export const Svg: React.FC<{ opacity?: number; children: React.ReactNode }> = ({ opacity = 1, children }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
    {children}
  </svg>
);

/** A part's kicker, top left, in sentence case: the only marker a part gets. */
export const Kicker: React.FC<{ at: number; out?: number; children: React.ReactNode }> = ({ at, out, children }) => {
  const { y } = useLayout();
  return (
    <Ink at={at} dur={14} out={out} style={{ left: 96, top: y(112), whiteSpace: "nowrap" }}>
      <span style={label(22, INK_SOFT)}>{children}</span>
    </Ink>
  );
};

/**
 * One headline line in two inks, as Unit 1 sets them: the lead in roman, the
 * turn in the accent's italic, each arriving on its own cue, the second
 * following the first in the flow of the line.
 */
export const Headline: React.FC<{
  lead: React.ReactNode;
  leadAt: number;
  turn?: React.ReactNode;
  turnAt?: number;
  out?: number;
  size?: number;
  top?: number;
}> = ({ lead, leadAt, turn, turnAt, out, size = 80, top = 150 }) => {
  const { y } = useLayout();
  return (
    <div style={{ position: "absolute", left: 92, top: y(top), display: "flex", gap: "0.26em", ...headline(size) }}>
      <Ink at={leadAt} dur={20} out={out} style={{ position: "relative", whiteSpace: "nowrap" }}>
        {lead}
      </Ink>
      {turn !== undefined && turnAt !== undefined ? (
        <Ink
          at={turnAt}
          dur={18}
          out={out}
          style={{ position: "relative", ...headline(size, true), color: STAT_INK, whiteSpace: "nowrap" }}
        >
          {turn}
        </Ink>
      ) : null}
    </div>
  );
};

/**
 * A slow, eased push on a finished figure: it grows by `scale` (a few percent
 * at most) and shifts by `dx`, `dy` between `from` and `to`, about `origin`,
 * so a figure being talked about never sits dead still. Never a jolt.
 */
export const Drift: React.FC<{
  from: number;
  to: number;
  scale?: number;
  dx?: number;
  dy?: number;
  origin?: readonly [number, number];
  opacity?: number;
  children: React.ReactNode;
}> = ({ from, to, scale = 0.025, dx = 0, dy = 0, origin = [960, 600], opacity = 1, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        transformOrigin: `${origin[0]}px ${origin[1]}px`,
        transform: `translate(${dx * p}px, ${dy * p}px) scale(${1 + scale * p})`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * A marker-pen highlight that sweeps under the words it wraps on `at`, and
 * lifts again on `out`. Sized in em, so it fits the words in any face.
 */
export const Mark: React.FC<{ at: number; out?: number; color?: string; children: React.ReactNode }> = ({
  at,
  out,
  color = HIGHLIGHT,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.12em",
          bottom: "0.02em",
          height: "0.42em",
          width: `calc((100% + 0.24em) * ${p})`,
          background: color,
          opacity: p > 0 ? 0.85 * (1 - o) : 0,
          borderRadius: 3,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};

/** A ring that swells out of a point and fades: a point being named. */
export const Pulse: React.FC<{ x: number; y: number; at: number; r?: number; grow?: number; color?: string; width?: number }> = ({
  x,
  y,
  at,
  r = 12,
  grow = 30,
  color = STAT,
  width = 2.4,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0 || p >= 1) return null;
  return (
    <Svg>
      <circle
        cx={x}
        cy={y}
        r={r + grow * Easing.out(Easing.cubic)(p)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        opacity={0.85 * (1 - p)}
      />
    </Svg>
  );
};

/** An outline that swells out of a box and fades: an entity being named. */
export const BoxPulse: React.FC<{ x: number; y: number; width: number; height: number; at: number; color?: string }> = ({
  x,
  y,
  width,
  height,
  at,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (p <= 0 || p >= 1) return null;
  const grow = 22 * Easing.out(Easing.cubic)(p);
  return (
    <Svg>
      <rect
        x={x - grow}
        y={y - grow}
        width={width + 2 * grow}
        height={height + 2 * grow}
        rx={6 + grow / 2}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        opacity={0.75 * (1 - p)}
      />
    </Svg>
  );
};

/**
 * A word set inline, wiped in from the left on `at` the way <Ink> reveals a
 * block, so a sentence can arrive word by word as it is spoken and still flow
 * as one line in any face. `circleAt` draws a hand-drawn loop around it, sized
 * in em to the word.
 */
export const Word: React.FC<{
  at: number;
  circleAt?: number;
  color?: string;
  circleColor?: string;
  children: React.ReactNode;
}> = ({ at, circleAt, color, circleColor = STAT, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const c = circleAt === undefined ? 0 : ease(frame, circleAt, 16);
  const edge = p * 130 - 15;
  const mask = `linear-gradient(90deg, ${INK} ${edge - 18}%, transparent ${edge + 4}%)`;
  return (
    <span style={{ position: "relative", display: "inline-block", color }}>
      <span
        style={{
          display: "inline-block",
          // Room for descenders and the italic's overhang under the mask.
          padding: "0.14em 0.12em",
          margin: "-0.14em -0.12em",
          WebkitMaskImage: p < 1 ? mask : undefined,
          maskImage: p < 1 ? mask : undefined,
          opacity: p > 0 ? 1 : 0,
        }}
      >
        {children}
      </span>
      {c > 0 ? (
        <svg
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", left: "-0.32em", right: "-0.32em", top: "-0.12em", bottom: "-0.2em", width: "calc(100% + 0.64em)", height: "calc(100% + 0.32em)", overflow: "visible" }}
        >
          <path
            d="M118,6 C170,4 198,26 196,52 C193,82 150,97 98,96 C44,95 4,80 4,52 C4,24 44,6 92,5 C112,4 128,8 140,14"
            fill="none"
            stroke={circleColor}
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${c} 1`}
          />
        </svg>
      ) : null}
    </span>
  );
};

/**
 * "Lots of these": two copies of an entity's header box stacked behind it,
 * fanning out down and to the right on `at` and folding back on `out`. Drawn
 * before the <Entity> so it sits underneath, in the kit's own box metrics.
 */
export const Stack: React.FC<{ layout: EntityLayout; at: number; out?: number; copies?: number; step?: number }> = ({
  layout,
  at,
  out,
  copies = 2,
  step = 14,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const k = p * (1 - o);
  if (k <= 0) return null;
  return (
    <>
      {Array.from({ length: copies }, (_, i) => copies - i).map((n) => (
        <div
          key={n}
          style={{
            position: "absolute",
            left: layout.x + n * step * k,
            top: layout.y + n * step * k,
            width: layout.width,
            height: layout.head,
            boxSizing: "border-box",
            border: `2px solid color-mix(in srgb, ${INK} ${70 - n * 18}%, transparent)`,
            borderRadius: 6,
            background: PAPER,
            opacity: k,
          }}
        />
      ))}
    </>
  );
};

/**
 * A column's type, set in an entity's row exactly where <Entity> sets a type
 * (the mono soft ink, right-aligned in the row), but arriving on its own cue:
 * the domain, named after the attribute.
 */
export const RowType: React.FC<{ layout: EntityLayout; row: number; at: number; children: string }> = ({
  layout,
  row,
  at,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: layout.x,
        width: layout.width,
        top: layout.rows[row].top,
        height: layout.row,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: `0 ${ENTITY.pad}px`,
        boxSizing: "border-box",
        fontFamily: MONO,
        fontSize: 19,
        color: INK_SOFT,
        whiteSpace: "nowrap",
        opacity: p,
        transform: `translateX(${(1 - p) * 10}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** A straight arrow that draws from `from` to `to`, its head built by
 *  arrowHead() on the drawn line. */
export const Arrow: React.FC<{
  from: readonly [number, number];
  to: readonly [number, number];
  at: number;
  dur?: number;
  out?: number;
  color?: string;
  width?: number;
  dash?: string;
}> = ({ from, to, at, dur = 16, out, color = INK, width = 2.4, dash }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const tip: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  const len = Math.hypot(tip[0] - from[0], tip[1] - from[1]);
  if (len < 4) return null;
  const headLen = Math.min(16, len * 0.6);
  return (
    <Svg opacity={1 - o}>
      <line
        x1={from[0]}
        y1={from[1]}
        x2={tip[0]}
        y2={tip[1]}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dash}
      />
      <path
        d={arrowHead([from, tip], headLen, headLen * 0.6)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** A square bracket beside some rows, opening toward them (on their right
 *  unless `left`), drawn on `at`. */
export const Bracket: React.FC<{ x: number; y0: number; y1: number; at: number; out?: number; left?: boolean; color?: string }> = ({
  x,
  y0,
  y1,
  at,
  out,
  left = false,
  color = ACCENT,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 14);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  const t = left ? -12 : 12;
  return (
    <Svg opacity={1 - o}>
      <path
        d={`M${x},${y0} H${x + t} V${y1} H${x}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={`${p} 1`}
      />
    </Svg>
  );
};

/**
 * A watercolor spot from illustrations.json: it pops in on `at`, bobs gently,
 * and fades on `out`. Nothing is drawn while the art is not in.
 */
export const Spot: React.FC<{
  id: string;
  at: number;
  out?: number;
  left: number;
  top: number;
  width: number;
  height: number;
}> = ({ id, at, out, left, top, width, height }) => {
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
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};
