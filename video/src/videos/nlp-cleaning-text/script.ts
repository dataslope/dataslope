import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/** Placeholder for "Cleaning text", Unit 2 of Natural Language Processing with Python; its builder replaces it. */
export const script: NarrationScript = {
  id: "nlp-cleaning-text",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Placeholder." }],
};
