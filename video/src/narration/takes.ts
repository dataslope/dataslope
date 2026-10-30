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

/** A stretch of a kept take's text: a script beat found in it (`beat` is its
 *  index in the script), or text no beat says any more (`beat` null). */
export type TakeSegment = { beat: number | null; start: number; end: number };

/**
 * Finds the script's beats in a kept take's text, in order, and returns the
 * whole take as segments: each beat whose text is in it, and between them any
 * text the script no longer has (a beat reworded and voiced on its own since).
 * A beat matches only as whole sentences: it starts the take or follows a
 * sentence's closing punctuation and a separator (a space, or the paragraph
 * break before a scene), and is followed by a separator or the take's end. So
 * a short beat can't match words inside a longer one, and a beat split
 * anywhere but a sentence break simply isn't found, which leaves its audio
 * as it is.
 *
 * This is what lets `narrate --recut` cut a take after the script has moved on
 * from it: a beat split at a sentence break is found as its pieces, a beat
 * voiced alone since is cut away as filler, and every unchanged beat keeps the
 * cut it had, because the pauses on either side of it are the same.
 */
export function locateBeats(text: string, beats: readonly { text: string }[]): TakeSegment[] {
  const edge = (i: number) => {
    if (i <= 0) return true;
    if (text[i - 1] !== " " && text[i - 1] !== "\n") return false;
    let j = i - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    return j < 0 || /[.!?:;"”’)\]]/.test(text[j]);
  };
  const tail = (i: number) => i >= text.length || text[i] === " " || text[i] === "\n";
  const found: TakeSegment[] = [];
  let pos = 0;
  beats.forEach((beat, b) => {
    if (!beat.text) return;
    for (let at = text.indexOf(beat.text, pos); at >= 0; at = text.indexOf(beat.text, at + 1)) {
      const end = at + beat.text.length;
      if (edge(at) && tail(end)) {
        found.push({ beat: b, start: at, end });
        pos = end;
        return;
      }
    }
  });
  const segments: TakeSegment[] = [];
  const filler = (from: number, to: number) => {
    while (from < to && /\s/.test(text[from])) from++;
    while (to > from && /\s/.test(text[to - 1])) to--;
    if (to > from) segments.push({ beat: null, start: from, end: to });
  };
  let at = 0;
  for (const f of found) {
    filler(at, f.start);
    segments.push(f);
    at = f.end;
  }
  filler(at, text.length);
  return segments;
}
