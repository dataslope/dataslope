import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CaseScene } from "./CaseScene";
import { CloseScene } from "./CloseScene";
import { LemmaScene } from "./LemmaScene";
import { PeriodScene } from "./PeriodScene";
import { PunctScene } from "./PunctScene";
import { SplitScene } from "./SplitScene";
import { StemScene } from "./StemScene";
import { StopScene } from "./StopScene";
import { TrapScene } from "./TrapScene";
import { TweetScene } from "./TweetScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Cleaning text" (16:9), Unit 2 of Natural Language Processing with Python.
 * One argument in four parts, every token, stem and lemma from the lessons'
 * own code run under NLTK 3.9.4 (measure.py, data.ts):
 *
 *   1. Tokens: SplitScene, PeriodScene, TweetScene.
 *   2. Normalization: CaseScene, PunctScene.
 *   3. Stopwords: StopScene, TrapScene.
 *   4. Stems and lemmas: StemScene, LemmaScene, and CloseScene (what every
 *      step threw away, and the bridge to Unit 3).
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
        <SeriesIntro course="Natural Language Processing with Python" unit="Unit 2" title="Cleaning text" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("period"))} fade={6}>
        <SplitScene />
      </Scene>
      <Scene from={cut("period")} to={until(cut("tweet"))} fade={6}>
        <PeriodScene />
      </Scene>
      <Scene from={cut("tweet")} to={until(cut("case"))} fade={6}>
        <TweetScene />
      </Scene>
      <Scene from={cut("case")} to={until(cut("punct"))} fade={6}>
        <CaseScene />
      </Scene>
      <Scene from={cut("punct")} to={until(cut("stop"))} fade={6}>
        <PunctScene />
      </Scene>
      <Scene from={cut("stop")} to={until(cut("trap"))} fade={6}>
        <StopScene />
      </Scene>
      <Scene from={cut("trap")} to={until(cut("forms"))} fade={6}>
        <TrapScene />
      </Scene>
      <Scene from={cut("forms")} to={until(cut("lemma"))} fade={6}>
        <StemScene />
      </Scene>
      <Scene from={cut("lemma")} to={until(cut("close"))} fade={6}>
        <LemmaScene />
      </Scene>
      <Scene from={cut("close")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const NlpCleaningText: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
