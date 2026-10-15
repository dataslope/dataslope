import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import { colors } from "../../theme/brand";
import { Answer } from "./scenes/Answer";
import { Go } from "./scenes/Go";
import { Hook } from "./scenes/Hook";
import { Mixing } from "./scenes/Mixing";
import { Outro } from "./scenes/Outro";
import { Python } from "./scenes/Python";
import { Reveal } from "./scenes/Reveal";
import { SpacesCase } from "./scenes/SpacesCase";
import { TabsCase } from "./scenes/TabsCase";
import { Wipe } from "./scenes/Wipe";

/** Frames a scene is up before its beat's first word. */
const LEAD = 6;
/** Frames each scene stays up into the next, so a cut cross-fades instead
 *  of dipping to an empty page between two fades. */
const OVERLAP = 6;

/**
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and ends where the next one starts, so new audio re-times the cuts
 * along with everything inside them.
 */
const Scenes: React.FC = () => {
  const { beat, word, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  const panels = word("hook", "on screen") - 3;
  const wipe = beat("python").from - 7;
  return (
    <>
      <Hook from={0} to={until(panels)} />
      <Reveal from={panels} to={until(cut("tabs-case"))} />
      <TabsCase from={cut("tabs-case")} to={until(cut("spaces-case"))} />
      <SpacesCase from={cut("spaces-case")} to={wipe} />
      <Python from={wipe} to={until(cut("go"))} />
      <Go from={cut("go")} to={until(cut("answer"))} />
      <Answer from={cut("answer")} to={until(cut("mixing"))} />
      <Mixing from={cut("mixing")} to={until(cut("outro"))} />
      <Outro from={cut("outro")} to={durationInFrames} />
      <Wipe at={wipe} />
    </>
  );
};

export const TabsVsSpaces: React.FC<NarratedProps> = ({ timeline, captions }) => {
  if (!timeline) return <AbsoluteFill style={{ background: colors.page }} />;
  return (
    <NarrationProvider timeline={timeline}>
      <AbsoluteFill style={{ background: colors.page }}>
        <Scenes />
        <NarrationAudio />
        {captions ? <Captions variant="portrait" /> : null}
      </AbsoluteFill>
    </NarrationProvider>
  );
};
