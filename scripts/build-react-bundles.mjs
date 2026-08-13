/**
 * Precompiled React bundles, so a `<CodeBlock adapter="react">` can render
 * its result before the reader presses Run.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * `web` blocks auto-render for free: composing their document is a pure
 * string operation and the browser is the runtime. `react` cannot do that,
 * because TSX has to be translated before a browser will take it, and the
 * translator is a ~3 MB esbuild-wasm download the reader would pay just for
 * scrolling past a lesson.
 *
 * So the translation moves here. It is possible at all because the bundler
 * marks every bare import **external** and rewrites it to a pinned esm.sh
 * URL (`esmResolve.ts`) — the bundle is a pure function of the block's own
 * tabs, with no node_modules and no network. That makes it small, stable,
 * and safe to commit; the reader's browser fetches React itself, once, and
 * caches it across the whole course.
 *
 * ── Why it is a workflow and not part of the build ────────────────────────
 *
 * Same reasoning as `build-block-outputs`, one order of magnitude down:
 * bundling 25 workspaces is real work that returns the same answer until a
 * lesson changes, so paying it on every deploy — and every `dev` start —
 * buys nothing. `lib/generated/react-bundles.json` is committed,
 * `.github/workflows/react-bundles.yml` keeps it current, and `build` and
 * `dev` read it and bundle nothing. A block whose entry is missing simply
 * shows the empty preview panel it showed before this existed.
 *
 * ── Reuse ─────────────────────────────────────────────────────────────────
 *
 * Keyed by `blockOutputKey` — the same content hash the prepopulated-output
 * manifest uses — so editing one block re-bundles that block and nothing
 * else. Reuse is checked against the committed manifest rather than a local
 * cache stamp, deliberately: `node_modules/.cache` does not survive the
 * `npm ci` on a CI runner, and the manifest does.
 *
 * ── Drift ─────────────────────────────────────────────────────────────────
 *
 * The resolution rules, loader table and build options all come from
 * `app/_components/runtime/reactBundle.ts`, which the browser worker imports
 * too (via the resolver hook in `scripts/lib/ts-resolve.mjs`). The esbuild
 * version is pinned to `ESBUILD_WASM_VERSION` from `cdn.ts` — the same
 * number the worker loads from jsDelivr — and this script fails loudly if
 * the installed devDependency disagrees. A bundle that differs between here
 * and the reader's Run would show them one thing and produce another.
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

// Dynamic on purpose, and it has to stay that way. A static `import`
// declaration is hoisted and resolved before *any* statement in this module
// runs, so the hook above would not be installed yet and the first shared
// module that imports a sibling extensionlessly would fail to resolve.
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
  // Not a warning. A different esbuild is a different bundle, and the
  // reader would see this one in the preview and the browser's in their Run.
  console.error(
    `esbuild-wasm mismatch: cdn.ts pins ${ESBUILD_WASM_VERSION}, node_modules has ${installed}.\n` +
      `Update the devDependency and the pin together, or the precompiled preview\n` +
      `will disagree with what the reader's own Run produces.`,
  );
  process.exit(1);
}
// No `wasmURL` here: that option is browser-only, and under Node the
// package finds its own `esbuild.wasm` beside itself. Same binary, same
// version — which is the whole point of pinning the devDependency to the
// number the worker loads from jsDelivr.
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
    // A block that will not bundle keeps no entry and falls back to the
    // empty preview panel — the same one it shows today. Loud, but not
    // fatal: one broken lesson must not cost the other 24 their previews.
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
