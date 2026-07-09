#!/usr/bin/env node
/**
 * Post-install patch for almostnode.
 *
 * `almostnode`'s prebuilt bundle (`dist/index.mjs`) constructs its
 * internal `WorkerRuntime` with a server-absolute asset URL:
 *
 *   new Worker(new URL("/assets/runtime-worker-XYZ.js", import.meta.url), …);
 *
 * The leading slash assumes the bundle is loaded from an HTTP origin
 * that serves `node_modules` at the root (the Vite dev-server model the
 * library was authored against). Under Next.js / Turbopack, the URL
 * resolves to a filesystem path that does not exist and the build
 * aborts with `Module not found: Can't resolve '/assets/runtime-...'`.
 *
 * We don't use `WorkerRuntime` (the playground spawns its own dedicated
 * Web Worker via the LanguageAdapter contract), only `VirtualFS` and
 * `Runtime`. But Turbopack still statically analyses every `new URL(...,
 * import.meta.url)` in `index.mjs`, so the bad string has to go away
 * even if the surrounding class is dead code at runtime.
 *
 * The fix: rewrite `/assets/runtime-worker-...` → `./assets/runtime-
 * worker-...` so the URL resolves relative to `dist/index.mjs`, where
 * the asset actually lives (`dist/assets/runtime-worker-*.js`).
 *
 * Idempotent: re-running the script is a no-op once the patch is
 * applied. Safe to invoke from `npm install` lifecycle hooks.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const TARGETS = [
  join(ROOT, "node_modules", "almostnode", "dist", "index.mjs"),
  join(ROOT, "node_modules", "almostnode", "dist", "index.cjs"),
];

// Match the leading-slash form but not the already-patched relative
// form, so the patch is naturally idempotent.
const BAD_URL_RE = /(["'`])\/assets\/runtime-worker-/g;

let patchedAny = false;

for (const target of TARGETS) {
  if (!existsSync(target)) {
    // almostnode not installed (yet); nothing to do.
    continue;
  }
  const src = readFileSync(target, "utf8");
  if (!BAD_URL_RE.test(src)) {
    // Already patched, or future almostnode versions may have fixed
    // it upstream. Either way, nothing to do.
    continue;
  }
  // Reset the regex's lastIndex after the test() above and replace.
  BAD_URL_RE.lastIndex = 0;
  const next = src.replace(BAD_URL_RE, (_match, quote) => `${quote}./assets/runtime-worker-`);
  writeFileSync(target, next);
  console.log(`[patch-almostnode] rewrote asset URL in ${target}`);
  patchedAny = true;
}

if (!patchedAny) {
  console.log("[patch-almostnode] no patch needed");
}
