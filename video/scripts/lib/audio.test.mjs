import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { compositionOf, folderOf, loudness, readWav, registry, silences, videoNames, writeWav } from "./audio.mjs";

const RATE = 48000;
const sine = (seconds, dbfs, hz = 997) => {
  const a = 10 ** (dbfs / 20);
  return Float32Array.from({ length: Math.round(seconds * RATE) }, (_, i) => a * Math.sin((2 * Math.PI * hz * i) / RATE));
};
const concat = (...xs) => {
  const out = new Float32Array(xs.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of xs) out.set(x, (o += x.length) - x.length);
  return out;
};
const quiet = (seconds) => new Float32Array(Math.round(seconds * RATE));

test("loudness reads BS.1770's reference tones", () => {
  // EBU Tech 3341: a 1 kHz sine at -23 dBFS in both channels is -23.0 LUFS.
  const tone = sine(5, -23);
  assert.ok(Math.abs(loudness({ rate: RATE, channels: [tone, tone] }).integrated + 23) < 0.05);
  // BS.1770: at 0 dBFS in one channel of two, -3.01 LKFS.
  const full = sine(5, 0);
  assert.ok(Math.abs(loudness({ rate: RATE, channels: [full, quiet(5)] }).integrated + 3.01) < 0.05);
});

test("loudness gates out silence and reports the sample peak", () => {
  const tone = concat(quiet(3), sine(3, -20), quiet(3));
  const l = loudness({ rate: RATE, channels: [tone, tone] });
  // The silence is gated out, but the six 400 ms blocks that straddle the
  // tone's edges (a quarter, half and three quarters full, at each end) pass
  // both gates, as BS.1770 intends: 27 full blocks and those six average to
  // 30/33 of the tone's energy.
  assert.ok(Math.abs(l.integrated - (-20 + 10 * Math.log10(30 / 33))) < 0.02, `got ${l.integrated}`);
  assert.ok(Math.abs(l.peak + 20) < 0.01);
  assert.ok(l.peakAt >= 3 && l.peakAt <= 6);
  assert.equal(loudness({ rate: RATE, channels: [quiet(2), quiet(2)] }).integrated, -Infinity);
});

test("silences finds runs under the threshold, and only long enough ones", () => {
  const x = concat(sine(0.5, -6), quiet(0.2), sine(0.5, -6), quiet(0.05), sine(0.5, -6));
  const found = silences({ rate: RATE, channels: [x] });
  assert.equal(found.length, 1);
  assert.ok(Math.abs(found[0].start - 0.5) < 0.002 && Math.abs(found[0].end - 0.7) < 0.002);
});

test("a WAV written at its own level reads back the same", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "audio-test-"));
  try {
    const file = path.join(dir, "t.wav");
    const left = sine(0.1, -12);
    const right = sine(0.1, -30, 440);
    writeWav(file, { rate: RATE, channels: [left, right] });
    const back = readWav(file);
    assert.equal(back.rate, RATE);
    assert.equal(back.channels.length, 2);
    assert.ok(back.channels[0].every((v, i) => Math.abs(v - left[i]) < 1e-4));
    assert.ok(back.channels[1].every((v, i) => Math.abs(v - right[i]) < 1e-4));
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("a video is named by its composition or its folder, either way round", () => {
  for (const [id, folder] of [
    ["WhyNormalization", "why-normalization"],
    ["CPointers", "c-pointers"],
    ["TfIdf", "tf-idf"],
    ["LlmTemperature", "llm-temperature"],
  ]) {
    assert.equal(folderOf(id), folder);
    assert.equal(compositionOf(folder), id);
    assert.deepEqual(videoNames(id), { id, folder });
    assert.deepEqual(videoNames(folder), { id, folder });
  }
});

test("every registered video resolves from its id and from its folder", () => {
  const videos = registry();
  assert.ok(videos.length > 20, `only ${videos.length} videos found in Root.tsx`);
  for (const { id, folder } of videos) {
    assert.ok(existsSync(new URL(`../../src/videos/${folder}/Video.tsx`, import.meta.url)), `${id}: no ${folder}/Video.tsx`);
    assert.deepEqual(videoNames(id), { id, folder });
    assert.deepEqual(videoNames(folder), { id, folder });
  }
  // An id that does not follow its folder's name is found through the registry.
  assert.deepEqual(videoNames("Stats-1-ThinkingStatistically", [{ id: "Stats-1-ThinkingStatistically", folder: "thinking-statistically" }]), {
    id: "Stats-1-ThinkingStatistically",
    folder: "thinking-statistically",
  });
  // So is the name the id was before it was prefixed.
  assert.deepEqual(videoNames("ThinkingStatistically", [{ id: "Stats-1-ThinkingStatistically", folder: "thinking-statistically" }]), {
    id: "Stats-1-ThinkingStatistically",
    folder: "thinking-statistically",
  });
  assert.deepEqual(videoNames("thinking-statistically", [{ id: "Stats-1-ThinkingStatistically", folder: "thinking-statistically" }]), {
    id: "Stats-1-ThinkingStatistically",
    folder: "thinking-statistically",
  });
});
