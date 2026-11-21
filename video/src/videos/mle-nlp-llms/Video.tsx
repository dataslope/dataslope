import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { AttnScene } from "./AttnScene";
import { BlockScene } from "./BlockScene";
import { ChooseScene } from "./ChooseScene";
import { ContextScene } from "./ContextScene";
import { CostScene } from "./CostScene";
import { EmbedScene } from "./EmbedScene";
import { HeadsScene } from "./HeadsScene";
import { HookScene } from "./HookScene";
import { LoraScene } from "./LoraScene";
import { NextScene } from "./NextScene";
import { PretrainScene } from "./PretrainScene";
import { RagScene } from "./RagScene";
import { RapidScene } from "./RapidScene";
import { RnnScene } from "./RnnScene";
import { StagesScene } from "./StagesScene";
import { TokenScene } from "./TokenScene";
import { WindowScene } from "./WindowScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "NLP and LLMs" (16:9), Part 6 of the Machine Learning Engineer interview
 * videos, on the editorial page. Text to tokens to vectors, attention and the
 * transformer, what attention costs, training and adapting, grounding: the
 * fourteen deep questions a scene each, in the order the ideas build, then
 * five quick ones and the bridge into system design. Every number is in
 * results.json (check.mjs); the simulation and the illustrative scores say so
 * on screen.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", TokenScene],
  ["q2", EmbedScene],
  ["q3", ContextScene],
  ["q4", AttnScene],
  ["q5", HeadsScene],
  ["q6", BlockScene],
  ["q7", RnnScene],
  ["q8", CostScene],
  ["q9", WindowScene],
  ["q10", PretrainScene],
  ["q11", StagesScene],
  ["q12", LoraScene],
  ["q13", RagScene],
  ["q14", ChooseScene],
  ["rapid-in", RapidScene],
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

export const MleNlpLlms: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
