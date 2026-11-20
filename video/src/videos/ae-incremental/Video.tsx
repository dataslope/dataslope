import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { FilterScene } from "./FilterScene";
import { HookScene } from "./HookScene";
import { IdemScene } from "./IdemScene";
import { KeyScene } from "./KeyScene";
import { MergeScene } from "./MergeScene";
import { RefreshScene } from "./RefreshScene";
import { WhenScene } from "./WhenScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Incremental models" (16:9), Part 4 of the Analytics Engineer interview
 * prep videos, on the editorial page. Eleven questions from the track's dbt,
 * warehousing and advanced SQL pages, paired into seven, every one worked
 * through: when to go incremental (on the dbt page's cost chart), how the
 * watermark filter finds new rows and where it misses them (one timeline of
 * events, the `{{ this }}` question inside it), `unique_key`, the idempotent
 * rebuild, `MERGE`, and the full refresh. No rapid round. Every table, count
 * and error ran on the site's Postgres (check.mjs, results.json, data.ts).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["when", WhenScene],
  ["filter", FilterScene],
  ["key", KeyScene],
  ["idem", IdemScene],
  ["merge", MergeScene],
  ["refresh", RefreshScene],
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

export const AeIncremental: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
