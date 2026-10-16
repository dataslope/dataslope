import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CompareScene } from "./CompareScene";
import { JoinScene } from "./JoinScene";
import { KeepScene } from "./KeepScene";
import { OnScene } from "./OnScene";
import { WhereScene } from "./WhereScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The LEFT JOIN trap" (16:9): a WHERE on a right-table column turns a LEFT
 * JOIN into an inner join, and moving the test into ON undoes it. Set as a
 * magazine's science page on the shared editorial kit (src/editorial/); every
 * query and table on screen is what PGlite returned (data.ts).
 *
 * Figs. 2 to 4 share one layout, so each cut reads as an edit to the same
 * query. Every scene boundary is a narration cue: a scene starts just before
 * its beat and stays up a few frames into the next, so new audio re-times the
 * cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("left"))} fade={6}>
        <KeepScene />
      </Scene>
      <Scene from={cut("left")} to={until(cut("filter"))} fade={6}>
        <JoinScene />
      </Scene>
      <Scene from={cut("filter")} to={until(cut("fix"))} fade={6}>
        <WhereScene />
      </Scene>
      <Scene from={cut("fix")} to={until(cut("compare"))} fade={6}>
        <OnScene />
      </Scene>
      <Scene from={cut("compare")} to={durationInFrames + OVERLAP} fade={6}>
        <CompareScene />
      </Scene>
    </>
  );
};

export const LeftJoinTrap: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
