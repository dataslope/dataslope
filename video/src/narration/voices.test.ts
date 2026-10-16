// Run with `npm test` (node --test; Node strips the types).
//
// A script names its narrator, and its committed audio has to be that voice:
// changing `voice` without running `npm run narrate` would leave the video
// speaking in the old one, with nothing on screen to say so.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { NarrationAlignmentFile, NarrationScript } from "./types.ts";
import { VOICES, voiceId } from "./voices.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VIDEOS = join(ROOT, "src", "videos");

async function voiced() {
  const out: { video: string; script: NarrationScript; alignment: NarrationAlignmentFile }[] = [];
  for (const video of readdirSync(VIDEOS).sort()) {
    const { script } = (await import(pathToFileURL(join(VIDEOS, video, "script.ts")).href)) as {
      script: NarrationScript;
    };
    const path = join(ROOT, "public", "narration", script.id, "alignment.json");
    if (existsSync(path)) out.push({ video, script, alignment: JSON.parse(readFileSync(path, "utf8")) });
  }
  return out;
}

test("the house voices are distinct", () => {
  const ids = Object.values(VOICES).map((v) => v.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every voiced video is in the voice its script names", async () => {
  for (const { video, script, alignment } of await voiced()) {
    assert.equal(
      alignment.meta?.voice_id,
      voiceId(script.voice),
      `${video}: script names ${script.voice ?? "the default"}, audio is ${alignment.meta?.voice_id}`,
    );
  }
});

test("every voiced video keeps the take its beats were cut from", async () => {
  for (const { video, script } of await voiced()) {
    const dir = join(ROOT, "takes", script.id);
    assert.ok(existsSync(join(dir, "take.mp3")), `${video}: no takes/${script.id}/take.mp3`);
    const take = JSON.parse(readFileSync(join(dir, "take.json"), "utf8"));
    assert.equal(take.voice_id, voiceId(script.voice), `${video}: the take is in another voice`);
  }
});
