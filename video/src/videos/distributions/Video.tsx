import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AreaScene } from "./AreaScene";
import { BellScene } from "./BellScene";
import { CastScene } from "./CastScene";
import { ChooseScene } from "./ChooseScene";
import { ExtentScene } from "./ExtentScene";
import { FitScene } from "./FitScene";
import { GeometricScene } from "./GeometricScene";
import { HeightScene } from "./HeightScene";
import { PoissonScene } from "./PoissonScene";
import { QQScene } from "./QQScene";
import { QuantileScene } from "./QuantileScene";
import { RuleScene } from "./RuleScene";
import { SkewScene } from "./SkewScene";
import { ZScene } from "./ZScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Distributions" (16:9), Unit 4 of the Statistics course, on the editorial
 * page the other unit videos share. One argument in four parts, every number
 * from the lessons' own seeded code (measure.py, data.ts):
 *
 *   1. Counting distributions, and choosing one: CastScene, PoissonScene,
 *      GeometricScene, ChooseScene.
 *   2. Probability is area: AreaScene, HeightScene, QuantileScene.
 *   3. The normal: BellScene, RuleScene, ZScene, SkewScene.
 *   4. Fitting, and where to stop trusting it: FitScene, QQScene,
 *      ExtentScene, which ends on the bridge to Unit 5.
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
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 4" title="Distributions" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("poisson"))} fade={6}>
        <CastScene />
      </Scene>
      <Scene from={cut("poisson")} to={until(cut("geometric"))} fade={6}>
        <PoissonScene />
      </Scene>
      <Scene from={cut("geometric")} to={until(cut("choose"))} fade={6}>
        <GeometricScene />
      </Scene>
      <Scene from={cut("choose")} to={until(cut("exact"))} fade={6}>
        <ChooseScene />
      </Scene>
      <Scene from={cut("exact")} to={until(cut("uniform"))} fade={6}>
        <AreaScene />
      </Scene>
      <Scene from={cut("uniform")} to={until(cut("quantile"))} fade={6}>
        <HeightScene />
      </Scene>
      <Scene from={cut("quantile")} to={until(cut("bell"))} fade={6}>
        <QuantileScene />
      </Scene>
      <Scene from={cut("bell")} to={until(cut("rule"))} fade={6}>
        <BellScene />
      </Scene>
      <Scene from={cut("rule")} to={until(cut("z"))} fade={6}>
        <RuleScene />
      </Scene>
      <Scene from={cut("z")} to={until(cut("incomes"))} fade={6}>
        <ZScene />
      </Scene>
      <Scene from={cut("incomes")} to={until(cut("fit"))} fade={6}>
        <SkewScene />
      </Scene>
      <Scene from={cut("fit")} to={until(cut("qq"))} fade={6}>
        <FitScene />
      </Scene>
      <Scene from={cut("qq")} to={until(cut("extent"))} fade={6}>
        <QQScene />
      </Scene>
      <Scene from={cut("extent")} to={durationInFrames + OVERLAP} fade={6}>
        <ExtentScene />
      </Scene>
    </>
  );
};

export const Distributions: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
