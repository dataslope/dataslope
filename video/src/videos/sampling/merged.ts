import { createContext, useContext } from "react";

/** Which part of the merged Unit 5 video a scene is playing in. */
export type MergedPart = {
  /** The part's kicker ("Sampling bias"). */
  name: string;
  /** 0 for the first part. */
  index: number;
  /** How many parts the merged video has. */
  count: number;
};

/**
 * Set by the merged video (Sampling, Video.tsx) around each part's scenes,
 * and null when a scene plays in its own standalone video. The parts' scenes
 * read it for the few things that differ in the merged video: a closing
 * scene's "Next: …" line, which reads wrong in the middle of one video whose
 * parts are joined by their spoken bridges (StandardError's, the unit's
 * bridge to Unit 6, stays), and the part's kicker.
 */
export const MergedPartContext = createContext<MergedPart | null>(null);

export const useMergedPart = () => useContext(MergedPartContext);
