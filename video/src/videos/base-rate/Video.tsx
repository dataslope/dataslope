import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BayesScene } from "./BayesScene";
import { CrowdScene } from "./CrowdScene";
import { HookScene } from "./HookScene";
import { RetestScene } from "./RetestScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Base-rate neglect" (16:9), on the editorial page the Central Limit Theorem
 * video set: a 99% accurate test for a condition one person in a thousand
 * has, walked through ten thousand people. Every number on screen is derived
 * from the lesson's inputs in data.ts.
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
      <Scene from={0} to={until(cut("crowd"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("crowd")} to={until(cut("bayes"))} fade={6}>
        <CrowdScene />
      </Scene>
      <Scene from={cut("bayes")} to={until(cut("again"))} fade={6}>
        <BayesScene />
      </Scene>
      <Scene from={cut("again")} to={durationInFrames + OVERLAP} fade={6}>
        <RetestScene />
      </Scene>
    </>
  );
};

export const BaseRate: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
