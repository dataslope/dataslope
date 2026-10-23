import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/** Placeholder for the deep dive "Zipf's law, read off a log-log plot"; its builder replaces it. */
export const script: NarrationScript = {
  id: "nlp-zipfs-law",
  voice: "hope",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Placeholder." }],
};
