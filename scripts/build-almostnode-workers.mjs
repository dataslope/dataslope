#!/usr/bin/env node
/**
 * Pre-bundle the playground workers that must run as genuine module
 * workers (the almostnode-backed JS/TS workers and the Pyodide worker)
 * as standalone ES module files served from `/public/_workers/`.
 *
 * Why this exists:
 *
 * Turbopack's worker bundler emits a bootstrap script that loads its
 * dependency chunks with `importScripts.apply(self, chunks)`, and
 * explicitly strips the `type` option from the Worker constructor
 * (see `new e(u, i ? {...i, type: void 0} : void 0)` in Turbopack's
 * runtime). Two consequences for the almostnode worker:
 *
 *   1. `{ type: "module" }` on `new Worker(...)` is ignored, the
 *      worker is always classic.
 *   2. almostnode's ~16 MB bundle is split into many chunks, all
 *      concatenated via `importScripts`. Two chunks happen to declare
 *      the same minified top-level identifier (`e1`), and the worker
 *      aborts at startup with
 *      `SyntaxError: Failed to execute 'importScripts' on
 *       'WorkerGlobalScope': Identifier 'e1' has already been declared`.
 *
 * Switching the whole app to Webpack would fix it but would also slow
 * `next build`/`next dev` substantially. Pre-bundling only the two
 * worker files with esbuild keeps Turbopack for everything else while
 * producing a single self-contained worker module that has zero chunk
 * collisions to worry about.
 *
 * The output goes under `public/_workers/` so Next.js serves it as a
 * plain static asset at `/_workers/...`. The adapters spawn:
 *
 *     new Worker("/_workers/javascript-worker.js", { type: "module" })
 *
 * which Turbopack treats as a regular URL string (no static analysis,
 * no bundling).
 *
 * The Pyodide worker is bundled here for consequence 1 alone: Pyodide
 * 314's environment detection throws "Classic web workers are not
 * supported" at import time when `importScripts` works (i.e. in a
 * classic worker scope), so the worker MUST be spawned with a real
 * `{ type: "module" }` — which Turbopack-bundled workers can never be.
 *
 * Idempotent. Safe to run from `postinstall`, `prebuild`, and `predev`.
 */

import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = join(ROOT, "public", "_workers");
const SRC_DIR = join(ROOT, "app", "_components", "runtime");

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

/**
 * almostnode pulls in `just-bash`'s browser bundle (`vercel-labs/just-
 * bash`), which has straggler `import "node:zlib"` / `"node:async_hooks"`
 * / `"node:dns"` references that aren't actually called at runtime but
 * still trip esbuild's resolver. Stub every `node:*` specifier to an
 * empty module so the bundle resolves cleanly. almostnode ships its own
 * shims for the Node modules our user code actually touches (fs, path,
 * crypto, …) inside `dist/index.mjs`, so the empty stubs are only used
 * by dead-code branches.
 */
const stubNodeBuiltins = {
  name: "stub-node-builtins",
  setup(buildContext) {
    buildContext.onResolve({ filter: /^node:/ }, (args) => ({
      path: args.path,
      namespace: "node-stub",
    }));
    buildContext.onLoad({ filter: /.*/, namespace: "node-stub" }, () => ({
      // CommonJS loader so any `import { foo } from "node:zlib"`
      // resolves at runtime through property access on the stub
      // object, esbuild interops ESM↔CJS by reading properties
      // dynamically. just-bash's browser bundle imports things like
      // `{ gunzipSync, gzipSync, constants }` from `node:zlib` in dead
      // code paths; this stub returns `undefined` for any name so the
      // bundle resolves cleanly. If any of these are actually called,
      // they'll throw `TypeError: undefined is not a function`, which
      // is the right behaviour for code that was never meant to run in
      // a browser.
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
  // Workers don't have a DOM and we don't ship sourcemaps for them to
  // browsers, keeping the file small matters more than debuggability
  // here (the original .ts source is still in /app/_components/runtime).
  minify: true,
  legalComments: "none",
  // Tell esbuild we're targeting a worker so any conditional
  // browser-vs-worker package exports pick the right entry.
  conditions: ["worker", "browser", "import", "default"],
  plugins: [stubNodeBuiltins],
  // almostnode's bundle pulls in `comlink` which references
  // `MessageChannel` etc., all worker-safe globals.
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
    // Pyodide 314 refuses to boot in classic workers, and Turbopack
    // strips `{ type: "module" }` from workers it bundles itself, so
    // this worker is pre-bundled and spawned from a static URL (see
    // the docblock above). Its only imports are a type-only `pyodide`
    // import (erased) and a bundler-opaque dynamic `import()` of
    // pyodide.mjs from the CDN, so the bundle is tiny.
    entry: join(SRC_DIR, "pyodide-worker.ts"),
    out: join(OUT_DIR, "pyodide-worker.js"),
    why: "pyodide",
  },
];

/** Repo-relative, forward-slashed, so the line reads the same on Windows as it
 *  does in CI and matches how the other generators name their outputs. */
const shortPath = (abs) => relative(ROOT, abs).split(sep).join("/");

for (const { entry, out, why } of targets) {
  await build({
    ...common,
    entryPoints: [entry],
    outfile: out,
  });
  // Tagged for what this script does, not for the one dependency that first
  // forced it to exist: only the JS/TS workers are almostnode-backed, and the
  // Pyodide worker is here for an unrelated reason (see the docblock). The
  // per-target suffix says which is which, so a slow line or a stale bundle
  // points at the right cause.
  console.log(`[build-workers] wrote ${shortPath(out)} (${why})`);
}
