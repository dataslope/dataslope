import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BiggerScene } from "./BiggerScene";
import { CloseScene } from "./CloseScene";
import { DigestScene } from "./DigestScene";
import { RepeatScene } from "./RepeatScene";
import { SampleScene } from "./SampleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Bigger and biased is still biased" (16:9), on the editorial page of the
 * Central Limit Theorem video: the lesson's 200,000 satisfaction scores,
 * sampled at random and the easy way, every number measured by measure.py
 * (data.ts), then the Literary Digest's 1936 poll.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
export const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("again"))} fade={6}>
        <SampleScene />
      </Scene>
      <Scene from={cut("again")} to={until(cut("bigger"))} fade={6}>
        <RepeatScene />
      </Scene>
      <Scene from={cut("bigger")} to={until(cut("digest"))} fade={6}>
        <BiggerScene />
      </Scene>
      <Scene from={cut("digest")} to={until(cut("two"))} fade={6}>
        <DigestScene />
      </Scene>
      <Scene from={cut("two")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const SamplingBias: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
