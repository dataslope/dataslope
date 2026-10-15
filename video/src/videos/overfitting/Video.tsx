import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CvScene } from "./CvScene";
import { ErrorScene } from "./ErrorScene";
import { FitScene } from "./FitScene";
import { RuleScene } from "./RuleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Overfitting" (16:9), on the editorial page: polynomials of rising degree
 * fitted to twelve noisy points, scored on those points and on new ones, then
 * cross-validated. Every curve and number comes from measure.py's run of
 * scikit-learn (measurements.json, read by data.ts).
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
      <Scene from={0} to={until(cut("sweep"))} fade={6}>
        <FitScene />
      </Scene>
      <Scene from={cut("sweep")} to={until(cut("holdout"))} fade={6}>
        <ErrorScene />
      </Scene>
      <Scene from={cut("holdout")} to={until(cut("rule"))} fade={6}>
        <CvScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const Overfitting: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
