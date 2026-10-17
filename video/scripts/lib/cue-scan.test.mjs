// Run with `npm test` (node --test; Node strips the types). The same scan as
// `npm run check:cues`: every literal word cue names a phrase its beat says,
// and says which occurrence when the beat says it more than once.
import assert from "node:assert/strict";
import { test } from "node:test";
import { scanCues } from "./cue-scan.mjs";

test("every word cue names a phrase its beat says, and which occurrence", async () => {
  const { ambiguous, missing } = await scanCues();
  const lines = [
    ...missing.map((c) => `${c.file}:${c.line} beat "${c.beat}" never says "${c.phrase}"`),
    ...ambiguous.map((c) => `${c.file}:${c.line} beat "${c.beat}" says "${c.phrase}" ${c.times} times; give it { nth }`),
  ];
  assert.deepEqual(lines, []);
});
