import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CopyScene } from "./CopyScene";
import { FanoutScene } from "./FanoutScene";
import { HookScene } from "./HookScene";
import { MergeScene } from "./MergeScene";
import { MissingScene } from "./MissingScene";
import { RapidScene } from "./RapidScene";
import { ReshapeScene } from "./ReshapeScene";
import { ShapesScene } from "./ShapesScene";
import { SplitScene } from "./SplitScene";
import { VectorScene } from "./VectorScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Python & pandas" (16:9), Part 9 of the Data Scientist interview prep
 * videos, on the editorial page. The fourteen questions of the track's Python
 * and pandas page: nine worked on real frames, a scene or a part of one each,
 * then five quickly. Every frame, snippet, error and warning ran in pandas
 * 3.0.2 in Pyodide (check.mjs, results.json, data.ts).
 *
 * No series intro yet, as in the other parts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["vector", VectorScene],
  ["split", SplitScene],
  ["shapes", ShapesScene],
  ["merge", MergeScene],
  ["fanout", FanoutScene],
  ["missing", MissingScene],
  ["copy", CopyScene],
  ["reshape", ReshapeScene],
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

export const DsPythonPandas: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
