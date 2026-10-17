#!/usr/bin/env node
/**
 * Checks that a voiced video's picture and voice line up: renders its
 * soundtrack, finds where speech actually starts after every pause, and
 * compares that with where the timeline puts each beat's first word. Every
 * animation is cued from those times (useNarration().word()), so a beat that
 * starts on time means the animations cued to it do too.
 *
 *   npm run check:sync -- ThinkingStatistically    # or thinking-statistically
 *   npm run check:sync -- ThinkingStatistically --tolerance 0.15
 *   npm run check:sync -- ThinkingStatistically --audio out/ThinkingStatistically-dry.wav
 *
 * The soundtrack is rendered with sound effects off (out/<id>-dry.wav), since
 * an effect playing in a pause hides where the speech begins. --audio checks
 * a WAV you already have instead, which must be a dry render of the current
 * timeline.
 *
 * Exits non-zero if any beat starts more than --tolerance seconds (default
 * 0.12) from where the timeline expects it. A beat with no pause before it
 * (one sentence running into the next) can't be measured this way and is
 * listed as unchecked, not failed.
 *
 * Needs a Node that strips TypeScript types (22.18 or later), like cues.mjs.
 */
import path from "node:path";
import { readWav, renderAudio, silences, videoNames } from "./lib/audio.mjs";
import { videoTimeline } from "./lib/video-timeline.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const tolerance = Number(flag("--tolerance") ?? 0.12);
const audioFile = flag("--audio");
if (!args[0]) {
  console.error("Usage: npm run check:sync -- <video> [--tolerance 0.12] [--audio file.wav]");
  process.exit(1);
}
const { id, folder: name } = videoNames(args[0]);
// A merged video (Unit 5) is checked against its parts' own cues, placed
// where it plays them; its beats are "<part>/<beat>".
const video = await videoTimeline(name);
if (!video) {
  console.error(`No script for ${id} (looked in src/videos/${name}).`);
  process.exit(1);
}
if (!video.voiced) {
  console.log(`${id} has no voice-over yet (no public/narration/${video.scripts[0].id}/alignment.json), so there is nothing to line up.`);
  process.exit(0);
}
const { timeline } = video;
const stale = timeline.beats.filter((b) => b.source !== "alignment").map((b) => b.id);
if (stale.length) console.log(`Not voiced (timed from the estimate, skipped): ${stale.join(", ")}`);

const wav = audioFile ? path.resolve(audioFile) : await renderAudio(id, { tag: "dry", inputProps: { sfx: false } });
const ends = silences(readWav(wav)).map((p) => p.end);

// How far a pause may sit from a beat and still be the one before it.
const REACH = 0.5;
const rows = [];
for (const b of timeline.beats) {
  if (b.source !== "alignment") continue;
  const near = ends.reduce((best, e) => (Math.abs(e - b.start) < Math.abs(best - b.start) ? e : best), Infinity);
  const d = near - b.start;
  rows.push({ id: b.id, start: b.start, d: Math.abs(d) <= REACH ? d : null });
}

const checked = rows.filter((r) => r.d !== null);
const late = checked.filter((r) => Math.abs(r.d) > tolerance);
const unchecked = rows.filter((r) => r.d === null);
const sign = (d) => `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}`;
const time = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

console.log(`\nSpeech onset minus the timeline's cue, per beat (+ means the voice starts later):\n`);
const cells = rows.map((r) => `${r.id} ${r.d === null ? "  –  " : sign(r.d)}`);
const width = Math.max(...cells.map((c) => c.length)) + 2;
const perLine = Math.max(1, Math.floor(96 / width));
for (let i = 0; i < cells.length; i += perLine) console.log("  " + cells.slice(i, i + perLine).map((c) => c.padEnd(width)).join(""));

const worst = checked.reduce((w, r) => (Math.abs(r.d) > Math.abs(w?.d ?? 0) ? r : w), null);
console.log(`\n${checked.length} beats checked${worst ? `, worst ${sign(worst.d)} s (${worst.id}, at ${time(worst.start)})` : ""}.`);
if (unchecked.length) console.log(`${unchecked.length} with no pause before them, unchecked: ${unchecked.map((r) => r.id).join(", ")}`);
if (late.length) {
  console.log(`\n✗ ${late.length} beyond ±${tolerance} s:`);
  for (const r of late) console.log(`  ${r.id.padEnd(16)} ${sign(r.d)} s at ${time(r.start)}`);
  console.log(
    "\nA beat voiced on its own can sit slightly apart from the take; one that drifts by more" +
      "\nusually means alignment.json is out of date for it. Re-voice just that beat (npm run narrate)." +
      `\nIf a whole run of beats drifts, the take was cut wrongly: npm run narrate -- ${name} --recut is free.`,
  );
  process.exit(1);
}
console.log(`✓ every beat starts within ±${tolerance} s of its cue`);
