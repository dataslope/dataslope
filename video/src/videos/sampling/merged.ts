import { createContext, useContext } from "react";

/** Which part of the merged Unit 5 video a scene is playing in. */
export type MergedPart = {
  /** The part's kicker ("Sampling bias"). */
  name: string;
  /** 0 for the first part. */
  index: number;
  /** How many parts the merged video has. */
  count: number;
  /** How many figures the parts before this one number, so this part's
   *  Fig. 1 continues the merged video's count rather than starting again. */
  figBase: number;
};

/**
 * Set by the merged video (Sampling, Video.tsx) around each part's scenes,
 * and null when a scene plays in its own standalone video. The parts' scenes
 * read it for the few things that differ in the merged video: a closing
 * scene's "Next: …" line, which reads wrong in the middle of one video whose
 * parts are joined by their spoken bridges (StandardError's, the unit's
 * bridge to Unit 6, stays), the part's kicker, and its figure numbers.
 */
export const MergedPartContext = createContext<MergedPart | null>(null);

export const useMergedPart = () => useContext(MergedPartContext);

/**
 * A part's figure number as the video playing it should print it: its own
 * standalone, carried on from the parts before it in the merged video, so
 * the merged video counts Fig. 1 to Fig. 27 once instead of restarting at
 * every part. `const fig = useFigNumber(); <FigLabel n={fig(3)} … />`.
 */
export const useFigNumber = () => {
  const part = useMergedPart();
  return (n: number) => String(n + (part?.figBase ?? 0));
};
