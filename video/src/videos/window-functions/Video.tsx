import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { GroupScene } from "./GroupScene";
import { OverScene } from "./OverScene";
import { PayoffScene } from "./PayoffScene";
import { RuleScene } from "./RuleScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Why window functions exist" (16:9), on the shared editorial page
 * (src/editorial/): six of the lesson's sales as a table, the same table under
 * GROUP BY, the same sum as a window function, and the share and running
 * total that only a window can put beside the rows. Every table on screen is
 * what PGlite returned for the listing beside it (data.ts).
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
      <Scene from={0} to={until(cut("over"))} fade={6}>
        <GroupScene />
      </Scene>
      <Scene from={cut("over")} to={until(cut("share"))} fade={6}>
        <OverScene />
      </Scene>
      <Scene from={cut("share")} to={until(cut("rule"))} fade={6}>
        <PayoffScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const WindowFunctions: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
