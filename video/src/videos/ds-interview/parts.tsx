import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * The overview draws on the series' shared furniture (re-exported from the
 * Data Analyst series' Part 1, so the two tracks read as one family) and on
 * the topic videos' own watercolor heroes, shown from their folders.
 */
export { Drift, Headline, Kicker, Mark, Mono, OK, OK_INK, X0 } from "../da-sql/parts";

/** A watercolor hero: it pops in on `at`, bobs gently, and dims from `dim`.
 *  This video's own otter waits on ILLUSTRATIONS. */
export const Hero: React.FC<{
  video: string;
  id: string;
  at: number;
  left: number;
  top: number;
  width: number;
  height: number;
  dim?: number;
}> = ({ video, id, at, left, top, width, height, dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps, 16);
  const d = dim === undefined ? 0 : ease(frame, dim, 16) * 0.6;
  if ((video === VIDEO && !ILLUSTRATIONS) || p <= 0.001) return null;
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
        opacity: Math.min(1, p) * (1 - d),
        transform: `translateY(${bob(frame + left, 4, 120) + (1 - p) * 24}px)`,
      }}
    />
  );
};
