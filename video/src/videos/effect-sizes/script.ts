import type { NarrationScript } from "../../narration/types";

/**
 * Placeholder for Statistics Unit 8.1, "Effect sizes" (16:9): registered in
 * Root.tsx so the video can be built in this folder alone. Replace the whole
 * file with the real script.
 */
export const script: NarrationScript = {
  id: "effect-sizes",
  voice: "hope",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  beats: [{ id: "placeholder", text: "This video is being written." }],
};
