import type { NarrationScript } from "../../narration/types";
import { script as centralLimitTheorem } from "../central-limit-theorem/script.ts";
import { script as samplingBias } from "../sampling-bias/script.ts";
import { script as samplingDistributions } from "../sampling-distributions/script.ts";
import { script as standardError } from "../standard-error/script.ts";
import { script as survivorshipBias } from "../survivorship-bias/script.ts";

/**
 * Statistics Unit 5, "Sampling", as one video: the unit's five voiced videos
 * played in order, each as a part, after the series intro.
 *
 * The merged video records nothing of its own. Each part is its standalone
 * video's scenes under its own NarrationProvider, timed by its own script
 * and its own public/narration/<id>/alignment.json, and playing its own
 * recorded beats (Video.tsx). The five already end on spoken bridges into
 * one another, so the parts join without new words. plan.ts places them.
 *
 * `name` is the part's kicker in the merged video.
 */
export const PARTS: readonly { name: string; script: NarrationScript }[] = [
  { name: "Sampling bias", script: samplingBias },
  { name: "Survivorship bias", script: survivorshipBias },
  { name: "Sampling distributions", script: samplingDistributions },
  { name: "The central limit theorem", script: centralLimitTheorem },
  { name: "Standard error", script: standardError },
];

/**
 * The merged video's own script, which the tooling looks for (`narrate`,
 * `cues`, the scene tests): deliberately empty. Every word it plays is
 * already recorded in the five parts, so `npm run narrate -- sampling` has
 * nothing to voice and costs nothing. Edit and voice a part in its own
 * folder; the merged video picks the change up from there.
 */
export const script: NarrationScript = {
  id: "sampling",
  voice: "hope",
  leadIn: 4.6,
  beats: [],
};
