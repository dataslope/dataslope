import type { CalculateMetadataFunction } from "remotion";
import type { EditorialProps } from "../../editorial/Page";
import { loadAlignment } from "../../narration/metadata";
import { assertUniqueBeatIds, buildTimeline } from "../../narration/timeline";
import type { Timeline } from "../../narration/types";
import { mergeTimelines, planParts } from "./plan";
import { PARTS } from "./script";

/** The merged video's props: the page's own (whose `timeline` is the merged
 *  one, for captions), plus each part's timeline, in PARTS order. */
export type SamplingProps = EditorialProps & {
  /** Filled in by samplingMetadata; leave it out of defaultProps. */
  parts?: Timeline[] | null;
};

/**
 * `calculateMetadata` for the merged video: times each part exactly as its
 * standalone video's narratedMetadata does (its script, its own alignment),
 * places the parts (plan.ts), and sizes the composition to fit them all.
 */
export const samplingMetadata: CalculateMetadataFunction<SamplingProps> = async ({ props }) => {
  const fps = 30;
  const parts = await Promise.all(
    PARTS.map(async ({ script }) => {
      assertUniqueBeatIds(script);
      const timeline = buildTimeline(script, await loadAlignment(script.id));
      const stale = timeline.beats.filter((b) => b.source === "stale");
      if (stale.length > 0) {
        console.warn(
          `[${script.id}] audio is older than the script for: ${stale.map((b) => b.id).join(", ")}. Those beats use estimated timing.`,
        );
      }
      return timeline;
    }),
  );
  const { spans, durationInFrames } = planParts(parts, fps);
  const timeline = mergeTimelines(
    PARTS.map(({ script }, k) => ({ id: script.id, timeline: parts[k] })),
    spans,
    fps,
    durationInFrames,
  );
  return { fps, durationInFrames, props: { ...props, timeline, parts } };
};
