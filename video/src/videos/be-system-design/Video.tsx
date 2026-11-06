import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { ApproachScene } from "./ApproachScene";
import { BreakerScene } from "./BreakerScene";
import { CdnScene } from "./CdnScene";
import { DiagramScene } from "./DiagramScene";
import { EdgeScene } from "./EdgeScene";
import { EstimateScene } from "./EstimateScene";
import { HookScene } from "./HookScene";
import { KeyScene } from "./KeyScene";
import { LadderScene } from "./LadderScene";
import { NextScene } from "./NextScene";
import { SpofScene } from "./SpofScene";
import { TailScene } from "./TailScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Approaching system design" (16:9), Part 1 of the Backend / Software
 * Engineer interview prep videos, on the editorial page. Five of the system
 * design page's questions, all worked through on one design, the URL
 * shortener: the method, the estimate (with the latency ladder and the
 * percentiles), the diagram and its follow-ups, its single points of failure
 * and the circuit breaker, and the CDN in front of it. Every number is
 * check.mjs's (results.json, data.ts): arithmetic on the video's stated
 * assumptions, the site's own charts read or copied from their source, and
 * light over two named cities.
 *
 * No series intro, as in the other interview series. Every scene boundary is
 * a narration cue, so new audio re-times the cuts along with every animation
 * inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", ApproachScene],
  ["q2", EstimateScene],
  ["q2-ladder", LadderScene],
  ["q2-tail", TailScene],
  ["q3", KeyScene],
  ["q3-diagram", DiagramScene],
  ["q4", SpofScene],
  ["q4-retry", BreakerScene],
  ["q5", CdnScene],
  ["q5-use", EdgeScene],
  ["next", NextScene],
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

export const BeSystemDesign: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
