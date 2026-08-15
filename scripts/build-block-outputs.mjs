/**
 * Runs every `<CodeBlock>` there is a headless runtime for and records what it
 * printed, so a lesson shows a block's output before the reader presses Run.
 * Python runs through Pyodide (same wire shape as the browser worker, via
 * `scripts/lib/python-output-capture.mjs` + `pythonDisplayOutputs.ts`);
 * JS/TS/C/C++ run through `scripts/lib/block-runners.mjs`.
 *
 * Only `.github/workflows/block-outputs.yml` invokes this — never `build` or
 * `dev` — and the manifest it writes is committed. Entries are keyed by a hash
 * of the block's source (`lib/blockOutputKey.ts`), not file/line, so an edited
 * block loses its entry rather than showing stale output. Every block runs
 * twice; differing results are recorded `stable: false` (a signal in the
 * summary, nothing in the UI branches on it).
 *
 * Usage:
 *   node scripts/build-block-outputs.mjs [--filter <substr>[,<substr>…]]
 *                                        [--adapter <name>[,<name>…]]
 *                                        [--force] [--stats]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { blockOutputKey } from "../lib/blockOutputKey.ts";
import { toOutputCells } from "../app/_components/runtime/pythonDisplayOutputs.ts";
import { collectFiles, freshness } from "./lib/build-cache.mjs";
import { extractBlocks, matchesFilter, parseFilter } from "./lib/mdx-blocks.mjs";
import { BROWSER_ADAPTERS, createRunner, TEXT_ADAPTERS } from "./lib/block-runners.mjs";
import { bootPyodide, isEnvironmental } from "./lib/pyodide-runner.mjs";
import { captureSetupScript, wrapLastExpression } from "./lib/python-output-capture.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "lib", "generated");
// JSON, not a JS module: `lib/blockOutputs.ts` reads it with `fs` at build
// time, so none of it reaches the Cloudflare Worker (a static import put the
// bundle over its 10 MiB gzipped cap).
const OUT_FILE = join(OUT_DIR, "block-outputs.json");
// Figures land here as files, not in the manifest: inline base64 PNG and
// Plotly JSON were nearly the whole payload, inlined into the page whether or
// not the reader scrolled to the block. As files they are fetched lazily.
const ASSET_DIR = join(ROOT, "public", "block-outputs");
const ASSET_URL_BASE = "/block-outputs";

/**
 * Size ceilings. Every inline byte is paid by every reader; a block over a
 * limit gets no entry rather than a truncated one — half a table looks like
 * the answer.
 */
const MAX_CELL_BYTES = 120_000; // one very wide table (images are files)
const MAX_BLOCK_BYTES = 250_000; // all inline cells of one block
const MAX_TEXT_CHARS = 20_000; // a runaway print loop
const MAX_IMAGE_BYTES = 400_000; // one encoded figure on disk
const MAX_PLOT_BYTES = 1_500_000; // one figure JSON on disk

function writeManifestFile(data) {
  mkdirSync(OUT_DIR, { recursive: true });
  // Lesson path -> block key -> { cells, stable }. See lib/blockOutputKey.ts.
  writeFileSync(OUT_FILE, JSON.stringify(data));
}

/**
 * Prepopulated output is a nicety; any unhandled failure must leave the
 * committed manifest alone and exit 0 (consumers treat missing entries as "no
 * output"). Loud on the way out, so a silent stop is distinguishable from
 * "nothing changed".
 */
function failSoft(err) {
  console.error(`build-block-outputs: FAILED (${err?.message ?? err})`);
  // Never overwrite an existing manifest with `{}` — one transient failure
  // would wipe every lesson's output. Only a tree with no manifest at all
  // gets an empty one, so the build has something to read.
  if (existsSync(OUT_FILE)) {
    console.error(
      "build-block-outputs: keeping the committed manifest; only blocks added " +
        "since it was generated will show an empty output panel.",
    );
  } else {
    console.error("build-block-outputs: no manifest on disk, writing an empty one.");
    try {
      writeManifestFile({});
    } catch {
      /* nothing more we can do; the consumer treats a missing file as empty too */
    }
  }
  process.exit(0);
}
process.on("uncaughtException", failSoft);
process.on("unhandledRejection", failSoft);

