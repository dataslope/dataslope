import React from "react";
import { AbsoluteFill } from "remotion";
import { Captions } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { DISPLAY } from "./fonts";
import { Encode } from "./scenes/Encode";
import { Hook } from "./scenes/Hook";
import { Outro } from "./scenes/Outro";
import { Rule } from "./scenes/Rule";
import { Sees } from "./scenes/Sees";
import { Sentence } from "./scenes/Sentence";
import { Spell } from "./scenes/Spell";
import { Units } from "./scenes/Units";
import { Why } from "./scenes/Why";
import { CAPTION_BOTTOM, glowBox, mix, NIGHT } from "./theme";
import { Backdrop, Crt, GlitchCut } from "./ui";

/** Frames a scene is up before its beat's first word. */
const LEAD = 6;
/** Frames each scene stays up into the next, so a cut cross-fades instead
 *  of dipping to an empty frame between two fades. */
const OVERLAP = 6;

/**
 * Every scene boundary is a narration cue: a scene starts just before its
 * beat and ends where the next one starts, so new audio re-times the cuts
 * along with everything inside them. Each cut also tears for a few frames.
 */
const Scenes: React.FC = () => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  const cuts = ["sees", "split", "sentence", "why", "spell", "rule", "units", "outro"].map(cut);
  return (
    <>
      {/* Starts before frame 0 so the first frame is already lit. */}
      <Hook from={-LEAD} to={until(cut("sees"))} />
      <Sees from={cut("sees")} to={until(cut("split"))} />
      <Encode from={cut("split")} to={until(cut("sentence"))} />
      <Sentence from={cut("sentence")} to={until(cut("why"))} />
      <Why from={cut("why")} to={until(cut("spell"))} />
      <Spell from={cut("spell")} to={until(cut("rule"))} />
      <Rule from={cut("rule")} to={until(cut("units"))} />
      <Units from={cut("units")} to={until(cut("outro"))} />
      <Outro from={cut("outro")} to={durationInFrames} />
      {cuts.map((at) => (
        <GlitchCut key={at} at={at + OVERLAP / 2} />
      ))}
    </>
  );
};

/** Captions as a lit sign: a dark box, a blue tube round it, the spoken
 *  word in yellow. */
const CAPTION_LOOK = {
  fontFamily: DISPLAY,
  fontWeight: 700,
  fontSize: 58,
  color: ds("gray", 50),
  highlight: ds("yellow", 300),
  background: mix(NIGHT, 90),
  radius: 18,
  bottom: CAPTION_BOTTOM,
  maxWidth: 900,
  letterSpacing: "-0.01em",
  box: {
    border: `3px solid ${mix(ds("blue", 400), 80)}`,
    boxShadow: glowBox(ds("blue", 400), 0.6),
    textShadow: `0 0 12px ${mix(ds("blue", 400), 55)}`,
  },
} as const;

export const LlmTokens: React.FC<NarratedProps> = ({ timeline, captions }) => {
  if (!timeline) return <AbsoluteFill style={{ background: NIGHT }} />;
  return (
    <NarrationProvider timeline={timeline}>
      <AbsoluteFill style={{ background: NIGHT, overflow: "hidden" }}>
        <Backdrop />
        <Scenes />
        <Crt />
        <NarrationAudio />
        {captions ? <Captions variant="portrait" look={CAPTION_LOOK} /> : null}
      </AbsoluteFill>
    </NarrationProvider>
  );
};
