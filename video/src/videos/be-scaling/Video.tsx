import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BalancerScene } from "./BalancerScene";
import { CacheScene } from "./CacheScene";
import { CapScene } from "./CapScene";
import { FeedScene } from "./FeedScene";
import { HookScene } from "./HookScene";
import { InvalidateScene } from "./InvalidateScene";
import { QueueScene } from "./QueueScene";
import { RapidScene } from "./RapidScene";
import { RateScene } from "./RateScene";
import { ReplicaScene } from "./ReplicaScene";
import { ScaleScene } from "./ScaleScene";
import { ShardScene } from "./ShardScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Scaling a design" (16:9), Part 2 of the Backend / Software Engineer
 * interview videos, on the editorial page. Part 1's URL shortener at ten
 * times its traffic: nine questions worked through, a scene each, on that
 * design (its diagram rides along as a small map, the part each question is
 * about lit), two quick ones, then the news feed, where fan-out is the whole
 * question, and the grown design. Every number is in results.json (check.mjs);
 * the simulations are named as simulations on screen and aloud.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", ScaleScene],
  ["q2", BalancerScene],
  ["q3", CacheScene],
  ["q4", InvalidateScene],
  ["q5", ReplicaScene],
  ["q6", ShardScene],
  ["q7", CapScene],
  ["q8", QueueScene],
  ["q9", RateScene],
  ["rapid-in", RapidScene],
  ["q12", FeedScene],
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

export const BeScaling: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
