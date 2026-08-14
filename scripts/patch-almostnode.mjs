#!/usr/bin/env node
/**
 * Post-install patch for almostnode: its bundle constructs a Worker with the
 * server-absolute URL `/assets/runtime-worker-*.js`, which under Next.js /
 * Turbopack fails the build with `Module not found` — Turbopack statically
 * analyses every `new URL(..., import.meta.url)` even though the class is
 * dead code for us. Rewrites the leading `/` to `./` so the URL resolves
 * relative to `dist/index.mjs`, where the asset lives. Idempotent; safe from
 * `npm install` lifecycle hooks.
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
    // Already patched, or fixed upstream.
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
