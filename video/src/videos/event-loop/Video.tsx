import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import "./fonts";
import { HAND } from "./fonts";
import { Paper } from "./Paper";
import { OutroSheet } from "./scenes/OutroSheet";
import { PartsSheet } from "./scenes/PartsSheet";
import { Schematic } from "./scenes/Schematic";
import { TimingSheet } from "./scenes/TimingSheet";
import { TitleSheet } from "./scenes/TitleSheet";
import { BP, SHEET, mix } from "./theme";

/** Frames a view is up before its beat's first word. */
const LEAD = 8;
/** Frames each view stays up into the next, so a cut cross-fades instead of
 *  dipping to bare paper. */
const OVERLAP = 6;

const CAPTION_W = 1360;

/**
 * "The event loop ordering puzzle" (16:9), drafted as one blueprint sheet.
 *
 * Five views share the paper, its border and its title block: the puzzle,
 * the parts list, the schematic the run plays out on, a timing diagram for
 * the replay and the takeaway, and the end sheet. Every cut is a narration
 * cue, and every animation inside a view is cued to a word (see script.ts).
 */
export const EventLoop: React.FC<NarratedProps> = ({ timeline, captions }) =>
  timeline ? (
    <NarrationProvider timeline={timeline}>
      <Body captions={captions} />
    </NarrationProvider>
  ) : (
    <AbsoluteFill style={{ background: BP.paper }} />
  );

const Body: React.FC<{ captions: boolean }> = ({ captions }) => {
  const { beat, durationInFrames } = useNarration();
  const cut = (id: string) => beat(id).from - LEAD;
  const until = (frame: number) => frame + OVERLAP;
  const views = [
    { at: 0, label: "A · THE PUZZLE" },
    { at: cut("machine"), label: "B · PARTS LIST" },
    { at: cut("stack"), label: "C · SCHEMATIC" },
    { at: cut("replay"), label: "D · TIMING" },
    { at: cut("outro"), label: "E · REFERENCE" },
  ];

  return (
    <AbsoluteFill style={{ background: BP.paper }}>
      <ViewLabel views={views} />
      <TitleSheet from={0} to={until(cut("machine"))} />
      <PartsSheet from={cut("machine")} to={until(cut("stack"))} />
      <Schematic from={cut("stack")} to={until(cut("replay"))} />
      <TimingSheet from={cut("replay")} to={until(cut("outro"))} />
      <OutroSheet from={cut("outro")} to={durationInFrames} />
      <NarrationAudio />
      {captions ? (
        <Captions
          variant="landscape"
          look={{
            fontFamily: HAND,
            fontWeight: 400,
            fontSize: 32,
            color: BP.line,
            highlight: BP.mark,
            background: mix(BP.paperDeep, 92),
            radius: 0,
            bottom: SHEET.h - SHEET.titleBlock.y - SHEET.titleBlock.h,
            maxWidth: CAPTION_W,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            // A label strip in the sheet's bottom margin, beside the title
            // block rather than centered under it.
            box: {
              width: CAPTION_W,
              boxSizing: "border-box",
              textAlign: "left",
              padding: "14px 30px",
              border: `2.5px solid ${BP.line2}`,
              outline: `1.5px solid ${mix(BP.line2, 45)}`,
              outlineOffset: -8,
              transform: `translateX(${SHEET.inner + 12 + CAPTION_W / 2 - SHEET.w / 2}px)`,
            },
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** The paper, with its title block's VIEW cell following the current view. */
const ViewLabel: React.FC<{ views: { at: number; label: string }[] }> = ({ views }) => {
  const frame = useCurrentFrame();
  const current = [...views].reverse().find((v) => frame >= v.at) ?? views[0];
  return <Paper view={current.label} viewAt={current.at} />;
};
