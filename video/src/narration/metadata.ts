import type { CalculateMetadataFunction } from "remotion";
import { staticFile } from "remotion";
import { assertUniqueBeatIds, buildTimeline } from "./timeline";
import type { NarrationAlignmentFile, NarrationScript, Timeline } from "./types";

/** Props every narrated composition receives. `timeline` is filled in by
 *  `narratedMetadata`; leave it null in `defaultProps`. */
export type NarratedProps = {
  timeline: Timeline | null;
  /** Burn the narration into the frame as captions. */
  captions: boolean;
};

/** The alignment file for a script, or null when no audio exists yet. Until
 *  there is audio, the browser logs this fetch as a 404; that is expected.
 *  Exported for a video that times several scripts (the merged Unit 5). */
export async function loadAlignment(
  scriptId: string,
): Promise<NarrationAlignmentFile | null> {
  const res = await fetch(staticFile(`narration/${scriptId}/alignment.json`));
  if (!res.ok) return null;
  return (await res.json()) as NarrationAlignmentFile;
}

/**
 * `calculateMetadata` for a narrated composition: times the script (from real
 * alignment when public/narration/<id>/alignment.json exists, otherwise from
 * the estimate) and sizes the composition to fit it.
 */
export function narratedMetadata<P extends NarratedProps>(
  script: NarrationScript,
): CalculateMetadataFunction<P> {
  return async ({ props }) => {
    assertUniqueBeatIds(script);
    const timeline = buildTimeline(script, await loadAlignment(script.id));
    const fps = 30;
    const stale = timeline.beats.filter((b) => b.source === "stale");
    if (stale.length > 0) {
      console.warn(
        `[${script.id}] audio is older than the script for: ${stale
          .map((b) => b.id)
          .join(", ")}. Those beats use estimated timing.`,
      );
    }
    return {
      fps,
      durationInFrames: Math.ceil(timeline.duration * fps),
      props: { ...props, timeline },
    };
  };
}
