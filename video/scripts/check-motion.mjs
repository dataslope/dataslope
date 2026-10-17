#!/usr/bin/env node
/**
 * Finds the stretches where a video's picture holds still. The narrator may
 * pause; the picture shouldn't: a frame that sits unchanged for seconds while
 * the voice carries on makes a video feel static, however good each
 * animation is. Measured on ThinkingStatistically (Unit 1) before this check
 * existed: 21 still stretches of 3 s or more, 107 s in all, the longest 13 s.
 *
 *   npm run check:motion -- describing-data                 # renders a half-size preview first
 *   npm run check:motion -- describing-data --file out/DescribingData-fhd.mp4
 *   npm run check:motion -- describing-data --max 2.5       # stricter
 *
 * A frame counts as still when under 0.05% of its pixels change from the one
 * before and under 0.01% change a lot (sampled at 4 fps, at 480x270, in
 * colour; lib/motion.mjs says why both). A pale highlight sweep and a thin
 * line drawing on both count as motion; a spot illustration's gentle bob
 * mostly does not, and is not motion anyone notices. Each still stretch
 * is listed with what the narrator is saying over it, so you know where to
 * add something: the next part of a figure, a highlight on the phrase being
 * spoken, a value counting, an annotation arriving, a slow drift.
 *
 * Exits non-zero if any stretch lasts --max seconds (default 3) or longer.
 * The preview is rendered to out/<id>-preview.mp4, with its sound (the
 * effects, and the narration once there is some), and kept: it is also the
 * quick way to watch a video, and a second run can pass it with --file.
 *
 * Needs a Node that strips TypeScript types (22.18 or later), like cues.mjs.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { videoNames } from "./lib/audio.mjs";
import { bundleVideo } from "./lib/bundle.mjs";
import { videoTimeline } from "./lib/video-timeline.mjs";
import { frameChanges, staticSpans } from "./lib/motion.mjs";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const max = Number(flag("--max") ?? 3);
const given = flag("--file");
if (!args[0]) {
  console.error("Usage: npm run check:motion -- <video> [--file video.mp4] [--max 3]");
  process.exit(1);
}
const { id, folder } = videoNames(args[0]);

let file = given && path.resolve(given);
if (!file) {
  const { renderMedia, selectComposition } = await import("@remotion/renderer");
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
  const serveUrl = await bundleVideo(path.join(VIDEO_ROOT, "src", "index.ts"));
  const composition = await selectComposition({ serveUrl, id, inputProps: {}, browserExecutable });
  file = path.join(VIDEO_ROOT, "out", `${id}-preview.mp4`);
  mkdirSync(path.dirname(file), { recursive: true });
  let shown = -1;
  await renderMedia({
    serveUrl,
    composition,
    inputProps: {},
    codec: "h264",
    scale: 0.5,
    outputLocation: file,
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== shown) process.stdout.write(`\r  rendering a half-size preview… ${(shown = pct)}%`);
    },
  });
  process.stdout.write(`\r  rendered ${path.relative(VIDEO_ROOT, file)}                \n`);
}
if (!existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

// What the narrator is saying when, to say where each still stretch falls
// (a merged video's beats are "<part>/<beat>").
const beats = (await videoTimeline(folder))?.timeline.beats ?? [];
const saying = (from, to) => {
  const over = beats.filter((b) => b.end > from && b.start < to);
  if (!over.length) return "(no narration)";
  return over.map((b) => b.id).join(", ");
};

const changes = await frameChanges(file);
const spans = staticSpans(changes, { minSeconds: Math.min(max, 2) });
const time = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;
const long = spans.filter((s) => s.end - s.start >= max);
const total = spans.reduce((n, s) => n + s.end - s.start, 0);
const duration = changes.at(-1)?.t ?? 0;

console.log(`\n${time(duration)} checked. Still for 2 s or more: ${spans.length} stretches, ${total.toFixed(1)} s in all.`);
for (const s of spans) {
  const mark = s.end - s.start >= max ? "✗" : " ";
  console.log(`  ${mark} ${time(s.start)}–${time(s.end)}  ${(s.end - s.start).toFixed(1).padStart(4)} s  over: ${saying(s.start, s.end)}`);
}
if (long.length) {
  console.log(`\n✗ ${long.length} still for ${max} s or longer. Give each something to move: the next part of the`);
  console.log("  figure as it is named, a highlight on the phrase being spoken, a value counting, an annotation.");
  process.exit(1);
}
console.log(`✓ nothing holds still for ${max} s`);
