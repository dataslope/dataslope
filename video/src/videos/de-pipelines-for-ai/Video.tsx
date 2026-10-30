import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AccessScene } from "./AccessScene";
import { AnnScene } from "./AnnScene";
import { BackfillScene } from "./BackfillScene";
import { ChangedScene } from "./ChangedScene";
import { ChunkScene } from "./ChunkScene";
import { CloseScene } from "./CloseScene";
import { FilterScene } from "./FilterScene";
import { FreshScene } from "./FreshScene";
import { HookScene } from "./HookScene";
import { HybridScene } from "./HybridScene";
import { PgScene } from "./PgScene";
import { RagScene } from "./RagScene";
import { SwitchScene } from "./SwitchScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Pipelines for AI" (16:9), Part 11 and the last of the Data Engineer
 * interview prep videos, on the editorial page. The page's eleven questions,
 * a scene each, then the close of the series. Every number is the page's own
 * or computed in check.mjs (results.json, data.ts); the simulation's are
 * labelled as one.
 *
 * No series intro, as in the other parts.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["changed", ChangedScene],
  ["rag", RagScene],
  ["chunk", ChunkScene],
  ["fresh", FreshScene],
  ["switch", SwitchScene],
  ["ann", AnnScene],
  ["pg", PgScene],
  ["filter", FilterScene],
  ["hybrid", HybridScene],
  ["access", AccessScene],
  ["backfill", BackfillScene],
  ["close", CloseScene],
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

export const DePipelinesForAi: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
