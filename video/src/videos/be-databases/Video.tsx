import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CompositeScene } from "./CompositeScene";
import { DeadlockScene } from "./DeadlockScene";
import { FanoutScene } from "./FanoutScene";
import { HookScene } from "./HookScene";
import { HurtScene } from "./HurtScene";
import { IndexScene } from "./IndexScene";
import { IsoScene } from "./IsoScene";
import { LockScene } from "./LockScene";
import { NosqlScene } from "./NosqlScene";
import { PlanScene } from "./PlanScene";
import { RapidScene } from "./RapidScene";
import { TxnScene } from "./TxnScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Databases" (16:9), Part 4 of the Backend / Software Engineer interview
 * prep videos, on the editorial page. The page's sixteen questions (and
 * system design's SQL-or-NoSQL question, answered with the first): eleven
 * worked through, a scene each (isolation levels and their anomalies share
 * one), then five quick ones. Every plan, count, size and error ran on the
 * site's Postgres (check.mjs, results.json, data.ts); the two-session
 * anomalies and the deadlock are drawn.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["nosql", NosqlScene],
  ["index", IndexScene],
  ["hurt", HurtScene],
  ["composite", CompositeScene],
  ["plan-q", PlanScene],
  ["fanout", FanoutScene],
  ["txn", TxnScene],
  ["levels", IsoScene],
  ["lock", LockScene],
  ["deadlock", DeadlockScene],
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

export const BeDatabases: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
