import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AmbiguityScene } from "./AmbiguityScene";
import { HalvesScene } from "./HalvesScene";
import { HookScene } from "./HookScene";
import { LayersScene } from "./LayersScene";
import { MessScene } from "./MessScene";
import { OrderScene } from "./OrderScene";
import { PipelineScene } from "./PipelineScene";
import { RulesScene } from "./RulesScene";
import { SplitScene } from "./SplitScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Why text is hard" (16:9), Unit 1 of Natural Language Processing with
 * Python, the course's first video. One argument in three parts, every token,
 * list and count from the lessons' own code run in NLTK 3.9.4 (measure.py,
 * data.ts):
 *
 *   1. Text is unstructured, ambiguous and messy: HookScene,
 *      AmbiguityScene, MessScene, SplitScene.
 *   2. What an NLP system does: LayersScene, RulesScene.
 *   3. The pipeline: PipelineScene, HalvesScene, OrderScene (and the bridge
 *      to Unit 2).
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
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Natural Language Processing with Python" unit="Unit 1" title="Why text is hard" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("ambiguity"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("ambiguity")} to={until(cut("contractions"))} fade={6}>
        <AmbiguityScene />
      </Scene>
      <Scene from={cut("contractions")} to={until(cut("split"))} fade={6}>
        <MessScene />
      </Scene>
      <Scene from={cut("split")} to={until(cut("layers"))} fade={6}>
        <SplitScene />
      </Scene>
      <Scene from={cut("layers")} to={until(cut("rules"))} fade={6}>
        <LayersScene />
      </Scene>
      <Scene from={cut("rules")} to={until(cut("pipeline"))} fade={6}>
        <RulesScene />
      </Scene>
      <Scene from={cut("pipeline")} to={until(cut("cleaning"))} fade={6}>
        <PipelineScene />
      </Scene>
      <Scene from={cut("cleaning")} to={until(cut("order"))} fade={6}>
        <HalvesScene />
      </Scene>
      <Scene from={cut("order")} to={durationInFrames + OVERLAP} fade={6}>
        <OrderScene />
      </Scene>
    </>
  );
};

export const NlpWhyTextIsHard: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
