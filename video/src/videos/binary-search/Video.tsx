import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions, type CaptionLook } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import { TERM } from "./fonts";
import { Backdrop, Scanlines } from "./pixel";
import { Board } from "./scenes/Board";
import { Catch } from "./scenes/Catch";
import { Outro } from "./scenes/Outro";
import { Scale } from "./scenes/Scale";
import { Title } from "./scenes/Title";
import { Why } from "./scenes/Why";
import { Win } from "./scenes/Win";
import { ARCADE, shade } from "./theme";

/** Frames a scene is up before its beat's first word. */
const LEAD = 6;
/** Frames each scene stays up into the next, so a cut cross-fades (in hard
 *  steps) instead of dipping to an empty screen. */
const OVERLAP = 6;

/** Captions as an arcade dialogue box: VT323 caps in a square neon frame
 *  with a hard drop shadow. */
const CAPTION_LOOK: Partial<CaptionLook> = {
  fontFamily: TERM,
  fontWeight: 400,
  fontSize: 70,
  color: ARCADE.text,
  highlight: ARCADE.yellow,
  background: ARCADE.panel,
  radius: 0,
  bottom: 380,
  maxWidth: 900,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  box: {
    lineHeight: 1,
    padding: "12px 30px 16px",
    border: `6px solid ${ARCADE.neon}`,
    boxShadow: `10px 10px 0 ${shade(45)}`,
  },
};

/**
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and ends where the next one starts, so new audio re-times the cuts
 * along with everything inside them.
 */
const Scenes: React.FC = () => {
  const { beat, word, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  const win = word("win", "Got");
  return (
    <>
      <Title from={0} to={until(cut("linear"))} />
      <Board from={cut("linear")} to={until(win)} />
      <Win from={win} to={until(cut("why"))} />
      <Why from={cut("why")} to={until(cut("scale"))} />
      <Scale from={cut("scale")} to={until(cut("catch"))} />
      <Catch from={cut("catch")} to={until(cut("outro"))} />
      <Outro from={cut("outro")} to={durationInFrames} />
    </>
  );
};

/** "I can guess any number from 1 to 100 in 7 tries": binary search as a
 *  vertical arcade short. */
export const BinarySearch: React.FC<NarratedProps> = ({ timeline, captions }) => {
  if (!timeline) return <AbsoluteFill style={{ background: ARCADE.screen }} />;
  return (
    <NarrationProvider timeline={timeline}>
      <AbsoluteFill style={{ background: ARCADE.screen }}>
        <Backdrop />
        <Scenes />
        <NarrationAudio />
        {captions ? <Captions variant="portrait" look={CAPTION_LOOK} /> : null}
        <Scanlines />
      </AbsoluteFill>
    </NarrationProvider>
  );
};
