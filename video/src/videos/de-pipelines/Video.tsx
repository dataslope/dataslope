import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BatchScene } from "./BatchScene";
import { CdcScene } from "./CdcScene";
import { EtlScene } from "./EtlScene";
import { EvoScene } from "./EvoScene";
import { HookScene } from "./HookScene";
import { IdemScene } from "./IdemScene";
import { LambdaScene } from "./LambdaScene";
import { MedalScene } from "./MedalScene";
import { RapidScene } from "./RapidScene";
import { SourceScene } from "./SourceScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Pipelines & systems" (16:9), Part 6 of the Data Engineer interview prep
 * videos, on the editorial page. Eleven questions from the track's pipelines
 * page: eight worked through, a scene each, then three quick ones. Every
 * table, count and error ran in DuckDB-Wasm (check.mjs, results.json,
 * data.ts); the rest are mechanisms, drawn.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["batch", BatchScene],
  ["idem", IdemScene],
  ["etl", EtlScene],
  ["cdc", CdcScene],
  ["evo", EvoScene],
  ["src", SourceScene],
  ["medal", MedalScene],
  ["lambda", LambdaScene],
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

export const DePipelines: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
