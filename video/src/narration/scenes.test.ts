// Run with `npm test` (node --test; Node strips the types).
//
// A cut that follows its scene's last word by an ordinary beat pause leaves
// the finished scene on screen for a third of a second or less, which is
// what every video did before `Beat.scene` existed. These tests keep each
// Video.tsx and its script in step: a beat a video cuts to must be marked as
// opening a scene, and the timeline must then hold the silence before it.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildTimeline, DEFAULT_SCENE_GAP } from "./timeline.ts";
import type { NarrationScript } from "./types.ts";

const VIDEOS = join(dirname(fileURLToPath(import.meta.url)), "..", "videos");

const videos = readdirSync(VIDEOS).sort();

test("every beat a video cuts to is marked as opening a scene", async () => {
  for (const video of videos) {
    const source = readFileSync(join(VIDEOS, video, "Video.tsx"), "utf8");
    const { script } = (await import(pathToFileURL(join(VIDEOS, video, "script.ts")).href)) as {
      script: NarrationScript;
    };
    const cuts = new Set([...source.matchAll(/cut\("([a-z0-9-]+)"\)/g)].map((m) => m[1]));
    for (const id of cuts) {
      const beat = script.beats.find((b) => b.id === id);
      assert.ok(beat, `${video}: cut("${id}") names no beat`);
      assert.equal(beat.scene, true, `${video}: beat "${id}" opens a scene but is not marked \`scene: true\``);
    }
  }
});

test("the timeline holds the scene gap before every scene-opening beat", async () => {
  for (const video of videos) {
    const { script } = (await import(pathToFileURL(join(VIDEOS, video, "script.ts")).href)) as {
      script: NarrationScript;
    };
    const gap = script.sceneGap ?? DEFAULT_SCENE_GAP;
    const t = buildTimeline(script, null);
    t.beats.forEach((beat, i) => {
      if (i === 0 || !script.beats[i].scene) return;
      const silence = beat.start - t.beats[i - 1].end;
      assert.ok(silence >= gap - 1e-9, `${video}: only ${silence.toFixed(2)} s before scene "${beat.id}"`);
    });
  }
});
