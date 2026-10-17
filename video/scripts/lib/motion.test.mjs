import assert from "node:assert/strict";
import { test } from "node:test";
import { compareFrames, isStill, staticSpans } from "./motion.mjs";

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

// Synthetic 480x270 RGB frames on the editorial paper (about 254, 249, 233).
const W = 480;
const H = 270;
const paper = () => {
  const f = new Uint8Array(W * H * 3);
  for (let i = 0; i < f.length; i += 3) f.set([254, 249, 233], i);
  return f;
};
const paint = (f, x0, y0, w, h, rgb) => {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) f.set(rgb, (y * W + x) * 3);
  return f;
};
// The highlight (yellow-400 at 80%) at half the opacity it ends at: grey moves
// under 12 levels, the blue channel about 37.
const PALE_WASH = [255, 241, 196];

test("a pale highlight sweep counts as motion, though its grey barely changes", () => {
  const grey = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;
  assert.ok(Math.abs(grey(PALE_WASH) - grey([254, 249, 233])) < 12, "the wash is meant to be under the old grey bar");
  const d = compareFrames(paper(), paint(paper(), 100, 100, 120, 10, PALE_WASH));
  assert.ok(!isStill(d), `a 120x10 wash: ${JSON.stringify(d)}`);
});

test("a thin line drawing on counts as motion, though few pixels change", () => {
  // 20 more pixels of a dark ink line this frame: 0.015% of the picture.
  const d = compareFrames(paper(), paint(paper(), 50, 200, 20, 1, [40, 38, 34]));
  assert.ok(d.changed < 0.0005, "it is under the share of changed pixels");
  assert.ok(!isStill(d), `20 px of ink: ${JSON.stringify(d)}`);
});

test("a small soft shift, like an illustration's bob, is still", () => {
  const d = compareFrames(paper(), paint(paper(), 300, 50, 40, 1, [238, 233, 217]));
  assert.ok(isStill(d), `40 px moved by 16 levels: ${JSON.stringify(d)}`);
});
