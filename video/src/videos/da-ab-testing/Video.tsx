import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AbtestScene } from "./AbtestScene";
import { FunnelScene } from "./FunnelScene";
import { HookScene } from "./HookScene";
import { MetricScene } from "./MetricScene";
import { PeekScene } from "./PeekScene";
import { PowerScene } from "./PowerScene";
import { RapidScene } from "./RapidScene";
import { SignifScene } from "./SignifScene";
import { SimpsonScene } from "./SimpsonScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "A/B testing & metrics" (16:9), Part 7 of the Data Analyst
 * interview prep videos, on the editorial page. Nineteen questions of the
 * track's page: fifteen worked through on its own data and charts, a scene
 * or a part of one each, then four at speed. Every count, test and interval
 * ran in DuckDB or in Pyodide with SciPy, and every curve is recomputed from
 * the page's chart (check.mjs, results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["metric", MetricScene],
  ["funnel-in", FunnelScene],
  ["abtest", AbtestScene],
  ["signif", SignifScene],
  ["power", PowerScene],
  ["peek-in", PeekScene],
  ["simpson", SimpsonScene],
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

export const DaAbTesting: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
