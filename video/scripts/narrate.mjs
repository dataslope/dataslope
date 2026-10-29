#!/usr/bin/env node
/**
 * Generates a video's voice-over with ElevenLabs: one MP3 per beat, plus the
 * character alignment that re-times every cue to the real voice
 * (public/narration/<script id>/alignment.json, see "Adding the voice-over"
 * in README.md).
 *
 *   node scripts/narrate.mjs <video>                 voice what is missing
 *   node scripts/narrate.mjs <video> --only n,star   just these beats
 *   node scripts/narrate.mjs <video> --force         new takes of the lot
 *   node scripts/narrate.mjs <video> --recut         re-cut every beat a kept take still says
 *   node scripts/narrate.mjs <video> --onsets --only a,b   re-place beats' first words, no API call
 *   node scripts/narrate.mjs <video> --dry-run       show what would be sent
 *
 * A script is recorded in TAKES, one request each, and every take is cut into
 * beats afterwards at the quietest point of each pause between them. A take
 * reads like a person reading a page: one breath runs into the next sentence,
 * a question lifts and the answer comes down, and the energy holds. Beats
 * voiced one request at a time each start cold, with the same contour, which
 * is most of what makes narration sound synthetic. The raw takes are the
 * master and are committed, in takes/<script id>/take-<n>.{mp3,json}.
 *
 * planTakes() (src/narration/takes.ts) decides the takes: each starts at a
 * scene, and scenes share one until it holds about TAKE_CHARS characters, so
 * a unit video is three or four takes rather than one. Each take is sent with
 * the beats on either side of it as context, so the voice runs on across the
 * seam, and the seam sits in a scene change, the longest pause in the video.
 * One long take would hit the API's 10,000-character cap, drift out of
 * alignment as it goes, and cost the whole video to redo.
 *
 * When a whole take's beats need voicing (a first run, a part rewritten, or
 * --force), that take is recorded. When only some beats of a take changed,
 * those are re-voiced one at a time, each with its neighbours as context, so
 * a one-line edit doesn't re-record the rest.
 *
 * A beat that needs audio but whose words a kept take still says, word for
 * word (a beat split at a sentence break, or one moved), is cut from that
 * take instead, for free: locateBeats() (src/narration/takes.ts) finds the
 * script's beats in each kept take's own text, whatever script it was
 * recorded from. So "split before you re-voice" is just an edit to the
 * script. --recut cuts every beat it finds that way, but never replaces a
 * beat voiced on its own since: it rewrites a beat only when the beat needs
 * audio, when --only names it, or when the fresh cut is the beat's committed
 * audio already (it came from that take).
 *
 * Videos voiced before takes were split keep their single takes/<id>/take.*,
 * which is one more kept take to cut from.
 *
 * The narrator is the script's `voice`, one of the house voices in
 * src/narration/voices.ts (Drew when it names none). --voice overrides it
 * for a trial, with a house name or any ElevenLabs voice id. A video is never
 * left with two voices: a change of voice re-voices every beat. The model is
 * always NARRATION_MODEL (eleven_v4_turbo); any other is refused.
 *
 * Reads ELEVENLABS_API_KEY from the environment and never writes it anywhere.
 * Cuts audio with the ffmpeg Remotion ships. Imports the TypeScript script
 * directly, so it needs a Node that strips types by default (22.18 or later).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loudestFrame, speechOnset } from "./lib/onset.mjs";

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
  console.error("Usage: node scripts/narrate.mjs <video> [--only ids] [--force] [--recut] [--dry-run] [--voice drew|hope|id]");
  process.exit(1);
}

const { script } = await import(pathToFileURL(join(VIDEO_ROOT, "src", "videos", video, "script.ts")).href);
const { VOICES, NARRATION_MODEL, voiceId } = await import(
  pathToFileURL(join(VIDEO_ROOT, "src", "narration", "voices.ts")).href
);
const { locateBeats, planTakes } = await import(pathToFileURL(join(VIDEO_ROOT, "src", "narration", "takes.ts")).href);
const outDir = join(VIDEO_ROOT, "public", "narration", script.id);
const takeDir = join(VIDEO_ROOT, "takes", script.id);
const alignmentPath = join(outDir, "alignment.json");
const existing = existsSync(alignmentPath) ? JSON.parse(readFileSync(alignmentPath, "utf8")) : { beats: {} };
const asked = value("--voice");
const voice = asked ? (VOICES[asked]?.id ?? asked) : voiceId(script.voice);
const voiceName = Object.keys(VOICES).find((name) => VOICES[name].id === voice) ?? voice;
// Every narration is eleven_v4_turbo. The plain eleven_v4 (and anything else)
// is refused rather than offered as a trial, so no video ends up on it.
const model = NARRATION_MODEL;
if (value("--model") && value("--model") !== NARRATION_MODEL) {
  console.error(`Narration is recorded on ${NARRATION_MODEL} only; --model ${value("--model")} is refused.`);
  process.exit(1);
}
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

/** A take's text: its beats run on with a space, and a beat that opens a
 *  scene starts a new paragraph, which the voice reads as a bigger turn.
 *  `spans` are each beat's characters in it. */
