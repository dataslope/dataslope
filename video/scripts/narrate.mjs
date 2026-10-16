#!/usr/bin/env node
/**
 * Generates a video's voice-over with ElevenLabs: one MP3 per beat, plus the
 * character alignment that re-times every cue to the real voice
 * (public/narration/<script id>/alignment.json, see "Adding the voice-over"
 * in README.md).
 *
 *   node scripts/narrate.mjs <video>                 voice what is missing
 *   node scripts/narrate.mjs <video> --only n,star   just these beats
 *   node scripts/narrate.mjs <video> --force         a whole new take
 *   node scripts/narrate.mjs <video> --dry-run       show what would be sent
 *
 * When every beat needs voicing (a first run, a new voice, or --force), the
 * whole script goes to the voice as ONE take and is cut into beats afterwards,
 * at the quietest point of each pause between them. A take reads like a person
 * reading a page: one breath runs into the next sentence, a question lifts
 * and the answer comes down, and the energy holds from start to finish. Beats
 * voiced one request at a time each start cold, with the same contour, which
 * is most of what makes narration sound synthetic. The raw take is kept in
 * .generated/narration/<script id>/.
 *
 * When only some beats changed, those are re-voiced one at a time, each sent
 * with its neighbours as context, so a one-line edit doesn't re-record the
 * rest. Use --force for a fresh take of the lot.
 *
 * Options: --voice <voice_id>, --model <model_id>. Both default to what the
 * video was last voiced with (recorded in alignment.json), then to the
 * defaults below, so re-voicing one edited beat keeps the same voice.
 *
 * Reads ELEVENLABS_API_KEY from the environment and never writes it anywhere.
 * Cuts audio with the ffmpeg Remotion ships. Imports the TypeScript script
 * directly, so it needs a Node that strips types by default (22.18 or later).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Drew (casual, curious, fun): a professional voice made for tutorials. */
const DEFAULT_VOICE = "q0IMILNRPxOgtBTS4taI";
const DEFAULT_MODEL = "eleven_v4_turbo";
const OUTPUT_FORMAT = "mp3_44100_128";
const API = "https://api.elevenlabs.io/v1";
const SAMPLE_RATE = 44100;
/** The most breath and onset a beat cut from a take keeps before its first
 *  word, and the most decay after its last. ElevenLabs' character times are
 *  only good to about 80 ms, so these are generous. */
const MAX_LEAD = 0.45;
const MAX_TAIL = 0.3;
/** A short fade at every cut, so no slice starts or ends on a click. */
const FADE = 0.008;

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
const takeDir = join(VIDEO_ROOT, ".generated", "narration", script.id);
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
const asTake = !only && todo.length === script.beats.length;

/** The take: beats run on with a space, and a beat that opens a scene starts
 *  a new paragraph, which the voice reads as a bigger turn. `spans` are each
 *  beat's characters in it. */
function takeText() {
  let text = "";
  const spans = [];
  script.beats.forEach((beat, i) => {
    if (i) text += beat.scene ? "\n\n" : " ";
    spans.push([text.length, text.length + beat.text.length]);
    text += beat.text;
  });
  return { text, spans };
}

console.log(
  `${video}: ${todo.length} of ${script.beats.length} beats to voice ` +
    `${asTake ? "as one take" : "one at a time"} (voice ${voice}, model ${model})`,
);
if (flag("--dry-run") || todo.length === 0) {
  if (asTake) console.log(`\n${takeText().text}\n`);
  else for (const b of todo) console.log(`  · ${b.id.padEnd(14)} ${b.text}`);
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  console.error("ELEVENLABS_API_KEY is not set.");
  process.exit(1);
}

