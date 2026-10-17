import React, { createContext, useContext, useMemo } from "react";
import { useVideoConfig } from "remotion";
import type { TimedBeat, Timeline } from "./types";
import { phraseStarts, wordKey } from "./timeline";

export type WordCueOptions = {
  /** Which occurrence of the phrase within the beat, from 1. */
  nth?: number;
  /** Cue on the phrase's first word starting (default) or last word ending. */
  edge?: "start" | "end";
};

/**
 * Cue lookups in frames. Scenes say *what is being said* when something
 * happens, never a frame number, so new audio (or an edited script) re-times
 * them. A cue that names a word the beat no longer says throws, which is the
 * point: a silently mistimed animation is worse than an error in the Studio.
 */
export type Narration = {
  timeline: Timeline;
  /** Frame at a time in seconds. */
  frame: (seconds: number) => number;
  /** A beat's first and last spoken frame. */
  beat: (id: string) => { from: number; to: number };
  /** Frame at which a word or phrase in a beat is spoken. */
  word: (beatId: string, phrase: string, options?: WordCueOptions) => number;
  /** Total length in frames. */
  durationInFrames: number;
};

const NarrationContext = createContext<Narration | null>(null);

/** Each ambiguous cue is reported once per page, not once per frame.
 *  check:frames collects the `[cue]` lines from the render's console. */
const warned = new Set<string>();
function warnAmbiguous(beatId: string, phrase: string, times: number) {
  const key = `${beatId}\u0000${phrase}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[cue] Beat "${beatId}" says "${phrase}" ${times} times; the cue takes the first. Pass { nth } to choose.`);
}

function findBeat(timeline: Timeline, id: string): TimedBeat {
  const beat = timeline.beats.find((b) => b.id === id);
  if (!beat) throw new Error(`No narration beat "${id}"`);
  return beat;
}

export const NarrationProvider: React.FC<{
  timeline: Timeline;
  children: React.ReactNode;
}> = ({ timeline, children }) => {
  const { fps } = useVideoConfig();
  const value = useMemo<Narration>(() => {
    const frame = (seconds: number) => Math.round(seconds * fps);
    return {
      timeline,
      frame,
      durationInFrames: Math.ceil(timeline.duration * fps),
      beat: (id) => {
        const b = findBeat(timeline, id);
        return { from: frame(b.start), to: frame(b.end) };
      },
      word: (beatId, phrase, { nth, edge = "start" } = {}) => {
        const b = findBeat(timeline, beatId);
        const starts = phraseStarts(b.words, phrase);
        const i = starts[(nth ?? 1) - 1];
        if (i === undefined) {
          throw new Error(
            `Beat "${beatId}" does not say "${phrase}"${(nth ?? 1) > 1 ? ` ${nth} times` : ""}: "${b.text}"`,
          );
        }
        if (nth === undefined && starts.length > 1) warnAmbiguous(beatId, phrase, starts.length);
        const length = phrase.split(/\s+/).map(wordKey).filter(Boolean).length;
        const w = edge === "start" ? b.words[i] : b.words[i + length - 1];
        return frame(edge === "start" ? w.start : w.end);
      },
    };
  }, [timeline, fps]);
  return (
    <NarrationContext.Provider value={value}>
      {children}
    </NarrationContext.Provider>
  );
};

export function useNarration(): Narration {
  const n = useContext(NarrationContext);
  if (!n) throw new Error("useNarration() outside <NarrationProvider>");
  return n;
}
