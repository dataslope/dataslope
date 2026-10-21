import React from "react";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { during } from "../../components/motion";
import { Scene } from "../../components/Scene";
import { EditorialPage } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider } from "../../narration/NarrationContext";
import type { Timeline } from "../../narration/types";
import { Scenes as CentralLimitTheoremScenes } from "../central-limit-theorem/Video";
import { Scenes as SamplingBiasScenes } from "../sampling-bias/Video";
import { Scenes as SamplingDistributionsScenes } from "../sampling-distributions/Video";
import { Scenes as StandardErrorScenes } from "../standard-error/Video";
import { Scenes as SurvivorshipBiasScenes } from "../survivorship-bias/Video";
import { MergedPartContext } from "./merged";
import type { SamplingProps } from "./metadata";
import { CROSSFADE, planParts, type PartSpan } from "./plan";
import { PARTS } from "./script";

/** Each part's scenes, in PARTS order: its standalone video, minus the page. */
const SCENES: readonly React.FC[] = [
  SamplingBiasScenes,
  SurvivorshipBiasScenes,
  SamplingDistributionsScenes,
  CentralLimitTheoremScenes,
  StandardErrorScenes,
];

/** A part's whole picture, cross-faded in at its start and out at its end
 *  (the last part ends on its own tail instead). Frames are the part's own. */
const Fade: React.FC<{ length: number; out: boolean; children: React.ReactNode }> = ({ length, out, children }) => {
  const frame = useCurrentFrame();
  const opacity = during(frame, 0, out ? length : length + CROSSFADE, CROSSFADE);
  return <div style={{ position: "absolute", inset: 0, opacity }}>{children}</div>;
};

/**
 * One part: its standalone video's scenes under its own narration, exactly
 * as that video times them, plus its own recorded beats. Inside the
 * Sequence, frame 0 is the part's own frame 0, so every cue in its scenes
 * lands where it does in the standalone video.
 */
/** How many numbered figures each part has, in PARTS order. A part that adds
 *  or drops a figure changes its count here, or the merged numbering after
 *  it skips or repeats a number. */
const FIGURES = [6, 2, 7, 5, 7];
const figBase = (k: number) => FIGURES.slice(0, k).reduce((a, b) => a + b, 0);

const Part: React.FC<{ k: number; timeline: Timeline; span: PartSpan }> = ({ k, timeline, span }) => {
  const Scenes = SCENES[k];
  const last = k === PARTS.length - 1;
  const length = span.to - span.from;
  return (
    <Sequence from={span.from} durationInFrames={length} name={PARTS[k].name}>
      <NarrationProvider timeline={timeline}>
        <MergedPartContext.Provider value={{ name: PARTS[k].name, index: k, count: PARTS.length, figBase: figBase(k) }}>
          <Fade length={length} out={!last}>
            <Scenes />
          </Fade>
          <NarrationAudio />
        </MergedPartContext.Provider>
      </NarrationProvider>
    </Sequence>
  );
};

const Parts: React.FC<{ parts: readonly Timeline[] }> = ({ parts }) => {
  const { fps } = useVideoConfig();
  const { spans } = planParts(parts, fps);
  return (
    <>
      <Scene from={0} to={spans[0].from + CROSSFADE} fade={CROSSFADE}>
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 5" title="Sampling" />
      </Scene>
      {parts.map((timeline, k) => (
        <Part key={PARTS[k].script.id} k={k} timeline={timeline} span={spans[k]} />
      ))}
    </>
  );
};

/**
 * Statistics Unit 5, "Sampling" (16:9), as one video: the series intro, then
 * the unit's five videos as its five parts, in order:
 *
 *   5.1 SamplingBias, 5.2 SurvivorshipBias, 5.3 SamplingDistributions,
 *   5.4 CentralLimitTheorem, 5.5 StandardError.
 *
 * Nothing is re-recorded. Each part is that video's own scenes under its own
 * NarrationProvider and NarrationAudio, so its cues, its beats and their
 * audio are the standalone video's, moved to where the part plays
 * (plan.ts). The parts already end on spoken bridges into one another; the
 * first four hide their "Next: …" line here (merged.ts), and each part
 * cross-fades into the next.
 */
export const Sampling: React.FC<SamplingProps> = ({ parts, ...props }) => (
  <EditorialPage {...props}>{parts ? <Parts parts={parts} /> : null}</EditorialPage>
);
