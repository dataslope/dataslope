import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/** Placeholder for the deep dive "How one attention score is computed"; its builder replaces it. */
export const script: NarrationScript = {
  id: "llm-attention-score",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Placeholder." }],
};
