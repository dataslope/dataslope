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
import { NARRATION_MODEL, VOICES, voiceId } from "./voices.ts";

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

/** A voiced video's kept takes: take.json from before scripts were split
 *  into takes, or take-1.json, take-2.json … (scripts/narrate.mjs). */
function takes(id: string) {
  const dir = join(ROOT, "takes", id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /^take(-\d+)?\.json$/.test(f))
    .map((f) => ({ file: f, mp3: existsSync(join(dir, f.replace(/\.json$/, ".mp3"))), ...JSON.parse(readFileSync(join(dir, f), "utf8")) }));
}

test("every voiced video keeps the takes its beats were cut from", async () => {
  for (const { video, script } of await voiced()) {
    const kept = takes(script.id);
    assert.ok(kept.length, `${video}: no takes in takes/${script.id}/`);
    for (const take of kept) {
      assert.ok(take.mp3, `${video}: takes/${script.id}/${take.file} has no audio beside it`);
      assert.equal(take.voice_id, voiceId(script.voice), `${video}: ${take.file} is in another voice`);
    }
  }
});

test("every narration is recorded on the house model (eleven_v4_turbo)", async () => {
  for (const { video, script, alignment } of await voiced()) {
    assert.equal(alignment.meta?.model_id, NARRATION_MODEL, `${video}: its audio is on ${alignment.meta?.model_id}`);
    for (const take of takes(script.id)) assert.equal(take.model_id, NARRATION_MODEL, `${video}: ${take.file} is on ${take.model_id}`);
  }
});
