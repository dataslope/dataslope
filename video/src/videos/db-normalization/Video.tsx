import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AnomalyScene } from "./AnomalyScene";
import { ChainScene } from "./ChainScene";
import { ChildScene } from "./ChildScene";
import { CellScene } from "./CellScene";
import { CloseScene } from "./CloseScene";
import { HomeScene } from "./HomeScene";
import { OathScene } from "./OathScene";
import { OpenScene } from "./OpenScene";
import { PairScene } from "./PairScene";
import { PriceScene } from "./PriceScene";
import { SummaryScene } from "./SummaryScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Normalization" (16:9), Unit 7 of Database Design with PostgreSQL, on the
 * editorial page, every table, statement and error from PGlite (check.mjs,
 * results.json, data.ts). One argument in five parts:
 *
 *   1. Why normalize: OpenScene, AnomalyScene, HomeScene.
 *   2. First normal form: CellScene, ChildScene.
 *   3. Second normal form: PairScene.
 *   4. Third normal form: ChainScene, OathScene.
 *   5. Denormalization: SummaryScene, PriceScene, and CloseScene's bridge.
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
      <Scene from={0} to={until(cut("open"))} fade={8}>
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 7" title="Normalization" />
      </Scene>
      <Scene from={cut("open")} to={until(cut("siblings"))} fade={6}>
        <OpenScene />
      </Scene>
      <Scene from={cut("siblings")} to={until(cut("home"))} fade={6}>
        <AnomalyScene />
      </Scene>
      <Scene from={cut("home")} to={until(cut("cell"))} fade={6}>
        <HomeScene />
      </Scene>
      <Scene from={cut("cell")} to={until(cut("child"))} fade={6}>
        <CellScene />
      </Scene>
      <Scene from={cut("child")} to={until(cut("pair"))} fade={6}>
        <ChildScene />
      </Scene>
      <Scene from={cut("pair")} to={until(cut("chain"))} fade={6}>
        <PairScene />
      </Scene>
      <Scene from={cut("chain")} to={until(cut("oath"))} fade={6}>
        <ChainScene />
      </Scene>
      <Scene from={cut("oath")} to={until(cut("summary"))} fade={6}>
        <OathScene />
      </Scene>
      <Scene from={cut("summary")} to={until(cut("prices"))} fade={6}>
        <SummaryScene />
      </Scene>
      <Scene from={cut("prices")} to={until(cut("rule"))} fade={6}>
        <PriceScene />
      </Scene>
      <Scene from={cut("rule")} to={durationInFrames + OVERLAP} fade={6}>
        <CloseScene />
      </Scene>
    </>
  );
};

export const DbNormalization: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
