import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { useNarration } from "../../narration/NarrationContext";
import { BatchScene } from "./BatchScene";
import { CloseScene } from "./CloseScene";
import { HookScene } from "./HookScene";
import { KvScene } from "./KvScene";
import { PrefillScene } from "./PrefillScene";
import { QuantScene } from "./QuantScene";
import { RapidScene } from "./RapidScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "Serving LLMs" (16:9), Part 9 of the Machine Learning Engineer interview
 * videos, on the editorial page. One argument on one model (the page's
 * 70B-class model on eight 80 GB GPUs): decode reads every weight per token
 * (1), the KV cache is where the memory goes (2), batching and paging keep
 * the GPU full (3), and two levers read fewer bytes or verify more tokens per
 * read (4); then four more levers, and the close. Every number is in
 * results.json (check.mjs); the simulations are named as simulations on
 * screen and aloud.
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const SCENES: [string, React.FC][] = [
  ["hook", HookScene],
  ["q1", PrefillScene],
  ["q2", KvScene],
  ["q3", BatchScene],
  ["q4", QuantScene],
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

export const MleServingLlms: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
