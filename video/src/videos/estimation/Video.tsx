import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BuildScene } from "./BuildScene";
import { CoverageScene } from "./CoverageScene";
import { LeversScene } from "./LeversScene";
import { LimitsScene } from "./LimitsScene";
import { MedianScene } from "./MedianScene";
import { MisreadScene } from "./MisreadScene";
import { RateScene } from "./RateScene";
import { ResampleScene } from "./ResampleScene";
import { TestScene } from "./TestScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Estimation" (16:9), Unit 6 of the Statistics course, on the editorial page
 * the Unit 5 videos share. One argument in three parts, every number from the
 * lessons' own seeded code (measure.py, data.ts):
 *
 *   1. What "95% confident" means: BuildScene, CoverageScene, MisreadScene.
 *   2. What makes an interval wide: LeversScene, RateScene, TestScene.
 *   3. The bootstrap: ResampleScene, MedianScene, LimitsScene.
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
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 6" title="Estimation" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("coverage"))} fade={6}>
        <BuildScene />
      </Scene>
      <Scene from={cut("coverage")} to={until(cut("misread"))} fade={6}>
        <CoverageScene />
      </Scene>
      <Scene from={cut("misread")} to={until(cut("wide"))} fade={6}>
        <MisreadScene />
      </Scene>
      <Scene from={cut("wide")} to={until(cut("rate"))} fade={6}>
        <LeversScene />
      </Scene>
      <Scene from={cut("rate")} to={until(cut("test"))} fade={6}>
        <RateScene />
      </Scene>
      <Scene from={cut("test")} to={until(cut("bootstrap"))} fade={6}>
        <TestScene />
      </Scene>
      <Scene from={cut("bootstrap")} to={until(cut("median"))} fade={6}>
        <ResampleScene />
      </Scene>
      <Scene from={cut("median")} to={until(cut("limits"))} fade={6}>
        <MedianScene />
      </Scene>
      <Scene from={cut("limits")} to={durationInFrames + OVERLAP} fade={6}>
        <LimitsScene />
      </Scene>
    </>
  );
};

export const Estimation: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
