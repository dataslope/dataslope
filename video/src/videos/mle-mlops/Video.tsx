import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { CloseScene } from "./CloseScene";
import { DriftScene } from "./DriftScene";
import { HookScene } from "./HookScene";
import { MlopsScene } from "./MlopsScene";
import { MonitorScene } from "./MonitorScene";
import { PipelineScene } from "./PipelineScene";
import { PsiScene } from "./PsiScene";
import { RapidScene } from "./RapidScene";
import { RolloutScene } from "./RolloutScene";
import { TestScene } from "./TestScene";
import { VersionScene } from "./VersionScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Shipping and monitoring models" (16:9), Part 8 of the Machine Learning
 * Engineer interview videos, on the editorial page. Twelve questions worked
 * through, a scene each or a pair to a scene, on a model's life after
 * training (a small loop in the corner of every deep dive, the stage the
 * question is about lit), then five quick ones, and the loop drawn large to
 * close. Every number is in results.json (check.mjs); the simulations are
 * named as simulations on screen and aloud.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", MlopsScene],
  ["q2", VersionScene],
  ["q4", PipelineScene],
  ["q6", MonitorScene],
  ["q7", DriftScene],
  ["q9", PsiScene],
  ["q11", RolloutScene],
  ["q12", TestScene],
  ["rapid-in", RapidScene],
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
          <Scene key={id} from={i === 0 ? 0 : cut(id)} to={next ? until(cut(next[0])) : durationInFrames + OVERLAP} fade={6}>
            <Body />
          </Scene>
        );
      })}
    </>
  );
};

export const MleMlops: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
