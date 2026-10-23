import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { FrameScene } from "./FrameScene";
import { HookScene } from "./HookScene";
import { LatestScene } from "./LatestScene";
import { RankScene } from "./RankScene";
import { RapidScene } from "./RapidScene";
import { RunningScene } from "./RunningScene";
import { WindowScene } from "./WindowScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Advanced SQL" (16:9), Part 4 of the Data Analyst interview prep videos, on
 * the editorial page. Twenty questions of the track's advanced SQL page:
 * twelve worked through on real queries, a scene or a part of one each, then
 * eight at speed. Every statement, result and error ran in DuckDB
 * (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in Parts 1 to 3 (see da-sql/Video.tsx for how it
 * goes in).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["window", WindowScene],
  ["rank", RankScene],
  ["frame", FrameScene],
  ["running", RunningScene],
  ["latest", LatestScene],
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
          <Scene
            key={id}
            from={i === 0 ? 0 : cut(id)}
            to={next ? until(cut(next[0])) : durationInFrames + OVERLAP}
            fade={6}
          >
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const DaAdvancedSql: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
