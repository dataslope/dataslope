import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CloseScene } from "./CloseScene";
import { DecideScene } from "./DecideScene";
import { DesignScene } from "./DesignScene";
import { HoldoutScene } from "./HoldoutScene";
import { LookScene } from "./LookScene";
import { PeekScene } from "./PeekScene";
import { RandomizeScene } from "./RandomizeScene";
import { ResultScene } from "./ResultScene";
import { WallScene } from "./WallScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Statistics in practice" (16:9), Unit 9 of the Statistics course and its
 * last video, on the editorial page the other units share. One argument in
 * two parts, every number from the lessons' own seeded code and chart specs
 * (measure.py, data.ts):
 *
 *   1. Exploring, then confirming: LookScene, WallScene, HoldoutScene.
 *   2. An A/B test, end to end: DesignScene, RandomizeScene, PeekScene,
 *      ResultScene, DecideScene, and CloseScene for the whole course.
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
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 9" title="Statistics in practice" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("jobs"))} fade={6}>
        <LookScene />
      </Scene>
      <Scene from={cut("jobs")} to={until(cut("split"))} fade={6}>
        <WallScene />
      </Scene>
      <Scene from={cut("split")} to={until(cut("design"))} fade={6}>
        <HoldoutScene />
      </Scene>
      <Scene from={cut("design")} to={until(cut("who"))} fade={6}>
        <DesignScene />
      </Scene>
      <Scene from={cut("who")} to={until(cut("size"))} fade={6}>
        <RandomizeScene />
      </Scene>
      <Scene from={cut("size")} to={until(cut("result"))} fade={6}>
        <PeekScene />
      </Scene>
      <Scene from={cut("result")} to={until(cut("decide"))} fade={6}>
        <ResultScene />
      </Scene>
      <Scene from={cut("decide")} to={until(cut("began"))} fade={6}>
        <DecideScene />
      </Scene>
      <Scene from={cut("began")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const StatisticsInPractice: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
