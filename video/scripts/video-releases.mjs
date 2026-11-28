/**
 * The 1080p videos as GitHub releases: one release per Studio folder in
 * Root.tsx (a course, an interview track, or "Landscape", the stand-alone
 * videos), each video an asset `<id>.mp4`. Run by
 * .github/workflows/video-releases.yml; every command shells out to `gh`,
 * which reads GH_TOKEN.
 *
 * A video is rendered again only when something its render reads has
 * changed since the copy in its release was made. render-all.mjs already
 * fingerprints every input of a video (its sources and the shared kit it
 * imports, its narration and images, its Root.tsx entry, the dependency
 * versions and the render settings). Beside each `<id>.mp4` its release
 * keeps `<id>.fingerprint.json`, the fingerprint it was rendered from, and
 * `plan` asks render-all which videos no longer match theirs. A commit that
 * touches no video's inputs renders nothing; an edit to one scene renders
 * that video; an edit to the shared kit renders every video that imports it.
 *
 * One fingerprint file per video, not one manifest per release, so the
 * render jobs share nothing: each uploads its own videos and their own
 * fingerprints, in that order. A video whose render or upload fails keeps
 * its old fingerprint, and the next run renders it again.
 *
 *   node scripts/video-releases.mjs plan [--only ids] [--force] [--limit N] [--footage S]
 *       Read every release's fingerprints, plan the renders, create any
 *       release that does not exist yet, and write `count`, `pending`,
 *       `releases` and `batches` (a JSON matrix) to $GITHUB_OUTPUT, with a
 *       summary. At most `limit` videos a run (all of them unless given);
 *       each job gets about `footage` seconds of video (1500). A 4-core
 *       runner renders 1080p at about 1.2 times real time with four frames
 *       at once (measured: 20 s of video in 23.8 s, against 32.0 s with
 *       Remotion's default of two), so a job is about half an hour, and all
 *       118 videos (13.4 hours of video) are about 33 jobs.
 *   node scripts/video-releases.mjs upload <ids>
 *       Upload each rendered out/<id>-fhd.mp4 to its release as <id>.mp4,
 *       replacing the old one, then its fingerprint (from
 *       out/.render-manifest.json, which render-all wrote).
 *   node scripts/video-releases.mjs notes <tags>
 *       Rewrite each release's notes from its fingerprints, and delete the
 *       files of videos no longer in it (renamed, moved or removed).
 *   node scripts/video-releases.mjs releases
 *       List the releases and how many videos each holds.
 */
import { execFileSync } from "node:child_process";
import { existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SERIES, unitLabel } from "../src/series.ts";
import { registry } from "./lib/audio.mjs";
import { videoTimeline } from "./lib/video-timeline.mjs";

const VIDEO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(VIDEO_ROOT, "out");
const FINGERPRINT = ".fingerprint.json";
/** render-all's key for a video's 1080p output: its path under out/. */
const keyOf = (id) => `${id}-fhd.mp4`;

const [command, ...rest] = process.argv.slice(2);
const opt = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};
const positional = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));

