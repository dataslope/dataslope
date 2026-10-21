// Run with `npm test` (node --test; Node strips the types).
//
// Every course video shares one floor under the silence between beats, so it
// has to come from one place: a script that types its own number, or none,
// keeps running ideas together when the rest of the course slows down.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildTimeline } from "../narration/timeline.ts";
import { COURSE_MIN_PAUSE } from "./course.ts";

const VIDEOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "videos");

/** Folders whose Video.tsx opens on the series intro. */
const courseVideos = readdirSync(VIDEOS).filter((d) => {
  const video = path.join(VIDEOS, d, "Video.tsx");
  return existsSync(video) && readFileSync(video, "utf8").includes("<SeriesIntro");
});

/** The script files a course video plays: its own, or a merged video's parts. */
async function scriptFiles(dir: string): Promise<string[]> {
  const mod = await import(pathToFileURL(path.join(dir, "script.ts")).href);
  if (!Array.isArray(mod.PARTS)) return [path.join(dir, "script.ts")];
  return mod.PARTS.map(({ script }: { script: { id: string } }) => {
    const folder = readdirSync(VIDEOS).find((d) => {
      const f = path.join(VIDEOS, d, "script.ts");
      return existsSync(f) && new RegExp(`id: "${script.id}"`).test(readFileSync(f, "utf8"));
    });
    assert.ok(folder, `no folder holds the script "${script.id}"`);
    return path.join(VIDEOS, folder, "script.ts");
  });
}

test("every course script takes its pause floor from course.ts", async () => {
  assert.ok(courseVideos.length > 0, "found no video that uses <SeriesIntro>");
  for (const d of courseVideos) {
    for (const file of await scriptFiles(path.join(VIDEOS, d))) {
      const { script } = await import(pathToFileURL(file).href);
      const name = path.relative(VIDEOS, file);
      assert.equal(script.minPause, COURSE_MIN_PAUSE, `${name}: minPause`);
      assert.match(readFileSync(file, "utf8"), /minPause: COURSE_MIN_PAUSE/, `${name} types its own number`);
    }
  }
});

test("minPause is a floor under every beat's pauseAfter, never a ceiling", () => {
  const beats = [
    { id: "a", text: "One.", pauseAfter: 0.2 },
    { id: "b", text: "Two.", pauseAfter: 1.4 },
    { id: "c", text: "Three." },
  ];
  const t = buildTimeline({ id: "t", leadIn: 0, beats, minPause: 0.55 }, null);
  const gap = (i: number) => t.beats[i + 1].start - t.beats[i].end;
  assert.ok(Math.abs(gap(0) - 0.55) < 1e-9, `short pause raised to the floor: ${gap(0)}`);
  assert.ok(Math.abs(gap(1) - 1.4) < 1e-9, `long pause kept: ${gap(1)}`);
});
