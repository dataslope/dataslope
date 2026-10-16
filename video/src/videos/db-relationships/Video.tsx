import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BadgeScene } from "./BadgeScene";
import { EndsScene } from "./EndsScene";
import { RowsScene } from "./RowsScene";
import { ShopScene } from "./ShopScene";
import { VerbsScene } from "./VerbsScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Relationships" (16:9), Unit 3 of Database Design with PostgreSQL, on the
 * editorial page. One argument in three parts, every row, id and error from
 * the lessons' own SQL run in PGlite (check.mjs, results.json, data.ts):
 *
 *   1. What a relationship is: VerbsScene, and RowsScene up to "how many?".
 *   2. Cardinality: RowsScene from "both" (the same diagram, its two ends
 *      drawn as they are read), EndsScene, BadgeScene.
 *   3. Reading a diagram: ShopScene, which ends on the bridge to keys.
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
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 3" title="Relationships" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("rows"))} fade={6}>
        <VerbsScene />
      </Scene>
      <Scene from={cut("rows")} to={until(cut("ends"))} fade={6}>
        <RowsScene />
      </Scene>
      <Scene from={cut("ends")} to={until(cut("schema"))} fade={6}>
        <EndsScene />
      </Scene>
      <Scene from={cut("schema")} to={until(cut("shop"))} fade={6}>
        <BadgeScene />
      </Scene>
      <Scene from={cut("shop")} to={durationInFrames + OVERLAP} fade={6}>
        <ShopScene />
      </Scene>
    </>
  );
};

export const DbRelationships: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
