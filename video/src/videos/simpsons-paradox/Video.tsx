import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { DeptScene } from "./DeptScene";
import { LessonScene } from "./LessonScene";
import { MixScene } from "./MixScene";
import { TotalsScene } from "./TotalsScene";
import { WeightScene } from "./WeightScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Simpson's paradox" (16:9), on the editorial page the Central Limit Theorem
 * video set: Berkeley's 1973 admissions, pooled and then split by department,
 * every number computed from the published counts (data.ts).
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
      <Scene from={0} to={until(cut("split"))} fade={6}>
        <TotalsScene />
      </Scene>
      <Scene from={cut("split")} to={until(cut("question"))} fade={6}>
        <DeptScene />
      </Scene>
      <Scene from={cut("question")} to={until(cut("average"))} fade={6}>
        <MixScene />
      </Scene>
      <Scene from={cut("average")} to={until(cut("name"))} fade={6}>
        <WeightScene />
      </Scene>
      <Scene from={cut("name")} to={durationInFrames + OVERLAP} fade={6}>
        <LessonScene />
      </Scene>
    </>
  );
};

export const SimpsonsParadox: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
