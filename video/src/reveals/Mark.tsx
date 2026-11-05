import React, { useId } from "react";
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BAND,
  LEFT,
  LEFT_GRADIENT,
  LEFT_STOPS,
  PEAK,
  polyline,
  RIGHT,
  RIGHT_GRADIENT,
  RIGHT_STOPS,
  SPINE,
  SPINE_RIGHT,
  VIEW,
} from "../components/mark";
import { ease } from "../components/motion";
import {
  ASSEMBLE_LAG,
  BAR_STAGGER,
  BARS,
  MARK_LANDS,
  type MarkMotion,
  SCATTER_DELAY,
  SPRINGS,
  UNFOLD_OPENS,
} from "./timing";

export type { MarkMotion } from "./timing";

/** Points in the scatter motion. */
const POINTS = 170;

/** A point on a spine at s in [0, 1], with the unit normal there. */
function onSpine(spine: readonly (readonly [number, number])[], s: number) {
  const at = s * (spine.length - 1);
  const i = Math.min(spine.length - 2, Math.floor(at));
  const t = at - i;
  const [x0, y0] = spine[i];
  const [x1, y1] = spine[i + 1];
  const len = Math.hypot(x1 - x0, y1 - y0) || 1;
  return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, nx: -(y1 - y0) / len, ny: (x1 - x0) / len };
}

/** Where each scatter point settles, inside one of the two slopes, and where
 *  it comes from: deterministic, so every render draws the same points. */
const SCATTER = Array.from({ length: POINTS }, (_, i) => {
  const seed = `ds-scatter-${i}`;
  const right = i % 2 === 1;
  const { x, y, nx, ny } = onSpine(SPINE, random(`${seed}-s`));
  const d = (random(`${seed}-d`) - 0.5) * (BAND - 90);
  const tx = x + nx * d;
  return {
    to: [right ? VIEW.w - tx : tx, y + ny * d] as const,
    /** Direction it flies in from, and how far out it starts, 0 to 1. */
    angle: random(`${seed}-a`) * Math.PI * 2,
    far: random(`${seed}-r`),
    delay: random(`${seed}-t`) * SCATTER_DELAY,
    size: 0.75 + random(`${seed}-z`) * 0.5,
  };
});

/**
 * The Dataslope mark, `height` px tall, arriving by `motion` from frame `at`.
 * `color` is the one color of its gradients: the brand blue on the white page,
 * white on a blue one. Distances in the motions are in screen pixels, so a
 * small mark beside a line of text moves as much as a large one does.
 */
