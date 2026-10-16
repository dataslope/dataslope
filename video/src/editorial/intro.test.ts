// Run with `npm test` (node --test; Node strips the types).
//
// Every course video opens on the shared <SeriesIntro>, so the intro's timing
// has to come from one place: a script that types its own lead-in keeps its
// old number when the intro changes, and its first word lands on the logo.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { INTRO_LEAD_IN, INTRO_SECONDS } from "./intro.ts";

const VIDEOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "videos");

/** Folders whose Video.tsx opens on the series intro. */
const courseVideos = readdirSync(VIDEOS).filter((d) => {
  const video = path.join(VIDEOS, d, "Video.tsx");
  return existsSync(video) && readFileSync(video, "utf8").includes("<SeriesIntro");
});

test("the first word lands after the intro has finished", () => {
  assert.ok(INTRO_LEAD_IN >= INTRO_SECONDS, `INTRO_LEAD_IN ${INTRO_LEAD_IN} < INTRO_SECONDS ${INTRO_SECONDS}`);
});

test("every video that opens on the series intro takes its lead-in from intro.ts", async () => {
  assert.ok(courseVideos.length > 0, "found no video that uses <SeriesIntro>");
  for (const d of courseVideos) {
    const dir = path.join(VIDEOS, d);
    // A merged video (Unit 5) has no beats of its own; its plan places the first part.
    const plan = path.join(dir, "plan.ts");
    if (existsSync(plan)) {
      const { FIRST_WORD } = await import(pathToFileURL(plan).href);
      assert.equal(FIRST_WORD, INTRO_LEAD_IN, `${d}/plan.ts: FIRST_WORD`);
      assert.match(readFileSync(plan, "utf8"), /FIRST_WORD = INTRO_LEAD_IN/, `${d}/plan.ts types its own number`);
      continue;
    }
    const file = path.join(dir, "script.ts");
    const { script } = await import(pathToFileURL(file).href);
    assert.equal(script.leadIn, INTRO_LEAD_IN, `${d}/script.ts: leadIn`);
    assert.match(readFileSync(file, "utf8"), /leadIn: INTRO_LEAD_IN/, `${d}/script.ts types its own number`);
  }
});
