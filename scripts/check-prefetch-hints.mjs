#!/usr/bin/env node
/**
 * Fail the build if any prerendered payload carries `InliningHintsStale`.
 *
 * ── The incident this guards against ────────────────────────────────────────
 *
 * On 2026-08-06 the deployed site began looping RSC prefetch requests at
 * ~150/second per open browser tab — 7.5M requests in four days. The trigger
 * was `PrefetchHint.InliningHintsStale` (bit 512) in the prerendered router
 * state: Next's client contract for that bit is "cache this route entry
 * already expired and immediately re-fetch", and it terminates only when the
 * re-fetch returns a payload with the bit stripped. A corrupted Workers Builds
 * build cache produced builds whose payloads carried the bit AND whose
 * segment-prefetch files were missing, so the re-fetch was answered by the
 * same stale payload, forever. The full chain is written up in the
 * next.config.ts comment beside `prefetchInlining`.
 *
 * The poisoning was invisible: builds succeeded, pages rendered, every
 * response was a 200. The only symptom was request volume in a dashboard
 * nobody was watching. This check turns that silence into a red build.
 *
 * A payload with the bit set is not necessarily wrong in general — Next stamps
 * it by design on payloads generated before `collectPrefetchHints` runs, and a
 * healthy origin resolves it in one round trip. But on THIS deployment target
 * a build that ships the bit is a build whose hints pipeline broke (to date:
 * always a corrupt `.next/cache` restore), and the fix is purging the Workers
 * Builds build cache, not deploying and hoping. So: refuse to ship it.
 *
 * Escape hatch: SKIP_PREFETCH_HINTS_CHECK=1 downgrades the failure to a
 * warning, for a knowingly-accepted deploy while an upstream change is
 * investigated.
 *
 * Runs right after `next build` in the build chain, so `.next/server/app`
 * always exists when it runs. Scans two shapes:
 *   - `*.rsc` initial payloads: the router-state tuple's trailing flags,
 *     `..."$undefined","$undefined",<flags>]`
 *   - `*.segments/**` tree files: `"prefetchHints":<flags>`
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const APP_DIR = join(ROOT, ".next", "server", "app");

/** PrefetchHint.InliningHintsStale — pinned by __tests__/prefetchHints.test.ts
 *  against next's own enum, so a renumbering upstream fails loudly here
 *  instead of quietly checking the wrong bit. */
export const INLINING_HINTS_STALE = 512;

const TUPLE_FLAGS = /"\$undefined","\$undefined",(\d+)\]/g;
const SEGMENT_FLAGS = /"prefetchHints":(\d+)/g;

/** Every file under `dir`, recursively. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** Stale-flag values found in one file, or an empty array. */
export function staleFlagsIn(text) {
  const hits = [];
  for (const re of [TUPLE_FLAGS, SEGMENT_FLAGS]) {
    for (const m of text.matchAll(re)) {
      const flags = Number(m[1]);
      if (flags & INLINING_HINTS_STALE) hits.push(flags);
    }
  }
  return hits;
}

function main() {
  const files = walk(APP_DIR).filter(
    (p) => p.endsWith(".rsc") || p.includes(".segments"),
  );
  const offenders = [];
  for (const file of files) {
    const hits = staleFlagsIn(readFileSync(file, "utf8"));
    if (hits.length) offenders.push({ file: relative(ROOT, file), hits });
  }

  if (!offenders.length) {
    console.log(
      `check-prefetch-hints: ${files.length} prerendered file(s) clean (no InliningHintsStale)`,
    );
    return;
  }

  const lines = offenders
    .slice(0, 10)
    .map((o) => `  ${o.file}  flags=${[...new Set(o.hits)].join(",")}`)
    .join("\n");
  const message =
    `check-prefetch-hints: ${offenders.length} of ${files.length} prerendered ` +
    `file(s) carry PrefetchHint.InliningHintsStale (bit ${INLINING_HINTS_STALE}):\n${lines}\n` +
    "Shipping these re-arms the prefetch request storm of 2026-08-06 (see\n" +
    "scripts/check-prefetch-hints.mjs and the next.config.ts `prefetchInlining`\n" +
    "comment). Known cause: a corrupt Workers Builds build cache — purge it in\n" +
    "the dashboard (Settings → Builds → Clear build cache) and retry.\n" +
    "To ship anyway: SKIP_PREFETCH_HINTS_CHECK=1";

  if (process.env.SKIP_PREFETCH_HINTS_CHECK === "1") {
    console.warn(`${message}\n(SKIP_PREFETCH_HINTS_CHECK=1 — continuing)`);
    return;
  }
  console.error(message);
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] &&
  fileURLToPath(new URL(import.meta.url)).endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) main();