function takeText(indices) {
  let text = "";
  const spans = [];
  indices.forEach((b, k) => {
    const beat = script.beats[b];
    if (k) text += beat.scene ? "\n\n" : " ";
    spans.push([text.length, text.length + beat.text.length]);
    text += beat.text;
  });
  return { text, spans };
}

const everyBeat = script.beats.map((_, i) => i);
/** A video voiced before scripts were split into takes keeps its one
 *  whole-script take (takes/<id>/take.*): while that still matches the
 *  script, the script stays one take, so --recut can cut it for free. */
const legacyPath = join(takeDir, "take.json");
const legacy =
  existsSync(legacyPath) && JSON.parse(readFileSync(legacyPath, "utf8")).text === takeText(everyBeat).text;
const plan = legacy ? [everyBeat] : planTakes(script);
const takeName = (k) => (legacy ? "take" : `take-${k + 1}`);
const describe = (k) => {
  const ids = plan[k].map((b) => script.beats[b].id);
  return `take ${k + 1} of ${plan.length} (${ids[0]} … ${ids.at(-1)}, ${plan[k].length} beats, ${takeText(plan[k]).text.length} characters)`;
};

/** Where each kept take says a beat, by beat id: the first kept take (in
 *  order) whose own text has the beat's words, word for word. */
const inTakes = new Map();
for (const { name, take } of keptTakesOnDisk()) {
  for (const seg of locateBeats(take.text, script.beats)) {
    if (seg.beat !== null && !inTakes.has(script.beats[seg.beat].id)) inTakes.set(script.beats[seg.beat].id, { name, take });
  }
}

/** Beats that need audio but are still said in a kept take, word for word: a
 *  beat split at a sentence break, or one moved. They are cut from the take
 *  for free. Not under --only or --force, which ask for a new performance,
 *  nor after a change of voice. */
const free = only || flag("--force") || voiceChanged ? [] : todo.filter((beat) => inTakes.has(beat.id));
const toVoice = todo.filter((beat) => !free.includes(beat));

/** The takes to record whole: every beat in them needs voicing. The rest of
 *  what needs voicing is voiced a beat at a time. */
const whole = only ? [] : plan.map((_, k) => k).filter((k) => plan[k].every((b) => toVoice.includes(script.beats[b])));
const single = toVoice.filter((beat) => !whole.some((k) => plan[k].includes(script.beats.indexOf(beat))));

/** Cuts the named beats from the kept takes that say them, writing only those
 *  beats; every other beat's audio is left as it is. */
function cutFromTakes(ids, beats) {
  const byTake = new Map();
  for (const id of ids) {
    const { name, take } = inTakes.get(id);
    if (!byTake.has(name)) byTake.set(name, { take, ids: [] });
    byTake.get(name).ids.push(id);
  }
  for (const [name, { take, ids: wanted }] of byTake) {
    const { pieces, write } = cutTake(take, name, locateBeats(take.text, script.beats));
    for (const piece of pieces) if (wanted.includes(piece.beat.id)) beats[piece.beat.id] = write(piece);
  }
  return beats;
}

