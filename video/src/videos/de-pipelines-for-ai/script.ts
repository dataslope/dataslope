import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Pipelines for AI" (16:9), Part 11 of the Data Engineer
 * interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/pipelines-for-ai.mdx.
 *
 * A placeholder until the video is built: one beat, so the composition
 * registers and the package bundles.
 */
export const script: NarrationScript = {
  id: "de-pipelines-for-ai",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [{ id: "hook", scene: true, text: "Pipelines for AI." }],
};
