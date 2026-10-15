import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CollapseScene } from "./CollapseScene";
import { ManyScene } from "./ManyScene";
import { PairScene } from "./PairScene";
import { RuleScene } from "./RuleScene";
import { WalkScene } from "./WalkScene";
import { WhyScene } from "./WhyScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Trends that are not there" (16:9), on the editorial page: a coin-flip
 * random walk, a second one that correlates with it by chance, ten thousand
 * pairs that do the same, and the differences that do not. Every curve and
 * number comes from measure.py (data.ts).
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
      <Scene from={0} to={until(cut("pair"))} fade={6}>
        <WalkScene />
      </Scene>
      <Scene from={cut("pair")} to={until(cut("many"))} fade={6}>
        <PairScene />
      </Scene>
      <Scene from={cut("many")} to={until(cut("why"))} fade={6}>
        <ManyScene />
      </Scene>
      <Scene from={cut("why")} to={until(cut("collapse"))} fade={6}>
        <WhyScene />
      </Scene>
      <Scene from={cut("collapse")} to={until(cut("rule"))} fade={6}>
        <CollapseScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <RuleScene />
      </Scene>
    </>
  );
};

export const RandomWalks: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