if (flag("--recut")) {
  const takes = keptTakesOnDisk();
  if (!takes.length) {
    console.error(`No take of ${video} is kept in this voice (${voiceName}, ${model}), in ${takeDir}.`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  console.log(`${video}: re-cutting ${takes.length} kept take${takes.length > 1 ? "s" : ""} (voice ${voiceName}, model ${model})`);
  const beats = { ...existing.beats };
  const done = new Set();
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const { name, take } of takes) {
    const segments = locateBeats(take.text, script.beats);
    if (!segments.some((seg) => seg.beat !== null)) {
      console.log(`  ${name}: says no beat of the script any more`);
      continue;
    }
    const { pieces, write } = cutTake(take, name, segments);
    for (const piece of pieces) {
      const id = piece.beat.id;
      if (done.has(id) || (only && !only.includes(id))) continue;
      done.add(id);
      const old = existing.beats[id];
      const onDisk = old && existsSync(join(VIDEO_ROOT, "public", old.audio));
      if (onDisk && old.text === piece.beat.text && same(old, piece.entry) && !only) continue; // this cut already
      if (!onDisk || old.text !== piece.beat.text || only) beats[id] = write(piece);
      else console.log(`  · ${id.padEnd(14)} kept as voiced on its own (--only ${id} cuts it from ${name})`);
    }
  }
  saveAlignment(beats);
  const unvoiced = script.beats.filter((b) => beats[b.id]?.text !== b.text).map((b) => b.id);
  if (unvoiced.length) console.log(`In no kept take, so still to voice: ${unvoiced.join(", ")}`);
  console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
  process.exit(0);
}

// Beats voiced on their own before their first word was placed from the
// sound: place it now, from the files already on disk.
if (flag("--onsets")) {
  if (!only) {
    console.error("--onsets re-places the beats named with --only.");
    process.exit(1);
  }
  const beats = { ...existing.beats };
  for (const id of only) {
    if (!beats[id]) {
      console.error(`${id} has no audio yet; voice it first.`);
      process.exit(1);
    }
    beats[id] = placeOnset(id, beats[id]);
  }
  saveAlignment(beats);
  console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
  process.exit(0);
}

const kept = (k) => (flag("--force") ? null : keptTake(k));
const sent =
  whole.reduce((n, k) => n + (kept(k) ? 0 : takeText(plan[k]).text.length), 0) + single.reduce((n, b) => n + b.text.length, 0);
// A beat cut free from a kept take sends nothing.
console.log(
  `${video}: ${todo.length} of ${script.beats.length} beats to voice, in ${plan.length} take${plan.length > 1 ? "s" : ""} ` +
    `(voice ${voiceName}, model ${model}); about ${sent} characters to send`,
);
for (let k = 0; k < plan.length; k++) {
  const state = whole.includes(k) ? (kept(k) ? "kept, will be re-cut" : "to record") : "voiced";
  console.log(`  ${describe(k)}: ${state}`);
}
for (const b of free) console.log(`  · ${b.id.padEnd(14)} cut from ${inTakes.get(b.id).name}, free: ${b.text}`);
for (const b of single) console.log(`  · ${b.id.padEnd(14)} on its own: ${b.text}`);
if (flag("--dry-run") || todo.length === 0) process.exit(0);

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

/** The text either side of a take, two beats each way, so the voice carries
 *  on from where the last take left off and into the next. */
function context(k) {
  const first = plan[k][0];
  const last = plan[k].at(-1);
  const around = (from, to) =>
    script.beats
      .slice(Math.max(0, from), Math.max(0, to))
      .map((b) => b.text)
      .join(" ") || undefined;
  return { previous_text: around(first - 2, first), next_text: around(last + 1, last + 3) };
}

/** Records take k, keeping its raw audio and alignment so it can be re-cut
 *  later without paying for it again (--recut). */
async function recordTake(k) {
  const { text } = takeText(plan[k]);
  console.log(`  recording ${describe(k)}`);
  const r = await tts({ text, ...context(k) }, `take ${k + 1}`);
  mkdirSync(takeDir, { recursive: true });
  writeFileSync(join(takeDir, `${takeName(k)}.mp3`), Buffer.from(r.audio_base64, "base64"));
  const beats = plan[k].map((b) => script.beats[b].id);
  const take = { voice_id: voice, model_id: model, beats, text, alignment: r.alignment };
  writeFileSync(join(takeDir, `${takeName(k)}.json`), JSON.stringify(take, null, 2) + "\n");
  return take;
}

/** Take k as kept on disk, if it was recorded from this text in this voice. */
function keptTake(k) {
  const path = join(takeDir, `${takeName(k)}.json`);
  if (!existsSync(path)) return null;
  const take = JSON.parse(readFileSync(path, "utf8"));
  const same = take.text === takeText(plan[k]).text && take.voice_id === voice && take.model_id === model;
  return same ? take : null;
}

/** Every take kept on disk in this voice and model, whatever script it was
 *  recorded from: takes/<id>/take.json (a video voiced in one take) and
 *  take-<n>.json. */
function keptTakesOnDisk() {
  if (!existsSync(takeDir)) return [];
  const order = (f) => Number(f.match(/\d+/)?.[0] ?? 0);
  return readdirSync(takeDir)
    .filter((f) => /^take(-\d+)?\.json$/.test(f))
    .sort((a, b) => order(a) - order(b))
    .map((f) => ({ name: f.replace(/\.json$/, ""), take: JSON.parse(readFileSync(join(takeDir, f), "utf8")) }))
    .filter(({ take }) => take.voice_id === voice && take.model_id === model);
}

/** Take k's segments as planned: each of its beats, nothing else. */
const planned = (k) => takeText(plan[k]).spans.map(([start, end], i) => ({ beat: plan[k][i], start, end }));

function saveAlignment(beats) {
  writeFileSync(alignmentPath, JSON.stringify({ meta: { voice_id: voice, model_id: model }, beats }, null, 2) + "\n");
}

/** Cuts a take at the pauses between its segments (locateBeats(), or
 *  planned()) and returns a piece per beat in it: where its file runs in the
 *  take, and its entry, with the alignment counted from the start of its own
 *  file. Nothing is written until write(piece); a segment that is text the
 *  script no longer has is cut around and dropped. */
function cutTake(take, name, segments) {
  const text = take.text;
  const spans = segments.map((seg) => [seg.start, seg.end]);
  const label = (i) => (segments[i].beat === null ? "(not in the script)" : script.beats[segments[i].beat].id);
  const { characters } = take.alignment;
  const starts = [...take.alignment.character_start_times_seconds];
  const ends = [...take.alignment.character_end_times_seconds];
  const samples = decode(join(takeDir, `${name}.mp3`));
  const length = samples.length / SAMPLE_RATE;
  console.log(`  ${name}: ${length.toFixed(2)} s, ${segments.filter((seg) => seg.beat !== null).length} beats of the script`);

  const frame = Math.round(0.01 * SAMPLE_RATE);
  let loudest = 0;
  for (let t = 0; t + frame <= samples.length; t += frame) loudest = Math.max(loudest, rms(samples, t, frame));

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
        `  ! ${label(i)} → ${label(i + 1)}: no clear pause (longest quiet ${quiet.toFixed(2)} s); the cut may clip a word`,
      );
    }
    return at;
  });
  // Where each beat's first word really starts: the first speech after the
  // cut. The character times put it up to 0.3 s late after an audio tag
  // (the tag is given time the voice spends on the word), so the sound
  // decides, and the first letter is moved to it. "Speech", not "sound": a
  // breath before the word clears a plain loudness bar (lib/onset.mjs).
  const onset = spans.map((_, i) => {
    const from = i === 0 ? 0 : cuts[i - 1];
    return speechOnset(samples, SAMPLE_RATE, from, starts[first[i]] + 0.3, loudest) ?? starts[first[i]];
  });
  spans.forEach(([s], i) => {
    const moved = onset[i] - starts[first[i]];
    if (Math.abs(moved) > 0.08 && segments[i].beat !== null) {
      console.log(`  · ${label(i)}: first word starts ${moved.toFixed(2)} s from its character time`);
    }
    starts[first[i]] = Math.min(onset[i], ends[first[i]]);
    for (let j = s; j < first[i]; j++) {
      starts[j] = Math.min(starts[j], onset[i]);
      ends[j] = Math.min(ends[j], onset[i]);
    }
  });
  // The video's first beat keeps no more lead than the script's lead-in; a
  // later take's first beat follows a scene change, which has room for it.
  const leadIn = segments[0].beat === 0 ? (script.leadIn ?? 0.6) : MAX_LEAD;

  const pieces = [];
  segments.forEach((seg, i) => {
    if (seg.beat === null) return;
    const beat = script.beats[seg.beat];
    const from = i === 0 ? Math.max(0, onset[0] - Math.min(MAX_LEAD, leadIn)) : Math.max(cuts[i - 1], onset[i] - MAX_LEAD);
    const to = i === spans.length - 1 ? Math.min(length, end[i] + MAX_TAIL) : Math.min(cuts[i], end[i] + MAX_TAIL);
    const audio = `narration/${script.id}/${beat.id}.mp3`;
    const [s, e] = spans[i];
    const rebase = (t) => Math.round((t - from) * 1000) / 1000;
    const entry = {
      text: beat.text,
      audio,
      alignment: {
        characters: characters.slice(s, e),
        character_start_times_seconds: starts.slice(s, e).map(rebase),
        character_end_times_seconds: ends.slice(s, e).map(rebase),
      },
    };
    pieces.push({ beat, from, to, entry });
  });
  const write = (piece) => {
    encode(samples, Math.round(piece.from * SAMPLE_RATE), Math.round(piece.to * SAMPLE_RATE), join(VIDEO_ROOT, "public", piece.entry.audio));
    console.log(`  ✓ ${piece.beat.id.padEnd(14)} ${piece.from.toFixed(2)} → ${piece.to.toFixed(2)} s of ${name}`);
    return piece.entry;
  };
  return { pieces, write };
}