export const AnimatedMark: React.FC<{
  motion: MarkMotion;
  at: number;
  height: number;
  color: string;
  style?: React.CSSProperties;
}> = ({ motion, at, height, color, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const id = `ds-mark-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const f = frame - at;
  const k = height / VIEW.h;
  /** Screen pixels as viewBox units. */
  const px = (n: number) => n / k;

  const gradients = (
    <>
      <radialGradient id={`${id}-l`} {...LEFT_GRADIENT} gradientUnits="userSpaceOnUse">
        {LEFT_STOPS.map(([o, a]) => (
          <stop key={o} offset={o} style={{ stopColor: color, stopOpacity: a }} />
        ))}
      </radialGradient>
      <radialGradient id={`${id}-r`} {...RIGHT_GRADIENT} gradientUnits="userSpaceOnUse">
        {RIGHT_STOPS.map(([o, a]) => (
          <stop key={o} offset={o} style={{ stopColor: color, stopOpacity: a }} />
        ))}
      </radialGradient>
    </>
  );
  const fillL = `url(#${id}-l)`;
  const fillR = `url(#${id}-r)`;

  let defs: React.ReactNode = null;
  let body: React.ReactNode;
  let svgStyle: React.CSSProperties = {};

  if (motion === "assemble") {
    const left = spring({ frame: f, fps, config: SPRINGS.assemble });
    const right = spring({ frame: f - ASSEMBLE_LAG, fps, config: SPRINGS.assemble });
    const tilt = interpolate(f, [17, 24, 37], [0, 8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    svgStyle = { rotate: `${tilt}deg`, transformOrigin: "50% 60%" };
    body = (
      <>
        <path
          d={LEFT}
          fill={fillL}
          opacity={Math.min(1, left * 1.4)}
          transform={`translate(${(1 - left) * -px(150)} ${(1 - left) * px(40)})`}
        />
        <path
          d={RIGHT}
          fill={fillR}
          opacity={Math.min(1, right * 1.4)}
          transform={`translate(${(1 - right) * px(150)} ${(1 - right) * px(40)})`}
        />
      </>
    );
  } else if (motion === "plot") {
    const p = interpolate(f, [0, MARK_LANDS.plot], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    const a = Math.min(1, p * 2);
    const b = Math.max(0, p * 2 - 1);
    // A stroke a little wider than the band, round-capped: its moving end is
    // the slope's own round cap, so the pen is the logo.
    const pen = (spine: typeof SPINE, done: number) =>
      done > 0 ? (
        <path
          d={polyline(spine)}
          fill="none"
          stroke="white"
          strokeWidth={BAND + 24}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={`${done} 2`}
        />
      ) : null;
    defs = (
      <>
        <mask id={`${id}-ml`} maskUnits="userSpaceOnUse" x={-400} y={-400} width={VIEW.w + 800} height={VIEW.h + 800}>
          {pen(SPINE, a)}
        </mask>
        <mask id={`${id}-mr`} maskUnits="userSpaceOnUse" x={-400} y={-400} width={VIEW.w + 800} height={VIEW.h + 800}>
          {pen(SPINE_RIGHT, b)}
        </mask>
      </>
    );
    body = (
      <>
        <path d={LEFT} fill={fillL} mask={`url(#${id}-ml)`} />
        <path d={RIGHT} fill={fillR} mask={`url(#${id}-mr)`} />
      </>
    );
  } else if (motion === "histogram") {
    const slot = VIEW.w / BARS;
    // The gaps close once the last bar is up, and the bars become the shape.
    const gap = slot * 0.3 * (1 - ease(f, MARK_LANDS.histogram - 10, 10));
    const bars = Array.from({ length: BARS }, (_, i) => {
      const rise = spring({ frame: f - i * BAR_STAGGER, fps, config: SPRINGS.bar });
      const h = (VIEW.h + 4) * rise;
      // Overlap neighbours by a unit once the gaps are closed, so no seam
      // shows between two bars.
      return <rect key={i} x={i * slot + gap / 2 - 0.5} y={VIEW.h + 2 - h} width={slot - gap + 1} height={h} fill="white" />;
    });
    defs = (
      <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={-10} y={-10} width={VIEW.w + 20} height={VIEW.h + 20}>
        {bars}
      </mask>
    );
    body = (
      <g mask={`url(#${id}-m)`}>
        <path d={LEFT} fill={fillL} />
        <path d={RIGHT} fill={fillR} />
      </g>
    );
  } else if (motion === "scatter") {
    const fill = ease(f, MARK_LANDS.scatter - 10, 10);
    const shrink = ease(f, MARK_LANDS.scatter - 4, 10);
    const r = px(Math.max(2.5, height * 0.036)) * (1 - shrink);
    const cx = VIEW.w / 2;
    const cy = VIEW.h / 2;
    body = (
      <>
        <g opacity={fill}>
          <path d={LEFT} fill={fillL} />
          <path d={RIGHT} fill={fillR} />
        </g>
        {r > 0
          ? SCATTER.map((pt, i) => {
              const p = spring({ frame: f - pt.delay, fps, config: SPRINGS.point });
              if (p <= 0) return null;
              const reach = px(260 + pt.far * 520);
              const sx = cx + Math.cos(pt.angle) * reach;
              const sy = cy + Math.sin(pt.angle) * reach * 0.55;
              return (
                <circle
                  key={i}
                  cx={sx + (pt.to[0] - sx) * p}
                  cy={sy + (pt.to[1] - sy) * p}
                  r={r * pt.size}
                  fill={color}
                  opacity={Math.min(1, p * 2.5) * 0.85}
                />
              );
            })
          : null}
      </>
    );
  } else if (motion === "rise") {
    const up = spring({ frame: f, fps, config: SPRINGS.rise });
    defs = (
      <clipPath id={`${id}-c`}>
        {/* Everything above the horizon, which is the mark's own baseline. */}
        <rect x={-VIEW.w} y={-VIEW.h * 3} width={VIEW.w * 3} height={VIEW.h * 4 + 1} />
      </clipPath>
    );
    body = (
      <g clipPath={`url(#${id}-c)`}>
        <g transform={`translate(0 ${(1 - up) * (VIEW.h + 20)})`}>
          <path d={LEFT} fill={fillL} />
          <path d={RIGHT} fill={fillR} />
        </g>
      </g>
    );
  } else {
    // unfold
    const drop = spring({ frame: f, fps, config: SPRINGS.drop });
    const open = spring({ frame: f - UNFOLD_OPENS, fps, config: SPRINGS.open });
    const [px0, py0] = PEAK;
    body = (
      <g opacity={Math.min(1, Math.max(0, f + 1) / 4)} transform={`translate(0 ${(1 - drop) * -px(220)})`}>
        <path d={LEFT} fill={fillL} transform={`rotate(${-45 * (1 - open)} ${px0} ${py0})`} />
        <path d={RIGHT} fill={fillR} transform={`rotate(${45 * (1 - open)} ${px0} ${py0})`} />
      </g>
    );
  }

  return (
    <svg
      width={VIEW.w * k}
      height={height}
      viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
      style={{ overflow: "visible", flexShrink: 0, ...svgStyle, ...style }}
    >
      <defs>
        {gradients}
        {defs}
      </defs>
      {f < 0 ? null : body}
    </svg>
  );
};
