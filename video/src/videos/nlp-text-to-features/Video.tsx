import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BagScene } from "./BagScene";
import { BinaryScene } from "./BinaryScene";
import { BlindScene } from "./BlindScene";
import { CountsScene } from "./CountsScene";
import { DefaultScene } from "./DefaultScene";
import { FlagScene } from "./FlagScene";
import { IdfScene } from "./IdfScene";
import { LexiconScene } from "./LexiconScene";
import { LimitsScene } from "./LimitsScene";
import { MenuScene } from "./MenuScene";
import { MorphScene } from "./MorphScene";
import { TasksScene } from "./TasksScene";
import { TwoPipelinesScene } from "./TwoPipelinesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "From text to features" (16:9), Unit 4 of Natural Language Processing with
 * Python. One argument in four parts, every token, vector, weight and verdict
 * from the lessons' own code (measure.py, data.ts):
 *
 *   1. Choosing the pipeline: MenuScene, TwoPipelinesScene, TasksScene.
 *   2. Bag of words: BagScene, BinaryScene, BlindScene.
 *   3. TF-IDF, adapted from the TfIdf video: CountsScene, IdfScene,
 *      MorphScene, DefaultScene.
 *   4. Rule-based sentiment: LexiconScene, FlagScene, LimitsScene (and the
 *      bridge to Unit 5).
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
        <SeriesIntro course="Natural Language Processing with Python" unit="Unit 4" title="From text to features" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("review"))} fade={6}>
        <MenuScene />
      </Scene>
      <Scene from={cut("review")} to={until(cut("tasks"))} fade={6}>
        <TwoPipelinesScene />
      </Scene>
      <Scene from={cut("tasks")} to={until(cut("bag"))} fade={6}>
        <TasksScene />
      </Scene>
      <Scene from={cut("bag")} to={until(cut("binary"))} fade={6}>
        <BagScene />
      </Scene>
      <Scene from={cut("binary")} to={until(cut("order"))} fade={6}>
        <BinaryScene />
      </Scene>
      <Scene from={cut("order")} to={until(cut("counts"))} fade={6}>
        <BlindScene />
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
      <Scene from={cut("sklearn")} to={until(cut("lexicon"))} fade={6}>
        <DefaultScene />
      </Scene>
      <Scene from={cut("lexicon")} to={until(cut("flag"))} fade={6}>
        <LexiconScene />
      </Scene>
      <Scene from={cut("flag")} to={until(cut("limits"))} fade={6}>
        <FlagScene />
      </Scene>
      <Scene from={cut("limits")} to={durationInFrames + OVERLAP} fade={6}>
        <LimitsScene />
      </Scene>
    </>
  );
};

export const NlpTextToFeatures: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
