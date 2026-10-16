#!/usr/bin/env node
/**
 * Generates a video's voice-over with ElevenLabs: one MP3 per beat, plus the
 * character alignment that re-times every cue to the real voice
 * (public/narration/<script id>/alignment.json, see "Adding the voice-over"
 * in README.md).
 *
 *   node scripts/narrate.mjs <video>                 every beat not yet voiced
 *   node scripts/narrate.mjs <video> --only n,star   just these beats
 *   node scripts/narrate.mjs <video> --force         re-voice every beat
 *   node scripts/narrate.mjs <video> --dry-run       list what would be sent
 *
 * Options: --voice <voice_id>, --model <model_id>. Both default to what the
 * video was last voiced with (recorded in alignment.json), then to the
 * defaults below, so re-voicing one edited beat keeps the same voice.
 *
 * Reads ELEVENLABS_API_KEY from the environment and never writes it anywhere.
 * Imports the TypeScript script directly, so it needs a Node that strips types
 * by default (22.18 or later).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Matilda: a premade ElevenLabs voice tagged for educational narration. */
const DEFAULT_VOICE = "XrExE9yKIg1WjnnlVkGX";
const DEFAULT_MODEL = "eleven_v4_turbo";
const OUTPUT_FORMAT = "mp3_44100_128";
const API = "https://api.elevenlabs.io/v1";

const VIDEO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const video = args.find((a) => !a.startsWith("--") && !isOptionValue(a));
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
function isOptionValue(a) {
  const i = args.indexOf(a);
  return i > 0 && ["--only", "--voice", "--model"].includes(args[i - 1]);
}

if (!video) {
  console.error("Usage: node scripts/narrate.mjs <video> [--only ids] [--force] [--dry-run] [--voice id] [--model id]");
  process.exit(1);
}

const { script } = await import(pathToFileURL(join(VIDEO_ROOT, "src", "videos", video, "script.ts")).href);
const outDir = join(VIDEO_ROOT, "public", "narration", script.id);
const alignmentPath = join(outDir, "alignment.json");
const existing = existsSync(alignmentPath) ? JSON.parse(readFileSync(alignmentPath, "utf8")) : { beats: {} };
const voice = value("--voice") ?? existing.meta?.voice_id ?? DEFAULT_VOICE;
const model = value("--model") ?? existing.meta?.model_id ?? DEFAULT_MODEL;
const voiceChanged = existing.meta && (existing.meta.voice_id !== voice || existing.meta.model_id !== model);

const only = value("--only")?.split(",");
if (only && voiceChanged) {
  console.error("A new voice or model re-voices every beat, so a video never mixes two. Drop --only.");
  process.exit(1);
}
const unknown = only?.filter((id) => !script.beats.some((b) => b.id === id)) ?? [];
if (unknown.length) {
  console.error(`No beat named ${unknown.join(", ")} in ${video}.`);
  process.exit(1);
}

/** A beat needs voicing when asked for, or when its audio is missing or was
 *  made from different text. A new voice or model re-voices everything, so a
 *  video never mixes two voices. */
const todo = script.beats.filter((beat) => {
  if (only) return only.includes(beat.id);
  const entry = existing.beats[beat.id];
  return (
    flag("--force") ||
    voiceChanged ||
    !entry ||
    entry.text !== beat.text ||
    !existsSync(join(VIDEO_ROOT, "public", entry.audio))
  );
});

console.log(`${video}: ${todo.length} of ${script.beats.length} beats to voice (voice ${voice}, model ${model})`);
if (flag("--dry-run") || todo.length === 0) {
  for (const b of todo) console.log(`  · ${b.id.padEnd(14)} ${b.text}`);
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set.");
  process.exit(1);
}

async function speak(beat) {
  const i = script.beats.indexOf(beat);
  const body = {
    text: beat.text,
    model_id: model,
    // The neighbouring beats, so the intonation runs on across the cut.
    previous_text: script.beats[i - 1]?.text,
    next_text: script.beats[i + 1]?.text,
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/text-to-speech/${voice}/with-timestamps?output_format=${OUTPUT_FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res.json();
    const retry = res.status === 429 || res.status >= 500;
    if (!retry || attempt === 4) throw new Error(`${beat.id}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

mkdirSync(outDir, { recursive: true });
const beats = voiceChanged ? {} : { ...existing.beats };
for (const beat of todo) {
  const r = await speak(beat);
  const alignment = r.alignment;
  // The timeline only trusts alignment made from the beat's exact text.
  if (alignment.characters.join("") !== beat.text) {
    throw new Error(`${beat.id}: the alignment does not spell the beat's text, so it cannot be used`);
  }
  const audio = `narration/${script.id}/${beat.id}.mp3`;
  writeFileSync(join(VIDEO_ROOT, "public", audio), Buffer.from(r.audio_base64, "base64"));
  beats[beat.id] = { text: beat.text, audio, alignment };
  const seconds = alignment.character_end_times_seconds.at(-1);
  console.log(`  ✓ ${beat.id.padEnd(14)} ${seconds.toFixed(2)} s`);
  // Saved after every beat, so an interrupted run keeps what it paid for.
  writeFileSync(alignmentPath, JSON.stringify({ meta: { voice_id: voice, model_id: model }, beats }, null, 2) + "\n");
}

const stale = script.beats.filter((b) => beats[b.id]?.text !== b.text).map((b) => b.id);
if (stale.length) console.log(`Still on estimated timing: ${stale.join(", ")}`);
console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
