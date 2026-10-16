import assert from "node:assert/strict";
import { test } from "node:test";
import { staticSpans } from "./motion.mjs";

const at4fps = (pattern) => [...pattern].map((c, i) => ({ t: (i + 1) / 4, changed: c === "m" ? 0.01 : 0 }));

test("staticSpans finds runs of still frames long enough to count", () => {
  // 1 s moving, 3.5 s still, 1 s moving, 1 s still, 1 s moving.
  const spans = staticSpans(at4fps("mmmm" + "s".repeat(14) + "mmmm" + "ssss" + "mmmm"));
  assert.equal(spans.length, 1);
  assert.equal(spans[0].start, 1);
  assert.equal(spans[0].end, 4.5);
});

test("a still stretch at the very end still counts", () => {
  const spans = staticSpans(at4fps("mmmm" + "s".repeat(16)));
  assert.deepEqual(spans, [{ start: 1, end: 5 }]);
});

test("a picture that keeps changing has no still stretches", () => {
  assert.deepEqual(staticSpans(at4fps("m".repeat(40))), []);
});