const gh = (args, options = {}) => execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
const ghOk = (args) => {
  try {
    gh(args);
    return true;
  } catch {
    return false;
  }
};
const output = (name, value) => {
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`, { flag: "a" });
  else console.log(`${name}=${value}`);
};
const summary = (markdown) => {
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n", { flag: "a" });
  else console.log(markdown);
};

// --- Which release each video belongs to ------------------------------------

/** Every video's Studio folder, from the <Folder> elements around it in Root.tsx. */
function studioFolders() {
  const src = readFileSync(path.join(VIDEO_ROOT, "src", "Root.tsx"), "utf8");
  const folderOf = new Map();
  const stack = [];
  for (const m of src.matchAll(/<Folder name="([^"]+)">|<\/Folder>|<Composition\s+id="([^"]+)"/g)) {
    if (m[1]) stack.push(m[1]);
    else if (m[0] === "</Folder>") stack.pop();
    else folderOf.set(m[2], stack[0] ?? "Videos");
  }
  return folderOf;
}

/** The series a video is part of, and the label and title its opener shows. */
const seriesOf = new Map();
for (const s of Object.values(SERIES)) {
  for (const u of s.units) for (const id of u.videos) seriesOf.set(id, { series: s, label: unitLabel(s, u), title: u.title });
}

const VIDEOS = registry();
const FOLDERS = studioFolders();
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** A release: its tag, title, and the videos in it, in Root.tsx order. */
function releases() {
  const byTag = new Map();
  for (const v of VIDEOS) {
    const folder = FOLDERS.get(v.id) ?? "Videos";
    const tag = `videos-${slug(folder)}`;
    if (!byTag.has(tag)) {
      // A course or track takes its series' name; the stand-alone videos theirs.
      const series = seriesOf.get(v.id)?.series;
      const name = series ? series.name : folder === "Landscape" ? "Stand-alone videos" : folder.replaceAll("-", " ");
      byTag.set(tag, { tag, title: `${name} (1080p)`, folder, videos: [] });
    }
    byTag.get(tag).videos.push(v);
  }
  return [...byTag.values()];
}
const RELEASES = releases();
const releaseOf = (id) => RELEASES.find((r) => r.videos.some((v) => v.id === id));

/** A release's fingerprints by video id: {} when the release has none. */
function pullFingerprints(tag, dir) {
  const into = path.join(dir, tag);
  mkdirSync(into, { recursive: true });
  if (!ghOk(["release", "download", tag, "--pattern", `*${FINGERPRINT}`, "--dir", into, "--clobber"])) return {};
  const out = {};
  for (const f of readdirSync(into).filter((x) => x.endsWith(FINGERPRINT))) {
    try {
      out[f.slice(0, -FINGERPRINT.length)] = JSON.parse(readFileSync(path.join(into, f), "utf8"));
    } catch {
      // Unreadable: as if the video had never been rendered.
    }
  }
  return out;
}

// --- Commands ---------------------------------------------------------------

async function plan() {
  const limit = Number(opt("--limit") ?? Infinity) || Infinity;
  const footage = Math.max(60, Number(opt("--footage") ?? 1500));
  const tmp = mkdtempSync(path.join(os.tmpdir(), "video-releases-"));

  // Every release's fingerprints, merged: the state of what is published.
  const merged = {};
  for (const r of RELEASES) {
    const prints = pullFingerprints(r.tag, tmp);
    for (const v of r.videos) if (prints[v.id]?.record) merged[keyOf(v.id)] = prints[v.id].record;
  }
  const manifestFile = path.join(tmp, "published.json");
  const planFile = path.join(tmp, "plan.json");
  writeFileSync(manifestFile, JSON.stringify(merged));
  const args = ["scripts/render-all.mjs", "--fhd", "--videos-only", "--trust-manifest", "--dry-run", "--manifest", manifestFile, "--plan", planFile];
  if (opt("--only")) args.push(opt("--only"));
  if (rest.includes("--force")) args.push("--force");
  execFileSync(process.execPath, args, { cwd: VIDEO_ROOT, stdio: "inherit" });
  const todo = JSON.parse(readFileSync(planFile, "utf8")).todo;
  rmSync(tmp, { recursive: true, force: true });

  // At most `limit` a run, in Root.tsx order; the rest wait for the next one.
  const now = todo.slice(0, limit);
  const later = todo.slice(limit);
  // Jobs filled to about `footage` seconds of video each, in order; a video
  // longer than that gets a job of its own.
  const batches = [];
  let batch = null;
  for (const v of now) {
    const seconds = (await videoTimeline(v.folder)).timeline.duration;
    if (!batch || batch.seconds + seconds > footage) batches.push((batch = { n: batches.length + 1, ids: [], seconds: 0 }));
    batch.ids.push(v.id);
    batch.seconds += seconds;
  }
  for (const b of batches) {
    b.ids = b.ids.join(",");
    b.seconds = Math.round(b.seconds);
  }

  // A release has to exist before a job can upload to it.
  for (const tag of new Set(now.map((v) => releaseOf(v.id).tag))) {
    if (ghOk(["release", "view", tag, "--json", "tagName"])) continue;
    const r = RELEASES.find((x) => x.tag === tag);
    gh(["release", "create", tag, "--title", r.title, "--notes", "Rendering; the notes list the videos once they are uploaded.", "--target", process.env.GITHUB_SHA ?? "main"]);
    console.log(`created release ${tag}`);
  }

  output("count", now.length);
  output("pending", later.length);
  output("releases", [...new Set(now.map((v) => releaseOf(v.id).tag))].join(" "));
  output("batches", JSON.stringify(batches));
  const lines = [`### Videos to render: ${now.length}${later.length ? `, and ${later.length} more on a later run` : ""}`, ""];
  if (!todo.length) lines.push("Every release is up to date: no video's inputs changed since its copy was rendered.");
  for (const v of now) lines.push(`- \`${v.id}\` → \`${releaseOf(v.id).tag}\`: ${v.reason}`);
  if (later.length) {
    lines.push("", `Over the limit of ${limit} a run, so not rendered yet (run the workflow again, or raise \`limit\`):`, "");
    for (const v of later) lines.push(`- \`${v.id}\`: ${v.reason}`);
  }
  summary(lines.join("\n"));
}

