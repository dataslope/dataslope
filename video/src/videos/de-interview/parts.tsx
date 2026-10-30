import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { arrowHead, lineLength, roundedPolyline, type Pt } from "../../components/arrow";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HAIRLINE, INK, PAPER, note } from "../../editorial/style";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The overview draws on the series' shared furniture (re-exported from the
 * Data Analyst series' Part 1, as the Data Scientist overview does, so the
 * three tracks read as one family) and on the topic videos' own watercolor
 * heroes, shown from their folders.
 */
export { Drift, Headline, Kicker, Mark, Mono, X0 } from "../da-sql/parts";

/**
 * A watercolor spot (after ds-sql/parts.tsx): it pops in on `at`, bobs
 * gently, dims from `dim` and fades on `out`. Another video's hero is always
 * there; this video's own waits on ILLUSTRATIONS. `phase` staggers the bob,
 * so a row of heroes does not rise and fall as one.
 */
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
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001 || o >= 1) return null;
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

/**
 * One idea as a pill: a rounded box around a few words, inked in on `at`.
 * Neutral by default (a topic, not a verdict); `fill` tints it.
 */
export const Chip: React.FC<{ at: number; size?: number; fill?: string; children: React.ReactNode }> = ({
  at,
  size = 24,
  fill,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 12);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 16px 7px",
        borderRadius: 10,
        border: `1.5px solid ${HAIRLINE}`,
        background: fill ?? PAPER,
        ...note(size, INK),
        lineHeight: 1.25,
        whiteSpace: "nowrap",
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
      }}
    >
      {children}
    </span>
  );
};

/**
 * An arrow along `points` (orthogonal, its corners rounded), drawn from its
 * tail on `at`, with an open head built by arrow.ts on its last, straight
 * leg. Every leg into the head is longer than the head, so the line has
 * stopped turning before the head starts.
 */
export const Flow: React.FC<{
  points: readonly Pt[];
  at: number;
  dur?: number;
  color?: string;
  width?: number;
  head?: number;
  opacity?: number;
}> = ({ points, at, dur = 14, color = INK, width = 2.2, head = 13, opacity = 1 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  if (p <= 0) return null;
  const { d, samples } = roundedPolyline(points, 18);
  const len = lineLength(samples);
  // The line stops a little short of the tip, so it never pokes out of the
  // head's point.
  const reach = (len - 2) / len;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible", opacity }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={`${p * reach} 1`}
      />
      <path
        d={arrowHead(samples, head, 6.5)}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={ease(frame, at + dur - 4, 5)}
      />
    </svg>
  );
};
