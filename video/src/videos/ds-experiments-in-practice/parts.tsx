import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Illustration } from "../../components/Illustration";
import { bob, ease, pop } from "../../components/motion";
import { ds } from "../../theme/brand";
import { ILLUSTRATIONS, VIDEO } from "./data";

/**
 * Pieces this video needs beyond the shared editorial kit and the interview
 * kit (editorial/interview.tsx). The page furniture and the plot pieces come
 * from the Data Analyst statistics video, and the drawn curve, the fade and
 * the panel title from Part 3 of this series, as Part 6 takes them, so the two
 * experimentation videos stay one family. What is new here is the hero, which
 * waits for this video's own art, and the two arms' inks.
 */
export {
  at,
  Axes,
  Bracket,
  chartLabel,
  Dots,
  Drift,
  Headline,
  Kicker,
  Mark,
  MARK_BAD,
  MARK_OK,
  OK,
  OK_INK,
  pulse,
  type Scale,
  Strike,
  Svg,
  VLine,
  WARM,
  WARM_INK,
  X0,
} from "../da-statistics-communication/parts";
export { type Box, Curve, Fade, PanelTitle } from "../ds-ml-evaluation/parts";

/** The watercolor hero from illustrations.json (or another video's spot):
 *  it pops in on `at`, bobs gently, and fades on `out`. */
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
}> = ({ id, video = VIDEO, at: from, out, dim, left, top, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, from, fps, 16);
  const o = out === undefined ? 0 : ease(frame, out, 12);
  const d = dim === undefined ? 0 : ease(frame, dim, 20) * 0.6;
  // Another video's art is already on disk; only this video's own waits for import.
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
        transform: `translateY(${bob(frame, 5, 110) + (1 - p) * 30}px)`,
      }}
    />
  );
};

/** The two arms are both data, so both are blue: control light, the new version dark. */
export const CONTROL = ds("blue", 300);
export const TREAT = ds("blue", 700);
