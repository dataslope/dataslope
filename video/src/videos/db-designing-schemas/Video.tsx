import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { ChangeScene } from "./ChangeScene";
import { EntitiesScene, PriceScene, RelateScene, RulesScene } from "./ErdScenes";
import { ExpandScene } from "./ExpandScene";
import { OpenScene } from "./OpenScene";
import { RequiredScene } from "./RequiredScene";
import { RequirementsScene } from "./RequirementsScene";
import { ScaleScene } from "./ScaleScene";
import { StepsLayer } from "./StepsLayer";
import { StoreErd } from "./StoreErd";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Designing a schema" (16:9), Unit 8 of the Database Design with PostgreSQL
 * course, on the editorial page. One argument in three parts, every row,
 * total and error from PGlite running the lessons' own SQL (check.mjs,
 * results.json, data.ts):
 *
 *   1. A process: OpenScene, and the eight steps (StepsLayer).
 *   2. The store, step by step: RequirementsScene, then the diagram
 *      (StoreErd) with EntitiesScene, RelateScene, RulesScene, PriceScene
 *      over it, the steps shrunk to a rail beside it.
 *   3. Changing a live schema: ChangeScene, RequiredScene, ExpandScene,
 *      ScaleScene.
 *
 * The step list and the store's diagram are layers that span several scenes,
 * so they build continuously instead of cross-fading with themselves at each
 * cut. Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("open"))} fade={8}>
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 8" title="Designing a schema" />
      </Scene>
      {/* ── Part 1 ── */}
      <Scene from={cut("open")} to={until(cut("reqs"))} fade={6}>
        <OpenScene />
      </Scene>
      {/* ── Part 2 ── */}
      <Scene from={cut("reqs")} to={until(cut("entities"))} fade={6}>
        <RequirementsScene />
      </Scene>
      <Scene from={cut("entities")} to={until(cut("change"))} fade={6}>
        <StoreErd />
      </Scene>
      <Scene from={cut("entities")} to={until(cut("relate"))} fade={6}>
        <EntitiesScene />
      </Scene>
      <Scene from={cut("relate")} to={until(cut("keys"))} fade={6}>
        <RelateScene />
      </Scene>
      <Scene from={cut("keys")} to={until(cut("copy"))} fade={6}>
        <RulesScene />
      </Scene>
      <Scene from={cut("copy")} to={until(cut("change"))} fade={6}>
        <PriceScene />
      </Scene>
      <Scene from={cut("open")} to={until(cut("change"))} fade={6}>
        <StepsLayer />
      </Scene>
      {/* ── Part 3 ── */}
      <Scene from={cut("change")} to={until(cut("priority"))} fade={6}>
        <ChangeScene />
      </Scene>
      <Scene from={cut("priority")} to={until(cut("expand"))} fade={6}>
        <RequiredScene />
      </Scene>
      <Scene from={cut("expand")} to={until(cut("scale"))} fade={6}>
        <ExpandScene />
      </Scene>
      <Scene from={cut("scale")} to={durationInFrames + OVERLAP} fade={6}>
        <ScaleScene />
      </Scene>
    </>
  );
};

export const DbDesigningSchemas: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
