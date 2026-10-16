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
const SCENES: { beat: string; Component: React.FC }[] = [
  { beat: "hook", Component: SalaryScene },
  { beat: "orders", Component: SkewScene },
  { beat: "delivery", Component: DeliveryScene },
  { beat: "divisor", Component: DivisorScene },
  { beat: "incomes", Component: RobustScene },
  { beat: "shape", Component: ShapeScene },
  { beat: "tails", Component: TailScene },
  { beat: "outlier", Component: OutlierScene },
  { beat: "dino", Component: DinoScene },
  { beat: "bins", Component: BinScene },
  { beat: "plots", Component: WhichScene },
];

const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 2" title="Describing data" />
      </Scene>
      {SCENES.map(({ beat: id, Component }, i) => (
        <Scene key={id} from={cut(id)} to={i + 1 < SCENES.length ? until(cut(SCENES[i + 1].beat)) : durationInFrames + OVERLAP} fade={6}>
          <Component />
        </Scene>
      ))}
    </>
  );
};

export const DescribingData: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
