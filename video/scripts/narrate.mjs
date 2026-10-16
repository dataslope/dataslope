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
 *   node scripts/narrate.mjs <video> --recut         re-cut the kept take
 *   node scripts/narrate.mjs <video> --dry-run       show what would be sent
 *
 * When every beat needs voicing (a first run, a new voice, or --force), the
 * whole script goes to the voice as ONE take and is cut into beats afterwards,
 * at the quietest point of each pause between them. A take reads like a person
 * reading a page: one breath runs into the next sentence, a question lifts
 * and the answer comes down, and the energy holds from start to finish. Beats
 * voiced one request at a time each start cold, with the same contour, which
 * is most of what makes narration sound synthetic. The raw take is the master
 * and is committed, in takes/<script id>/.
 *
 * When only some beats changed, those are re-voiced one at a time, each sent
 * with its neighbours as context, so a one-line edit doesn't re-record the
 * rest. Use --force for a fresh take of the lot.
 *
 * The narrator is the script's `voice`, one of the house voices in
 * src/narration/voices.ts (Drew when it names none). --voice overrides it
 * for a trial, with a house name or any ElevenLabs voice id, and --model
 * overrides the model. A video is never left with two voices: a change of
 * either re-voices every beat.
 *
 * Reads ELEVENLABS_API_KEY from the environment and never writes it anywhere.
 * Cuts audio with the ffmpeg Remotion ships. Imports the TypeScript script
 * directly, so it needs a Node that strips types by default (22.18 or later).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
/** The shortest pause a cut is trusted to sit in. Below it, the longest
 *  quiet stretch may be the closure of a "t" inside a word. */
const MIN_PAUSE = 0.15;
/** How far outside the words' window to look for a pause they missed, in s. */
const PAUSE_SLACK = 0.8;

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
  console.error("Usage: node scripts/narrate.mjs <video> [--only ids] [--force] [--recut] [--dry-run] [--voice drew|hope|id] [--model id]");
  process.exit(1);
}

const { script } = await import(pathToFileURL(join(VIDEO_ROOT, "src", "videos", video, "script.ts")).href);
const { VOICES, NARRATION_MODEL, voiceId } = await import(
  pathToFileURL(join(VIDEO_ROOT, "src", "narration", "voices.ts")).href
);
const outDir = join(VIDEO_ROOT, "public", "narration", script.id);
const takeDir = join(VIDEO_ROOT, "takes", script.id);
const alignmentPath = join(outDir, "alignment.json");
const existing = existsSync(alignmentPath) ? JSON.parse(readFileSync(alignmentPath, "utf8")) : { beats: {} };
const asked = value("--voice");
const voice = asked ? (VOICES[asked]?.id ?? asked) : voiceId(script.voice);
const voiceName = Object.keys(VOICES).find((name) => VOICES[name].id === voice) ?? voice;
const model = value("--model") ?? NARRATION_MODEL;
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

