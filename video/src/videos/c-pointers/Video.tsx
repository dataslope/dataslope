import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { PointerScene } from "./PointerScene";
import { RuleScene } from "./RuleScene";
import { SwapScene } from "./SwapScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Pointers in C" (16:9): a variable is a box at an address, `&` gives the
 * address and `*` follows it, and the swap that only works through pointers.
 * Set on the shared editorial page (src/editorial/), with every address and
 * every printed line from a real run (data.ts).
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
      <Scene from={0} to={until(cut("trap"))} fade={6}>
        <PointerScene />
      </Scene>
      <Scene from={cut("trap")} to={until(cut("fix"))} fade={6}>
        <SwapScene variant="copy" />
      </Scene>
      <Scene from={cut("fix")} to={until(cut("rule"))} fade={6}>
        <SwapScene variant="pointer" />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const CPointers: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
