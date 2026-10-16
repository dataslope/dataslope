#!/usr/bin/env node
/**
 * Generates the sound effects described in sfx/elevenlabs.json with the
 * ElevenLabs sound-generation API, into public/sfx/el-<name>.wav: trimmed of
 * the silence the model leaves at either end, normalized to a 0 dBFS peak
 * (<Sfx level> sets the mix level), and indexed in sounds.json beside the
 * synthesized palette (scripts/sfx.mjs).
 *
 *   npm run sfx:elevenlabs               # generate only the sounds not on disk
 *   npm run sfx:elevenlabs -- --only tap # generate these again (costs credits)
 *   npm run sfx:elevenlabs -- --dry-run  # what it would generate, no API call
 *
 * Generation is billed in credits, so a sound already on disk is never
 * generated again unless --only names it; edit a prompt and the run says the
 * file is stale rather than spending on it. Measured 2026-10-16: 14 credits
 * for a 2.5 s sound. sfx/elevenlabs.lock.json records the prompt each file
 * was made from. Needs ELEVENLABS_API_KEY.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodeWav, indexSounds, SR } from "./lib/wav.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFS = join(ROOT, "sfx", "elevenlabs.json");
const LOCK = join(ROOT, "sfx", "elevenlabs.lock.json");
const RAW = join(ROOT, ".generated", "sfx");
const OUT = join(ROOT, "public", "sfx");

const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1].split(",") : null;
const defs = JSON.parse(readFileSync(DEFS, "utf8"));
const lock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : {};
const same = (a, b) => a && b && a.prompt === b.prompt && a.seconds === b.seconds && a.influence === b.influence;

const todo = Object.keys(defs).filter((name) => (only ? only.includes(name) : !existsSync(join(OUT, `el-${name}.wav`))));
for (const name of Object.keys(defs)) {
  if (!todo.includes(name) && existsSync(join(OUT, `el-${name}.wav`)) && !same(defs[name], lock[name])) {
    console.warn(`  ! el-${name}: its prompt changed since it was generated; --only ${name} to regenerate`);
  }
}
if (!todo.length) {
  console.log("Nothing to generate.");
  process.exit(0);
}
console.log(`${dry ? "Would generate" : "Generating"} ${todo.length}: ${todo.join(", ")} (${todo.reduce((s, n) => s + defs[n].seconds, 0).toFixed(1)} s)`);
if (dry) process.exit(0);
if (!process.env.ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not set");

mkdirSync(RAW, { recursive: true });
for (const name of todo) {
  const { prompt, seconds, influence } = defs[name];
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ text: prompt, duration_seconds: seconds, prompt_influence: influence }),
  });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  const mp3 = join(RAW, `${name}.mp3`);
  writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
  const { bytes, seconds: kept } = encodeWav(trim(decode(mp3)));
  writeFileSync(join(OUT, `el-${name}.wav`), bytes);
  lock[name] = { prompt, seconds, influence };
  console.log(`  ✓ el-${name}  ${kept.toFixed(2)} s`);
}
writeFileSync(LOCK, JSON.stringify(lock, null, 2) + "\n");
indexSounds(OUT);

/** The MP3 as two float channels at the palette's rate. */
function decode(path) {
  const r = spawnSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-ac", "2", "-ar", String(SR), "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"], {
    cwd: ROOT,
    maxBuffer: 1 << 28,
    shell: process.platform === "win32",
  });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
  const wav = r.stdout;
  let at = 12;
  while (wav.toString("ascii", at, at + 4) !== "data") at += 8 + wav.readUInt32LE(at + 4);
  const pcm = wav.subarray(at + 8);
  const n = pcm.length >> 2;
  const l = new Float64Array(n);
  const rr = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    l[i] = pcm.readInt16LE(i * 4) / 32768;
    rr[i] = pcm.readInt16LE(i * 4 + 2) / 32768;
  }
  return [l, rr];
}

/** Cuts the near-silence the model pads either end with: from 5 ms before the
 *  first sample within 40 dB of the peak to 30 ms after the last within 60 dB. */
function trim([l, r]) {
  const amp = (i) => Math.max(Math.abs(l[i]), Math.abs(r[i]));
  let peak = 0;
  for (let i = 0; i < l.length; i++) peak = Math.max(peak, amp(i));
  let a = 0;
  while (a < l.length && amp(a) < peak * 0.01) a++;
  let b = l.length - 1;
  while (b > a && amp(b) < peak * 0.001) b--;
  a = Math.max(0, a - Math.round(0.005 * SR));
  b = Math.min(l.length, b + Math.round(0.03 * SR));
  return [l.slice(a, b), r.slice(a, b)];
}