/** Cuts a take and writes every beat in it. */
function cutAll(take, name, segments) {
  const { pieces, write } = cutTake(take, name, segments);
  return Object.fromEntries(pieces.map((piece) => [piece.beat.id, write(piece)]));
}

/**
 * A beat voiced on its own gets the correction a beat cut from a take gets:
 * its first letter moves to the first speech in its file. After an audio tag
 * such as [slowly] the character times put the word up to 0.3 s late (the
 * tag is given time the voice spends on the word), so a cue on the beat's
 * first word fired early against the sound: Estimation's [slowly] beats were
 * up to 0.25 s out in check:sync until this was added.
 */
function placeOnset(id, entry) {
  const samples = decode(join(VIDEO_ROOT, "public", entry.audio));
  const text = entry.alignment.characters.join("");
  const first = letterAt(text, 0, text.length, false);
  const starts = [...entry.alignment.character_start_times_seconds];
  const ends = [...entry.alignment.character_end_times_seconds];
  const onset = speechOnset(samples, SAMPLE_RATE, 0, starts[first] + 0.3, loudestFrame(samples, SAMPLE_RATE));
  if (onset === null) return entry;
  const moved = onset - starts[first];
  if (Math.abs(moved) > 0.08) console.log(`  · ${id}: first word starts ${moved.toFixed(2)} s from its character time`);
  starts[first] = Math.min(onset, ends[first]);
  for (let j = 0; j < first; j++) {
    starts[j] = Math.min(starts[j], onset);
    ends[j] = Math.min(ends[j], onset);
  }
  return {
    ...entry,
    alignment: { ...entry.alignment, character_start_times_seconds: starts, character_end_times_seconds: ends },
  };
}

