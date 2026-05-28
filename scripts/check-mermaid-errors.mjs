#!/usr/bin/env node
/**
 * Headless crawler that checks every page under the `/learn` route for the
 * Mermaid "Syntax error in text mermaid version 11.15.0" failure.
 *
 * Why this exists:
 *
 * Mermaid diagrams in the `/learn` lessons are rendered client-side (see
 * `app/_components/mdx/mermaid.tsx`). When a diagram fails to parse, Mermaid
 * injects its "bomb" error SVG into the page — the one that reads
 * "Syntax error in text" / "mermaid version 11.15.0". This script visits the
 * lesson pages in parallel with a headless Chromium, waits for the diagrams
 * to render, and records whether that error text showed up.
 *
 * Usage:
 *
 *   # No need to start the app yourself — the script boots the Next.js dev
 *   # server automatically if nothing is already serving BASE_URL, and shuts
 *   # it down when finished:
 *   node scripts/check-mermaid-errors.mjs
 *
 *   # If you already have `npm run dev` running, the script reuses it.
 *
 *   # Against a different origin / with more concurrency:
 *   BASE_URL=http://localhost:3457 CONCURRENCY=10 \
 *     node scripts/check-mermaid-errors.mjs
 *
 *   # Never auto-start a server (fail if BASE_URL isn't reachable):
 *   NO_AUTO_SERVER=1 node scripts/check-mermaid-errors.mjs
 *
 * Incremental re-runs:
 *
 *   The results are written to `mermaid-check-results.json` at the repo root
 *   (git-ignored). On the FIRST run (no result file) every `/learn` page is
 *   visited. On SUBSEQUENT runs, only the pages that previously FAILED (or
 *   errored) are revisited, and their entries in the result file are updated
 *   in place — so you can iterate on a fix and re-check just the broken pages.
 *
 *   Force a full re-crawl any time with: `--all` (or delete the result file).
 */
import { chromium } from "playwright";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(REPO_ROOT, "content", "learn");
const RESULT_FILE = path.join(REPO_ROOT, "mermaid-check-results.json");

// ── Config (overridable via env) ──────────────────────────────────────────
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 6);
// How long (ms) to keep polling a page for the Mermaid error after the
// network goes idle. Diagrams import Mermaid lazily and render async, so we
// give them a moment to either render cleanly or blow up.
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 8000);
const NAV_TIMEOUT_MS = Number(process.env.NAV_TIMEOUT_MS ?? 45000);
const FORCE_ALL = process.argv.includes("--all");
// Auto-start the dev server if BASE_URL isn't already serving. Set
// NO_AUTO_SERVER=1 to opt out. SERVER_TIMEOUT_MS bounds the startup wait —
// a cold `next dev` (Turbopack + fumadocs-mdx + worker bundling) can be slow.
const NO_AUTO_SERVER = process.env.NO_AUTO_SERVER === "1";
const SERVER_TIMEOUT_MS = Number(process.env.SERVER_TIMEOUT_MS ?? 180000);

// The two text fragments Mermaid's error SVG always contains. We require
// BOTH so a lesson that merely *mentions* the phrase in prose isn't flagged.
const ERROR_NEEDLES = ["Syntax error in text", "mermaid version"];

// ── Dev-server management ───────────────────────────────────────────────────

/** Is something already serving BASE_URL? (Used for reuse + readiness polls.) */
async function isServerUp() {
  try {
    const res = await fetch(BASE_URL, { method: "HEAD" });
    // Any HTTP response — even a 404 — means the server is accepting requests.
    return res.status > 0;
  } catch {
    return false;
  }
}

/**
 * Ensure a server is reachable at BASE_URL, starting `next dev` if needed.
 * Returns a `stop()` teardown that kills any server we launched (and is a
 * no-op when we reused an already-running one).
 */
