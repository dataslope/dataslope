import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AdmitScene } from "./AdmitScene";
import { BerksonScene } from "./BerksonScene";
import { CherryScene } from "./CherryScene";
import { CloseScene } from "./CloseScene";
import { ConfoundScene } from "./ConfoundScene";
import { DScene } from "./DScene";
import { HugeScene } from "./HugeScene";
import { RatesScene } from "./RatesScene";
import { RtmScene } from "./RtmScene";
import { SharpScene } from "./SharpScene";
import { SweepScene } from "./SweepScene";
import { UnitScene } from "./UnitScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Interpreting results" (16:9), Unit 8 of the Statistics course, on the
 * editorial page the course shares. One argument in four parts, every number
 * from the lessons' own seeded code (measure.py, data.ts):
 *
 *   1. Significant isn't important: HugeScene, DScene, SweepScene, RatesScene.
 *   2. Simpson's paradox and confounding: AdmitScene, ConfoundScene.
 *   3. Regression to the mean: RtmScene.
 *   4. Sharpshooters, selection and the unit of analysis: CherryScene,
 *      SharpScene, BerksonScene, UnitScene, and the close, CloseScene.
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
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 8" title="Interpreting results" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("dscene"))} fade={6}>
        <HugeScene />
      </Scene>
      <Scene from={cut("dscene")} to={until(cut("sweep"))} fade={6}>
        <DScene />
      </Scene>
      <Scene from={cut("sweep")} to={until(cut("rates"))} fade={6}>
        <SweepScene />
      </Scene>
      <Scene from={cut("rates")} to={until(cut("admit"))} fade={6}>
        <RatesScene />
      </Scene>
      <Scene from={cut("admit")} to={until(cut("confound"))} fade={6}>
        <AdmitScene />
      </Scene>
      <Scene from={cut("confound")} to={until(cut("rtm"))} fade={6}>
        <ConfoundScene />
      </Scene>
      <Scene from={cut("rtm")} to={until(cut("cherry"))} fade={6}>
        <RtmScene />
      </Scene>
      <Scene from={cut("cherry")} to={until(cut("sharp"))} fade={6}>
        <CherryScene />
      </Scene>
      <Scene from={cut("sharp")} to={until(cut("berkson"))} fade={6}>
        <SharpScene />
      </Scene>
      <Scene from={cut("berkson")} to={until(cut("unit"))} fade={6}>
        <BerksonScene />
      </Scene>
      <Scene from={cut("unit")} to={until(cut("close"))} fade={6}>
        <UnitScene />
      </Scene>
      <Scene from={cut("close")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const InterpretingResults: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
