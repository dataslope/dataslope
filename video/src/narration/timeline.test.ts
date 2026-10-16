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

test("captions break pages at sentence ends inside a beat", () => {
  const { captions } = buildTimeline(
    { id: "s", beats: [{ id: "a", text: "It moves. Spaces stay put." }] },
    null,
  );
  assert.deepEqual(
    captions.map((c) => Boolean(c.pageBreakAfter)),
    [false, true, false, false, true],
  );
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

test("leaves the scene gap before a beat that opens a scene, and never shortens a longer pause", () => {
  const t = buildTimeline(
    {
      id: "s",
      leadIn: 0,
      sceneGap: 1.5,
      beats: [
        { id: "a", text: "First scene ends here.", pauseAfter: 0.3 },
        { id: "b", text: "A new scene opens.", scene: true, pauseAfter: 2 },
        { id: "c", text: "And another.", scene: true },
      ],
    },
    null,
  );
  const [a, b, c] = t.beats;
  assert.ok(Math.abs(b.start - (a.end + 1.5)) < 1e-9);
  assert.ok(Math.abs(c.start - (b.end + 2)) < 1e-9);
});

test("audio tags are neither words nor captions, and words keep their spans", () => {
  const text = "[curious] So what's a pointer? [low, warm voice]It holds an address.";
  const estimated = buildTimeline({ id: "s", beats: [{ id: "a", text }] }, null);
  assert.deepEqual(
    estimated.beats[0].words.map((w) => w.text),
    ["So", "what's", "a", "pointer?", "It", "holds", "an", "address."],
  );
  assert.ok(estimated.captions.every((c) => !c.text.includes("[")));

  const aligned = buildTimeline(
    { id: "s", leadIn: 0, beats: [{ id: "a", text }] },
    { beats: { a: { text, audio: "narration/s/a.mp3", alignment: align(text) } } },
  );
  // "So" is characters 10-11; the tag before it is the beat's lead-in.
  assert.ok(Math.abs(aligned.beats[0].words[0].start - 0) < 1e-9);
  assert.ok(Math.abs(aligned.beats[0].words[4].start - (text.indexOf("It") - 10) * 0.1) < 1e-9);
});

test("a beat's audio starts early by its lead-in, so the first word lands on the beat", () => {
  // A beat cut from a continuous take: 0.4 s of breath before "Second".
  const text = "Second beat.";
  const alignment = align(text);
  alignment.character_start_times_seconds = alignment.character_start_times_seconds.map((s) => s + 0.4);
  alignment.character_end_times_seconds = alignment.character_end_times_seconds.map((s) => s + 0.4);
  const t = buildTimeline(script, {
    beats: { b: { text, audio: "narration/t/b.mp3", alignment } },
  });
  const [a, b] = t.beats;
  assert.ok(Math.abs(b.start - (a.end + 0.5)) < 1e-9);
  assert.ok(Math.abs(b.words[0].start - b.start) < 1e-9);
  assert.ok(Math.abs(b.audioStart - (b.start - 0.4)) < 1e-9);
  assert.ok(Math.abs(b.end - (b.start + 1.2)) < 1e-9);
  assert.equal(a.audioStart, a.start);
});

test("a lead-in longer than the pause before it pushes the beat back, never overlapping", () => {
  const text = "Second beat.";
  const alignment = align(text);
  alignment.character_start_times_seconds = alignment.character_start_times_seconds.map((s) => s + 0.8);
  alignment.character_end_times_seconds = alignment.character_end_times_seconds.map((s) => s + 0.8);
  const t = buildTimeline(script, { beats: { b: { text, audio: "narration/t/b.mp3", alignment } } });
  const [a, b] = t.beats;
  // pauseAfter is 0.5, the lead-in 0.8: the audio starts as "a" ends.
  assert.ok(Math.abs(b.audioStart - a.end) < 1e-9);
  assert.ok(Math.abs(b.start - (a.end + 0.8)) < 1e-9);
});
