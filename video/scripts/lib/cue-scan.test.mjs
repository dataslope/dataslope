// Run with `npm test` (node --test; Node strips the types). The same scan as
// `npm run check:cues`: every literal word cue names a phrase its beat says,
// and says which occurrence when the beat says it more than once.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cuesIn, scanCues } from "./cue-scan.mjs";

test("every word cue names a phrase its beat says, and which occurrence", async () => {
  const { ambiguous, missing } = await scanCues();
  const lines = [
    ...missing.map((c) => `${c.file}:${c.line} beat "${c.beat}" never says "${c.phrase}"`),
    ...ambiguous.map((c) => `${c.file}:${c.line} beat "${c.beat}" says "${c.phrase}" ${c.times} times; give it { nth }`),
  ];
  assert.deepEqual(lines, []);
});

const pairs = (src) => cuesIn(src).map((c) => [c.beat, c.phrase]);

test("literal cues, the rapid rounds' c.w, and their options", () => {
  const src = 'n.word("a", "one"); c.w("b", "two", { nth: 2 }); n.word(x, "skipped");';
  assert.deepEqual(pairs(src), [["a", "one"], ["b", "two"]]);
  assert.equal(cuesIn(src)[1].options.trim(), "nth: 2");
});

test("a wrapper that names its beat makes each call a cue on that beat", () => {
  const src = 'const w = (p: string) => n.word("ai", p);\nconst at = w("Evaluating");\nconst b = w("judge", { nth: 1 });';
  assert.deepEqual(pairs(src), [["ai", "Evaluating"], ["ai", "judge"]]);
});

test("a wrapper that passes both on makes each two-string call a cue", () => {
  const src = 'const w: Words = (b, p) => n.word(b, p);\nconst at = w("r-cov", "Covariance tracks");';
  assert.deepEqual(pairs(src), [["r-cov", "Covariance tracks"]]);
});
