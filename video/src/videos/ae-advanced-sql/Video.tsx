import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { DistinctScene } from "./DistinctScene";
import { HookScene } from "./HookScene";
import { LagScene } from "./LagScene";
import { LatestScene } from "./LatestScene";
import { RapidScene } from "./RapidScene";
import { RatioScene } from "./RatioScene";
import { RunningScene } from "./RunningScene";
import { SpineScene } from "./SpineScene";
import { WindowScene } from "./WindowScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Advanced SQL" (16:9), Part 5 of the Analytics Engineer interview prep
 * videos, on the editorial page. Nineteen of the page's questions: twelve
 * worked through on real queries, a scene or a part of one each, then seven
 * quickly. Every statement, result and error ran in Postgres, or in DuckDB
 * where Postgres can't (check.mjs, results.json, data.ts, and Data Analyst
 * Part 4's own for the tables the two share).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["window", WindowScene],
  ["latest", LatestScene],
  ["running", RunningScene],
  ["lag", LagScene],
  ["spine", SpineScene],
  ["distinct", DistinctScene],
  ["ratio", RatioScene],
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

export const AeAdvancedSql: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
