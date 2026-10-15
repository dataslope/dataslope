import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ChainScene } from "./ChainScene";
import { FixScene } from "./FixScene";
import { LogicScene } from "./LogicScene";
import { TrapScene } from "./TrapScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The NULL trap" (16:9): why `WHERE id NOT IN (subquery)` returns no rows
 * once the subquery yields a NULL, set as a magazine's science page on the
 * shared editorial kit (src/editorial/). Every table on screen is what
 * PGlite returned (data.ts).
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
      <Scene from={0} to={until(cut("three"))} fade={6}>
        <TrapScene />
      </Scene>
      <Scene from={cut("three")} to={until(cut("expand"))} fade={6}>
        <LogicScene />
      </Scene>
      <Scene from={cut("expand")} to={until(cut("exists"))} fade={6}>
        <ChainScene />
      </Scene>
      <Scene from={cut("exists")} to={durationInFrames + OVERLAP} fade={6}>
        <FixScene />
      </Scene>
    </>
  );
};

export const SqlNullTrap: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
