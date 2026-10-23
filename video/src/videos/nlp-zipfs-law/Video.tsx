import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CurveScene } from "./CurveScene";
import { PredictScene } from "./PredictScene";
import { SharesScene } from "./SharesScene";
import { WhyScene } from "./WhyScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Zipf's law, read off a log-log plot" (16:9): a deep dive for Natural
 * Language Processing with Python, Unit 3, on the shared editorial page. It
 * opens straight on its question, with no series intro, and ends on its
 * takeaway. Every count, share and slope on screen is measured by measure.py
 * on the lesson's own Emma (data.ts); script.ts says where each comes from.
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
      <Scene from={0} to={until(cut("predict"))} fade={6}>
        <CurveScene />
      </Scene>
      <Scene from={cut("predict")} to={until(cut("warn"))} fade={6}>
        <PredictScene />
      </Scene>
      <Scene from={cut("warn")} to={until(cut("why"))} fade={6}>
        <SharesScene />
      </Scene>
      <Scene from={cut("why")} to={durationInFrames + OVERLAP} fade={6}>
        <WhyScene />
      </Scene>
    </>
  );
};

export const NlpZipfsLaw: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
