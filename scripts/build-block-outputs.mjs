/**
 * Runs every `<CodeBlock>` there is a headless runtime for and records what it
 * printed, so a lesson can show a block's output before the reader presses Run.
 *
 * Python runs here, through Pyodide; JavaScript, TypeScript, C and C++ run
 * through `scripts/lib/block-runners.mjs`, which explains what is missing and
 * why. Before those were added this script was Python-only, and the other
 * 1,685 runnable blocks on the site showed an empty panel until the reader
 * pressed Run — not one course, but every language that is not Python.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 * A runnable block that shows nothing until it is run asks the reader to
 * press a button before the page makes its point. That is a fine trade for
 * the reader who wants to experiment and a bad one for the reader who is
 * skimming, and the second reader is most readers. This fills the panel in
 * ahead of time so the lesson reads end to end, and Run still does exactly
 * what it always did — the prepopulated cells are replaced the moment the
 * reader executes anything.
 *
 * Nothing invokes this automatically except
 * `.github/workflows/block-outputs.yml`. Neither `build` nor `dev` runs it:
 * executing lesson code is not something a deploy or a local start should be
 * doing, and the manifest it writes is committed.
 *
 * ── How it works ────────────────────────────────────────────────────────
 * It boots the same Pyodide-in-Node the content sweeps use
 * (`scripts/lib/pyodide-runner.mjs`), then re-patches the three rendering
 * seams that runner deliberately stubs (`scripts/lib/python-output-capture.mjs`),
 * so a DataFrame, a matplotlib figure and a Plotly chart come back in the
 * same wire shape the browser worker produces. The JS-side conversion into
 * `OutputCell`s is imported from `app/_components/runtime/pythonDisplayOutputs.ts`
 * rather than reimplemented, which is what keeps a prepopulated panel and a
 * freshly-run one rendering identically.
 *
 * Entries are keyed by a hash of the block's source (`lib/blockOutputKey.ts`),
 * not by file and line: an edited block simply loses its entry and falls back
 * to the empty panel, where a positional key would confidently show output the
 * code no longer produces.
 *
 * ── Determinism ─────────────────────────────────────────────────────────
 * Every block runs twice and the two results are compared. Matching runs are
 * recorded `stable: true`; differing ones `stable: false`. Nothing in the UI
 * branches on that today (every prepopulated panel is labelled a preview,
 * because sorting deterministic blocks from non-deterministic ones is a
 * losing game), but it is a real signal: a block that is *supposed* to be
 * reproducible and isn't shows up in this script's summary.
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
import { createRunner, TEXT_ADAPTERS } from "./lib/block-runners.mjs";
import { bootPyodide, isEnvironmental } from "./lib/pyodide-runner.mjs";
import { captureSetupScript, wrapLastExpression } from "./lib/python-output-capture.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "lib", "generated");
// JSON, not a JS module: `lib/blockOutputs.ts` reads it with `fs` at build
// time rather than importing it, so none of it reaches the Cloudflare Worker
// (a static import put the bundle 136 kB over its 10 MiB gzipped cap and the
// upload was rejected outright).
const OUT_FILE = join(OUT_DIR, "block-outputs.json");
// Charts land here as files rather than inside the manifest, and between
// them they were essentially the entire payload. Base64 PNG was 98% of the
// first measurement (1,165 kB of 1,189 kB across one course, 273 kB on a
// single lesson); with the images externalised, Plotly figure JSON was 88%
// of what remained, 160 kB on the heaviest lesson, and the sole reason 11
// chart blocks had to be dropped outright. All of it would have been
// inlined into the page whether or not the reader ever scrolled to the
// block. As files they are fetched lazily and cached apart from the HTML.
const ASSET_DIR = join(ROOT, "public", "block-outputs");
const ASSET_URL_BASE = "/block-outputs";

/**
 * Size ceilings, and why each one is where it is.
 *
 * Every byte here is paid by a reader loading the lesson, whether or not
 * they look at the block, so the caps are deliberately tighter than "what
 * fits". A block over the limit gets no entry at all rather than a
 * truncated one: half a table is worse than no table, because it looks
 * like the answer.
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
 * Prepopulated output is a nicety; the site is correct without it. So a
 * failure here — a Pyodide boot that cannot reach its packages, a dataset
 * fetch that times out, an OOM part-way through 2,600 blocks — must never
 * take the run that invoked it down with it. Anything unhandled leaves the
 * committed manifest alone and exits 0, which every consumer already treats
 * as "no entries": blocks show the panel they showed before this feature
 * existed, and the workflow carries on.
 *
 * Loud on the way out, though. A regeneration that silently stopped
 * prepopulating would be indistinguishable from one where nothing changed.
 */
