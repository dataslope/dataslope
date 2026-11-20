import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AgentEvalScene } from "./AgentEvalScene";
import { AgentScene } from "./AgentScene";
import { CloseScene } from "./CloseScene";
import { HookScene } from "./HookScene";
import { JudgeScene } from "./JudgeScene";
import { LayersScene } from "./LayersScene";
import { RagScene } from "./RagScene";
import { WhenNotScene } from "./WhenNotScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Evaluating LLM systems" (16:9), Part 10 and the last of the Machine
 * Learning Engineer interview videos, on the editorial page. One running
 * system, an assistant that answers from a company's documents and can file
 * a support ticket, gives each of the page's six questions its object: the
 * layers that evaluate it, the judge they lean on, its retrieval half, the
 * ticket tool that makes it an agent, how that agent is graded, and when to
 * use no LLM at all. Every number is check.mjs's (results.json, data.ts).
 * The series ends here, so the close has no "Next" line.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", LayersScene],
  ["q2", JudgeScene],
  ["q3", RagScene],
  ["q4", AgentScene],
  ["q5", AgentEvalScene],
  ["q6", WhenNotScene],
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

export const MleLlmEvals: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
