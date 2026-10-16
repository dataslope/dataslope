import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { DrawScene } from "./DrawScene";
import { PromptScene } from "./PromptScene";
import { RuleScene } from "./RuleScene";
import { TempScene } from "./TempScene";
import { TopPScene } from "./TopPScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Temperature" (16:9): what temperature does when a language model picks its
 * next token, on the shared editorial page (src/editorial/). The tokens and
 * scores are the lesson's own illustrative example, and every probability and
 * draw on screen is computed by measure.py (data.ts).
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
      <Scene from={0} to={until(cut("divide"))} fade={6}>
        <PromptScene />
      </Scene>
      <Scene from={cut("divide")} to={until(cut("draw"))} fade={6}>
        <TempScene />
      </Scene>
      <Scene from={cut("draw")} to={until(cut("topp"))} fade={6}>
        <DrawScene />
      </Scene>
      <Scene from={cut("topp")} to={until(cut("rule"))} fade={6}>
        <TopPScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const LlmTemperature: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
