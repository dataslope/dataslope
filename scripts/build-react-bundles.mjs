/**
 * Precompiled React bundles, so a `<CodeBlock adapter="react">` can render
 * its result before the reader presses Run — TSX needs translating, and the
 * translator is a ~3 MB esbuild-wasm download the reader should not pay for
 * scrolling past a lesson. Bare imports are marked external and rewritten to
 * pinned esm.sh URLs (`esmResolve.ts`), so each bundle is a pure function of
 * the block's own tabs: small, stable, safe to commit.
 *
 * Run by `.github/workflows/react-bundles.yml`, not `build`/`dev`; the
 * manifest `lib/generated/react-bundles.json` is committed. Entries are keyed
 * by `blockOutputKey` and reuse is checked against the committed manifest
 * (`node_modules/.cache` does not survive `npm ci` on CI). Build options come
 * from `reactBundle.ts`, shared with the browser worker, and esbuild is
 * pinned to `ESBUILD_WASM_VERSION` — a version mismatch fails loudly, since a
 * differing bundle would show the reader one thing and Run another.
 *
 * Usage:
 *   node scripts/build-react-bundles.mjs [--force] [--filter <substr>] [--stats]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { extractBlocks } from "./lib/mdx-blocks.mjs";
import { enableTsResolution } from "./lib/ts-resolve.mjs";

enableTsResolution();

// Dynamic on purpose: a static `import` is hoisted and resolved before the
// resolver hook above is installed.
const { blockOutputKey } = await import("../lib/blockOutputKey.ts");
const { REACT_BUILD_OPTIONS, splitBundleOutput, vfsPlugin } = await import(
  "../app/_components/runtime/reactBundle.ts"
);
const { ESBUILD_WASM_VERSION } = await import(
  "../app/_components/runtime/cdn.ts"
);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = join(ROOT, "lib/generated/react-bundles.json");
const ADAPTER = "react";

const args = process.argv.slice(2);
const force = args.includes("--force");
const stats = args.includes("--stats");
const filterIdx = args.indexOf("--filter");
const filter = filterIdx === -1 ? null : args[filterIdx + 1];

// ─── esbuild, at the version the browser uses ────────────────────────────

const esbuild = await import("esbuild-wasm");
const installed = JSON.parse(
  readFileSync(join(ROOT, "node_modules/esbuild-wasm/package.json"), "utf8"),
).version;
if (installed !== ESBUILD_WASM_VERSION) {
  // Not a warning: a different esbuild is a different bundle.
  console.error(
    `esbuild-wasm mismatch: cdn.ts pins ${ESBUILD_WASM_VERSION}, node_modules has ${installed}.\n` +
      `Update the devDependency and the pin together, or the precompiled preview\n` +
      `will disagree with what the reader's own Run produces.`,
  );
  process.exit(1);
}
// No `wasmURL`: that option is browser-only; under Node the package finds
// its own `esbuild.wasm` beside itself.
await esbuild.initialize({});

// ─── Manifest ────────────────────────────────────────────────────────────

function loadManifest() {
  try {
    return JSON.parse(readFileSync(OUT_FILE, "utf8"));
  } catch {
    return {};
  }
}

const onDisk = loadManifest();
// `--force` means "do not *reuse* an entry", never "throw the file away":
// a narrowed run still has to carry the blocks it is not looking at.
const previous = force ? {} : onDisk;
const manifest = {};

// ─── Bundle ──────────────────────────────────────────────────────────────

/** Every file's effective source — init prepended to starter — which is
 *  exactly what `<CodeBlock>` hands the adapter at render time. */
function effectiveSources(block) {
  const files = new Map();
  for (const f of block.files) {
    const init = (f.initCode ?? "").trimEnd();
    files.set(f.filename, init ? `${init}\n${f.starterCode}` : f.starterCode);
  }
  return files;
}

async function bundleBlock(block) {
  const files = effectiveSources(block);
  const entry = files.has(block.entry) ? block.entry : block.files[0].filename;
  const result = await esbuild.build({
    ...REACT_BUILD_OPTIONS,
    entryPoints: [entry],
    plugins: [vfsPlugin(files)],
  });
  return splitBundleOutput(result.outputFiles);
}

const blocks = extractBlocks("content", ADAPTER).filter(
  (b) => !filter || b.file.includes(filter),
);

let reused = 0;
let built = 0;
let failed = 0;
let bytes = 0;

for (const block of blocks) {
  if (block.expectError) continue; // the failure is the lesson; don't pre-render it
  const entryFile =
    block.files.find((f) => f.filename === block.entry) ?? block.files[0];
  const key = blockOutputKey(ADAPTER, entryFile.initCode, entryFile.starterCode);

  const reusable = previous[block.file]?.[key];
  if (reusable) {
    (manifest[block.file] ??= {})[key] = reusable;
    reused++;
    bytes += reusable.js.length + (reusable.css?.length ?? 0);
    continue;
  }

  try {
    const { js, css } = await bundleBlock(block);
    const entry = { js, ...(css ? { css } : {}) };
    (manifest[block.file] ??= {})[key] = entry;
    built++;
    bytes += js.length + css.length;
    if (stats) {
      console.log(
        `  built ${block.file}:${block.line} → ${(js.length / 1024).toFixed(1)} kB`,
      );
    }
  } catch (err) {
    // A block that will not bundle keeps no entry and falls back to the empty
    // preview panel. Loud but not fatal: one broken lesson must not cost the
    // rest their previews.
    failed++;
    const message = err?.errors?.[0]?.text ?? err?.message ?? String(err);
    console.error(`  FAILED ${block.file}:${block.line} — ${message}`);
  }
}

// A narrowed run only looked at part of the tree, so it must not be the one
// that decides an unvisited block's entry should disappear.
const output = filter ? { ...onDisk, ...manifest } : manifest;

mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, `${JSON.stringify(output)}\n`);

console.log(
  `react-bundles: ${built + reused} block(s) (${reused} reused, ${built} bundled)` +
    `${failed ? `, ${failed} failed` : ""}, ${(bytes / 1024).toFixed(0)} kB total`,
);
process.exit(0);
