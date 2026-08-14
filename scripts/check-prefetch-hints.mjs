#!/usr/bin/env node
/**
 * Fail the build if any prerendered payload carries `InliningHintsStale`
 * (bit 512). Next's client contract for that bit is "this route entry already
 * expired — re-fetch until a payload without the bit arrives"; a corrupt
 * Workers Builds cache once produced builds carrying the bit with the
 * segment-prefetch files missing, so every open tab looped RSC prefetches
 * forever, with nothing else visibly wrong (full chain: the
 * `prefetchInlining` comment in next.config.ts).
 *
 * The bit is not wrong in general — a healthy origin resolves it in one round
 * trip — but on this deployment target it means the hints pipeline broke, and
 * the fix is purging the Workers Builds build cache, not deploying and
 * hoping. SKIP_PREFETCH_HINTS_CHECK=1 downgrades the failure to a warning.
 *
 * Runs right after `next build`, so `.next/server/app` exists. Scans two
 * shapes: `*.rsc` router-state tuples (`..."$undefined","$undefined",
 * <flags>]`) and `*.segments/**` tree files (`"prefetchHints":<flags>`).
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
