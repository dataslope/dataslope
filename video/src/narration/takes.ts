import type { NarrationScript } from "./types";

/**
 * About how much one take holds, in characters: a part of a video, around
 * two minutes of speech. A unit video of 6,000 characters is recorded in
 * three or four takes.
 */
export const TAKE_CHARS = 1800;

/**
 * Splits a script into takes, each recorded in its own request
 * (scripts/narrate.mjs). A take only ever starts at a beat that opens a scene
 * (or one marked `take`), so the seam between two recordings falls in the
 * longest pauses of the video, at a turn the listener already expects.
 * Consecutive scenes share a take until it would pass `takeChars`; a beat
 * marked `take` always starts a new one.
 *
 * Why several takes rather than one: a request is capped at 10,000
 * characters; the character times drift over a long take (ThinkingStatistically's
 * ran half a second late by 2:30); and a part that needs redoing costs that
 * part, not the video.
 *
 * Returns each take as the indices of its beats, in order.
 */
export function planTakes(script: Pick<NarrationScript, "beats" | "takeChars">, takeChars = script.takeChars ?? TAKE_CHARS): number[][] {
  const scenes: { beats: number[]; chars: number; forced: boolean }[] = [];
  script.beats.forEach((beat, i) => {
    if (i === 0 || beat.scene || beat.take) scenes.push({ beats: [], chars: 0, forced: !!beat.take });
    const scene = scenes[scenes.length - 1];
    scene.beats.push(i);
    scene.chars += beat.text.length + 1;
  });
  const takes: { beats: number[]; chars: number }[] = [];
  for (const scene of scenes) {
    const current = takes[takes.length - 1];
    if (current && !scene.forced && current.chars + scene.chars <= takeChars) {
      current.beats.push(...scene.beats);
      current.chars += scene.chars;
    } else takes.push({ beats: [...scene.beats], chars: scene.chars });
  }
  return takes.map((t) => t.beats);
}
