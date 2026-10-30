// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { locateBeats, planTakes } from "./takes.ts";
import type { Beat } from "./types.ts";

const beat = (id: string, chars: number, extra: Partial<Beat> = {}): Beat => ({ id, text: "x".repeat(chars), ...extra });

test("scenes share a take until it would grow past takeChars", () => {
  const beats = [
    beat("a", 400, { scene: true }), beat("b", 400),
    beat("c", 400, { scene: true }), beat("d", 400),
    beat("e", 400, { scene: true }), beat("f", 400),
  ];
  // 802 + 802 = 1604 fits in 1800; adding the third scene's 802 would not.
  assert.deepEqual(planTakes({ beats }, 1800), [[0, 1, 2, 3], [4, 5]]);
});

test("a take only ever starts at a scene, however long the scene", () => {
  const beats = [beat("a", 3000, { scene: true }), beat("b", 3000), beat("c", 10, { scene: true })];
  assert.deepEqual(planTakes({ beats }, 1800), [[0, 1], [2]]);
});

test("a beat marked take always starts one", () => {
  const beats = [beat("a", 10, { scene: true }), beat("b", 10, { scene: true, take: true }), beat("c", 10)];
  assert.deepEqual(planTakes({ beats }, 1800), [[0], [1, 2]]);
});

test("a short script is one take", () => {
  const beats = [beat("a", 100, { scene: true }), beat("b", 100), beat("c", 100, { scene: true })];
  assert.deepEqual(planTakes({ beats }), [[0, 1, 2]]);
});

const words = (texts: string[]) => texts.map((text) => ({ text }));
const pieces = (text: string, beats: { text: string }[]) =>
  locateBeats(text, beats).map((s) => [s.beat, text.slice(s.start, s.end)]);

test("a take still matching the script is its beats, nothing else", () => {
  const text = "One two. Three four.\n\nFive six.";
  assert.deepEqual(pieces(text, words(["One two.", "Three four.", "Five six."])), [
    [0, "One two."],
    [1, "Three four."],
    [2, "Five six."],
  ]);
});

test("a beat split at a sentence break is found as its pieces", () => {
  const text = "One two. Three four. Five six.";
  assert.deepEqual(pieces(text, words(["One two.", "Three four.", "Five six."])).length, 3);
  assert.deepEqual(pieces(text, words(["One two. Three four.", "Five six."])), [
    [0, "One two. Three four."],
    [1, "Five six."],
  ]);
});

test("text reworded since is filler, and the beats around it keep their spans", () => {
  const text = "One two. Old words here. Five six.";
  assert.deepEqual(pieces(text, words(["One two.", "New words here.", "Five six."])), [
    [0, "One two."],
    [null, "Old words here."],
    [2, "Five six."],
  ]);
});

test("a beat matches only whole, between separators", () => {
  // "two." sits inside "One two." but is not a beat of this take.
  assert.deepEqual(pieces("One two. Three.", words(["two.", "Three."])), [
    [null, "One two."],
    [1, "Three."],
  ]);
});

test("beats from other takes are simply not found", () => {
  assert.deepEqual(pieces("Three four.", words(["One two.", "Three four.", "Five six."])), [[1, "Three four."]]);
});
