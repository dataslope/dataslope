import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CodeScene } from "./CodeScene";
import { CollapseScene } from "./CollapseScene";
import { CompareScene } from "./CompareScene";
import { GrowthScene } from "./GrowthScene";
import { MemoScene } from "./MemoScene";
import { TreeScene } from "./TreeScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Recursive Fibonacci, and the memo that fixes it" (16:9), on the shared
 * editorial page: the lesson's naive fib in C++, its call tree, the call
 * count as n grows, then the memoized version and what it costs instead.
 * Every count and time on screen comes from running fib.cpp (data.ts).
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
      <Scene from={0} to={until(cut("tree"))} fade={6}>
        <CodeScene />
      </Scene>
      <Scene from={cut("tree")} to={until(cut("count"))} fade={6}>
        <TreeScene />
      </Scene>
      <Scene from={cut("count")} to={until(cut("fix"))} fade={6}>
        <GrowthScene />
      </Scene>
      <Scene from={cut("fix")} to={until(cut("collapse"))} fade={6}>
        <MemoScene />
      </Scene>
      <Scene from={cut("collapse")} to={until(cut("linear"))} fade={6}>
        <CollapseScene />
      </Scene>
      <Scene from={cut("linear")} to={durationInFrames + OVERLAP} fade={6}>
        <CompareScene />
      </Scene>
    </>
  );
};

export const RecursionFib: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
