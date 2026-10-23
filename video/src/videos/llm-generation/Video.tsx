import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BillScene } from "./BillScene";
import { CostScene } from "./CostScene";
import { FixScene } from "./FixScene";
import { PlausibleScene } from "./PlausibleScene";
import { ReturnsScene } from "./ReturnsScene";
import { RiskScene } from "./RiskScene";
import { RunsScene } from "./RunsScene";
import { ScoreScene } from "./ScoreScene";
import { SquareScene } from "./SquareScene";
import { TempScene } from "./TempScene";
import { ThinkScene } from "./ThinkScene";
import { TopPScene } from "./TopPScene";
import { WindowScene } from "./WindowScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Choosing the next token" (16:9), Unit 3 of How Large Language Models
 * Work. One argument in four parts, every number from the lessons' own code
 * (measure.py, data.ts):
 *
 *   1. Sampling: ScoreScene, TempScene, TopPScene, RunsScene.
 *   2. Why models hallucinate: PlausibleScene, RiskScene, FixScene.
 *   3. Context windows: WindowScene, CostScene, SquareScene.
 *   4. Reasoning models: ThinkScene, ReturnsScene, BillScene (and the bridge
 *      to Unit 4).
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
        <SeriesIntro course="How Large Language Models Work" unit="Unit 3" title="Choosing the next token" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("divide"))} fade={6}>
        <ScoreScene />
      </Scene>
      <Scene from={cut("divide")} to={until(cut("topp"))} fade={6}>
        <TempScene />
      </Scene>
      <Scene from={cut("topp")} to={until(cut("runs"))} fade={6}>
        <TopPScene />
      </Scene>
      <Scene from={cut("runs")} to={until(cut("plausible"))} fade={6}>
        <RunsScene />
      </Scene>
      <Scene from={cut("plausible")} to={until(cut("risk"))} fade={6}>
        <PlausibleScene />
      </Scene>
      <Scene from={cut("risk")} to={until(cut("hedge"))} fade={6}>
        <RiskScene />
      </Scene>
      <Scene from={cut("hedge")} to={until(cut("window"))} fade={6}>
        <FixScene />
      </Scene>
      <Scene from={cut("window")} to={until(cut("costs"))} fade={6}>
        <WindowScene />
      </Scene>
      <Scene from={cut("costs")} to={until(cut("square"))} fade={6}>
        <CostScene />
      </Scene>
      <Scene from={cut("square")} to={until(cut("think"))} fade={6}>
        <SquareScene />
      </Scene>
      <Scene from={cut("think")} to={until(cut("returns"))} fade={6}>
        <ThinkScene />
      </Scene>
      <Scene from={cut("returns")} to={until(cut("bill"))} fade={6}>
        <ReturnsScene />
      </Scene>
      <Scene from={cut("bill")} to={durationInFrames + OVERLAP} fade={6}>
        <BillScene />
      </Scene>
    </>
  );
};

export const LlmGeneration: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
