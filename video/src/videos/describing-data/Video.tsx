import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BinScene } from "./BinScene";
import { DeliveryScene } from "./DeliveryScene";
import { DinoScene } from "./DinoScene";
import { DivisorScene } from "./DivisorScene";
import { OutlierScene } from "./OutlierScene";
import { RobustScene } from "./RobustScene";
import { SalaryScene } from "./SalaryScene";
import { ShapeScene } from "./ShapeScene";
import { SkewScene } from "./SkewScene";
import { TailScene } from "./TailScene";
import { WhichScene } from "./WhichScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Describing data" (16:9), Unit 2 of the Statistics course, on the editorial
 * page Unit 1 set. One argument in four parts, every number from the lessons'
 * own seeded code (measure.py, data.ts):
 *
 *   1. Mean and median: SalaryScene, SkewScene.
 *   2. Spread: DeliveryScene, DivisorScene, RobustScene.
 *   3. Shape, tails and outliers: ShapeScene, TailScene, OutlierScene.
 *   4. Always plot first: DinoScene, BinScene, WhichScene.
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
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 2" title="Describing data" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("orders"))} fade={6}>
        <SalaryScene />
      </Scene>
      <Scene from={cut("orders")} to={until(cut("delivery"))} fade={6}>
        <SkewScene />
      </Scene>
      <Scene from={cut("delivery")} to={until(cut("divisor"))} fade={6}>
        <DeliveryScene />
      </Scene>
      <Scene from={cut("divisor")} to={until(cut("incomes"))} fade={6}>
        <DivisorScene />
      </Scene>
      <Scene from={cut("incomes")} to={until(cut("shape"))} fade={6}>
        <RobustScene />
      </Scene>
      <Scene from={cut("shape")} to={until(cut("tails"))} fade={6}>
        <ShapeScene />
      </Scene>
      <Scene from={cut("tails")} to={until(cut("outlier"))} fade={6}>
        <TailScene />
      </Scene>
      <Scene from={cut("outlier")} to={until(cut("dino"))} fade={6}>
        <OutlierScene />
      </Scene>
      <Scene from={cut("dino")} to={until(cut("bins"))} fade={6}>
        <DinoScene />
      </Scene>
      <Scene from={cut("bins")} to={until(cut("plots"))} fade={6}>
        <BinScene />
      </Scene>
      <Scene from={cut("plots")} to={durationInFrames + OVERLAP} fade={6}>
        <WhichScene />
      </Scene>
    </>
  );
};

export const DescribingData: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