function failSoft(err) {
  console.error(`build-block-outputs: FAILED (${err?.message ?? err})`);
  // Leave a manifest that is already on disk exactly where it is. It is
  // committed, so it is correct for every block except the handful this run
  // was going to add — and overwriting it with `{}` would turn one transient
  // failure (a dataset fetch timing out on a build runner, say) into every
  // lesson on the site losing its output. Only a tree that has no manifest
  // at all gets an empty one written, so the build has something to read.
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
// `--empty` writes an empty manifest without booting Pyodide, for a tree
// that wants the feature switched off. `lib/blockOutputs.ts` reads an empty
// manifest exactly as it reads a missing entry, so every block falls back to
// the panel it had before any of this.
const emptyOnly = args.includes("--empty");
// `--adapter js,cpp` narrows a run to one language, which is what makes a
// twenty-minute C++ pass optional while a JavaScript one stays quick.
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
/** Per-language counts for the summary, so a language that recorded nothing
 *  is visible rather than averaged away. */
const totals = {};

const allBlocks = doPython ? extractBlocks().filter((b) => !b.unparsable) : [];
const blocks = filter
  ? allBlocks.filter((b) => matchesFilter(filter, b.file))
  : allBlocks;

/**
 * What a previous run already recorded, reused block for block.
 *
 * This is what makes the generator cheap in the places that matter. Keys are
 * content hashes, so an entry that exists is an entry that is still correct:
 * a block whose source has not changed cannot have changed its output. Only
 * new and edited blocks are executed, and when none are, Pyodide is never
 * booted at all.
 *
 * That is the difference between a deploy paying twelve minutes and a deploy
 * paying seconds. The stat-signature cache below cannot help there —
 * `node_modules/.cache` does not survive the `npm ci` on a build runner — but
 * the committed manifest does, so reuse is checked against the manifest
 * itself rather than against a stamp.
 *
 * It also keeps the committed assets stable. Matplotlib's PNG bytes are not
 * reproducible run to run (the same figure came back 24 bytes different),
 * so re-running everything would rewrite all 368 files on every regeneration
 * and churn the history for no change in what a reader sees.
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
// narrowed run still has to carry the languages it is not looking at, and
// conflating the two is what deleted every Python entry on the site.
const previous = force ? {} : onDisk;

/** True when a recorded entry is still usable: every file it points at is
 *  still on disk. A pruned or half-copied asset directory must re-run the
 *  block rather than ship a manifest entry whose image 404s. */
function entryIsIntact(entry) {
  return (entry?.cells ?? []).every(
    (c) => !c.src || existsSync(join(ROOT, "public", c.src)),
  );
}

/** True when an entry is nothing but diagnostics — the shape a run that
 *  panicked leaves behind. Recording one is guarded against below; this is
 *  what retires the ones already committed, since a narrowed run clones the
 *  manifest on disk and a guard at the write site can never reach them. */
function isDiagnosticsOnly(entry) {
  const cells = entry?.cells ?? [];
  return cells.length > 0 && cells.every((c) => c.type === "stderr");
}

// An unchanged content tree costs a stat signature and nothing else, the
// same contract every other generator honours. Without it, a regeneration
// would re-scan every lesson to discover that none of them moved.
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
  console.log("build-block-outputs: no blocks selected");
  writeManifestFile({});
  process.exit(0);
}

mkdirSync(ASSET_DIR, { recursive: true });

const { default: sharp } = await import("sharp");

/**
 * Pyodide, booted on first use rather than up front.
 *
 * The boot alone is ~11s and the packages more, which is pure waste on the
 * common path: a run where every block is already in the manifest never
 * executes anything. Deferring it is what lets a deploy that only needs to
 * verify the manifest finish in seconds.
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
 * Write one figure out as a WebP and return its URL, or null when the
 * encode fails or the result is implausibly large.
 *
 * Quality 82 is the same setting `build-images.mjs` uses for illustrations.
 * Charts are flat-colour line art, which is where WebP wins most against
 * matplotlib's PNG.
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
 * Write one Plotly figure out as JSON and return its URL, or null when it
 * is implausibly large.
 *
 * Same reasoning as the images, and the same measurement behind it: with
 * the PNGs externalised, figure JSON was 2,328 kB of the manifest's 2,635 kB
 * and put 160 kB on the heaviest lesson. It was also the sole reason 11
 * chart blocks were dropped outright, at 146 kB to 866 kB a cell.
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
 * Whether two runs produced the same *content*.
 *
 * Two normalisations, because without them the flag reports almost every
 * block as unstable and therefore says nothing:
 *
 *   - **Object reprs carry a memory address.** A block ending in a bare
 *     `sns.catplot(...)` prints `<seaborn.axisgrid.FacetGrid object at
 *     0x65cbb90>`, and the address moves every run. The browser prints the
 *     same line, so this is faithful output, not a defect — but it is not
 *     a *difference* either.
 *   - **PNG bytes are not reproducible.** The same figure came back at
 *     10,472 and 10,496 bytes across two runs of one block. Images are
 *     therefore compared by presence and position, not by content; a chart
 *     that genuinely changed would show up as a different cell count or a
 *     different cell order.
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
 * Lesson path → { key → { cells, stable } }.
 *
 * A narrowed run (`--filter`, `--adapter`) starts from what is already
 * recorded, because it is only *adding* to it. Starting empty and writing at
 * the end is what a full run does, and doing it after `--adapter typescript`
 * deleted every Python entry on the site along with 364 of their figures.
 */
