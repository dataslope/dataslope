import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AnyScene } from "./AnyScene";
import { HookScene } from "./HookScene";
import { LeversScene } from "./LeversScene";
import { ThreeScene } from "./ThreeScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The three distributions to keep apart" (16:9), Unit 5 of the Statistics
 * course, on the editorial page the Central Limit Theorem video set: the
 * population, one sample and the sampling distribution, every bar and number
 * from the lesson's own seeded code (measure.py, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them. The three distributions share one
 * scene, so their rows never move; "third" and "compare" open its later
 * phases after a scene's pause, without a cut.
 */
export const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("pop"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("pop")} to={until(cut("trap"))} fade={6}>
        <ThreeScene />
      </Scene>
      <Scene from={cut("trap")} to={until(cut("any"))} fade={6}>
        <LeversScene />
      </Scene>
      <Scene from={cut("any")} to={durationInFrames + OVERLAP} fade={6}>
        <AnyScene />
      </Scene>
    </>
  );
};

export const SamplingDistributions: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
