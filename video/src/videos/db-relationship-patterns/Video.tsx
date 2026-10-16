import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { CrossScene } from "./CrossScene";
import { GradeScene } from "./GradeScene";
import { GuardScene } from "./GuardScene";
import { JunctionScene } from "./JunctionScene";
import { ListScene } from "./ListScene";
import { OneManyScene } from "./OneManyScene";
import { PairScene } from "./PairScene";
import { SelfScene } from "./SelfScene";
import { ShapesScene } from "./ShapesScene";
import { UniqueScene } from "./UniqueScene";
import { WideScene } from "./WideScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Relationship patterns" (16:9), Unit 5 of Database Design with PostgreSQL,
 * on the editorial page, with every diagram drawn in the ERD kit
 * (editorial/erd.tsx) and every row, key and error from PGlite (check.mjs,
 * data.ts). An opening and five parts:
 *
 *   0. The shapes: ShapesScene.
 *   1. One to many: OneManyScene, ListScene.
 *   2. Many to many: CrossScene, JunctionScene.
 *   3. Junction tables: PairScene, GradeScene.
 *   4. One to one: WideScene, UniqueScene.
 *   5. Self-reference: SelfScene, GuardScene (which ends on the bridge).
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
      <Scene from={0} to={until(cut("shapes"))} fade={8}>
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 5" title="Relationship patterns" />
      </Scene>
      <Scene from={cut("shapes")} to={until(cut("many"))} fade={6}>
        <ShapesScene />
      </Scene>
      <Scene from={cut("many")} to={until(cut("list"))} fade={6}>
        <OneManyScene />
      </Scene>
      <Scene from={cut("list")} to={until(cut("cross"))} fade={6}>
        <ListScene />
      </Scene>
      <Scene from={cut("cross")} to={until(cut("pairing"))} fade={6}>
        <CrossScene />
      </Scene>
      <Scene from={cut("pairing")} to={until(cut("pair"))} fade={6}>
        <JunctionScene />
      </Scene>
      <Scene from={cut("pair")} to={until(cut("grade"))} fade={6}>
        <PairScene />
      </Scene>
      <Scene from={cut("grade")} to={until(cut("wide"))} fade={6}>
        <GradeScene />
      </Scene>
      <Scene from={cut("wide")} to={until(cut("unique"))} fade={6}>
        <WideScene />
      </Scene>
      <Scene from={cut("unique")} to={until(cut("self"))} fade={6}>
        <UniqueScene />
      </Scene>
      <Scene from={cut("self")} to={until(cut("alias"))} fade={6}>
        <SelfScene />
      </Scene>
      <Scene from={cut("alias")} to={durationInFrames + OVERLAP} fade={6}>
        <GuardScene />
      </Scene>
    </>
  );
};

export const DbRelationshipPatterns: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
