import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BridgeScene } from "./BridgeScene";
import { CheckScene } from "./CheckScene";
import { HookScene } from "./HookScene";
import { MoneyScene } from "./MoneyScene";
import { NullScene } from "./NullScene";
import { PairScene } from "./PairScene";
import { SchemaScene } from "./SchemaScene";
import { TypeScene } from "./TypeScene";
import { UniqueScene } from "./UniqueScene";
import { UnknownScene } from "./UnknownScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Constraints" (16:9), Unit 6 of Database Design with PostgreSQL: the
 * unit's five lessons as one argument in six parts, every row, error and
 * constraint name from PGlite (check.mjs, results.json, data.ts):
 *
 *   1. Why constraints: HookScene, SchemaScene.
 *   2. The first constraint: TypeScene, MoneyScene.
 *   3. Required or optional: NullScene.
 *   4. No repeats: UniqueScene, PairScene.
 *   5. Rules about values: CheckScene, UnknownScene.
 *   6. Where constraints stop, the bridge to normalization: BridgeScene.
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
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 6" title="Constraints" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("schema"))} fade={6}>
        <HookScene />
      </Scene>
      <Scene from={cut("schema")} to={until(cut("type"))} fade={6}>
        <SchemaScene />
      </Scene>
      <Scene from={cut("type")} to={until(cut("money"))} fade={6}>
        <TypeScene />
      </Scene>
      <Scene from={cut("money")} to={until(cut("null"))} fade={6}>
        <MoneyScene />
      </Scene>
      <Scene from={cut("null")} to={until(cut("unique"))} fade={6}>
        <NullScene />
      </Scene>
      <Scene from={cut("unique")} to={until(cut("pair"))} fade={6}>
        <UniqueScene />
      </Scene>
      <Scene from={cut("pair")} to={until(cut("check"))} fade={6}>
        <PairScene />
      </Scene>
      <Scene from={cut("check")} to={until(cut("unknown"))} fade={6}>
        <CheckScene />
      </Scene>
      <Scene from={cut("unknown")} to={until(cut("limits"))} fade={6}>
        <UnknownScene />
      </Scene>
      <Scene from={cut("limits")} to={durationInFrames + OVERLAP} fade={6}>
        <BridgeScene />
      </Scene>
    </>
  );
};

export const DbConstraints: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
