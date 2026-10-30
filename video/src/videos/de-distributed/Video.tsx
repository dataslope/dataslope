import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BroadcastScene } from "./BroadcastScene";
import { HadoopScene } from "./HadoopScene";
import { HookScene } from "./HookScene";
import { LazyScene } from "./LazyScene";
import { LineageScene } from "./LineageScene";
import { MapReduceScene } from "./MapReduceScene";
import { NarrowScene } from "./NarrowScene";
import { PartitionScene } from "./PartitionScene";
import { RapidScene } from "./RapidScene";
import { ReduceScene } from "./ReduceScene";
import { ShuffleScene } from "./ShuffleScene";
import { SkewScene } from "./SkewScene";
import { StageScene } from "./StageScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Distributed processing" (16:9), Part 7 of the Data Engineer interview
 * prep videos, on the editorial page. All seventeen questions of the track's
 * distributed processing page: fourteen worked through in eleven scenes, then
 * three quick ones. No Spark runs here: questions 1 and 12 run a MapReduce by
 * hand on the course video PandasGroupby's seven-row frame, the shuffle and
 * stage questions redraw the page's own latency and fan-out charts, and the
 * rest are seeded models that the narration calls models (check.mjs,
 * results.json, data.ts).
 *
 * No series intro, as in the other interview series.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["mr", MapReduceScene],
  ["hadoop", HadoopScene],
  ["lazy", LazyScene],
  ["partitions", PartitionScene],
  ["narrow", NarrowScene],
  ["shuffle", ShuffleScene],
  ["stage", StageScene],
  ["skew", SkewScene],
  ["broadcast", BroadcastScene],
  ["reduce", ReduceScene],
  ["lineage", LineageScene],
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

export const DeDistributed: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
