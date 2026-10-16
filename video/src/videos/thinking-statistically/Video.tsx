import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { DecideScene } from "./DecideScene";
import { FlavorScene } from "./FlavorScene";
import { GapScene } from "./GapScene";
import { KindsScene } from "./KindsScene";
import { ParameterScene } from "./ParameterScene";
import { SurveyScene } from "./SurveyScene";
import { TrapScene } from "./TrapScene";
import { TrendScene } from "./TrendScene";
import { TwentyScene } from "./TwentyScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Thinking statistically" (16:9), Unit 1 of the Statistics course, on the
 * editorial page the Unit 5 videos share. One argument in three parts, every
 * number from the lessons' own seeded code (measure.py, data.ts):
 *
 *   1. Signal and noise: GapScene, TrendScene.
 *   2. Population and sample: SurveyScene, ParameterScene, TwentyScene.
 *   3. What kind of data: FlavorScene, KindsScene, TrapScene, DecideScene.
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
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 1" title="Thinking statistically" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("trend"))} fade={6}>
        <GapScene />
      </Scene>
      <Scene from={cut("trend")} to={until(cut("survey"))} fade={6}>
        <TrendScene />
      </Scene>
      <Scene from={cut("survey")} to={until(cut("parameter"))} fade={6}>
        <SurveyScene />
      </Scene>
      <Scene from={cut("parameter")} to={until(cut("twenty"))} fade={6}>
        <ParameterScene />
      </Scene>
      <Scene from={cut("twenty")} to={until(cut("flavors"))} fade={6}>
        <TwentyScene />
      </Scene>
      <Scene from={cut("flavors")} to={until(cut("kinds"))} fade={6}>
        <FlavorScene />
      </Scene>
      <Scene from={cut("kinds")} to={until(cut("trap"))} fade={6}>
        <KindsScene />
      </Scene>
      <Scene from={cut("trap")} to={until(cut("decides"))} fade={6}>
        <TrapScene />
      </Scene>
      <Scene from={cut("decides")} to={durationInFrames + OVERLAP} fade={6}>
        <DecideScene />
      </Scene>
    </>
  );
};

export const ThinkingStatistically: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
