import React, { createContext, useContext, useMemo } from "react";
import { useVideoConfig } from "remotion";
import type { TimedBeat, Timeline } from "./types";
import { wordKey } from "./timeline";

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
      word: (beatId, phrase, { nth = 1, edge = "start" } = {}) => {
        const b = findBeat(timeline, beatId);
        const keys = phrase.split(/\s+/).map(wordKey).filter(Boolean);
        let seen = 0;
        for (let i = 0; i + keys.length <= b.words.length; i++) {
          if (keys.every((k, j) => b.words[i + j].key === k) && ++seen === nth) {
            const w =
              edge === "start" ? b.words[i] : b.words[i + keys.length - 1];
            return frame(edge === "start" ? w.start : w.end);
          }
        }
        throw new Error(
          `Beat "${beatId}" does not say "${phrase}"${nth > 1 ? ` ${nth} times` : ""}: "${b.text}"`,
        );
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
