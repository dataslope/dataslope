#!/usr/bin/env node
/**
 * Pre-bundle the playground workers that must run as genuine module workers
 * (the almostnode JS/TS workers and the Pyodide worker) into standalone ES
 * modules under `public/_workers/`. Turbopack strips `{ type: "module" }`
 * from workers it bundles (always classic) and its `importScripts` chunking
 * collides on minified identifiers for almostnode's ~16 MB bundle; Pyodide
 * 314 refuses to boot in a classic worker at all. Adapters spawn these from
 * a plain URL string, which Turbopack leaves alone.
 *
 * Idempotent. Safe to run from `postinstall`, `prebuild`, and `predev`.
 */

import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { freshness, readManifest } from "./lib/build-cache.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "public", "_workers");
const SRC_DIR = join(ROOT, "app", "_components", "runtime");

/**
 * just-bash's browser bundle (pulled in by almostnode) has dead-code
 * `import "node:zlib"` etc. that still trip esbuild's resolver. Stub every
 * `node:*` specifier; almostnode ships its own shims for the Node modules
 * user code actually touches.
 */
const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^node:/ }, (args) => ({
      path: args.path,
      namespace: "node-stub",
    }));
    buildContext.onLoad({ filter: /.*/, namespace: "node-stub" }, () => ({
      // CJS Proxy stub: any named import resolves to `undefined`, and calling
      // one throws — the right behaviour for dead browser-bundle branches.
      contents:
        "module.exports = new Proxy({}, { get() { return undefined; } });",
      loader: "js",
    }));
  },
};

/** @type {import("esbuild").BuildOptions} */
const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  // No sourcemaps shipped; file size beats debuggability here.
  minify: true,
  legalComments: "none",
  // Worker-first conditions so conditional package exports pick the right entry.
  conditions: ["worker", "browser", "import", "default"],
  plugins: [stubNodeBuiltins],
};

const targets = [
  {
    entry: join(SRC_DIR, "javascript-worker.ts"),
    out: join(OUT_DIR, "javascript-worker.js"),
    why: "almostnode",
  },
  {
    entry: join(SRC_DIR, "typescript-worker.ts"),
    out: join(OUT_DIR, "typescript-worker.js"),
    why: "almostnode",
  },
  {
    // Pyodide 314 refuses to boot in classic workers (see the docblock above).
    entry: join(SRC_DIR, "pyodide-worker.ts"),
    out: join(OUT_DIR, "pyodide-worker.js"),
    why: "pyodide",
  },
];

/** Repo-relative, forward-slashed, so output reads the same on Windows. */
const shortPath = (abs) => relative(ROOT, abs).split(sep).join("/");

/**
 * Skip the bundle when nothing it reads has moved. The input set is the
 * dependency closure, unknowable up front, so it is learned from esbuild's
 * metafile and stat-checked next run; the first run after `npm ci` has no
 * list and always bundles. `package-lock.json` is stamped too so a dependency
 * bump re-bundles; plugin-namespace metafile keys are virtual and dropped.
 */
const cache = freshness(ROOT, "workers", {
  inputs: [
    fileURLToPath(import.meta.url),
    join(ROOT, "package-lock.json"),
    ...(readManifest(ROOT, "workers")?.bundleInputs ?? []).map((p) => join(ROOT, p)),
  ],
  outputs: targets.map((t) => t.out),
});
if (cache.fresh) {
  console.log("[build-workers] up to date (no worker source changed), skipping");
  process.exit(0);
}

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

const bundleInputs = new Set();
for (const { entry, out, why } of targets) {
  const result = await build({
    ...common,
    entryPoints: [entry],
    outfile: out,
    metafile: true,
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    if (!/^[a-z-]+:/.test(input)) bundleInputs.add(input);
  }
  // `why` names which dependency forced the pre-bundle, so a slow line or a
  // stale bundle points at the right cause.
  console.log(`[build-workers] wrote ${shortPath(out)} (${why})`);
}

// Stamp the closure the builds actually read, so the very next run is a hit.
const learned = [...bundleInputs].sort();
cache.commit({ bundleInputs: learned }, [
  fileURLToPath(import.meta.url),
  join(ROOT, "package-lock.json"),
  ...learned.map((p) => join(ROOT, p)),
]);
