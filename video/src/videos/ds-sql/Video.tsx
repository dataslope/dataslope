import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CohortScene } from "./CohortScene";
import { HookScene } from "./HookScene";
import { JoinScene } from "./JoinScene";
import { PctScene } from "./PctScene";
import { RapidScene } from "./RapidScene";
import { RateScene } from "./RateScene";
import { SessionScene } from "./SessionScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "SQL" (16:9), Part 10 of the Data Scientist interview prep videos, on the
 * editorial page. The page's fifteen questions: six worked through on real
 * queries, a scene each (the first two share one), then nine at speed. Every
 * statement, result and error ran in DuckDB (and one in Postgres): check.mjs,
 * results.json, data.ts.
 *
 * No series intro yet, as in the other parts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["join", JoinScene],
  ["rate", RateScene],
  ["cohort", CohortScene],
  ["session", SessionScene],
  ["pct", PctScene],
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

export const DsSql: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
