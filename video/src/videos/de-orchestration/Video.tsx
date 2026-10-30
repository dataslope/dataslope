import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AntiScene } from "./AntiScene";
import { BackfillScene } from "./BackfillScene";
import { BreakerScene } from "./BreakerScene";
import { CronScene } from "./CronScene";
import { DagsterScene } from "./DagsterScene";
import { FreshScene } from "./FreshScene";
import { GateScene } from "./GateScene";
import { HookScene } from "./HookScene";
import { JitterScene } from "./JitterScene";
import { KindsScene } from "./KindsScene";
import { RapidScene } from "./RapidScene";
import { RetryScene } from "./RetryScene";
import { SensorScene } from "./SensorScene";
import { SlaScene } from "./SlaScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Orchestration & reliability" (16:9), Part 10 of the Data Engineer interview
 * prep videos, on the editorial page. Fourteen questions from the track's
 * orchestration page, with the seven Pipelines asks here too: eleven worked
 * through, a scene each (retries take two, for the jitter), then three quick
 * ones. Airflow and Dagster are drawn as mechanism; every number is a chart
 * spec's, Pyodide's or DuckDB's (check.mjs, results.json, data.ts).
 *
 * No series intro, as in the other interview series. Every scene boundary is a
 * narration cue, so new audio re-times the cuts along with every animation
 * inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["cron", CronScene],
  ["dagster", DagsterScene],
  ["anti", AntiScene],
  ["retry", RetryScene],
  ["jitter", JitterScene],
  ["kinds", KindsScene],
  ["backfill", BackfillScene],
  ["quality", GateScene],
  ["breaker", BreakerScene],
  ["sla", SlaScene],
  ["fresh", FreshScene],
  ["sensor", SensorScene],
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

export const DeOrchestration: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
