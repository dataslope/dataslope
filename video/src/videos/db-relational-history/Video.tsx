import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BeforeScene } from "./BeforeScene";
import { CoddScene } from "./CoddScene";
import { IngresScene } from "./IngresScene";
import { OpenScene } from "./OpenScene";
import { PostgresScene } from "./PostgresScene";
import { RaceScene } from "./RaceScene";
import { SqlScene } from "./SqlScene";
import { TabScene } from "./TabScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Where it came from" (16:9), Unit 9 of Database Design with PostgreSQL and
 * the course's last video. One history in two parts, every row, query and
 * error from PGlite (check.mjs, data.ts) and every date from the sources in
 * script.ts:
 *
 *   1. The relational revolution: OpenScene, BeforeScene, CoddScene,
 *      SqlScene, RaceScene.
 *   2. From Ingres to PostgreSQL: IngresScene, PostgresScene, TabScene.
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
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 9" title="Where it came from" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("trees"))} fade={6}>
        <OpenScene />
      </Scene>
      <Scene from={cut("trees")} to={until(cut("codd"))} fade={6}>
        <BeforeScene />
      </Scene>
      <Scene from={cut("codd")} to={until(cut("doubt"))} fade={6}>
        <CoddScene />
      </Scene>
      <Scene from={cut("doubt")} to={until(cut("oracle"))} fade={6}>
        <SqlScene />
      </Scene>
      <Scene from={cut("oracle")} to={until(cut("ingres"))} fade={6}>
        <RaceScene />
      </Scene>
      <Scene from={cut("ingres")} to={until(cut("postgres"))} fade={6}>
        <IngresScene />
      </Scene>
      <Scene from={cut("postgres")} to={until(cut("tab"))} fade={6}>
        <PostgresScene />
      </Scene>
      <Scene from={cut("tab")} to={durationInFrames + OVERLAP} fade={6}>
        <TabScene />
      </Scene>
    </>
  );
};

export const DbRelationalHistory: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
