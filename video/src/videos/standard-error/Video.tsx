import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AgesScene } from "./AgesScene";
import { CheckScene } from "./CheckScene";
import { CostScene } from "./CostScene";
import { FormulaScene } from "./FormulaScene";
import { RulerScene } from "./RulerScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Standard error and the square-root-of-n law" (16:9), Unit 5's last video,
 * on the editorial page CentralLimitTheorem set and in its colors: the data
 * in blue, every statistic (an average, a pile of averages, an estimate's
 * spread) in the red accent. Every number comes from the lesson's own code,
 * re-run in measure.py (data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
export const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("one"))} fade={6}>
        <AgesScene />
      </Scene>
      <Scene from={cut("one")} to={until(cut("check"))} fade={6}>
        <FormulaScene />
      </Scene>
      <Scene from={cut("check")} to={until(cut("cost"))} fade={6}>
        <CheckScene />
      </Scene>
      <Scene from={cut("cost")} to={until(cut("ruler"))} fade={6}>
        <CostScene />
      </Scene>
      <Scene from={cut("ruler")} to={durationInFrames + OVERLAP} fade={6}>
        <RulerScene />
      </Scene>
    </>
  );
};

export const StandardError: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