const args = process.argv.slice(2);
const filter = parseFilter(
  args.includes("--filter") ? args[args.indexOf("--filter") + 1] : null,
);
const force = args.includes("--force");
const showStats = args.includes("--stats");
// `--empty` writes an empty manifest without booting Pyodide; every block
// falls back to the panel it had before this feature.
const emptyOnly = args.includes("--empty");
// `--adapter js,cpp` narrows a run to given languages, so a slow C++ pass is
// optional while a JavaScript one stays quick.
const adapterArg = args.includes("--adapter")
  ? args[args.indexOf("--adapter") + 1]
  : null;
const wanted = adapterArg
  ? adapterArg
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean)
  : null;
const doPython = !wanted || wanted.includes("python");
const textAdapters = TEXT_ADAPTERS.filter((a) => !wanted || wanted.includes(a));
/** True when this run looked at only part of the tree, and so must add to
 *  what is recorded rather than replace it. Every write below is guarded on it. */
const narrowed = Boolean(filter) || Boolean(wanted);
/** Per-language counts for the summary. */
const totals = {};

const allBlocks = doPython ? extractBlocks().filter((b) => !b.unparsable) : [];
const blocks = filter
  ? allBlocks.filter((b) => matchesFilter(filter, b.file))
  : allBlocks;

/**
 * What a previous run already recorded, reused block for block. Keys are
 * content hashes, so an existing entry is still correct; only new and edited
 * blocks execute, and when none do Pyodide never boots. Reuse is checked
 * against the committed manifest, not a cache stamp — `node_modules/.cache`
 * does not survive `npm ci` on a build runner. It also keeps committed assets
 * stable: matplotlib's PNG bytes differ run to run, so re-running everything
 * would churn every figure for no visible change.
 */
function loadManifestFile() {
  try {
    return JSON.parse(readFileSync(OUT_FILE, "utf8"));
  } catch {
    return {};
  }
}

const onDisk = loadManifestFile();
// `--force` means "do not *reuse* an entry", not "throw the file away": a
// narrowed run still has to carry the languages it is not looking at.
const previous = force ? {} : onDisk;

/** True when every file an entry points at is still on disk; otherwise the
 *  block must re-run rather than ship an entry whose image 404s. */
function entryIsIntact(entry) {
  return (entry?.cells ?? []).every(
    (c) => !c.src || existsSync(join(ROOT, "public", c.src)),
  );
}

/** True when an entry is nothing but diagnostics — the shape a panicked run
 *  leaves behind. Used to retire already-committed ones, which the write-site
 *  guard can never reach. */
function isDiagnosticsOnly(entry) {
  const cells = entry?.cells ?? [];
  return cells.length > 0 && cells.every((c) => c.type === "stderr");
}

// An unchanged content tree costs a stat signature and nothing else.
const cache = freshness(ROOT, "block-outputs", {
  inputs: [
    fileURLToPath(import.meta.url),
    join(ROOT, "scripts", "lib", "python-output-capture.mjs"),
    join(ROOT, "scripts", "lib", "pyodide-runner.mjs"),
    join(ROOT, "scripts", "lib", "block-runners.mjs"),
    join(ROOT, "lib", "blockOutputKey.ts"),
    join(ROOT, "app", "_components", "runtime", "pythonDisplayOutputs.ts"),
    ...collectFiles(join(ROOT, "content"), (f) => f.endsWith(".mdx")).map((rel) =>
      join(ROOT, "content", rel),
    ),
  ],
  outputs: [OUT_FILE],
});
if (cache.fresh && !force && !filter) {
  console.log("build-block-outputs: up to date (no lesson changed), skipping");
  process.exit(0);
}

if (emptyOnly) {
  // Never stamp the cache: the next real run must still do the work.
  writeManifestFile({});
  console.log("build-block-outputs: wrote an empty manifest (--empty)");
  process.exit(0);
}

if (blocks.length === 0 && textAdapters.length === 0) {
  // Selecting nothing must not mean recording nothing: `--adapter r` picks no
  // headless language, and writing `{}` here once threw away every entry on
  // the site. An empty manifest is what `--empty` is for.
  console.log("build-block-outputs: no blocks selected");
  if (!narrowed) writeManifestFile({});
  process.exit(0);
}

mkdirSync(ASSET_DIR, { recursive: true });

const { default: sharp } = await import("sharp");

/**
 * Pyodide, booted on first use: the boot alone is ~11s, pure waste on a run
 * where every block is already in the manifest.
 */
let runtime = null;
async function ensureRuntime() {
  if (!runtime) {
    runtime = await bootPyodide("build-block-outputs");
    runtime.py.runPython(captureSetupScript());
  }
  return runtime;
}

