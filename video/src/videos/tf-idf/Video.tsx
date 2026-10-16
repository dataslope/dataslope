import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CountsScene } from "./CountsScene";
import { DefaultScene } from "./DefaultScene";
import { HookScene } from "./HookScene";
import { IdfScene } from "./IdfScene";
import { MorphScene } from "./MorphScene";
import { RuleScene } from "./RuleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "TF-IDF" (16:9), on the editorial page: the lesson's three documents, their
 * term counts, the textbook idf, and the count table turning into TF-IDF in
 * place, then scikit-learn's smoothed default for contrast. Every number is
 * computed by measure.py (data.ts).
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
      <Scene from={0} to={until(cut("counts"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("counts")} to={until(cut("idf"))} fade={6}>
        <CountsScene />
      </Scene>
      <Scene from={cut("idf")} to={until(cut("tf"))} fade={6}>
        <IdfScene />
      </Scene>
      <Scene from={cut("tf")} to={until(cut("sklearn"))} fade={6}>
        <MorphScene />
      </Scene>
      <Scene from={cut("sklearn")} to={until(cut("rule"))} fade={6}>
        <DefaultScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const TfIdf: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
