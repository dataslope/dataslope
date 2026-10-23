import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/** Placeholder for the deep dive "Why a chat's bill grows faster than the chat"; its builder replaces it. */
export const script: NarrationScript = {
  id: "llm-conversation-cost",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Placeholder." }],
};
