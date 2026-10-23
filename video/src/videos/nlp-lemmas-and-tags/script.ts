import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/** Placeholder for the deep dive "Lemmatizing needs the part of speech"; its builder replaces it. */
export const script: NarrationScript = {
  id: "nlp-lemmas-and-tags",
  voice: "hope",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Placeholder." }],
};
