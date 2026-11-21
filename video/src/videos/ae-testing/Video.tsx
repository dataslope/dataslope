import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AssertsScene } from "./AssertsScene";
import { BuiltinsScene } from "./BuiltinsScene";
import { CiScene } from "./CiScene";
import { CompoundScene } from "./CompoundScene";
import { FreshScene } from "./FreshScene";
import { HookScene } from "./HookScene";
import { MetricScene } from "./MetricScene";
import { ObserveScene } from "./ObserveScene";
import { RapidScene } from "./RapidScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Testing and data quality" (16:9), Part 7 of the Analytics Engineer
 * interview videos, on the editorial page. The testing page's nineteen
 * questions, with the seven dbt page questions that repeat them answered
 * alongside: ten worked through (two pairs share a scene), then nine quick
 * ones. Every test is shown as the query it runs beside the rows it
 * returned, and every result ran on the site's Postgres (check.mjs,
 * results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["asserts", AssertsScene],
  ["builtins", BuiltinsScene],
  ["compound", CompoundScene],
  ["fresh", FreshScene],
  ["ci", CiScene],
  ["observe", ObserveScene],
  ["metric", MetricScene],
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

export const AeTesting: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
