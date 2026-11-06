import React from "react";
import { getStaticFiles, useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The overview draws on the interview series' shared furniture: the headings,
 * Drift, Mark and Mono from the Data Analyst series' Part 1 (as the Data
 * Engineer and Data Scientist overviews take them), and the Data Engineer
 * overview's Chip and Flow, so the four tracks' overviews read as one family.
 */
export { Drift, Headline, Kicker, Mark, Mono, X0 } from "../da-sql/parts";
export { Chip, Flow } from "../de-interview/parts";

/** Whether a topic video's hero is in public/ yet. The nine topic videos are
 *  built alongside this one, so a hero that has not been generated is left
 *  out rather than failing the render on a missing file. */
const present = (video: string, id: string) => getStaticFiles().some((f) => f.name === `images/${video}/${id}.webp`);

/**
 * A watercolor spot (after de-interview/parts.tsx): it pops in on `at`, bobs
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
