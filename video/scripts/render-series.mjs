/**
 * Stitches a series into one video: before each unit or part, its opener,
 * then the unit's videos, in the order src/series.ts gives.
 *
 *   npm run render:series -- Statistics               # 4K → out/series/Statistics.mp4
 *   npm run render:series -- Statistics --fhd         # 1080p → out/series/Statistics-fhd.mp4
 *   npm run render:series -- --all --fhd              # every series
 *   npm run render:series -- DataEngineer --units 0-2 # a stretch of one, to preview
 *   npm run render:series -- Statistics --dry-run     # list the pieces, render nothing
 *   npm run render:series -- Statistics --no-render   # stitch what is in out/ as it is
 *
 * It first runs render-all on exactly the pieces it needs, so a piece is
 * rendered only when it is missing or its inputs changed since its last
 * render (out/.render-manifest.json), then joins them with ffmpeg:
 *
 * - The picture is copied packet for packet (`-c:v copy`): every frame in the
 *   series is the frame its piece rendered, bit for bit, at no quality cost
 *   and in minutes rather than the hours a fresh render would take.
 * - The sound is decoded and encoded once (AAC at 320 kb/s with libfdk_aac,
 *   the encoder and rate the pieces have), because AAC frames do not join
 *   cleanly when copied: each piece's encoder delay would leave a few
 *   milliseconds of silence or a click at every join.
 * - Every piece must share size, frame rate and pixel format, which pieces
 *   from one render-all run do; anything else stops the stitch, since
 *   copying cannot convert.
 *
 * Next to each video it writes `<name>.chapters.txt`, one line per unit
 * ("0:00 Unit 1 · Thinking statistically"), ready for a YouTube
 * description, which is where YouTube reads chapters from.
 *
 * ffmpeg and ffprobe are Remotion's own (`npx remotion ffmpeg`), so nothing
 * else needs installing. Its build is minimal (no ffmetadata reader), so the
 * chapters are not written into the file itself.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openerId, SERIES, unitLabel } from "../src/series.ts";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(VIDEO_ROOT, "out");
const SERIES_OUT = path.join(OUT, "series");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const fhd = flag("--fhd");
const dryRun = flag("--dry-run");
const noRender = flag("--no-render");
const unitsArg = value("--units");
const names = flag("--all") ? Object.keys(SERIES) : args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--units");

if (names.length === 0) {
  console.error(`Name a series, or pass --all. Series: ${Object.keys(SERIES).join(", ")}`);
  process.exit(1);
}
const unknown = names.filter((n) => !(n in SERIES));
if (unknown.length) {
  console.error(`Not a series: ${unknown.join(", ")}. Series: ${Object.keys(SERIES).join(", ")}`);
  process.exit(1);
}

/** `--units 0-2` or `--units 3`: the unit numbers to keep. */
const unitRange = (() => {
  if (!unitsArg) return null;
  const m = /^(\d+)(?:-(\d+))?$/.exec(unitsArg);
  if (!m) {
    console.error(`--units takes a number or a range, like 3 or 0-2, not "${unitsArg}"`);
    process.exit(1);
  }
  const lo = Number(m[1]);
  const hi = m[2] === undefined ? lo : Number(m[2]);
  return (n) => n >= lo && n <= hi;
})();

const outputOf = (id) => path.join(OUT, fhd ? `${id}-fhd.mp4` : `${id}.mp4`);

// Remotion's own ffmpeg and ffprobe, through its CLI.
const tool = (name, toolArgs, opts = {}) => {
  const r = spawnSync("npx", ["remotion", name, ...toolArgs], {
    cwd: VIDEO_ROOT,
    encoding: "utf8",
    maxBuffer: 1 << 26,
    shell: process.platform === "win32",
    ...opts,
  });
  if (r.status !== 0) throw new Error(`${name} failed:\n${r.stderr || r.stdout}`);
  return r.stdout;
};

