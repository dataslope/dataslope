#!/usr/bin/env node
/**
 * Lists every word cue a beat says more than once with no `nth`, and every
 * literal cue whose beat doesn't say its phrase (lib/cue-scan.mjs says why).
 * No render, a second or two:
 *
 *   npm run check:cues
 *
 * Exits non-zero if it finds either. `npm test` runs the same scan.
 */
import { scanCues } from "./lib/cue-scan.mjs";

const { ambiguous, missing } = await scanCues();
for (const c of missing) console.log(`  ✗ ${c.file}:${c.line}  beat "${c.beat}" never says "${c.phrase}"`);
for (const c of ambiguous) {
  console.log(`  ✗ ${c.file}:${c.line}  beat "${c.beat}" says "${c.phrase}" ${c.times} times; give the cue { nth } (1 to ${c.times})`);
}
if (ambiguous.length || missing.length) process.exit(1);
console.log("✓ every word cue names a phrase its beat says, and says which one");
