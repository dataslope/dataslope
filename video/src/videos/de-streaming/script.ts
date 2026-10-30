import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Streaming & messaging" (16:9), Part 8 of the Data Engineer
 * interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/streaming.mdx.
 *
 * A placeholder until the video is built: one beat, so the composition
 * registers and the package bundles.
 */
export const script: NarrationScript = {
  id: "de-streaming",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Streaming and messaging." }],
};
