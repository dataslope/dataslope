// Run with `npm test` (node --test; Node strips the types).
//
// The sound effects are generated files that <Sfx> addresses by name, and
// sounds.json is both its type and its record of each file's length. If the
// two drift (a sound renamed, regenerated longer, or deleted), a Sequence is
// sized wrong or a render fails on a missing file.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SFX = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "sfx");
const listed: Record<string, number> = JSON.parse(readFileSync(join(SFX, "sounds.json"), "utf8"));

test("sounds.json lists exactly the sound files", () => {
  const files = readdirSync(SFX)
    .filter((f) => f.endsWith(".wav"))
    .map((f) => f.slice(0, -4))
    .sort();
  assert.deepEqual(files, Object.keys(listed).sort());
});

test("every sound is a 44.1 kHz 16-bit stereo WAV of the length listed", () => {
  for (const [name, seconds] of Object.entries(listed)) {
    const wav = readFileSync(join(SFX, `${name}.wav`));
    assert.equal(wav.toString("ascii", 0, 4), "RIFF", name);
    assert.equal(wav.readUInt16LE(22), 2, `${name}: channels`);
    assert.equal(wav.readUInt32LE(24), 44100, `${name}: sample rate`);
    assert.equal(wav.readUInt16LE(34), 16, `${name}: bits`);
    const length = wav.readUInt32LE(40) / 4 / 44100;
    assert.ok(Math.abs(length - seconds) < 0.002, `${name}: ${length} s, listed as ${seconds} s`);
  }
});
