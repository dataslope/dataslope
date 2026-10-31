import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ClusterScene } from "./ClusterScene";
import { CorrScene } from "./CorrScene";
import { CoverScene } from "./CoverScene";
import { HookScene } from "./HookScene";
import { IndexScene } from "./IndexScene";
import { IsoScene } from "./IsoScene";
import { JoinScene } from "./JoinScene";
import { MvScene } from "./MvScene";
import { PruneScene } from "./PruneScene";
import { SlowScene } from "./SlowScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "SQL II: performance" (16:9), Part 2 of the Data Engineer interview prep
 * videos, on the editorial page. The page's ten performance questions, each
 * worked through (the first two share a scene), nine on the site's Postgres
 * and one drawn: check.mjs, results.json, data.ts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["slow", SlowScene],
  ["index", IndexScene],
  ["cover", CoverScene],
  ["cluster", ClusterScene],
  ["prune", PruneScene],
  ["corr", CorrScene],
  ["join", JoinScene],
  ["iso", IsoScene],
  ["mv", MvScene],
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

export const DeSqlPerformance: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
