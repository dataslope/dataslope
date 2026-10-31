import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ClusterScene } from "./ClusterScene";
import { CompressScene } from "./CompressScene";
import { CostScene } from "./CostScene";
import { FormatsScene } from "./FormatsScene";
import { HookScene } from "./HookScene";
import { LakeScene } from "./LakeScene";
import { PartitionScene } from "./PartitionScene";
import { RowsScene } from "./RowsScene";
import { SmallFilesScene } from "./SmallFilesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Data warehousing & storage" (16:9), Part 9 of the Data Engineer interview
 * prep videos, on the editorial page. Nine questions, numbered aloud, each a
 * figure (the first two share one); seven are measured on one made-up table
 * of a million sales in DuckDB-Wasm (check.mjs, results.json, data.ts), and
 * the first and last are drawn. No quick round, as the plan gives this part.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["rows", RowsScene],
  ["fmt", FormatsScene],
  ["cmp", CompressScene],
  ["part", PartitionScene],
  ["cl", ClusterScene],
  ["sm", SmallFilesScene],
  ["cost", CostScene],
  ["lake", LakeScene],
];

const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      {SCENES.map(([id, Body], i) => {
        const next = SCENES[i + 1];
        return (
          <Scene key={id} from={i === 0 ? 0 : cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const DeWarehousing: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
