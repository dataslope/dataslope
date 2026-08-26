/**
 * Records prepopulated output for the blocks a Node process cannot run:
 * java/csharp/web/react/php have no Node runtime, and r's output is not text
 * (`runtime/r.tsx` renders tables and graphics in the browser). Drives real
 * pages with Playwright (`e2e/capture-block-outputs.spec.ts`), reads the
 * finished `OutputCell[]` off the page, and merges into the same manifest
 * under the same keys and caps as `build-block-outputs.mjs` — a reader cannot
 * tell which generator produced a panel. No second run, so entries are
 * recorded `stable: false` (conservative, not measured).
 *
 * Usage:
 *   node scripts/capture-browser-outputs.mjs [--adapters java,r,…]
 *                                            [--port <n>] [--relay] [--dry-run]
 *
 * `--relay` hands the browser's CDN requests to this process, for sandboxes
 * that allow Node's egress but not the browser's.
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { blockOutputKey } from "../lib/blockOutputKey.ts";
import { extractBlocks } from "./lib/mdx-blocks.mjs";
import { BROWSER_ADAPTERS } from "./lib/block-runners.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "lib", "generated", "block-outputs.json");
const ASSET_DIR = join(ROOT, "public", "block-outputs");
const ASSET_URL_BASE = "/block-outputs";

// BROWSER_ADAPTERS lives in `block-runners.mjs` beside the headless list: the
// headless generator has to carry these entries, so it must know the set.

// Same ceilings as build-block-outputs, for the same reason.
const MAX_CELL_BYTES = 120_000;
const MAX_BLOCK_BYTES = 250_000;
const MAX_TEXT_CHARS = 20_000;
const MAX_IMAGE_BYTES = 400_000;
const MAX_PLOT_BYTES = 1_500_000;

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const adapters = (flag("--adapters") ?? BROWSER_ADAPTERS.join(","))
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);
const port = flag("--port") ?? process.env.E2E_PORT ?? "3457";
const relay = args.includes("--relay");
const dryRun = args.includes("--dry-run");
const config = flag("--config");

// ─── key → every lesson that holds that block ───────────────────────────
//
// The capture reports keys; the manifest is keyed by lesson path. Keys are
// content hashes, so a block on two lessons belongs on both.
const byKey = new Map();
let selected = 0;
for (const adapter of adapters) {
  for (const block of extractBlocks(undefined, adapter)) {
    if (block.unparsable || block.expectError) continue;
    const entry = block.files.find((f) => f.filename === block.entry) ?? block.files[0];
    if (!entry) continue;
    const key = blockOutputKey(
      adapter,
      entry.initCode,
      entry.starterCode,
      block.stdin,
    );
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(block.file);
    selected++;
  }
}
console.log(
  `capture-browser-outputs: ${adapters.join(", ")} — ${selected} block(s), ` +
    `${byKey.size} distinct`,
);

if (dryRun) process.exit(0);

// ─── drive the browser ──────────────────────────────────────────────────
const spec = "e2e/capture-block-outputs.spec.ts";
const child = spawn(
  "npx",
  ["playwright", "test", ...(config ? ["--config", config] : []), spec, "--reporter=list"],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      ADAPTERS: adapters.join(","),
      E2E_PORT: String(port),
      ...(relay ? { CAPTURE_RELAY: "1" } : {}),
    },
    stdio: ["inherit", "pipe", "inherit"],
  },
);

const pages = [];
let buffered = "";
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buffered += chunk;
  const lines = buffered.split("\n");
  buffered = lines.pop() ?? "";
  for (const line of lines) {
    const at = line.indexOf("CAPTURE {");
    if (at === -1) {
      process.stdout.write(line + "\n");
      continue;
    }
    try {
      pages.push(JSON.parse(line.slice(at + "CAPTURE ".length)));
    } catch (err) {
      console.error(`capture-browser-outputs: unparseable CAPTURE line (${err?.message})`);
    }
  }
});
const exitCode = await new Promise((resolve) => child.on("close", resolve));

// ─── merge ──────────────────────────────────────────────────────────────
let manifest = {};
try {
  manifest = JSON.parse(readFileSync(OUT_FILE, "utf8"));
} catch {
  // No manifest yet; this run writes the first one.
}

mkdirSync(ASSET_DIR, { recursive: true });

function cellBytes(cells) {
  return Buffer.byteLength(JSON.stringify(cells), "utf8");
}

/** Which cap a block trips, or null. Mirrors build-block-outputs. */
function withinCaps(cells) {
  for (const cell of cells) {
    if (
      (cell.type === "stdout" || cell.type === "stderr") &&
      cell.content.length > MAX_TEXT_CHARS
    ) {
      return "text";
    }
    if (Buffer.byteLength(JSON.stringify(cell), "utf8") > MAX_CELL_BYTES) return "cell";
  }
  if (cellBytes(cells) > MAX_BLOCK_BYTES) return "block";
  return null;
}

