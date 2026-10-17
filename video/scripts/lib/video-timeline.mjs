/**
 * A video's narration timeline as its composition times it, for the checks
 * that need to know what is said when (check:motion labels its still
 * stretches with it; check:sync lines the soundtrack up against it).
 *
 * A video that plays one script (nearly all of them) gets that script's
 * timeline. A merged video, one whose folder has a plan.ts and whose script.ts
 * lists PARTS (Unit 5, src/videos/sampling/), gets its parts' own timelines
 * placed where plan.ts puts them, with beat ids "<part>/<beat>": exactly what
 * samplingMetadata builds for the composition, so a check of the merged video
 * sees the beats it plays. Before this, the merged video's checks were scratch
 * copies (out/Sampling-motion.mjs, out/Sampling-sync.mjs).
 *
 * Needs a Node that strips TypeScript types (22.18 or later).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
/** Every composition runs at 30 fps (Root.tsx). */
const FPS = 30;

/** Returns { timeline, voiced, scripts }, or null when the folder has no script.
 *  `voiced` is whether any of its scripts has an alignment.json. */
export async function videoTimeline(folder, root = VIDEO_ROOT) {
  const dir = path.join(root, "src", "videos", folder);
  if (!existsSync(path.join(dir, "script.ts"))) return null;
  const load = (file) => import(pathToFileURL(file).href);
  const { buildTimeline } = await load(path.join(root, "src", "narration", "timeline.ts"));
  const alignmentOf = (id) => {
    const file = path.join(root, "public", "narration", id, "alignment.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  };
  const mod = await load(path.join(dir, "script.ts"));
  if (Array.isArray(mod.PARTS) && existsSync(path.join(dir, "plan.ts"))) {
    const { planParts, mergeTimelines } = await load(path.join(dir, "plan.ts"));
    const scripts = mod.PARTS.map(({ script }) => script);
    const alignments = scripts.map((s) => alignmentOf(s.id));
    const timelines = scripts.map((s, k) => buildTimeline(s, alignments[k]));
    const { spans, durationInFrames } = planParts(timelines, FPS);
    const timeline = mergeTimelines(scripts.map((s, k) => ({ id: s.id, timeline: timelines[k] })), spans, FPS, durationInFrames);
    return { timeline, voiced: alignments.some(Boolean), scripts };
  }
  const alignment = alignmentOf(mod.script.id);
  return { timeline: buildTimeline(mod.script, alignment), voiced: Boolean(alignment), scripts: [mod.script] };
}
