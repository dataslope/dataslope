// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTimeline } from "./timeline.ts";
import type { CharacterAlignment, NarrationScript } from "./types.ts";

const script: NarrationScript = {
  id: "t",
  leadIn: 1,
  tail: 2,
  beats: [
    { id: "a", text: "Hello there, world.", pauseAfter: 0.5 },
    { id: "b", text: "Second beat." },
  ],
};

/** Fake ElevenLabs alignment: every character 0.1 s, back to back. */
function align(text: string): CharacterAlignment {
  const characters = [...text];
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * 0.1),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * 0.1),
  };
}

test("estimates timing in order, with the lead-in, pauses and tail", () => {
  const t = buildTimeline(script, null);
  const [a, b] = t.beats;
  assert.equal(a.start, 1);
  assert.equal(a.source, "estimate");
  assert.ok(a.words.every((w, i) => w.end > w.start && (i === 0 || w.start >= a.words[i - 1].end)));
  assert.ok(Math.abs(b.start - (a.end + 0.5)) < 1e-9);
  assert.ok(Math.abs(t.duration - (b.end + 2)) < 1e-9);
  assert.deepEqual(
    a.words.map((w) => w.key),
    ["hello", "there", "world"],
  );
});

test("uses alignment made from the same text, timing words by their letters", () => {
  const t = buildTimeline(script, {
    beats: { a: { text: "Hello there, world.", audio: "narration/t/a.mp3", alignment: align("Hello there, world.") } },
  });
  const [a, b] = t.beats;
  assert.equal(a.source, "alignment");
  assert.equal(a.audio, "narration/t/a.mp3");
  // "there," spans characters 6-11; the comma is not part of the word.
  assert.ok(Math.abs(a.words[1].start - (1 + 0.6)) < 1e-9);
  assert.ok(Math.abs(a.words[1].end - (1 + 1.1)) < 1e-9);
  assert.ok(Math.abs(a.end - (1 + 1.9)) < 1e-9);
  assert.equal(b.source, "estimate");
});

test("falls back to the estimate for a beat edited after its audio", () => {
  const t = buildTimeline(script, {
    beats: { a: { text: "Hello there.", audio: "narration/t/a.mp3", alignment: align("Hello there.") } },
  });
  assert.equal(t.beats[0].source, "stale");
  assert.equal(t.beats[0].audio, null);
});

test("captions carry leading spaces and break pages at every beat", () => {
  const { captions } = buildTimeline(script, null);
  assert.deepEqual(
    captions.map((c) => c.text),
    ["Hello", " there,", " world.", " Second", " beat."],
  );
  assert.deepEqual(
    captions.map((c) => Boolean(c.pageBreakAfter)),
    [false, false, true, false, true],
  );
});