/** A base64 image or a Plotly figure becomes a file, as on the Python path
 *  (inline they were nearly the whole manifest). Images are re-encoded to
 *  WebP at the Python path's quality; R hands over PNG at ~4.5x the size. */
const { default: sharp } = await import("sharp");
let assetsWritten = 0;
let assetBytes = 0;
let assetsDropped = 0;
async function externalise(cell, key, index) {
  if (cell.type === "image" && cell.content) {
    const base64 = cell.content.replace(/^data:[^,]+,/, "");
    const name = `${key}-${index}.webp`;
    let webp;
    try {
      webp = await sharp(Buffer.from(base64, "base64")).webp({ quality: 82 }).toBuffer();
    } catch {
      assetsDropped++;
      return null;
    }
    if (webp.length > MAX_IMAGE_BYTES) {
      assetsDropped++;
      return null;
    }
    writeFileSync(join(ASSET_DIR, name), webp);
    assetsWritten++;
    assetBytes += webp.length;
    return { type: "image", content: "", src: `${ASSET_URL_BASE}/${name}` };
  }
  if (cell.type === "plot" && cell.plot) {
    const json = JSON.stringify(cell.plot);
    if (Buffer.byteLength(json, "utf8") > MAX_PLOT_BYTES) {
      assetsDropped++;
      return null;
    }
    const name = `${key}-${index}.json`;
    writeFileSync(join(ASSET_DIR, name), json);
    assetsWritten++;
    assetBytes += Buffer.byteLength(json, "utf8");
    return { type: "plot", content: "", src: `${ASSET_URL_BASE}/${name}` };
  }
  return { type: cell.type, content: cell.content ?? "" };
}

const stats = { captured: 0, recorded: 0, unmatched: 0, errored: 0, empty: 0, overCap: 0 };
const lessons = new Set();
for (const page of pages) {
  for (const cap of page.captured ?? []) {
    stats.captured++;
    const files = byKey.get(cap.key);
    if (!files) {
      // Not attributed to one of these adapters — a demo page, most often.
      stats.unmatched++;
      continue;
    }
    const cells = (cap.cells ?? []).filter((c) => c.content !== "" || c.plot);
    if (cells.length === 0) {
      stats.empty++;
      continue;
    }
    // Diagnostics-only means the block ran and failed; the headless generator
    // drops these for the same reason.
    if (!cells.some((c) => c.type !== "stderr")) {
      stats.errored++;
      continue;
    }
    const stored = (
      await Promise.all(cells.map((c, i) => externalise(c, cap.key, i)))
    ).filter(Boolean);
    if (stored.length === 0) {
      stats.empty++;
      continue;
    }
    if (withinCaps(stored)) {
      stats.overCap++;
      continue;
    }
    for (const file of files) {
      (manifest[file] ??= {})[cap.key] = { cells: stored, stable: false };
      lessons.add(file);
    }
    stats.recorded++;
  }
}

writeFileSync(OUT_FILE, JSON.stringify(manifest));

console.log(
  `capture-browser-outputs: ${stats.recorded} of ${stats.captured} captured block(s) ` +
    `recorded across ${lessons.size} lesson(s); ${stats.empty} produced nothing, ` +
    `${stats.errored} only errored, ${stats.overCap} over cap, ${stats.unmatched} unmatched`,
);
if (assetsWritten || assetsDropped) {
  console.log(
    `capture-browser-outputs: ${assetsWritten} asset(s) written ` +
      `(${Math.round(assetBytes / 1024)} kB)` +
      (assetsDropped ? `, ${assetsDropped} dropped over cap` : ""),
  );
}
process.exit(exitCode === 0 ? 0 : 1);
