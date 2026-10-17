// Run with `npm test` (node --test; Node strips the types).
import assert from "node:assert/strict";
import { test } from "node:test";
import { planTakes } from "./takes.ts";
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
