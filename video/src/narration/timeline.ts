// Turns a narration script into a timeline: when every beat and every word is
// spoken. Pure (no Remotion, no DOM), so the same code times the Studio, the
// render and any script that prints cue sheets.
//
// There are two sources of timing and one shape of output:
//
//   - **alignment**: ElevenLabs' character timestamps for audio generated
//     from the beat's exact text. This is the real thing.
//   - **estimate**: a reading-speed model, so a video can be built, reviewed
//     and re-timed before any audio exists. Scenes are keyed to words, not to
//     seconds, so dropping real alignment in later re-times every animation
//     with no code changes.
import type { Caption } from "@remotion/captions";
import type {
  Beat,
  CharacterAlignment,
  NarrationAlignmentFile,
  NarrationScript,
  TimedBeat,
  TimedWord,
  Timeline,
} from "./types";

const DEFAULT_LEAD_IN = 0.6;
const DEFAULT_TAIL = 1.6;
const DEFAULT_PAUSE = 0.35;

// Reading-speed model, calibrated to ElevenLabs' narration voices at default
// speed (about 160 words a minute once sentence pauses are counted).
const SECONDS_PER_LETTER = 0.062;
const SECONDS_PER_SPACE = 0.03;
const PAUSE_AFTER: Record<string, number> = {
  ",": 0.18,
  ";": 0.26,
  ":": 0.26,
  ".": 0.38,
  "!": 0.38,
  "?": 0.4,
};

/** Lowercase letters and digits: "total," and "Total" both match "total". */
export const wordKey = (word: string) =>
  word.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Words of a text with their character spans, split on whitespace. */
function splitWords(text: string) {
  const words: { text: string; from: number; to: number }[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    const from = m.index ?? 0;
    words.push({ text: m[0], from, to: from + m[0].length });
  }
  return words;
}

/** How many letters a word takes to say. Digits are the case worth
 *  modelling: "125" is three characters and "one hundred twenty-five". */
function spokenLetters(word: string) {
  const digits = word.replace(/[^0-9]/g, "");
  const letters = word.replace(/[^a-zA-Z]/g, "").length;
  if (!digits) return Math.max(letters, 1);
  const perNumber = [0, 4, 7, 18, 24];
  return letters + (perNumber[Math.min(digits.length, 4)] ?? 24);
}

/** Estimated word timings for one beat, relative to the beat's start. */
function estimateBeat(text: string) {
  let t = 0;
  const words = splitWords(text).map((w) => {
    const start = t;
    t += spokenLetters(w.text) * SECONDS_PER_LETTER;
    const end = t;
    t += SECONDS_PER_SPACE + (PAUSE_AFTER[w.text.slice(-1)] ?? 0);
    return { text: w.text, key: wordKey(w.text), start, end };
  });
  // The pause after the final word belongs to `pauseAfter`, not to the beat.
  return { words, duration: words.length ? words[words.length - 1].end : 0 };
}

/** Word timings for one beat from real character alignment. */
function alignBeat(text: string, alignment: CharacterAlignment) {
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const words = splitWords(text).map((w) => {
    // Time a word by its letters, so a leading quote or a trailing comma
    // does not stretch it.
    let from = w.from;
    let to = w.to - 1;
    while (from < to && !/[a-z0-9]/i.test(text[from])) from++;
    while (to > from && !/[a-z0-9]/i.test(text[to])) to--;
    return {
      text: w.text,
      key: wordKey(w.text),
      start: starts[from],
      end: ends[to],
    };
  });
  return { words, duration: ends.length ? ends[ends.length - 1] : 0 };
}

/** Whether alignment was made from this exact text. */
function matches(beat: Beat, entry: NarrationAlignmentFile["beats"][string]) {
  return (
    entry.text === beat.text &&
    entry.alignment.characters.join("") === beat.text
  );
}

export function buildTimeline(
  script: NarrationScript,
  alignmentFile: NarrationAlignmentFile | null,
): Timeline {
  let cursor = script.leadIn ?? DEFAULT_LEAD_IN;
  const beats: TimedBeat[] = script.beats.map((beat) => {
    const entry = alignmentFile?.beats[beat.id];
    const usable = entry && matches(beat, entry);
    const timed = usable
      ? alignBeat(beat.text, entry.alignment)
      : estimateBeat(beat.text);
    const start = cursor;
    const words: TimedWord[] = timed.words.map((w) => ({
      ...w,
      start: start + w.start,
      end: start + w.end,
    }));
    cursor = start + timed.duration + (beat.pauseAfter ?? DEFAULT_PAUSE);
    return {
      id: beat.id,
      text: beat.text,
      start,
      end: start + timed.duration,
      words,
      source: usable ? "alignment" : entry ? "stale" : "estimate",
      audio: usable ? entry.audio : null,
    };
  });

  const last = beats[beats.length - 1];
  const duration = (last ? last.end : cursor) + (script.tail ?? DEFAULT_TAIL);

  const captions: Caption[] = beats.flatMap((beat, b) =>
    beat.words.map((w, i) => ({
      // @remotion/captions convention: a token carries its leading space,
      // which is also what lets a page break before it.
      text: b === 0 && i === 0 ? w.text : ` ${w.text}`,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
      timestampMs: Math.round(((w.start + w.end) / 2) * 1000),
      confidence: null,
      // A caption page never runs on past a sentence, or into the next beat.
      pageBreakAfter: i === beat.words.length - 1 || /[.!?]["')]?$/.test(w.text),
    })),
  );

  return { beats, duration, captions };
}

/** Every beat id must be unique: cues and audio files are keyed by them. */
export function assertUniqueBeatIds(script: NarrationScript) {
  const seen = new Set<string>();
  for (const beat of script.beats) {
    if (seen.has(beat.id)) {
      throw new Error(`Duplicate beat id "${beat.id}" in ${script.id}`);
    }
    seen.add(beat.id);
  }
}

/** The full narration as one string, beats separated by blank lines. */
export const narrationText = (script: NarrationScript) =>
  script.beats.map((b) => b.text).join("\n\n");
