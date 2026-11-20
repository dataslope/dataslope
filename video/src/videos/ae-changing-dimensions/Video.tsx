import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { HookScene } from "./HookScene";
import { LateFactScene } from "./LateFactScene";
import { LateScene } from "./LateScene";
import { MeasureScene } from "./MeasureScene";
import { RapidScene } from "./RapidScene";
import { SnapScene } from "./SnapScene";
import { Type1Scene } from "./Type1Scene";
import { Type2Scene } from "./Type2Scene";
import { Type3Scene } from "./Type3Scene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Dimensions that change" (16:9), Part 2 of the Analytics Engineer
 * interview videos, on the editorial page. Nine questions: seven worked
 * through, a scene each, then two quick ones and the bridge into dbt. Every
 * table, listing and number ran in Postgres (check.mjs, results.json,
 * data.ts); the dbt snapshot is drawn. Customer 42's history on a timeline
 * (parts.tsx, `acme()`) is the figure Types 1, 2 and 3 and the late fact
 * are argued on.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["t1", Type1Scene],
  ["t2", Type2Scene],
  ["t3", Type3Scene],
  ["snap", SnapScene],
  ["late", LateScene],
  ["late-fact", LateFactScene],
  ["measure", MeasureScene],
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

export const AeChangingDimensions: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
