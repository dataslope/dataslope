import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { HAIRLINE, INK, INK_SOFT, note } from "../../editorial/style";
import { Num, OutlineBadge } from "../../editorial/ui";
import { SANS } from "../../theme/fonts";
import { HEROES_IN, ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The overview draws on the interview series' shared furniture, as the
 * Backend, Data Engineer and Data Scientist overviews do: the headings, Drift
 * and the highlighter Mark (which takes its bleed back as margin) from the
 * Data Analyst series' Part 1.
 */
export { Drift, Headline, Kicker, Mark } from "../da-sql/parts";

/** The page's left edge for text, and its right edge for the part tags. */
export const LEFT_X = 96;
export const RIGHT_X = 1824;

/**
 * A watercolor spot (after be-interview/parts.tsx): it pops in on `at`, bobs
 * gently, dims from `dim` and fades on `out`. This video's own art waits on
 * ILLUSTRATIONS; another part's hero on its folder being in HEROES_IN (a
 * render cannot look for a file that may not be there yet). `fit` sets where
 * the art sits in its box: a hero on a bar stands on the box's floor.
 */
export const Spot: React.FC<{
  id: string;
  video?: string;
  at: number;
  out?: number;
  dim?: number;
  /** How far `dim` takes it down, 0 to 1. */
  dimBy?: number;
  left: number;
  top: number;
  width: number;
  height: number;
  phase?: number;
  amp?: number;
  fit?: string;
}> = ({ id, video = VIDEO, at, out, dim, dimBy = 0.6, left, top, width, height, phase = 0, amp = 4, fit = "50% 50%" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * dimBy;
  if (video === VIDEO ? !ILLUSTRATIONS : !HEROES_IN.has(video)) return null;
  if (p <= 0.001 || o >= 1) return null;
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
        objectPosition: fit,
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame + phase, amp, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** "Part 3", "Parts 7 and 8", "Parts 4, 5 and 6": the parts that answer a
 *  row, the numbers in digits of one width. */
export const partsText = (parts: readonly number[]): React.ReactNode => {
  const nums = parts.map((n, i) => (
    <React.Fragment key={n}>
      {i === 0 ? null : i === parts.length - 1 ? " and " : ", "}
      <Num>{n}</Num>
    </React.Fragment>
  ));
  return (
    <>
      {parts.length > 1 ? "Parts " : "Part "}
      {nums}
    </>
  );
};

/** The tag at a row's right end naming the parts that answer it: an
 *  outlined badge in the blue the series uses for its parts, inking a beat
 *  after the row's name. */
export const PartTag: React.FC<{ parts: readonly number[]; at: number; size?: number }> = ({ parts, at, size = 22 }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  return (
    <OutlineBadge tone="blue" size={size} style={{ fontFamily: SANS, opacity: p, transform: `translateX(${(1 - p) * 10}px)` }}>
      {partsText(parts)}
    </OutlineBadge>
  );
};

/** A row's topics as a line of words, each inking in as it is said, joined
 *  by commas (each comma arrives with the topic after it). They continue the
 *  row's name, so lowercase. */
export const Topics: React.FC<{ items: readonly { text: string; at: number }[]; size?: number; color?: string }> = ({
  items,
  size = 24,
  color = INK,
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...note(size, color), fontWeight: 400, whiteSpace: "nowrap" }}>
      {items.map((t, k) => (
        <span key={t.text} style={{ opacity: ease(frame, t.at - 2, 10) }}>
          {k ? <span style={{ color: INK_SOFT }}>, </span> : null}
          {t.text}
        </span>
      ))}
    </div>
  );
};

/** A horizontal hairline across the list, drawn left to right from `at`.
 *  `top` is a page position, already through y(). */
export const Rule: React.FC<{ at: number; top: number; left?: number; right?: number; opacity?: number }> = ({
  at,
  top,
  left = LEFT_X,
  right = RIGHT_X,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 18);
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left, top, width: (right - left) * p, height: 1, background: HAIRLINE, opacity }} />;
};

/** A block that fades and settles in on `at`; `top` through y(). */
export const Settle: React.FC<{ at: number; top: number; left?: number; width?: number; out?: number; children: React.ReactNode }> = ({
  at,
  top,
  left = LEFT_X,
  width,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at - 2, 14);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  if (p <= 0 || o >= 1) return null;
  return (
    <div style={{ position: "absolute", left, top, width, opacity: p * (1 - o), transform: `translateY(${(1 - p) * -10}px)`, color: INK }}>
      {children}
    </div>
  );
};
