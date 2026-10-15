import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Scene } from "../../components/Scene";
import { Captions } from "../../narration/Captions";
import type { NarratedProps } from "../../narration/metadata";
import { NarrationAudio } from "../../narration/NarrationAudio";
import { NarrationProvider, useNarration } from "../../narration/NarrationContext";
import { ds } from "../../theme/brand";
import { ChalkDefs, INK, Slate } from "./chalk";
import { Eraser, erasedBy, WIPE_DUR, type Wipe } from "./Eraser";
import { HAND } from "./fonts";
import { BinaryBoard } from "./scenes/BinaryBoard";
import { BitsBoard } from "./scenes/BitsBoard";
import { FixBoard } from "./scenes/FixBoard";
import { OutroBoard } from "./scenes/OutroBoard";
import { PromptBoard } from "./scenes/PromptBoard";
import { SumBoard } from "./scenes/SumBoard";
import { ThirdBoard } from "./scenes/ThirdBoard";

/** A board, shown from `from` until the eraser that follows it has passed. */
const Board: React.FC<{ from: number; to: number; wipe?: Wipe; children: React.ReactNode }> = ({
  from,
  to,
  wipe,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <Scene from={from} to={to} fade={2}>
      <AbsoluteFill style={wipe ? erasedBy(frame, wipe) : undefined}>{children}</AbsoluteFill>
    </Scene>
  );
};

const Boards: React.FC = () => {
  const n = useNarration();
  // Each eraser finishes on the first word of the board after it, so the
  // next lesson starts being written the moment the slate is clean.
  const wipe = (beat: string, dir: 1 | -1, seed: number): Wipe => ({
    at: n.beat(beat).from - WIPE_DUR,
    dir,
    seed,
  });
  const wipes = [
    // Directions are picked so each board's last mark is erased last.
    wipe("third", 1, 1),
    wipe("binary", -1, 2),
    wipe("bits", 1, 3),
    wipe("pair", -1, 4),
    wipe("isclose", -1, 5),
    wipe("outro", 1, 6),
  ];
  // A board is up from the moment the eraser before it starts (so the two
  // overlap for the whole sweep) until the eraser after it has passed.
  const boards = [PromptBoard, ThirdBoard, BinaryBoard, BitsBoard, SumBoard, FixBoard, OutroBoard];
  return (
    <>
      {boards.map((Content, i) => {
        const before = wipes[i - 1];
        const after = wipes[i];
        return (
          <Board
            key={i}
            // The first board starts "before" frame 0, so its two-frame fade
            // is already done and the very first frame shows chalk.
            from={before ? before.at : -2}
            // The last board runs past the end, so it never fades on the final frame.
            to={after ? after.at + WIPE_DUR + 2 : n.durationInFrames + 4}
            wipe={after}
          >
            <Content />
          </Board>
        );
      })}
      {wipes.map((w) => (
        <Eraser key={w.seed} wipe={w} />
      ))}
    </>
  );
};

/**
 * "Why 0.1 + 0.2 isn't 0.3" (16:9), a chalkboard lecture.
 *
 * Seven boards, each erased by a felt eraser before the next is written:
 * the Python prompt, one third in decimal, one tenth in binary, the 53 bits
 * and the stored digits, the sum landing on the wrong float, the fixes, and
 * the lesson. Every mark on every board is written at a narration cue
 * (script.ts), so new audio re-times the whole lecture.
 */
export const FloatingPoint: React.FC<NarratedProps> = ({ timeline, captions }) => {
  if (!timeline) return <AbsoluteFill style={{ background: ds("gray", 900) }} />;
  return (
    <NarrationProvider timeline={timeline}>
      <AbsoluteFill>
        <ChalkDefs />
        <Slate />
        <Boards />
        <NarrationAudio />
        {captions ? (
          <Captions
            variant="landscape"
            look={{
              fontFamily: HAND,
              fontWeight: 600,
              fontSize: 58,
              color: INK.white,
              highlight: ds("yellow", 300),
              background: "transparent",
              bottom: 30,
              maxWidth: 1560,
              box: { filter: "url(#fp-chalk)", letterSpacing: "0.01em" },
            }}
          />
        ) : null}
      </AbsoluteFill>
    </NarrationProvider>
  );
};
