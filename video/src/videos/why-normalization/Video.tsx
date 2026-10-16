import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { DeleteScene } from "./DeleteScene";
import { FlatScene } from "./FlatScene";
import { InsertScene } from "./InsertScene";
import { JoinScene } from "./JoinScene";
import { SplitScene } from "./SplitScene";
import { UpdateScene } from "./UpdateScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Why normalize?" (16:9): one wide table that copies each customer's email
 * onto every order, the update, insertion and deletion anomalies that copying
 * invites, and the split into two tables joined by a foreign key. Set on the
 * shared editorial page (src/editorial/), with every table on screen exactly
 * what Postgres returned for it (data.ts).
 *
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and stays up a few frames into the next, so new audio re-times the
 * cuts along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("update"))} fade={6}>
        <FlatScene />
      </Scene>
      <Scene from={cut("update")} to={until(cut("insert"))} fade={6}>
        <UpdateScene />
      </Scene>
      <Scene from={cut("insert")} to={until(cut("delete"))} fade={6}>
        <InsertScene />
      </Scene>
      <Scene from={cut("delete")} to={until(cut("split"))} fade={6}>
        <DeleteScene />
      </Scene>
      <Scene from={cut("split")} to={until(cut("join"))} fade={6}>
        <SplitScene />
      </Scene>
      <Scene from={cut("join")} to={durationInFrames + OVERLAP} fade={6}>
        <JoinScene />
      </Scene>
    </>
  );
};

export const WhyNormalization: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