async function tts(body, label) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}/text-to-speech/${voice}/with-timestamps?output_format=${OUTPUT_FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, model_id: model }),
    });
    if (res.ok) {
      const r = await res.json();
      // The timeline only trusts alignment made from the exact text.
      if (r.alignment.characters.join("") !== body.text) {
        throw new Error(`${label}: the alignment does not spell the text sent, so it cannot be used`);
      }
      return r;
    }
    const retry = res.status === 429 || res.status >= 500;
    if (!retry || attempt === 4) throw new Error(`${label}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

/** Remotion's own ffmpeg, so the package needs no system install. */
function ffmpeg(ffArgs, input) {
  const win = process.platform === "win32";
  const quoted = ffArgs.map((a) => (win && /\s/.test(a) ? `"${a}"` : a));
  const r = spawnSync(win ? "npx.cmd" : "npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...quoted], {
    cwd: VIDEO_ROOT,
    input,
    maxBuffer: 1 << 30,
    shell: win,
  });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${r.stderr}`);
  return r.stdout;
}

/** Decodes an MP3 to mono 16-bit samples. A WAV written to a pipe can't
 *  record its own length, so the samples are simply everything after the
 *  header's data chunk id. */
function decode(path) {
  const wav = ffmpeg(["-i", path, "-c:a", "pcm_s16le", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "wav", "pipe:1"]);
  let at = 12;
  while (wav.toString("ascii", at, at + 4) !== "data") at += 8 + wav.readUInt32LE(at + 4);
  const bytes = wav.subarray(at + 8);
  const samples = new Int16Array(bytes.length >> 1);
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readInt16LE(i * 2);
  return samples;
}

