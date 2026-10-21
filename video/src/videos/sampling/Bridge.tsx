import React from "react";
import { useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { body, HAIRLINE, INK } from "../../editorial/style";
import { Ink, NextLine } from "../../editorial/ui";
import { useMergedPart } from "./merged";

/** Line pitch of a bridge's lines, at body(34). */
const PITCH = 48;

/**
 * A part's spoken bridge into the next, on screen.
 *
 * Standalone, it is the series' `NextLine`: a hairline and "Next: …".
 *
 * In the merged Unit 5 video the next part follows straight on, so "Next:"
 * reads wrong there. But the bridge still turns to a new idea while the
 * finished scene eases back, and with nothing in its place the narrator
 * introduced that idea over a page that was only fading. So the same
 * hairline carries the idea itself, a line at a time as it is said.
 *
 * `x`, `y` and `width` place both versions; `y` is a page position, already
 * through `useLayout().y()`.
 */
export const Bridge: React.FC<{
  x: number;
  y: number;
  width: number;
  /** Standalone: the cue, and what follows "Next: ". */
  next: { at: number; text: React.ReactNode };
  /** Merged: each line of the spoken idea and the frame it inks on. */
  merged: readonly { at: number; text: React.ReactNode }[];
}> = ({ x, y, width, next, merged }) => {
  const frame = useCurrentFrame();
  const part = useMergedPart();
  if (!part) {
    return (
      <NextLine at={next.at} x={x} y={y} width={width}>
        {next.text}
      </NextLine>
    );
  }
  const first = merged[0]?.at ?? next.at;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width, height: 1, background: HAIRLINE, opacity: ease(frame, first - 4, 12) }} />
      {merged.map((line, i) => (
        <Ink key={i} at={line.at} dur={18} style={{ left: x, top: y + 20 + i * PITCH, ...body(34, true), color: INK, whiteSpace: "nowrap" }}>
          {line.text}
        </Ink>
      ))}
    </>
  );
};