/**
 * Write one figure out as a WebP and return its URL, or null when the encode
 * fails or the result is implausibly large. Quality 82 matches build-images.mjs.
 */
async function writeFigure(base64, key, index) {
  const name = `${key}-${index}.webp`;
  try {
    const webp = await sharp(Buffer.from(base64, "base64")).webp({ quality: 82 }).toBuffer();
    if (webp.length > MAX_IMAGE_BYTES) return null;
    writeFileSync(join(ASSET_DIR, name), webp);
    imageBytes += webp.length;
    return `${ASSET_URL_BASE}/${name}`;
  } catch {
    return null;
  }
}

/**
 * Write one Plotly figure out as JSON and return its URL, or null when it is
 * implausibly large. Same reasoning as the images: inline, figure JSON was
 * nearly the whole manifest.
 */
function writePlot(json, key, index) {
  const name = `${key}-${index}.json`;
  if (json.length > MAX_PLOT_BYTES) return null;
  try {
    writeFileSync(join(ASSET_DIR, name), json);
    plotBytes += json.length;
    return `${ASSET_URL_BASE}/${name}`;
  } catch {
    return null;
  }
}

/** Read and reset the Python-side output buffer for one run. */
function takeOutputs(py) {
  try {
    return JSON.parse(py.runPython("_bo_take()"));
  } catch {
    return [];
  }
}

/** Cells → bytes, the measure the caps are expressed in. */
function cellBytes(cells) {
  return cells.reduce((n, c) => n + c.content.length, 0);
}

/** Drop a block's entry rather than ship a partial one. Returns null when
 *  any ceiling is hit, and says which, so a silent truncation can never be
 *  mistaken for full coverage. */
function withinCaps(cells) {
  for (const cell of cells) {
    if ((cell.type === "stdout" || cell.type === "stderr") && cell.content.length > MAX_TEXT_CHARS) {
      return "text";
    }
    if (cell.content.length > MAX_CELL_BYTES) return "cell";
  }
  return cellBytes(cells) > MAX_BLOCK_BYTES ? "block" : null;
}

/**
 * Whether two runs produced the same *content*. Two normalisations, or the
 * flag would report almost every block unstable: object reprs carry a memory
 * address (masked as 0xADDR), and PNG bytes are not reproducible, so images
 * compare by presence and position only.
 */
function normalizeForCompare(cell) {
  if (cell.type === "image") return "image";
  return `${cell.type}:${cell.content.replace(/0x[0-9a-f]+/gi, "0xADDR")}`;
}

function sameOutput(a, b) {
  if (a.length !== b.length) return false;
  return a.every((c, i) => normalizeForCompare(c) === normalizeForCompare(b[i]));
}

/**
 * Lesson path → { key → { cells, stable } }. A narrowed run starts from what
 * is on disk because it only *adds*; a full run starts empty on purpose — that
 * retires deleted blocks' entries — but only for the languages this generator
 * can re-record. `carryCapturedEntries` below puts the rest back.
 */
const manifest = narrowed ? structuredClone(onDisk) : {};
const stats = {
  ran: 0,
  reused: 0,
  recorded: 0,
  empty: 0,
  failed: 0,
  retired: 0,
  environmental: 0,
  timedOut: 0,
  unstable: 0,
  overCap: { text: 0, cell: 0, block: 0 },
  bytes: 0,
};
const unstableExamples = [];
const timedOutExamples = [];
const overCapExamples = [];
let imageBytes = 0;
let imagesWritten = 0;
let imagesDropped = 0;
let plotBytes = 0;
let plotsWritten = 0;
let plotsDropped = 0;
// Asset filenames still referenced by the manifest, so the prune below can
// delete the ones no block points at any more.
const keptAssets = new Set();

/**
 * Carry forward the entries this generator does not produce:
 * `capture-browser-outputs.mjs` records r/java/csharp/web/react/php into this
 * manifest under the same keys, and a full run starting empty would silently
 * delete them (a loss invisible in a single-line JSON diff, and nothing runs
 * the capture to put them back). Only keys still matching a block in
 * `content/` are carried, so deleted captured blocks are still pruned.
 * `--force` does not reach them: they are not this generator's to re-execute.
 */
