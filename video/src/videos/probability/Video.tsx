import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BayesScene } from "./BayesScene";
import { CasesScene } from "./CasesScene";
import { DieScene } from "./DieScene";
import { DoorsScene } from "./DoorsScene";
import { LawScene } from "./LawScene";
import { OpenScene } from "./OpenScene";
import { RvScene } from "./RvScene";
import { SplitScene } from "./SplitScene";
import { TableScene } from "./TableScene";
import { TestScene } from "./TestScene";
import { WarrantyScene } from "./WarrantyScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Probability" (16:9), Unit 3 of the Statistics course, on the editorial
 * page the other unit videos share. One argument in five parts, every number
 * from the lessons' own seeded code (measure.py, data.ts):
 *
 *   1. Long-run frequency: OpenScene, LawScene.
 *   2. Conditioning and independence: TableScene, SplitScene.
 *   3. Bayes and the 99% test: TestScene, BayesScene.
 *   4. Monty Hall: DoorsScene, CasesScene.
 *   5. Expected value: RvScene, DieScene, WarrantyScene.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  const scenes: [string, React.FC][] = [
    ["hook", OpenScene],
    ["lln", LawScene],
    ["table", TableScene],
    ["split", SplitScene],
    ["test", TestScene],
    ["inverse", BayesScene],
    ["doors", DoorsScene],
    ["cases", CasesScene],
    ["rv", RvScene],
    ["die", DieScene],
    ["warranty", WarrantyScene],
  ];
  return (
    <>
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 3" title="Probability" />
      </Scene>
      {scenes.map(([id, Body], i) => {
        const next = scenes[i + 1];
        return (
          <Scene key={id} from={cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const Probability: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
