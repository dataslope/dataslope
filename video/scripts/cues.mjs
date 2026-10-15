#!/usr/bin/env node
/**
 * Prints a video's cue sheet: every beat with its start and end, from real
 * alignment where public/narration/<id>/alignment.json has it and from the
 * reading-speed estimate otherwise. Also prints the narration as plain text,
 * which is what goes to the voice.
 *
 *   node scripts/cues.mjs <video>
 *
 * Imports the TypeScript script and timeline directly, so it needs a Node
 * that strips types by default (22.18 or later).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VIDEO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const video = process.argv[2];
if (!video) {
  console.error("Usage: node scripts/cues.mjs <video>");
  process.exit(1);
}

const { script } = await import(pathToFileURL(join(VIDEO_ROOT, "src", "videos", video, "script.ts")).href);
const { buildTimeline, narrationText } = await import(
  pathToFileURL(join(VIDEO_ROOT, "src", "narration", "timeline.ts")).href
);
const alignmentPath = join(VIDEO_ROOT, "public", "narration", script.id, "alignment.json");
const alignment = existsSync(alignmentPath) ? JSON.parse(readFileSync(alignmentPath, "utf8")) : null;
const timeline = buildTimeline(script, alignment);

const s = (t) => t.toFixed(2).padStart(6);
for (const b of timeline.beats) {
  console.log(`${b.id.padEnd(14)} ${s(b.start)} → ${s(b.end)}  ${b.source.padEnd(9)} ${b.text}`);
}
const words = timeline.beats.reduce((n, b) => n + b.words.length, 0);
console.log(
  `\n${timeline.beats.length} beats · ${words} words · ${timeline.duration.toFixed(1)} s · ` +
    `${Math.round(words / (timeline.duration / 60))} wpm overall\n`,
);
console.log(narrationText(script));
