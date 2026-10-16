import type { Caption } from "@remotion/captions";
import type { VoiceName } from "./voices";

/** One sentence or phrase of narration: the unit audio is generated in. */
export type Beat = {
  /** Stable id. Audio files and alignment are keyed by it, and scenes look
   *  their cues up by it, so renaming one is a re-generation. */
  id: string;
  /** Exactly what the voice is sent, and what captions show. It may carry
   *  ElevenLabs audio tags (`[curious]`), which are directions rather than
   *  words: they are left out of the captions and can't be cued to. */
  text: string;
  /** Silence after this beat, in seconds. */
  pauseAfter?: number;
  /** A new scene opens on this beat. The timeline then leaves at least the
   *  script's `sceneGap` of silence before it, so the scene that ends here
   *  stays on screen, finished, before it cross-fades away. Every beat a
   *  Video.tsx cuts to must say so; src/narration/scenes.test.ts checks. */
  scene?: boolean;
  /** Start a new take here: a separate recording request, whatever the size
   *  of the one before. Takes otherwise start only at scene beats, grouped up
   *  to the script's `takeChars` (src/narration/takes.ts). */
  take?: boolean;
};

export type NarrationScript = {
  /** Folder under public/narration/ that holds this script's audio. */
  id: string;
  /** The house narrator who reads it (voices.ts). Defaults to Drew. */
  voice?: VoiceName;
  /** Silence before the first beat, in seconds. */
  leadIn?: number;
  /** Time after the last beat, in seconds, for the end card to breathe. */
  tail?: number;
  /** Minimum silence, in seconds, before a beat marked `scene`. Defaults to
   *  1.6, which holds a finished scene about 1.3 s past its last word in a
   *  video whose cuts start 8 frames early. Raise it for a video whose exits
   *  start earlier than that (a wipe, or text that fades ahead of the cut). */
  sceneGap?: number;
  /** About how many characters one take holds before the next scene starts a
   *  new one (src/narration/takes.ts). Defaults to TAKE_CHARS. */
  takeChars?: number;
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
  /** The ElevenLabs voice and model the beats were generated with
   *  (scripts/narrate.mjs), so re-voicing one beat keeps the same voice. */
  meta?: { voice_id: string; model_id: string };
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
  /** Seconds from the start of the video at which `audio` starts playing:
   *  ahead of `start` by the file's own lead-in (a breath, the onset of the
   *  first word), so the first word lands on `start`. Equal to `start` for an
   *  estimated beat. */
  audioStart: number;
};

export type Timeline = {
  beats: TimedBeat[];
  /** Seconds, including the lead-in and the tail. */
  duration: number;
  /** One caption per word, in the shape @remotion/captions works with. */
  captions: Caption[];
};