const narrowed = Boolean(filter) || Boolean(wanted);
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

for (const [i, block] of blocks.entries()) {
  const entry = block.files.find((f) => f.filename === block.entry) ?? block.files[0];

  // Blocks whose lesson *is* the failure are skipped: the panel would show
  // a traceback the reader is meant to produce themselves.
  if (block.expectError) continue;

  const key = blockOutputKey("python", entry.initCode, entry.starterCode);

  // Already recorded, and the files it points at are still there. The key is
  // a hash of the source, so this entry cannot be stale, and reusing it is
  // what keeps an unchanged tree from booting Pyodide at all.
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

  // Stage the block's remote datasets and sibling files, the same way
  // `check-code-blocks.mjs` does. Without this every block that reads a
  // CSV — the whole seaborn course, much of pandas — raises
  // FileNotFoundError and is recorded as a failure rather than as output.
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
  // A block that produced nothing but diagnostics ran and failed, and its
  // panel would teach the reader the wrong thing. `r.error` catches that for
  // an exception; it does not catch a *panic*, which Pyodide prints to stderr
  // and does not raise, so `runPythonAsync` resolves and the traceback becomes
  // the block's recorded output. Polars' thread pool cannot start under Node
  // and poisons its `LazyLock` for the rest of the process, which is exactly
  // this shape: 31 polars lessons in the committed manifest previewed a Rust
  // panic. Anything real leaves a stdout, a table or a figure behind, so the
  // test is "stderr and nothing else" rather than the text adapters' "no
  // stdout" — a block whose whole output is one DataFrame has no stdout
  // either.
  if (cells.every((c) => c.type === "stderr")) {
    stats.failed++;
    continue;
  }

  const stable = sameOutput(cells, toOutputCells(second));
  if (!stable) {
    stats.unstable++;
    if (unstableExamples.length < 5) unstableExamples.push(`${block.file}:${block.line}`);
  }

  // Externalise the figures. A cell whose image cannot be encoded is
  // dropped rather than left inline: one 80 kB base64 blob is exactly the
  // weight this whole step exists to avoid.
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
      // `plot` is dropped along with `content`: the renderer fetches and
      // parses the JSON itself, and keeping the parsed copy here would put
      // the whole figure straight back into the payload.
      stored.push({ type: "plot", content: "", src });
      continue;
    }
    stored.push(cell);
  }
  if (stored.length === 0) {
    stats.empty++;
    continue;
  }

  // The ceilings apply to what actually goes inline, which is why this runs
  // after the figures have been externalised: an image cell costs a short
  // URL here and is bounded separately by MAX_IMAGE_BYTES on disk.
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
 * One block, with a wall clock on it.
 *
 * A lesson is free to demonstrate a loop that never ends, and one of them
 * does; the browser gives the reader a Stop button, and a build has no such
 * thing. Without this the generator hangs on that block forever rather than
 * recording the other 529. A block that runs out of time is recorded as
 * nothing at all, which is the panel it had before.
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
// Everything above is Pyodide and the structured cells it produces. The rest
// of the site's runnable blocks print text, and until now every one of them
// showed an empty panel: 1,685 of 3,374 blocks, which is not a course but
// every language that is not Python.
//
// They share all of the machinery below the runtime — the content-hash key,
// the reuse check, the two-run stability flag, the size caps and the manifest
// — and differ only in what produces the text. `scripts/lib/block-runners.mjs`
// owns that part, and each runner is the same runtime the browser uses.
for (const adapter of textAdapters) {
  const all = extractBlocks(undefined, adapter).filter((b) => !b.unparsable);
  const selected = filter
    ? all.filter((b) => matchesFilter(filter, b.file))
    : all;
  if (selected.length === 0) continue;

  totals[adapter] = { total: selected.length, ran: 0, recorded: 0 };

  // Anything already recorded is reused before a runtime is booted, exactly
  // as on the Python path: a tree whose blocks have not changed pays nothing.
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
    // A block that only produced diagnostics ran and failed. Recording the
    // error as its preview would teach the reader the wrong thing, and the
    // Python path drops these for the same reason.
    if (!cells.some((c) => c.type === "stdout")) {
      stats.failed++;
      continue;
    }

    // Second run, for the determinism flag, the same as Python. A block that
    // finished once and timed out on the repeat counts as unstable.
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
// Loud, because it is the only sign that a lesson stopped previewing
// something: an entry that was nothing but a traceback has been dropped and
// the block falls back to the empty panel.
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
// Never let a cap pass silently: a dropped block reads as "we covered
// everything" unless it is said out loud.
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

// Every byte is written and every stat is printed; what is left is other
// people's timers. A lesson is free to leave an interval running, and
// almostnode keeps the handle, so the event loop never drains and a build
// step that has finished its work sits there until CI kills it. The runners
// have restored `process.exit` by now, so this is the real one.
process.exit(0);
