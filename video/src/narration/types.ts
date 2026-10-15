import type { Caption } from "@remotion/captions";

/** One sentence or phrase of narration: the unit audio is generated in. */
export type Beat = {
  /** Stable id. Audio files and alignment are keyed by it, and scenes look
   *  their cues up by it, so renaming one is a re-generation. */
  id: string;
  /** Exactly what the voice says. Captions show it verbatim. */
  text: string;
  /** Silence after this beat, in seconds. */
  pauseAfter?: number;
};

export type NarrationScript = {
  /** Folder under public/narration/ that holds this script's audio. */
  id: string;
  /** Silence before the first beat, in seconds. */
  leadIn?: number;
  /** Time after the last beat, in seconds, for the end card to breathe. */
  tail?: number;
  beats: Beat[];
};

/**
 * Character-level timing exactly as ElevenLabs returns it from
 * `POST /v1/text-to-speech/{voice_id}/with-timestamps` (the `alignment`
 * field, which indexes the text that was sent, not the normalized one).
 */
export type CharacterAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

/**
 * `public/narration/<script id>/alignment.json`. One entry per beat: the text
 * the audio was generated from (so an edited beat is detected as stale), the
 * audio file relative to public/, and its alignment.
 */
export type NarrationAlignmentFile = {
  beats: Record<
    string,
    { text: string; audio: string; alignment: CharacterAlignment }
  >;
};

export type TimedWord = {
  /** The word as written, punctuation included. */
  text: string;
  /** Lowercase letters and digits only: what cues match against. */
  key: string;
  /** Seconds from the start of the video. */
  start: number;
  end: number;
};

export type TimedBeat = {
  id: string;
  text: string;
  start: number;
  end: number;
  words: TimedWord[];
  /** Where the timing came from. `stale` means audio exists but was made
   *  from different text, so the beat fell back to an estimate. */
  source: "alignment" | "estimate" | "stale";
  /** Audio file relative to public/, when there is one. */
  audio: string | null;
};

export type Timeline = {
  beats: TimedBeat[];
  /** Seconds, including the lead-in and the tail. */
  duration: number;
  /** One caption per word, in the shape @remotion/captions works with. */
  captions: Caption[];
};
