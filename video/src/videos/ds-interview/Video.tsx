import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AiScene } from "./AiScene";
import { LoopScene } from "./LoopScene";
import { ProbeScene } from "./ProbeScene";
import { SeriesScene } from "./SeriesScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "The Data Scientist interview" (16:9), Part 0 of the Data Scientist
 * interview prep videos, on the editorial page: the loop's four rounds, the
 * five things interviewers score, what AI has brought in, and the series
 * itself, ending on the bridge into Part 1.
 *
 * No series intro yet, as in the other parts.
 */
const SCENES: [string, React.FC][] = [
  ["loop", LoopScene],
  ["probe", ProbeScene],
  ["ai", AiScene],
  ["series", SeriesScene],
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

export const DsInterview: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