/** Writes samples [from, to) as an MP3, faded in and out at the cuts. */
function encode(samples, from, to, path) {
  const n = to - from;
  const fade = Math.round(FADE * SAMPLE_RATE);
  const out = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / fade, (n - 1 - i) / fade);
    out.writeInt16LE(Math.round(samples[from + i] * g), i * 2);
  }
  // To a file rather than a pipe: only a seekable output gets the LAME
  // header that tells players to skip the encoder's own leading silence.
  ffmpeg(["-f", "s16le", "-ar", String(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-q:a", "2", path], out);
}

/** Where to cut between two beats, in [lo, hi) seconds: the middle of the
 *  longest quiet stretch, which is the pause between the sentences. The
 *  single quietest instant could be the closure of a "t" inside a word.
 *  Quiet is 10 ms below 3% of the take's loudest 10 ms. */
function cutPoint(samples, lo, hi, loudest) {
  const frame = Math.round(0.01 * SAMPLE_RATE);
  const a = Math.max(0, Math.round(lo * SAMPLE_RATE));
  const b = Math.min(samples.length, Math.round(hi * SAMPLE_RATE));
  let best = null;
  let run = null;
  for (let t = a; t + frame <= b; t += frame) {
    if (rms(samples, t, frame) < 0.03 * loudest) {
      run = run ? { from: run.from, to: t + frame } : { from: t, to: t + frame };
      if (!best || run.to - run.from > best.to - best.from) best = run;
    } else run = null;
  }
  return best ? (best.from + best.to) / 2 / SAMPLE_RATE : (lo + hi) / 2;
}

function rms(samples, from, n) {
  let e = 0;
  for (let k = 0; k < n; k++) e += samples[from + k] * samples[from + k];
  return Math.sqrt(e / n);
}

/** Index of the first or last letter in [s, e) that is spoken, skipping any
 *  audio tag such as [curious]. */
function letterAt(text, s, e, last) {
  let depth = 0;
  const found = [];
  for (let i = s; i < e; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[a-z0-9]/i.test(text[i])) found.push(i);
  }
  return last ? found.at(-1) : found[0];
}

async function voiceTake() {
  const { text, spans } = takeText();
  const r = await tts({ text }, "take");
  mkdirSync(takeDir, { recursive: true });
  const takePath = join(takeDir, "take.mp3");
  writeFileSync(takePath, Buffer.from(r.audio_base64, "base64"));
  writeFileSync(join(takeDir, "take.json"), JSON.stringify({ voice_id: voice, model_id: model, text, alignment: r.alignment }, null, 2) + "\n");
  const { character_start_times_seconds: starts, character_end_times_seconds: ends } = r.alignment;
  const samples = decode(takePath);
  const length = samples.length / SAMPLE_RATE;
  console.log(`  take: ${length.toFixed(2)} s, ${text.length} characters`);

  const onset = spans.map(([s, e]) => starts[letterAt(text, s, e, false)]);
  const lastLetter = spans.map(([s, e]) => starts[letterAt(text, s, e, true)]);
  const end = spans.map(([, e]) => ends[e - 1]);
  // Each cut sits in the quietest part of the pause between two beats: from
  // just after the last letter starts to just after the next one starts,
  // which covers the pause even where the character times are off.
  const frame = Math.round(0.01 * SAMPLE_RATE);
  let loudest = 0;
  for (let t = 0; t + frame <= samples.length; t += frame) loudest = Math.max(loudest, rms(samples, t, frame));
  const cuts = spans
    .slice(1)
    .map((_, i) => cutPoint(samples, lastLetter[i] + 0.06, Math.max(onset[i + 1] + 0.06, lastLetter[i] + 0.1), loudest));
  const leadIn = script.leadIn ?? 0.6;

  const beats = {};
  script.beats.forEach((beat, i) => {
    const from = i === 0 ? Math.max(0, onset[0] - Math.min(MAX_LEAD, leadIn)) : Math.max(cuts[i - 1], onset[i] - MAX_LEAD);
    const to = i === spans.length - 1 ? Math.min(length, end[i] + MAX_TAIL) : Math.min(cuts[i], end[i] + MAX_TAIL);
    const audio = `narration/${script.id}/${beat.id}.mp3`;
    encode(samples, Math.round(from * SAMPLE_RATE), Math.round(to * SAMPLE_RATE), join(VIDEO_ROOT, "public", audio));
    const [s, e] = spans[i];
    const rebase = (t) => Math.round((t - from) * 1000) / 1000;
    beats[beat.id] = {
      text: beat.text,
      audio,
      alignment: {
        characters: r.alignment.characters.slice(s, e),
        character_start_times_seconds: starts.slice(s, e).map(rebase),
        character_end_times_seconds: ends.slice(s, e).map(rebase),
      },
    };
    console.log(`  ✓ ${beat.id.padEnd(14)} ${from.toFixed(2)} → ${to.toFixed(2)} s of the take`);
  });
  writeFileSync(alignmentPath, JSON.stringify({ meta: { voice_id: voice, model_id: model }, beats }, null, 2) + "\n");
  return beats;
}

async function voiceBeats() {
  const beats = { ...existing.beats };
  for (const beat of todo) {
    const i = script.beats.indexOf(beat);
    const r = await tts(
      {
        text: beat.text,
        // The neighbouring beats, so the intonation runs on across the cut.
        previous_text: script.beats[i - 1]?.text,
        next_text: script.beats[i + 1]?.text,
      },
      beat.id,
    );
    const audio = `narration/${script.id}/${beat.id}.mp3`;
    writeFileSync(join(VIDEO_ROOT, "public", audio), Buffer.from(r.audio_base64, "base64"));
    beats[beat.id] = { text: beat.text, audio, alignment: r.alignment };
    console.log(`  ✓ ${beat.id.padEnd(14)} ${r.alignment.character_end_times_seconds.at(-1).toFixed(2)} s`);
    // Saved after every beat, so an interrupted run keeps what it paid for.
    writeFileSync(alignmentPath, JSON.stringify({ meta: { voice_id: voice, model_id: model }, beats }, null, 2) + "\n");
  }
  return beats;
}

mkdirSync(outDir, { recursive: true });
const beats = asTake ? await voiceTake() : await voiceBeats();

const stale = script.beats.filter((b) => beats[b.id]?.text !== b.text).map((b) => b.id);
if (stale.length) console.log(`Still on estimated timing: ${stale.join(", ")}`);
console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