async function upload() {
  const ids = (positional[0] ?? "").split(",").filter(Boolean);
  if (!ids.length) throw new Error("upload <ids>");
  const manifest = JSON.parse(readFileSync(path.join(OUT, ".render-manifest.json"), "utf8"));
  let missing = 0;
  for (const id of ids) {
    const file = path.join(OUT, keyOf(id));
    if (!existsSync(file) || !manifest[keyOf(id)]) {
      console.error(`${id}: not rendered, so not uploaded; the next run renders it again`);
      missing++;
      continue;
    }
    // Uploaded under its asset name through a hard link, so a failed upload
    // leaves the render where a retry looks for it.
    const asset = path.join(OUT, `${id}.mp4`);
    rmSync(asset, { force: true });
    linkSync(file, asset);
    const { tag } = releaseOf(id);
    // The video first, its fingerprint second: a fingerprint never claims a
    // video its release does not hold.
    try {
      gh(["release", "upload", tag, asset, "--clobber"], { stdio: "inherit" });
    } finally {
      rmSync(asset, { force: true });
    }
    const folder = VIDEOS.find((v) => v.id === id).folder;
    const seconds = (await videoTimeline(folder)).timeline.duration;
    const print = path.join(OUT, `${id}${FINGERPRINT}`);
    writeFileSync(
      print,
      JSON.stringify(
        {
          record: manifest[keyOf(id)],
          commit: process.env.GITHUB_SHA ?? null,
          rendered: new Date().toISOString(),
          seconds: Math.round(seconds * 10) / 10,
          bytes: statSync(file).size,
        },
        null,
        2,
      ) + "\n",
    );
    gh(["release", "upload", tag, print, "--clobber"], { stdio: "inherit" });
    console.log(`${id} → ${tag}`);
  }
  if (missing) process.exitCode = 1;
}

function notes() {
  const tags = positional.join(" ").split(/[\s,]+/).filter(Boolean);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "video-releases-"));
  const repo = process.env.GITHUB_REPOSITORY;
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  for (const r of RELEASES.filter((x) => tags.includes(x.tag))) {
    const prints = pullFingerprints(r.tag, tmp);
    const rows = r.videos.map((v) => {
      const e = prints[v.id];
      const s = seriesOf.get(v.id);
      const name = s ? `${s.label}: ${s.title}` : v.id;
      if (!e) return `| ${name} | \`${v.id}\` | not rendered yet | | |`;
      const commit = e.commit ? (repo ? `[\`${e.commit.slice(0, 7)}\`](https://github.com/${repo}/commit/${e.commit})` : `\`${e.commit.slice(0, 7)}\``) : "";
      const link = repo ? `[${v.id}.mp4](https://github.com/${repo}/releases/download/${r.tag}/${v.id}.mp4)` : `${v.id}.mp4`;
      return `| ${name} | ${link} | ${mmss(e.seconds)}, ${Math.round(e.bytes / 1e6)} MB | ${commit} | ${e.rendered.slice(0, 10)} |`;
    });
    const body = [
      `${r.title.replace(/ \(1080p\)$/, "")}: every video at 1920x1080, rendered by the video releases workflow (\`.github/workflows/video-releases.yml\`).`,
      "A video is rendered again, and its file here replaced, only when something it is made from changes.",
      "",
      "| Video | File | Length, size | Rendered from | On |",
      "| --- | --- | --- | --- | --- |",
      ...rows,
    ].join("\n");
    const file = path.join(tmp, r.tag, "notes.md");
    writeFileSync(file, body + "\n");
    gh(["release", "edit", r.tag, "--title", r.title, "--notes-file", file], { stdio: "inherit" });

    // Files of videos this release no longer has: a renamed, moved or
    // removed video. Only this workflow's own file names are touched.
    const ids = new Set(r.videos.map((v) => v.id));
    const assets = gh(["release", "view", r.tag, "--json", "assets", "--jq", ".assets[].name"]).split("\n").filter(Boolean);
    for (const name of assets) {
      const m = /^(.+?)(\.mp4|\.fingerprint\.json)$/.exec(name);
      if (m && !ids.has(m[1])) {
        gh(["release", "delete-asset", r.tag, name, "--yes"], { stdio: "inherit" });
        console.log(`${r.tag}: removed ${name}, no longer one of its videos`);
      }
    }
    console.log(`${r.tag}: notes rewritten`);
  }
  rmSync(tmp, { recursive: true, force: true });
}

if (command === "plan") await plan();
else if (command === "upload") await upload();
else if (command === "notes") notes();
else if (command === "releases") for (const r of RELEASES) console.log(`${r.tag.padEnd(42)} ${String(r.videos.length).padStart(3)}  ${r.title}`);
else {
  console.error("video-releases.mjs plan | upload <ids> | notes <tags> | releases");
  process.exit(1);
}
