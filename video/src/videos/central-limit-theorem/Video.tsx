import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BuildScene } from "./BuildScene";
import { ShapesScene } from "./ShapesScene";
import { SpreadScene } from "./SpreadScene";
import { ThumbScene } from "./ThumbScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The Central Limit Theorem" (16:9), as a print magazine's science pages:
 * warm paper, Source Serif 4 headlines, and numbered figures drawn from a
 * seeded simulation (data.ts).
 *
 * The page, its face and its captions setting come from the shared editorial
 * kit (src/editorial/Page.tsx).
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
      <Scene from={0} to={until(cut("any-shape"))} fade={6}>
        <BuildScene />
      </Scene>
      <Scene from={cut("any-shape")} to={until(cut("thumb"))} fade={6}>
        <ShapesScene />
      </Scene>
      <Scene from={cut("thumb")} to={until(cut("spread"))} fade={6}>
        <ThumbScene />
      </Scene>
      <Scene from={cut("spread")} to={durationInFrames + OVERLAP} fade={6}>
        <SpreadScene />
      </Scene>
    </>
  );
};

export const CentralLimitTheorem: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
