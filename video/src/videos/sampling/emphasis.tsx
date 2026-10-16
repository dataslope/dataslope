import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { HIGHLIGHT } from "../../editorial/style";

/**
 * Small, calm ways for Unit 5's five videos to make the spoken phrase
 * visible while a finished figure is being talked about (the "keep the
 * picture moving" rule): a value that swells as it is named, a marker that
 * sweeps under the words being read, a number that counts to its result.
 * Each is cued from a narration frame, like everything else in the scenes.
 */

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** 1, rising to 1 + `amount` and back over `dur` frames from `at`: a value,
 *  a mark or a row swelling as the narration names it. For a CSS scale. */
export const swell = (frame: number, at: number, amount = 0.08, dur = 18) =>
  1 + amount * Math.sin(Math.PI * clamp01((frame - at) / dur));

/** 0, up to 1 and back to 0 over `dur` frames from `at`: a brief flash of
 *  emphasis, for an opacity or a color mix. */
export const flash = (frame: number, at: number, dur = 24) => Math.sin(Math.PI * clamp01((frame - at) / dur));

/** A number from `from` to `to` over `dur` frames from `at`, eased, so a
 *  result counts up as it is read rather than appearing whole. */
export const countTo = (frame: number, at: number, dur: number, from: number, to: number) =>
  from + (to - from) * ease(frame, at, dur);

/**
 * A highlighter stroke behind the words it wraps: sweeps in left to right on
 * `at` and, with `out`, fades away again, so a run of them can follow the
 * narration from one phrase to the next. Sized to the words in any face.
 */
export const Marker: React.FC<{
  at: number;
  out?: number;
  color?: string;
  dur?: number;
  children: React.ReactNode;
}> = ({ at, out, color = HIGHLIGHT, dur = 12, children }) => {
  const frame = useCurrentFrame();
  const p = ease(frame, at, dur);
  const o = out === undefined ? 0 : ease(frame, out, 14);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: "-0.1em",
          right: "-0.1em",
          top: "0.12em",
          bottom: "0.02em",
          background: color,
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
          opacity: 1 - o,
        }}
      />
      <span style={{ position: "relative" }}>{children}</span>
    </span>
  );
};
