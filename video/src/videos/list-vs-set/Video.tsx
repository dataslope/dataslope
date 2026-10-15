import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CodeScene } from "./CodeScene";
import { GrowthScene } from "./GrowthScene";
import { MechanismScene } from "./MechanismScene";
import { RuleScene } from "./RuleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "List or set?" (16:9): why `x in a_list` is slow and `x in a_set` is fast,
 * set as a magazine's science page on the shared editorial kit
 * (src/editorial/), with every time on screen measured (data.ts).
 *
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and stays up a few frames into the next, so new audio re-times the
 * cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("scan"))} fade={6}>
        <CodeScene />
      </Scene>
      <Scene from={cut("scan")} to={until(cut("grow"))} fade={6}>
        <MechanismScene />
      </Scene>
      <Scene from={cut("grow")} to={until(cut("rule"))} fade={6}>
        <GrowthScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const ListVsSet: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
