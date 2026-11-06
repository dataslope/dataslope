// Run with `npm test` (node --test; Node strips the types).
//
// No video opens on <SeriesIntro> today: each course and interview track is
// uploaded as one merged video, with an opener added in the edit (the logo
// reveals, src/reveals/). The intro is kept for when one is wanted. Its
// timing still has to come from one place: a script that waits for an intro
// it no longer has opens on 4.6 s of silence, and one that opens on the intro
// with its own lead-in keeps its old number when the intro changes.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INTRO_LEAD_IN, INTRO_SECONDS } from "./intro.ts";

const VIDEOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "videos");

const opensOnIntro = (d: string) => {
  const video = path.join(VIDEOS, d, "Video.tsx");
  return existsSync(video) && readFileSync(video, "utf8").includes("<SeriesIntro");
};

test("the first word lands after the intro has finished", () => {
  assert.ok(INTRO_LEAD_IN >= INTRO_SECONDS, `INTRO_LEAD_IN ${INTRO_LEAD_IN} < INTRO_SECONDS ${INTRO_SECONDS}`);
});

test("a script waits for the series intro exactly when its video opens on it", async () => {
  for (const d of readdirSync(VIDEOS)) {
    const dir = path.join(VIDEOS, d);
    // A merged video (Unit 5) has no beats of its own; its plan places the first part.
    const plan = path.join(dir, "plan.ts");
    const file = existsSync(plan) ? plan : path.join(dir, "script.ts");
    if (!existsSync(file)) continue;
    const mod = await import(pathToFileURL(file).href);
    const leadIn = existsSync(plan) ? mod.FIRST_WORD : mod.script?.leadIn;
    const source = readFileSync(file, "utf8");
    if (opensOnIntro(d)) {
      assert.equal(leadIn, INTRO_LEAD_IN, `${d} opens on the intro, so its first word waits INTRO_LEAD_IN`);
      assert.match(source, /INTRO_LEAD_IN/, `${d} types its own number for the intro's lead-in`);
    } else {
      assert.notEqual(leadIn, INTRO_LEAD_IN, `${d} waits ${INTRO_LEAD_IN} s for an intro it does not open on`);
    }
  }
});
