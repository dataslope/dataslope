import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ArchScene } from "./ArchScene";
import { ClusterScene } from "./ClusterScene";
import { ColsScene } from "./ColsScene";
import { ComputeScene } from "./ComputeScene";
import { HookScene } from "./HookScene";
import { HurtScene } from "./HurtScene";
import { ObtScene } from "./ObtScene";
import { OltpScene } from "./OltpScene";
import { PruneScene } from "./PruneScene";
import { RapidScene } from "./RapidScene";
import { SplitScene } from "./SplitScene";
import { StarScene } from "./StarScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Warehouses and what they cost" (16:9), Part 6 of the Analytics Engineer
 * interview prep videos, on the editorial page. Ten questions worked
 * through, a scene each, then three quick ones and the bridge into testing.
 * Sizes are DuckDB's, on the million made-up sales Data Engineer Part 9
 * measured (check.mjs, results.json, data.ts); the 200-column table, the
 * pruning chart and the idle cluster are models, and say so.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["split", SplitScene],
  ["arch", ArchScene],
  ["oltp", OltpScene],
  ["cols", ColsScene],
  ["star", StarScene],
  ["prune", PruneScene],
  ["cluster", ClusterScene],
  ["hurt", HurtScene],
  ["compute", ComputeScene],
  ["obt", ObtScene],
  ["rapid-in", RapidScene],
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

export const AeWarehousing: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