if (flag("--recut")) {
  const take = keptTake();
  if (!take) {
    console.error(`No kept take of this text in this voice in ${takeDir}. Record one with --force.`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  console.log(`${video}: re-cutting the kept take (voice ${voiceName}, model ${model})`);
  cutTake(take);
  console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
  process.exit(0);
}

console.log(
  `${video}: ${todo.length} of ${script.beats.length} beats to voice ` +
    `${asTake ? "as one take" : "one at a time"} (voice ${voiceName}, model ${model})`,
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
  if (!best) return { at: (lo + hi) / 2, quiet: 0 };
  return { at: (best.from + best.to) / 2 / SAMPLE_RATE, quiet: (best.to - best.from) / SAMPLE_RATE };
}


/** The quiet run of at least MIN_PAUSE in [from, to] nearest the window
 *  [lo, hi] (the longer one on a tie), as { at: its middle, quiet: its length },
 *  or null if there is none. */
function nearestPause(samples, from, to, lo, hi, loudest) {
  const frame = Math.round(0.01 * SAMPLE_RATE);
  const a = Math.max(0, Math.round(from * SAMPLE_RATE));
  const b = Math.min(samples.length, Math.round(to * SAMPLE_RATE));
  const runs = [];
  let run = null;
  for (let t = a; t + frame <= b; t += frame) {
    if (rms(samples, t, frame) < 0.03 * loudest) run = run ? { ...run, to: t + frame } : { from: t, to: t + frame };
    else if (run) (runs.push(run), (run = null));
  }
  if (run) runs.push(run);
  let best = null;
  for (const r of runs) {
    const start = r.from / SAMPLE_RATE;
    const end = r.to / SAMPLE_RATE;
    if (end - start < MIN_PAUSE) continue;
    const gap = Math.max(0, lo - end, start - hi);
    if (!best || gap < best.gap || (gap === best.gap && end - start > best.quiet)) best = { at: (start + end) / 2, quiet: end - start, gap };
  }
  return best && { at: best.at, quiet: best.quiet };
}

function rms(samples, from, n) {
  let e = 0;
  for (let k = 0; k < n; k++) e += samples[from + k] * samples[from + k];
  return Math.sqrt(e / n);
}

/** Index of the first or last letter in [s, e) that is spoken, skipping any
 *  audio tag such as [curious]. */
/** The index of the first letter of the last spoken word in [s, e), or of
 *  the last letter of the first one. */
function wordEdge(text, s, e, last) {
  const inWord = (c) => /[a-z0-9'’-]/i.test(c ?? "");
  let i = letterAt(text, s, e, last);
  if (last) while (i > s && inWord(text[i - 1])) i--;
  else while (i < e - 1 && inWord(text[i + 1])) i++;
  return i;
}

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

/** Records a new take, keeping the raw audio and alignment so it can be
 *  re-cut later without paying for it again (--recut). */
async function recordTake() {
  const { text } = takeText();
  const r = await tts({ text }, "take");
  mkdirSync(takeDir, { recursive: true });
  writeFileSync(join(takeDir, "take.mp3"), Buffer.from(r.audio_base64, "base64"));
  const take = { voice_id: voice, model_id: model, text, alignment: r.alignment };
  writeFileSync(join(takeDir, "take.json"), JSON.stringify(take, null, 2) + "\n");
  return take;
}

/** The kept take, if it was recorded from this script's text in this voice. */
function keptTake() {
  const path = join(takeDir, "take.json");
  if (!existsSync(path)) return null;
  const take = JSON.parse(readFileSync(path, "utf8"));
  const same = take.text === takeText().text && take.voice_id === voice && take.model_id === model;
  return same ? take : null;
}

/** Cuts a take into one MP3 per beat, with each beat's alignment counted
 *  from the start of its own file. */
function cutTake(take) {
  const { text, spans } = takeText();
  const { characters } = take.alignment;
  const starts = [...take.alignment.character_start_times_seconds];
  const ends = [...take.alignment.character_end_times_seconds];
  const samples = decode(join(takeDir, "take.mp3"));
  const length = samples.length / SAMPLE_RATE;
  console.log(`  take: ${length.toFixed(2)} s, ${text.length} characters`);

  const frame = Math.round(0.01 * SAMPLE_RATE);
  let loudest = 0;
  for (let t = 0; t + frame <= samples.length; t += frame) loudest = Math.max(loudest, rms(samples, t, frame));
  const sounding = (t) => rms(samples, Math.round(t * SAMPLE_RATE), frame) >= 0.03 * loudest;

  const first = spans.map(([s, e]) => letterAt(text, s, e, false));
  const end = spans.map(([, e]) => ends[e - 1]);
  // Each cut sits in the longest quiet stretch between the start of one
  // beat's last word and the end of the next beat's first word. The pause
  // between them is in there even where the character times are well off:
  // StandardError's alignment stretched "testing." 0.45 s across the pause
  // after it, and a window that started at its last letter missed the pause
  // and cut into "Next". A sentence pause runs 0.3 to 0.6 s, longer than any
  // gap inside a word, so the longest quiet stretch is the pause.
  const cuts = spans.slice(1).map((_, i) => {
    const lo = starts[wordEdge(text, ...spans[i], true)];
    const hi = ends[wordEdge(text, ...spans[i + 1], false)];
    let { at, quiet } = cutPoint(samples, lo, Math.max(hi, lo + 0.1), loudest);
    if (quiet < MIN_PAUSE) {
      // Deep into a long take the character times can run half a second late
      // (ThinkingStatistically's did, at 2:30), so the pause sits just outside
      // the words' window. Take the nearest clear one within PAUSE_SLACK,
      // never past the two beats' own first and last letters.
      const near = nearestPause(
        samples,
        Math.max(starts[spans[i][0]], lo - PAUSE_SLACK),
        Math.min(ends[spans[i + 1][1] - 1], hi + PAUSE_SLACK),
        lo,
        hi,
        loudest,
      );
      if (near) ({ at, quiet } = near);
    }
    if (quiet < MIN_PAUSE) {
      console.warn(
        `  ! ${script.beats[i].id} → ${script.beats[i + 1].id}: no clear pause (longest quiet ${quiet.toFixed(2)} s); the cut may clip a word`,
      );
    }
    return at;
  });
  // Where each beat's first word really starts: the first sound after the
  // cut. The character times put it up to 0.3 s late after an audio tag
  // (the tag is given time the voice spends on the word), so the sound
  // decides, and the first letter is moved to it.
  const onset = spans.map((_, i) => {
    const from = i === 0 ? 0 : cuts[i - 1];
    for (let t = from; t < starts[first[i]] + 0.3; t += 0.01) if (sounding(t)) return t;
    return starts[first[i]];
  });
  spans.forEach(([s], i) => {
    const moved = onset[i] - starts[first[i]];
    if (Math.abs(moved) > 0.08) console.log(`  · ${script.beats[i].id}: first word starts ${moved.toFixed(2)} s from its character time`);
    starts[first[i]] = Math.min(onset[i], ends[first[i]]);
    for (let j = s; j < first[i]; j++) {
      starts[j] = Math.min(starts[j], onset[i]);
      ends[j] = Math.min(ends[j], onset[i]);
    }
  });
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
        characters: characters.slice(s, e),
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
// --force asks for a new performance; otherwise a kept take of this exact
// text is cut again rather than paid for twice.
const kept = flag("--force") ? null : keptTake();
const beats = asTake ? cutTake(kept ?? (await recordTake())) : await voiceBeats();

const stale = script.beats.filter((b) => beats[b.id]?.text !== b.text).map((b) => b.id);
if (stale.length) console.log(`Still on estimated timing: ${stale.join(", ")}`);
console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
