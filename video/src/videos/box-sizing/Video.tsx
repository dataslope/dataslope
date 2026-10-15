import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ColumnsScene } from "./ColumnsScene";
import { FixScene } from "./FixScene";
import { LayersScene } from "./LayersScene";
import { SumScene } from "./SumScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The box model and box-sizing" (16:9), on the shared editorial page
 * (src/editorial/): the four layers of a box, the sum that makes a 300px box
 * 350px wide under the default content-box, the two 50% columns that stop
 * fitting in their row, and border-box, which fits them. Every pixel value is
 * read back from Chromium (measure.mjs, data.ts).
 *
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and stays up a few frames into the next, so new audio re-times the
 * cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("ask"))} fade={6}>
        <LayersScene />
      </Scene>
      <Scene from={cut("ask")} to={until(cut("columns"))} fade={6}>
        <SumScene />
      </Scene>
      <Scene from={cut("columns")} to={until(cut("fix"))} fade={6}>
        <ColumnsScene />
      </Scene>
      <Scene from={cut("fix")} to={durationInFrames + OVERLAP} fade={6}>
        <FixScene />
      </Scene>
    </>
  );
};

export const BoxSizing: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
