import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CountScene } from "./CountScene";
import { DiversityScene } from "./DiversityScene";
import { FishScene } from "./FishScene";
import { LemmaScene } from "./LemmaScene";
import { OrderScene } from "./OrderScene";
import { PennScene } from "./PennScene";
import { SparseScene } from "./SparseScene";
import { StopScene } from "./StopScene";
import { TailScene } from "./TailScene";
import { WindowScene } from "./WindowScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "What counting reveals" (16:9), Unit 3 of Natural Language Processing with
 * Python. One argument in three parts, every count, tag and n-gram from the
 * lessons' own code run in measure.py (data.ts):
 *
 *   1. Counting words: CountScene, DiversityScene, TailScene, StopScene.
 *   2. Tagging words: FishScene, PennScene, LemmaScene.
 *   3. Counting word pairs: WindowScene, OrderScene, SparseScene (and the
 *      bridge to Unit 4).
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
        <SeriesIntro course="Natural Language Processing with Python" unit="Unit 3" title="What counting reveals" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("diversity"))} fade={6}>
        <CountScene />
      </Scene>
      <Scene from={cut("diversity")} to={until(cut("book"))} fade={6}>
        <DiversityScene />
      </Scene>
      <Scene from={cut("book")} to={until(cut("top"))} fade={6}>
        <TailScene />
      </Scene>
      <Scene from={cut("top")} to={until(cut("fish"))} fade={6}>
        <StopScene />
      </Scene>
      <Scene from={cut("fish")} to={until(cut("penn"))} fade={6}>
        <FishScene />
      </Scene>
      <Scene from={cut("penn")} to={until(cut("lemma"))} fade={6}>
        <PennScene />
      </Scene>
      <Scene from={cut("lemma")} to={until(cut("together"))} fade={6}>
        <LemmaScene />
      </Scene>
      <Scene from={cut("together")} to={until(cut("compare"))} fade={6}>
        <WindowScene />
      </Scene>
      <Scene from={cut("compare")} to={until(cut("sparse"))} fade={6}>
        <OrderScene />
      </Scene>
      <Scene from={cut("sparse")} to={durationInFrames + OVERLAP} fade={6}>
        <SparseScene />
      </Scene>
    </>
  );
};

export const NlpCountingWords: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
