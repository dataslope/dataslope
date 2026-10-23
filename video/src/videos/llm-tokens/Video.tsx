import React from "react";
import { Scene } from "../../components/Scene";
import { EditorialPage, type EditorialProps } from "../../editorial/Page";
import { SeriesIntro } from "../../editorial/SeriesIntro";
import { useNarration } from "../../narration/NarrationContext";
import { BpeScene } from "./BpeScene";
import { BytesScene } from "./BytesScene";
import { ChatScene } from "./ChatScene";
import { FormatScene } from "./FormatScene";
import { LoopScene } from "./LoopScene";
import { ModelScene } from "./ModelScene";
import { RateScene } from "./RateScene";
import { StrawScene } from "./StrawScene";

/** Frames a scene is up before its beat's first word. */
const LEAD = 8;
/** Frames each scene stays up into the next, so cuts cross-fade. */
const OVERLAP = 6;

/**
 * "What the model reads" (16:9), Unit 1 of How Large Language Models Work,
 * the course's first video. One argument in four parts, every token, id and
 * count from the lessons' own code and tokenizer (measure.py, data.ts):
 *
 *   1. A next-token machine: ModelScene, LoopScene.
 *   2. Tokens: StrawScene, RateScene.
 *   3. Byte-pair encoding, by hand: BpeScene.
 *   4. Counts in practice: BytesScene, FormatScene, ChatScene (and the
 *      bridge to Unit 2).
 *
 * Every scene boundary is a narration cue, so new audio re-times the cuts
 * along with every animation inside them.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  return (
    <>
      <Scene from={0} to={until(cut("hook"))} fade={8}>
        <SeriesIntro course="How Large Language Models Work" unit="Unit 1" title="What the model reads" />
      </Scene>
      <Scene from={cut("hook")} to={until(cut("loop"))} fade={6}>
        <ModelScene />
      </Scene>
      <Scene from={cut("loop")} to={until(cut("token"))} fade={6}>
        <LoopScene />
      </Scene>
      <Scene from={cut("token")} to={until(cut("rate"))} fade={6}>
        <StrawScene />
      </Scene>
      <Scene from={cut("rate")} to={until(cut("bpe"))} fade={6}>
        <RateScene />
      </Scene>
      <Scene from={cut("bpe")} to={until(cut("bytes"))} fade={6}>
        <BpeScene />
      </Scene>
      <Scene from={cut("bytes")} to={until(cut("formats"))} fade={6}>
        <BytesScene />
      </Scene>
      <Scene from={cut("formats")} to={until(cut("chat"))} fade={6}>
        <FormatScene />
      </Scene>
      <Scene from={cut("chat")} to={durationInFrames + OVERLAP} fade={6}>
        <ChatScene />
      </Scene>
    </>
  );
};

export const LlmTokens: React.FC<EditorialProps> = (props) => (
  <EditorialPage {...props}>
    <Scenes />
  </EditorialPage>
);
