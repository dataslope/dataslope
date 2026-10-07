#!/usr/bin/env node
/**
 * Post-install patch for @opennextjs/cloudflare: inline Next 16.4's
 * `server/preview-props.json` into the Worker like every other manifest.
 *
 * Workerd has no filesystem, so OpenNext's build replaces Next's
 * `loadManifest()` with a function that returns each manifest inlined, and
 * throws `Unexpected loadManifest(...) call!` for any path it did not inline.
 * The set it inlines is a glob, `{*-manifest,required-server-files,
 * prefetch-hints}.json`. Next 16.4 moved the draft-mode keys out of
 * `prerender-manifest.json` into `server/preview-props.json`, which that glob
 * does not match, and reads it in the `Server` constructor. So the Next server
 * cannot be constructed inside the Worker at all, and every request that is
 * not answered by cache interception 500s: `/api/auth/*`, `/api/*`,
 * `/s/[shareId]`, the 404 page. Prerendered pages still serve, which is what
 * makes it easy to miss. Measured on `opennextjs-cloudflare preview` with
 * @opennextjs/cloudflare 1.20.9 (the latest when Next 16.4.0 shipped).
 *
 * Adding the file to the glob is the whole fix: the inlined body is the same
 * JSON Next reads from disk under `next start`.
 *
 * Idempotent. Once upstream matches `preview-props` itself this logs "no
 * patch needed" and can be deleted. If neither the old glob nor the fix is
 * found, the plugin changed shape and this exits non-zero: a deploy that
 * fails at install is better than one that serves 500s past the cache.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

const TARGET = join(
  ROOT,
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "build",
  "patches",
  "plugins",
  "load-manifest.js",
);

const OLD_GLOB = "{*-manifest,required-server-files,prefetch-hints}.json";
const NEW_GLOB = "{*-manifest,required-server-files,prefetch-hints,preview-props}.json";

if (!existsSync(TARGET)) {
  // @opennextjs/cloudflare not installed (yet); nothing to do.
  console.log("[patch-opennext] @opennextjs/cloudflare not installed, skipping");
  process.exit(0);
}

const src = readFileSync(TARGET, "utf8");

if (src.includes("preview-props")) {
  // Already patched, or fixed upstream.
  console.log("[patch-opennext] no patch needed");
  process.exit(0);
}

if (!src.includes(OLD_GLOB)) {
  console.error(
    `[patch-opennext] ${TARGET} no longer contains the manifest glob this patch ` +
      `extends (${OLD_GLOB}), and does not mention preview-props either.\n` +
      "Check whether this @opennextjs/cloudflare inlines `server/preview-props.json`; " +
      "without it every request that reaches the Next server inside the Worker 500s. " +
      "See the header of scripts/patch-opennext.mjs.",
  );
  process.exit(1);
}

writeFileSync(TARGET, src.replace(OLD_GLOB, NEW_GLOB));
console.log(`[patch-opennext] added preview-props.json to the inlined manifests in ${TARGET}`);