async function ensureServer() {
  const noop = async () => {};

  if (await isServerUp()) {
    console.log(`Reusing the server already running at ${BASE_URL}.`);
    return noop;
  }
  if (NO_AUTO_SERVER) {
    throw new Error(
      `Nothing is serving ${BASE_URL} and NO_AUTO_SERVER=1 is set. ` +
        `Start the app (e.g. \`npm run dev\`) or unset NO_AUTO_SERVER.`,
    );
  }

  const port = Number(new URL(BASE_URL).port || 3000);
  console.log(`No server at ${BASE_URL}; starting \`next dev -p ${port}\`…`);

  const child = spawn("npx", ["next", "dev", "-p", String(port)], {
    cwd: REPO_ROOT,
    stdio: ["ignore", "ignore", "inherit"], // surface startup errors on stderr
    env: process.env,
  });

  let exited = false;
  child.on("exit", (code) => {
    exited = true;
    if (code && code !== 0 && !serverReady) {
      console.error(`Dev server exited early with code ${code}.`);
    }
  });

  let serverReady = false;
  const stop = async () => {
    if (exited || child.killed) return;
    child.kill("SIGTERM");
    // Give it a moment to exit cleanly, then force-kill.
    await new Promise((resolve) => {
      const t = setTimeout(() => {
        if (!exited) child.kill("SIGKILL");
        resolve();
      }, 5000);
      child.once("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  };

  // Poll until the server answers or we time out.
  const deadline = Date.now() + SERVER_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (exited) {
      throw new Error("Dev server process exited before becoming ready.");
    }
    if (await isServerUp()) {
      serverReady = true;
      console.log("Dev server is up.\n");
      return stop;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  await stop();
  throw new Error(
    `Dev server did not become ready within ${SERVER_TIMEOUT_MS} ms ` +
      `(raise SERVER_TIMEOUT_MS if your machine needs longer).`,
  );
}

/**
 * Walk `content/learn/` and turn every `.mdx` file into its public route.
 *
 * Fumadocs (see `lib/source.ts`, `baseUrl: "/learn"`) maps:
 *   content/learn/index.mdx                     -> /learn
 *   content/learn/python.mdx                    -> /learn/python
 *   content/learn/python-basics/index.mdx       -> /learn/python-basics
 *   content/learn/python-basics/data-types.mdx  -> /learn/python-basics/data-types
 */
async function discoverRoutes() {
  const files = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
        files.push(full);
      }
    }
  }
  await walk(CONTENT_DIR);

  const routes = new Set();
  for (const file of files) {
    const rel = path.relative(CONTENT_DIR, file).replace(/\\/g, "/");
    let slug = rel.replace(/\.mdx$/, "");
    slug = slug.replace(/(^|\/)index$/, ""); // index -> parent dir
    const route = slug ? `/learn/${slug}` : "/learn";
    routes.add(route);
  }
  return [...routes].sort();
}

/** Detect Mermaid's error bomb in the live DOM (covers SVG <text> content). */
function pageHasMermaidError(needles) {
  const text = document.body ? document.body.textContent ?? "" : "";
  return needles.every((needle) => text.includes(needle));
}

/** Visit one route and classify it as pass / fail / error. */
async function checkRoute(context, route) {
  const url = `${BASE_URL}${route}`;
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: NAV_TIMEOUT_MS });

    // Poll for the error text. Bail early the instant it appears; otherwise
    // keep watching until the diagrams have had time to render.
    const deadline = Date.now() + SETTLE_MS;
    let hasError = false;
    do {
      hasError = await page.evaluate(pageHasMermaidError, ERROR_NEEDLES);
      if (hasError) break;
      await page.waitForTimeout(400);
    } while (Date.now() < deadline);

    return { route, status: hasError ? "fail" : "pass" };
  } catch (err) {
    return {
      route,
      status: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await page.close();
  }
}

/** Run `worker` over `items` with a fixed concurrency ceiling. */
async function runPool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function drain() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, drain),
  );
  return results;
}

async function loadPreviousResults() {
  if (FORCE_ALL || !existsSync(RESULT_FILE)) return null;
  try {
    return JSON.parse(await readFile(RESULT_FILE, "utf8"));
  } catch (err) {
    console.warn(
      `⚠️  Could not parse ${path.basename(RESULT_FILE)} (${
        err instanceof Error ? err.message : err
      }); doing a full crawl.`,
    );
    return null;
  }
}

async function main() {
  const allRoutes = await discoverRoutes();
  const previous = await loadPreviousResults();

  // Decide which routes to visit this run.
  let routesToCheck;
  let priorResults = [];
  if (previous?.results?.length) {
    priorResults = previous.results;
    routesToCheck = priorResults
      .filter((r) => r.status !== "pass")
      .map((r) => r.route)
      // Only re-check routes that still exist in the content tree.
      .filter((r) => allRoutes.includes(r));
    if (routesToCheck.length === 0) {
      console.log(
        "✅ Previous run had no failing pages — nothing to re-check. " +
          "Use --all to force a full crawl.",
      );
      return;
    }
    console.log(
      `Re-checking ${routesToCheck.length} previously-failed page(s) ` +
        `(of ${priorResults.length} recorded).`,
    );
  } else {
    routesToCheck = allRoutes;
    console.log(`Full crawl: ${routesToCheck.length} page(s) under /learn.`);
  }

  console.log(`Base URL: ${BASE_URL}  |  concurrency: ${CONCURRENCY}\n`);

  // Boot (or reuse) the app, then always tear down whatever we started.
  const stopServer = await ensureServer();
  let fresh;
  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });

    let done = 0;
    fresh = await runPool(routesToCheck, CONCURRENCY, async (route) => {
      const result = await checkRoute(context, route);
      done += 1;
      const mark =
        result.status === "pass" ? "✓" : result.status === "fail" ? "✗" : "!";
      console.log(
        `[${String(done).padStart(3)}/${routesToCheck.length}] ${mark} ` +
          `${result.status.toUpperCase().padEnd(5)} ${result.route}` +
          (result.detail ? `  (${result.detail})` : ""),
      );
      return result;
    });

    await context.close();
    await browser.close();
  } finally {
    await stopServer();
  }

  // Merge fresh results over any prior ones (incremental runs update in place).
  const byRoute = new Map(priorResults.map((r) => [r.route, r]));
  for (const r of fresh) byRoute.set(r.route, r);
  const merged = [...byRoute.values()].sort((a, b) =>
    a.route.localeCompare(b.route),
  );

  const passed = merged.filter((r) => r.status === "pass").length;
  const failed = merged.filter((r) => r.status === "fail").length;
  const errored = merged.filter((r) => r.status === "error").length;

  const output = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: { total: merged.length, passed, failed, errored },
    results: merged,
  };
  await writeFile(RESULT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `\nDone. ${passed} passed, ${failed} failed, ${errored} errored ` +
      `(of ${merged.length} total).`,
  );
  console.log(`Results written to ${path.relative(REPO_ROOT, RESULT_FILE)}`);

  // Non-zero exit when something is broken so CI / shells can react.
  if (failed > 0 || errored > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
