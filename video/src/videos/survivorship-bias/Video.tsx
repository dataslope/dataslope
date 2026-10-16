import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { FundsScene } from "./FundsScene";
import { HabitScene } from "./HabitScene";
import { HookScene } from "./HookScene";
import { WaldScene } from "./WaldScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Survivorship bias" (16:9), on the editorial page of the Sampling unit:
 * Wald's question and the planes that came home, the worked example in his
 * 1943 memos, the lesson's 5,000 simulated funds with the losers deleted,
 * and the habit of asking what is missing. Every number comes from
 * measure.py through data.ts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("example"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("example")} to={until(cut("funds"))} fade={6}>
        <WaldScene />
      </Scene>
      <Scene from={cut("funds")} to={until(cut("habit"))} fade={6}>
        <FundsScene />
      </Scene>
      <Scene from={cut("habit")} to={durationInFrames + OVERLAP} fade={6}>
        <HabitScene />
      </Scene>
    </>
  );
};

export const SurvivorshipBias: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
