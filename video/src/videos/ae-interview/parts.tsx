import React from "react";
import { getStaticFiles, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { INK, label } from "../../editorial/style";
import { Num } from "../../editorial/ui";
import { Mark } from "../da-sql/parts";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The overview draws on the interview series' shared furniture: the headings,
 * Drift, Mark and Mono from the Data Analyst series' Part 1 (as the Data
 * Engineer and Backend Engineer overviews take them), and the Data Engineer
 * overview's Flow, so the tracks' overviews read as one family.
 */
export { Drift, Headline, Kicker, Mark, Mono } from "../da-sql/parts";
export { Flow } from "../de-interview/parts";

/** Whether a topic video's hero is in public/ yet. The nine topic videos are
 *  built alongside this one, so a hero that is missing is left out rather
 *  than failing the render on a missing file. */
const present = (video: string, id: string) => getStaticFiles().some((f) => f.name === `images/${video}/${id}.webp`);

/**
 * A watercolor spot (after be-interview/parts.tsx): it pops in on `at`, bobs
 * gently, dims from `dim` and fades on `out`. This video's own art waits on
 * ILLUSTRATIONS; another video's hero, on its file being there. `phase`
 * staggers the bob, so a row of heroes does not rise and fall as one.
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
}> = ({ id, video = VIDEO, at, out, dim, dimBy = 0.6, left, top, width, height, phase = 0, amp = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * dimBy;
  if (video === VIDEO ? !ILLUSTRATIONS : !present(video, id)) return null;
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
        opacity: Math.min(1, p) * (1 - o) * (1 - d),
        transform: `translateY(${bob(frame + phase, amp, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/**
 * A box of a diagram, the house's (README, "A diagram's boxes are outlined,
 * not filled"): no fill, a 2px near-black outline, black text, centred. It
 * inks in on `at` (a short rise and fade, so a stack builds box by box) and
 * fades on `out`. The box the narration points at keeps its outline and
 * takes the highlighter's yellow under its words, from `markAt` to
 * `markOut`, as any word pointed at does; `dashed` draws the empty
 * placeholder a box will fill.
 */
export const Box: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  at: number;
  out?: number;
  markAt?: number;
  markOut?: number;
  dashed?: boolean;
  /** How strongly it is drawn, 0 to 1: a placeholder waits faint. */
  strength?: number;
  size?: number;
  children?: React.ReactNode;
}> = ({ x, y, w, h, at, out, markAt, markOut, dashed = false, strength = 1, size = 24, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, 12);
  const o = out === undefined ? 0 : ease(frame, out, 10);
  if (p <= 0 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        boxSizing: "border-box",
        border: `2px ${dashed ? "dashed" : "solid"} ${INK}`,
        borderRadius: 8,
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...label(size, INK),
        whiteSpace: "nowrap",
        opacity: p * (1 - o) * strength,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      {markAt === undefined || !children ? children : <Mark at={markAt} out={markOut}>{children}</Mark>}
    </div>
  );
};

/** "Part 9" or "Parts 1, 2, 5": each number in tabular figures, the commas
 *  outside them. */
export const PartsLabel: React.FC<{ parts: readonly number[] }> = ({ parts }) => (
  <>
    {parts.length > 1 ? "Parts " : "Part "}
    {parts.flatMap((p, k) => (k ? [", ", <Num key={p}>{p}</Num>] : [<Num key={p}>{p}</Num>]))}
  </>
);
