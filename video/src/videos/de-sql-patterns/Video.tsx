import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AntiScene } from "./AntiScene";
import { FrameScene } from "./FrameScene";
import { HookScene } from "./HookScene";
import { IslandsScene } from "./IslandsScene";
import { MovingScene } from "./MovingScene";
import { OrderScene } from "./OrderScene";
import { RankScene } from "./RankScene";
import { RapidScene } from "./RapidScene";
import { RecursiveScene } from "./RecursiveScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "SQL I: window functions and query patterns" (16:9), Part 1 of the Data
 * Engineer interview prep videos, on the editorial page. Twenty-two of the
 * page's questions: eleven worked through on real queries, a scene or a part
 * of one each, then eleven at speed. Every statement, result and error ran in
 * DuckDB: check.mjs, results.json, data.ts, and the reused videos' own.
 *
 * No series intro, as in the other interview series.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["rank", RankScene],
  ["order", OrderScene],
  ["frame", FrameScene],
  ["moving", MovingScene],
  ["islands", IslandsScene],
  ["anti", AntiScene],
  ["recursive", RecursiveScene],
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

export const DeSqlPatterns: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
