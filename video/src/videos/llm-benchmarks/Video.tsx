import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CloseScene } from "./CloseScene";
import { ContaminationScene } from "./ContaminationScene";
import { CostScene } from "./CostScene";
import { ExamplesScene } from "./ExamplesScene";
import { FamiliesScene } from "./FamiliesScene";
import { HarnessScene } from "./HarnessScene";
import { MismatchScene } from "./MismatchScene";
import { ReportingScene } from "./ReportingScene";
import { RouteScene } from "./RouteScene";
import { SaturationScene } from "./SaturationScene";
import { ScaleScene } from "./ScaleScene";
import { ScoringScene } from "./ScoringScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Is it good enough?" (16:9), Unit 5 of How Large Language Models Work, the
 * course's last video. One argument in three parts, every number from the
 * lessons' own code blocks (measure.py, data.ts):
 *
 *   1. What benchmarks measure: RouteScene, FamiliesScene, ScaleScene.
 *   2. Four pitfalls: SaturationScene, ContaminationScene, ReportingScene,
 *      MismatchScene.
 *   3. Your own evaluation: ExamplesScene, HarnessScene, ScoringScene,
 *      CostScene, CloseScene. The course ends here, so there is no NextLine.
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
        <SeriesIntro course="How Large Language Models Work" unit="Unit 5" title="Is it good enough?" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("families"))} fade={6}>
        <RouteScene />
      </Scene>
      <Scene from={cut("families")} to={until(cut("read"))} fade={6}>
        <FamiliesScene />
      </Scene>
      <Scene from={cut("read")} to={until(cut("saturation"))} fade={6}>
        <ScaleScene />
      </Scene>
      <Scene from={cut("saturation")} to={until(cut("contam"))} fade={6}>
        <SaturationScene />
      </Scene>
      <Scene from={cut("contam")} to={until(cut("select"))} fade={6}>
        <ContaminationScene />
      </Scene>
      <Scene from={cut("select")} to={until(cut("mismatch"))} fade={6}>
        <ReportingScene />
      </Scene>
      <Scene from={cut("mismatch")} to={until(cut("own"))} fade={6}>
        <MismatchScene />
      </Scene>
      <Scene from={cut("own")} to={until(cut("harness"))} fade={6}>
        <ExamplesScene />
      </Scene>
      <Scene from={cut("harness")} to={until(cut("freetext"))} fade={6}>
        <HarnessScene />
      </Scene>
      <Scene from={cut("freetext")} to={until(cut("cost"))} fade={6}>
        <ScoringScene />
      </Scene>
      <Scene from={cut("cost")} to={until(cut("end"))} fade={6}>
        <CostScene />
      </Scene>
      <Scene from={cut("end")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const LlmBenchmarks: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
