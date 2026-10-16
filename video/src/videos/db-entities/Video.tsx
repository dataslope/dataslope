import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { AtomicScene } from "./AtomicScene";
import { AttrScene } from "./AttrScene";
import { ChenScene } from "./ChenScene";
import { ClaimsScene } from "./ClaimsScene";
import { DomainScene } from "./DomainScene";
import { ErdScene } from "./ErdScene";
import { NounsScene } from "./NounsScene";
import { TableScene } from "./TableScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Entities and attributes" (16:9), Unit 2 of Database Design with
 * PostgreSQL, on the editorial page the course shares. One argument in three
 * parts, every table, type, key and message from the lessons' own SQL run in
 * PGlite (check.mjs, results.json, data.ts):
 *
 *   1. Entities: NounsScene, TableScene.
 *   2. Attributes and domains: AttrScene, DomainScene, ClaimsScene, AtomicScene.
 *   3. Entity-relationship diagrams: ChenScene, ErdScene.
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
        <SeriesIntro course="Database Design with PostgreSQL" unit="Unit 2" title="Entities and attributes" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("type"))} fade={6}>
        <NounsScene />
      </Scene>
      <Scene from={cut("type")} to={until(cut("attributes"))} fade={6}>
        <TableScene />
      </Scene>
      <Scene from={cut("attributes")} to={until(cut("loose"))} fade={6}>
        <AttrScene />
      </Scene>
      <Scene from={cut("loose")} to={until(cut("claims"))} fade={6}>
        <DomainScene />
      </Scene>
      <Scene from={cut("claims")} to={until(cut("atomic"))} fade={6}>
        <ClaimsScene />
      </Scene>
      <Scene from={cut("atomic")} to={until(cut("chen"))} fade={6}>
        <AtomicScene />
      </Scene>
      <Scene from={cut("chen")} to={until(cut("pieces"))} fade={6}>
        <ChenScene />
      </Scene>
      <Scene from={cut("pieces")} to={durationInFrames + OVERLAP} fade={6}>
        <ErdScene />
      </Scene>
    </>
  );
};

export const DbEntities: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
