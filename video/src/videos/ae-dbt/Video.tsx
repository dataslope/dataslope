import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BuildScene } from "./BuildScene";
import { EnvScene } from "./EnvScene";
import { HookScene } from "./HookScene";
import { LayersScene } from "./LayersScene";
import { MatScene } from "./MatScene";
import { RapidScene } from "./RapidScene";
import { RefScene } from "./RefScene";
import { SubsetScene } from "./SubsetScene";
import { WhatScene } from "./WhatScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "How dbt builds a project" (16:9), Part 3 of the Analytics Engineer
 * interview prep videos, on the editorial page. Nineteen questions: ten
 * worked through on the page's own lineage slice (ref and source, the DAG,
 * the layers, the materializations and ephemeral models, run, test and
 * build, selection, targets and schemas), then nine quick ones. The graph is
 * the page's (GRAPH in data.ts); the materializations ran on the site's
 * Postgres (check.mjs, results.json, data.ts); dbt itself does not run here.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["what", WhatScene],
  ["ref", RefScene],
  ["layers", LayersScene],
  ["mat", MatScene],
  ["build", BuildScene],
  ["subset", SubsetScene],
  ["env", EnvScene],
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

export const AeDbt: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
