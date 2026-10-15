import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { RuleScene } from "./RuleScene";
import { ShapesScene } from "./ShapesScene";
import { ShareScene } from "./ShareScene";
import { SplitScene } from "./SplitScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "pandas groupby: split, apply, combine" (16:9), on the shared editorial
 * page: the lesson's seven-row frame split by department, summed and
 * recombined, then the same sum through `.transform`, which keeps every row
 * and so gives each its share of its group. Every number comes from pandas
 * (measure.py, data.ts).
 *
 * The frame sits in the same place in the first three scenes, so the cuts
 * between them cross-fade around it. Every scene boundary is a narration cue,
 * so new audio re-times the cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("miss"))} fade={6}>
        <SplitScene />
      </Scene>
      <Scene from={cut("miss")} to={until(cut("share"))} fade={6}>
        <ShapesScene />
      </Scene>
      <Scene from={cut("share")} to={until(cut("rule"))} fade={6}>
        <ShareScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const PandasGroupby: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
