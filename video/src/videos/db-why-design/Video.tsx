import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CostScene } from "./CostScene";
import { FlatScene } from "./FlatScene";
import { GateScene } from "./GateScene";
import { JoinScene } from "./JoinScene";
import { LibraryScene } from "./LibraryScene";
import { OrbiterScene } from "./OrbiterScene";
import { QuestionsScene } from "./QuestionsScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "What design is for" (16:9), Unit 1 of Database Design with PostgreSQL, the
 * course's first video. One argument in three parts, every table, row and
 * error from the lessons' own SQL run in PGlite (check.mjs, data.ts):
 *
 *   1. What a shortcut costs: FlatScene, CostScene.
 *   2. What design is: QuestionsScene, LibraryScene.
 *   3. What design buys: JoinScene, GateScene, OrbiterScene (and the bridge
 *      to Unit 2).
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
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 1" title="What design is for" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("legal"))} fade={6}>
        <FlatScene />
      </Scene>
      <Scene from={cut("legal")} to={until(cut("what"))} fade={6}>
        <CostScene />
      </Scene>
      <Scene from={cut("what")} to={until(cut("library"))} fade={6}>
        <QuestionsScene />
      </Scene>
      <Scene from={cut("library")} to={until(cut("ask"))} fade={6}>
        <LibraryScene />
      </Scene>
      <Scene from={cut("ask")} to={until(cut("gate"))} fade={6}>
        <JoinScene />
      </Scene>
      <Scene from={cut("gate")} to={until(cut("orbiter"))} fade={6}>
        <GateScene />
      </Scene>
      <Scene from={cut("orbiter")} to={durationInFrames + OVERLAP} fade={6}>
        <OrbiterScene />
      </Scene>
    </>
  );
};

export const DbWhyDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
