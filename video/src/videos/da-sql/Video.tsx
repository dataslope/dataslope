import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AntiScene } from "./AntiScene";
import { CteScene } from "./CteScene";
import { DistinctScene } from "./DistinctScene";
import { FanoutScene } from "./FanoutScene";
import { HookScene } from "./HookScene";
import { JoinsScene } from "./JoinsScene";
import { NullsScene } from "./NullsScene";
import { OrderScene } from "./OrderScene";
import { RapidScene } from "./RapidScene";
import { TrapScene } from "./TrapScene";
import { WhereScene } from "./WhereScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "SQL" (16:9), Part 1 of the Data Analyst interview prep videos, on the
 * editorial page. Twenty-four questions from the track's SQL page: ten that
 * hide a trap, one scene (or two) each, then a rapid-fire round of fourteen.
 * Every table, statement and error ran in DuckDB (check.mjs, results.json,
 * data.ts).
 *
 * No series intro yet: the first scene opens at frame 0. When it is added,
 * it goes before the hook as the course videos' SeriesIntro scene (course
 * "Data Analyst Interview Prep", unit "Part 1", title "SQL"; see
 * db-keys/Video.tsx), with `leadIn: INTRO_LEAD_IN` in the script.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["where", WhereScene],
  ["order", OrderScene],
  ["joins", JoinsScene],
  ["trap", TrapScene],
  ["fanout", FanoutScene],
  ["nulls", NullsScene],
  ["anti", AntiScene],
  ["distinct", DistinctScene],
  ["cte", CteScene],
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

export const DaSql: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