const probe = (file) => {
  const info = JSON.parse(tool("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,pix_fmt,sample_rate,channels", "-of", "json", file]));
  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  return {
    duration: Number(info.format.duration),
    video: v && `${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt}`,
    audio: a && `${a.codec_name} ${a.sample_rate} ${a.channels}ch`,
  };
};

const clock = (secs) => {
  const s = Math.floor(secs);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

for (const name of names) {
  const series = SERIES[name];
  const units = series.units.filter((u) => !unitRange || unitRange(u.n));
  if (units.length === 0) {
    console.error(`${name}: no unit matches --units ${unitsArg}`);
    process.exit(1);
  }
  const pieces = units.flatMap((u) => [
    { id: openerId(name, u), unit: u },
    ...u.videos.map((id) => ({ id, unit: u })),
  ]);
  const stem = `${name}${unitsArg ? `-units-${unitsArg}` : ""}${fhd ? "-fhd" : ""}`;
  const output = path.join(SERIES_OUT, `${stem}.mp4`);

  console.log(`\n${name}: ${units.length} ${series.kind === "course" ? "units" : "parts"}, ${pieces.length} pieces → ${path.relative(VIDEO_ROOT, output)}`);
  for (const p of pieces) console.log(`  ${p.id}`);
  if (dryRun) continue;

  // Render whatever is missing or stale, and nothing else.
  if (!noRender) {
    const r = spawnSync(process.execPath, [path.join(VIDEO_ROOT, "scripts", "render-all.mjs"), ...(fhd ? ["--fhd"] : []), pieces.map((p) => p.id).join(",")], {
      cwd: VIDEO_ROOT,
      stdio: "inherit",
    });
    if (r.status !== 0) {
      console.error(`${name}: render-all failed; nothing stitched.`);
      process.exit(1);
    }
  }
  const missing = pieces.filter((p) => !existsSync(outputOf(p.id)));
  if (missing.length) {
    console.error(`${name}: not rendered yet: ${missing.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }

  // Copying the picture needs every piece encoded alike.
  const probed = pieces.map((p) => ({ ...p, ...probe(outputOf(p.id)) }));
  const ref = probed[0];
  const odd = probed.filter((p) => p.video !== ref.video || p.audio !== ref.audio);
  if (odd.length) {
    console.error(`${name}: pieces differ from ${ref.id} (${ref.video}, ${ref.audio}):`);
    for (const p of odd) console.error(`  ${p.id}: ${p.video}, ${p.audio}`);
    process.exit(1);
  }

  // Chapters: one per unit, from its opener to the next opener.
  const chapters = [];
  let t = 0;
  for (const p of probed) {
    if (p.id === openerId(name, p.unit)) chapters.push({ start: t, unit: p.unit });
    t += p.duration;
  }
  const total = t;
  const chapterTitle = (u) => `${unitLabel(series, u)} · ${u.title}`;

  mkdirSync(SERIES_OUT, { recursive: true });
  const list = path.join(SERIES_OUT, `${stem}.concat.txt`);
  writeFileSync(list, probed.map((p) => `file '${outputOf(p.id).replaceAll("'", "'\\''")}'`).join("\n") + "\n");
  console.log(`\nStitching ${probed.length} pieces (${clock(total)})…`);
  const started = Date.now();
  tool("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-map",
    "0:v",
    "-map",
    "0:a",
    "-c:v",
    "copy",
    "-c:a",
    "libfdk_aac",
    "-b:a",
    "320k",
    "-movflags",
    "+faststart",
    output,
  ]);

  rmSync(list);
  const chaptersTxt = path.join(SERIES_OUT, `${stem}.chapters.txt`);
  writeFileSync(chaptersTxt, chapters.map((c) => `${clock(c.start)} ${chapterTitle(c.unit)}`).join("\n") + "\n");
  console.log(`→ ${path.relative(VIDEO_ROOT, output)} (${clock(probe(output).duration)}, ${Math.round((Date.now() - started) / 1000)}s)`);
  console.log(`→ ${path.relative(VIDEO_ROOT, chaptersTxt)}`);
}