function carryCapturedEntries() {
  let carried = 0;
  let stale = 0;
  for (const adapter of BROWSER_ADAPTERS) {
    for (const block of extractBlocks(undefined, adapter)) {
      if (block.unparsable || block.expectError) continue;
      const entry = block.files.find((f) => f.filename === block.entry) ?? block.files[0];
      if (!entry) continue;
      const key = blockOutputKey(adapter, entry.initCode, entry.starterCode);
      const recorded = onDisk[block.file]?.[key];
      if (!recorded) continue;
      // A missing figure would render a 404 and this generator cannot re-run
      // the block; dropping the entry gives the usual empty-panel fallback.
      if (!entryIsIntact(recorded)) {
        stale++;
        continue;
      }
      (manifest[block.file] ??= {})[key] = recorded;
      for (const cell of recorded.cells) if (cell.src) keptAssets.add(basename(cell.src));
      carried++;
    }
  }
  return { carried, stale };
}

// A narrowed run already cloned the whole manifest, captured entries and all.
const captured = narrowed ? { carried: 0, stale: 0 } : carryCapturedEntries();

for (const [i, block] of blocks.entries()) {
  const entry = block.files.find((f) => f.filename === block.entry) ?? block.files[0];

  // Blocks whose lesson *is* the failure are skipped: the panel would show
  // a traceback the reader is meant to produce themselves.
  if (block.expectError) continue;

  const key = blockOutputKey("python", entry.initCode, entry.starterCode);

  // Reuse: the key is a source hash, so an intact entry cannot be stale, and
  // reusing it keeps an unchanged tree from booting Pyodide at all.
  const reusable = previous[block.file]?.[key];
  if (isDiagnosticsOnly(reusable)) {
    // Drop it and re-run: if the block still only produces a traceback the
    // guard below refuses it, and if it has been fixed it records properly.
    delete manifest[block.file]?.[key];
    stats.retired++;
  } else if (reusable && entryIsIntact(reusable)) {
    (manifest[block.file] ??= {})[key] = reusable;
    for (const cell of reusable.cells) if (cell.src) keptAssets.add(basename(cell.src));
    stats.reused++;
    stats.recorded++;
    stats.bytes += cellBytes(reusable.cells);
    continue;
  }

  const { py, run, stage } = await ensureRuntime();
  const source = wrapLastExpression(py, block.code);

  // Stage remote datasets and sibling files, as `check-code-blocks.mjs` does;
  // without this every CSV-reading block records FileNotFoundError.
  const stageError = await stage(block);
  if (stageError) {
    stats.failed++;
    continue;
  }

  let first;
  try {
    const r = await run(source, { capture: false });
    first = takeOutputs(py);
    if (r.error) {
      if (isEnvironmental({ full: r.full, error: r.error })) stats.environmental++;
      else stats.failed++;
      continue;
    }
  } catch {
    stats.failed++;
    continue;
  }
  stats.ran++;

  // Second run, for the determinism flag. Cheap: the interpreter is warm
  // and the packages are loaded.
  let second = [];
  try {
    await run(source, { capture: false });
    second = takeOutputs(py);
  } catch {
    /* a block that ran once and threw the second time counts as unstable */
  }

  const cells = toOutputCells(first);
  if (cells.length === 0) {
    stats.empty++;
    continue;
  }
  // `r.error` catches exceptions but not a *panic*, which Pyodide prints to
  // stderr without raising (e.g. polars' thread pool failing under Node), so
  // the traceback would become the recorded output. Anything real leaves a
  // stdout, table or figure behind, so the test is "stderr and nothing else"
  // — a block whose whole output is one DataFrame has no stdout either.
  if (cells.every((c) => c.type === "stderr")) {
    stats.failed++;
    continue;
  }

  const stable = sameOutput(cells, toOutputCells(second));
  if (!stable) {
    stats.unstable++;
    if (unstableExamples.length < 5) unstableExamples.push(`${block.file}:${block.line}`);
  }

  // Externalise the figures; a cell whose image cannot be encoded is dropped
  // rather than left inline.
  const stored = [];
  let figureIndex = 0;
  for (const cell of cells) {
    if (cell.type === "image") {
      const src = await writeFigure(cell.content, key, figureIndex++);
      if (!src) {
        imagesDropped++;
        continue;
      }
      imagesWritten++;
      keptAssets.add(basename(src));
      stored.push({ type: "image", content: "", src });
      continue;
    }
    if (cell.type === "plot") {
      const src = writePlot(cell.content, key, figureIndex++);
      if (!src) {
        plotsDropped++;
        continue;
      }
      plotsWritten++;
      keptAssets.add(basename(src));
      // `content` stays empty: the renderer fetches the JSON itself, and a
      // parsed copy here would put the whole figure back into the payload.
      stored.push({ type: "plot", content: "", src });
      continue;
    }
    stored.push(cell);
  }
  if (stored.length === 0) {
    stats.empty++;
    continue;
  }

  // Checked after externalising: the ceilings apply to what goes inline; an
  // image cell costs a short URL here and is bounded by MAX_IMAGE_BYTES on disk.
  const capped = withinCaps(stored);
  if (capped) {
    stats.overCap[capped]++;
    if (overCapExamples.length < 5) {
      overCapExamples.push(`${block.file}:${block.line} (${capped}, ${cellBytes(stored)} B)`);
    }
    continue;
  }

  (manifest[block.file] ??= {})[key] = { cells: stored, stable };
  stats.recorded++;
  stats.bytes += cellBytes(stored);

  if (showStats && (i + 1) % 100 === 0) {
    console.log(`  …${i + 1}/${blocks.length}  (${block.file}:${block.line})`);
  }
}

