import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AbScene } from "./AbScene";
import { ChiScene } from "./ChiScene";
import { CoinScene } from "./CoinScene";
import { CorrScene } from "./CorrScene";
import { CourtScene } from "./CourtScene";
import { CurseScene } from "./CurseScene";
import { GridScene } from "./GridScene";
import { GroupsScene } from "./GroupsScene";
import { IsntScene } from "./IsntScene";
import { NullScene } from "./NullScene";
import { OddsScene } from "./OddsScene";
import { OpenScene } from "./OpenScene";
import { PairsScene } from "./PairsScene";
import { PowerScene } from "./PowerScene";
import { RanksScene } from "./RanksScene";
import { RatioScene } from "./RatioScene";
import { SidesScene } from "./SidesScene";
import { StepsScene } from "./StepsScene";
import { UniformScene } from "./UniformScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Testing hypotheses" (16:9), Unit 7 of the Statistics course, on the
 * editorial page the earlier units share. One argument in seven parts, every
 * number from the lessons' own seeded code (measure.py, data.ts):
 *
 *   1. The logic of a test: OpenScene, NullScene, CourtScene, StepsScene, SidesScene.
 *   2. The p-value: CoinScene, IsntScene.
 *   3. Looking many times: UniformScene, OddsScene.
 *   4. Errors and power: GridScene, PowerScene, AbScene, CurseScene.
 *   5. t-tests: RatioScene, PairsScene.
 *   6. ANOVA and chi-square: GroupsScene, ChiScene.
 *   7. Correlation and nonparametric tests: CorrScene, RanksScene.
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
        <SeriesIntro course="Statistics for Data Science with Python" unit="Unit 7" title="Testing hypotheses" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("null"))} fade={6}>
        <OpenScene />
      </Scene>
      <Scene from={cut("null")} to={until(cut("court"))} fade={6}>
        <NullScene />
      </Scene>
      <Scene from={cut("court")} to={until(cut("steps"))} fade={6}>
        <CourtScene />
      </Scene>
      <Scene from={cut("steps")} to={until(cut("sides"))} fade={6}>
        <StepsScene />
      </Scene>
      <Scene from={cut("sides")} to={until(cut("coin"))} fade={6}>
        <SidesScene />
      </Scene>
      <Scene from={cut("coin")} to={until(cut("isnt"))} fade={6}>
        <CoinScene />
      </Scene>
      <Scene from={cut("isnt")} to={until(cut("uniform"))} fade={6}>
        <IsntScene />
      </Scene>
      <Scene from={cut("uniform")} to={until(cut("odds"))} fade={6}>
        <UniformScene />
      </Scene>
      <Scene from={cut("odds")} to={until(cut("grid"))} fade={6}>
        <OddsScene />
      </Scene>
      <Scene from={cut("grid")} to={until(cut("sim"))} fade={6}>
        <GridScene />
      </Scene>
      <Scene from={cut("sim")} to={until(cut("ab"))} fade={6}>
        <PowerScene />
      </Scene>
      <Scene from={cut("ab")} to={until(cut("curse"))} fade={6}>
        <AbScene />
      </Scene>
      <Scene from={cut("curse")} to={until(cut("ratio"))} fade={6}>
        <CurseScene />
      </Scene>
      <Scene from={cut("ratio")} to={until(cut("pairs"))} fade={6}>
        <RatioScene />
      </Scene>
      <Scene from={cut("pairs")} to={until(cut("groups"))} fade={6}>
        <PairsScene />
      </Scene>
      <Scene from={cut("groups")} to={until(cut("chi"))} fade={6}>
        <GroupsScene />
      </Scene>
      <Scene from={cut("chi")} to={until(cut("corr"))} fade={6}>
        <ChiScene />
      </Scene>
      <Scene from={cut("corr")} to={until(cut("ranks"))} fade={6}>
        <CorrScene />
      </Scene>
      <Scene from={cut("ranks")} to={durationInFrames + OVERLAP} fade={6}>
        <RanksScene />
      </Scene>
    </>
  );
};

export const TestingHypotheses: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