async function voiceBeats(beats) {
  for (const beat of single) {
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
    beats[beat.id] = placeOnset(beat.id, { text: beat.text, audio, alignment: r.alignment });
    console.log(`  ✓ ${beat.id.padEnd(14)} ${r.alignment.character_end_times_seconds.at(-1).toFixed(2)} s`);
    // Saved after every beat, so an interrupted run keeps what it paid for.
    saveAlignment(beats);
  }
  return beats;
}

mkdirSync(outDir, { recursive: true });
// A new voice replaces every beat, so nothing of the old one is carried over.
const beats = voiceChanged ? {} : { ...existing.beats };
for (const k of whole) {
  // --force asks for a new performance; otherwise a kept take of this exact
  // text is cut again rather than paid for twice.
  Object.assign(beats, cutAll(kept(k) ?? (await recordTake(k)), takeName(k), planned(k)));
  // Saved after every take, so an interrupted run keeps what it paid for.
  saveAlignment(beats);
}
if (free.length) {
  cutFromTakes(free.map((b) => b.id), beats);
  saveAlignment(beats);
}
await voiceBeats(beats);

const stale = script.beats.filter((b) => beats[b.id]?.text !== b.text).map((b) => b.id);
if (stale.length) console.log(`Still on estimated timing: ${stale.join(", ")}`);
console.log(`Done. Check the new timing with: npm run cues -- ${video}`);