/**
 * One block, with a wall clock on it: a lesson may demonstrate an infinite
 * loop, and the build has no Stop button. A timed-out block records nothing,
 * which is the panel it had before.
 */
const BLOCK_TIMEOUT_MS = 20_000;
async function runBounded(runner, block) {
  let timer;
  try {
    return await Promise.race([
      runner.run(block),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), BLOCK_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// ─── The languages that are not Python ──────────────────────────────────
//
// Text-only output. These share the content-hash key, reuse check, stability
// flag, size caps and manifest with the Python path, and differ only in what
// produces the text: `scripts/lib/block-runners.mjs`, the same runtimes the
// browser uses.
for (const adapter of textAdapters) {
  const all = extractBlocks(undefined, adapter).filter((b) => !b.unparsable);
  const selected = filter
    ? all.filter((b) => matchesFilter(filter, b.file))
    : all;
  if (selected.length === 0) continue;

  totals[adapter] = { total: selected.length, ran: 0, recorded: 0 };

  // Reuse before booting a runtime, exactly as on the Python path.
  const pending = [];
  for (const block of selected) {
    if (block.expectError) continue; // the panel would show the error the reader is meant to produce
    const entry =
      block.files.find((f) => f.filename === block.entry) ?? block.files[0];
    const key = blockOutputKey(adapter, entry.initCode, entry.starterCode);
    const reusable = previous[block.file]?.[key];
    if (reusable && entryIsIntact(reusable)) {
      (manifest[block.file] ??= {})[key] = reusable;
      stats.reused++;
      stats.recorded++;
      totals[adapter].recorded++;
      stats.bytes += cellBytes(reusable.cells);
      continue;
    }
    pending.push({ block, key });
  }
  if (pending.length === 0) continue;

  let runner;
  try {
    runner = await createRunner(adapter);
  } catch (err) {
    // A missing toolchain is a reason to record nothing for this language,
    // not a reason to fail a build that is otherwise fine.
    console.log(
      `build-block-outputs: skipping ${adapter} (${err?.message ?? err})`,
    );
    continue;
  }

  for (const [i, { block, key }] of pending.entries()) {
    const cells = await runBounded(runner, block);
    stats.ran++;
    totals[adapter].ran++;

    if (cells === null) {
      stats.timedOut++;
      if (timedOutExamples.length < 5)
        timedOutExamples.push(`${block.file}:${block.line}`);
      continue;
    }
    if (cells.length === 0) {
      stats.empty++;
      continue;
    }
    // Diagnostics-only means the block ran and failed; the Python path drops
    // these for the same reason.
    if (!cells.some((c) => c.type === "stdout")) {
      stats.failed++;
      continue;
    }

    // Second run for the determinism flag; a timeout on the repeat counts as
    // unstable.
    const again = await runBounded(runner, block);
    const stable = again !== null && sameOutput(cells, again);
    if (!stable) {
      stats.unstable++;
      if (unstableExamples.length < 5)
        unstableExamples.push(`${block.file}:${block.line}`);
    }

    const capped = withinCaps(cells);
    if (capped) {
      stats.overCap[capped]++;
      if (overCapExamples.length < 5) {
        overCapExamples.push(
          `${block.file}:${block.line} (${capped}, ${cellBytes(cells)} B)`,
        );
      }
      continue;
    }

    (manifest[block.file] ??= {})[key] = { cells, stable };
    stats.recorded++;
    totals[adapter].recorded++;
    stats.bytes += cellBytes(cells);

    if (showStats && (i + 1) % 50 === 0) {
      console.log(
        `  …${adapter} ${i + 1}/${pending.length}  (${block.file}:${block.line})`,
      );
    }
  }
  await runner.dispose?.();
}

// Prune assets no manifest entry points at any more: a deleted block, or an
// edited one whose new key wrote new files. A narrowed run only looked at
// part of the tree, so it must not delete the rest's files.
let pruned = 0;
if (!narrowed) {
  for (const name of readdirSync(ASSET_DIR)) {
    if (keptAssets.has(name)) continue;
    try {
      unlinkSync(join(ASSET_DIR, name));
      pruned++;
    } catch {
      /* leave it; a stray file is harmless, a crashed generator is not */
    }
  }
}

writeManifestFile(manifest);
// A narrowed run only covers part of the tree, so it must not stamp the
// cache as if it had covered all of it.
if (!narrowed) cache.commit();

/** Every block this run looked at, across all languages. */
function selectedTotal() {
  return blocks.length + Object.values(totals).reduce((n, t) => n + t.total, 0);
}

const kb = Math.round(stats.bytes / 1024);
const assetKb = Math.round((imageBytes + plotBytes) / 1024);
console.log(
  `build-block-outputs: ${stats.recorded} block(s) recorded of ${selectedTotal()} ` +
    `(${stats.reused} reused, ${stats.ran} executed), ${kb} kB inline, ` +
    `${imagesWritten} image(s) + ${plotsWritten} figure(s) written (${assetKb} kB)` +
    `${pruned ? `, ${pruned} stale asset(s) pruned` : ""}, ` +
    `${stats.empty} produced no output, ${stats.failed} failed, ` +
    `${stats.environmental} could not run in Node`,
);
// Printed on every full run: these are entries this generator carries but
// cannot rebuild, and their loss is otherwise invisible.
if (!narrowed) {
  console.log(
    `build-block-outputs: ${captured.carried} captured entr(ies) carried forward ` +
      `(${BROWSER_ADAPTERS.join(", ")} — see capture-browser-outputs.mjs)` +
      `${captured.stale ? `, ${captured.stale} dropped for a missing figure` : ""}`,
  );
}
// The only sign that a traceback-only entry was dropped and its block now
// shows the empty panel.
if (stats.retired > 0) {
  console.log(
    `build-block-outputs: ${stats.retired} diagnostics-only entr(ies) retired ` +
      `(a panic recorded as output); those blocks now show an empty panel`,
  );
}
const byAdapter = Object.entries(totals)
  .map(([a, t]) => `${a} ${t.recorded}/${t.total}`)
  .join(", ");
if (byAdapter) console.log(`build-block-outputs: ${byAdapter}`);
if (imagesDropped + plotsDropped > 0) {
  console.log(
    `build-block-outputs: ${imagesDropped} image(s) and ${plotsDropped} figure(s) ` +
      `were too large to write and were dropped`,
  );
}
// Never let a cap pass silently.
const droppedByCap = stats.overCap.text + stats.overCap.cell + stats.overCap.block;
if (droppedByCap > 0) {
  console.log(
    `build-block-outputs: ${droppedByCap} block(s) left empty by the size caps ` +
      `(${stats.overCap.text} text, ${stats.overCap.cell} cell, ${stats.overCap.block} block)` +
      (overCapExamples.length ? `, e.g. ${overCapExamples.join(", ")}` : ""),
  );
}
if (stats.timedOut > 0) {
  console.log(
    `build-block-outputs: ${stats.timedOut} block(s) hit the ${BLOCK_TIMEOUT_MS / 1000}s ` +
      `timeout and were left empty` +
      (timedOutExamples.length ? `, e.g. ${timedOutExamples.join(", ")}` : ""),
  );
}
if (stats.unstable > 0) {
  console.log(
    `build-block-outputs: ${stats.unstable} block(s) differed between two runs ` +
      `(recorded, flagged unstable)` +
      (unstableExamples.length ? `, e.g. ${unstableExamples.join(", ")}` : ""),
  );
}

// A lesson may leave an interval running and almostnode keeps the handle, so
// the event loop never drains; exit explicitly. The runners have restored
// `process.exit` by now, so this is the real one.
process.exit(0);
