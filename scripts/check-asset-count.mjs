#!/usr/bin/env node
/**
 * Report (and bound) how many static-asset files a deploy would upload.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Cloudflare caps the number of static-asset files in a *single Worker
 * version* at 20,000 on the free plan and 100,000 on Workers Paid; individual
 * files are capped at 25 MiB on both. Blowing either cap fails the deploy, and
 * on this repo the count is content-driven rather than code-driven: almost
 * everything under `.open-next/assets` is generated per lesson (one `.md`
 * mirror per course, several `.webp` illustrations per lesson), so the number
 * creeps up with authoring, not with commits anyone reviews for size.
 *
 * A failed deploy is a bad place to learn that. This prints the count so it can
 * be watched, and exits non-zero once it is actually unshippable.
 *
 * ── Why not just `find .open-next/assets -type f | wc -l` ───────────────────
 *
 * That happens to be right today, but it is not what wrangler uploads, and the
 * number wrangler *prints* is not it either. `wrangler deploy` logs
 * "Read N files from the assets directory" from a bare
 * `fs.readdir(dir, { recursive: true })`, whose result includes directory
 * entries — on this repo that reads 5,268 for 5,222 actual files (46 dirs).
 * The manifest it then builds skips directories and symlinks and applies
 * `.assetsignore`. This script mirrors the manifest, not the log line, so the
 * number here is the number that counts against the cap.
 *
 * ── What enforces the limit ─────────────────────────────────────────────────
 *
 * The real ceiling is server-side: wrangler reads `max_file_count_allowed`
 * from the upload-session JWT and falls back to 20,000 when the claim is
 * absent. So the plan constants below are a local mirror of an account
 * property, not the source of truth — pass `--plan=free` (or ASSETS_PLAN=free)
 * to check against the lower cap.
 *
 * Note that the ~1,600 prerendered pages are NOT counted here: they are served
 * from the R2 incremental cache (see open-next.config.ts), not from static
 * assets, and `.open-next/assets` contains no HTML at all. Lesson growth costs
 * roughly one `.md` plus its illustrations, not a page's worth of assets.
 *
 * Usage:
 *   npm run check:assets              # after `opennextjs-cloudflare build`
 *   npm run check:assets -- --plan=free
 *   npm run check:assets -- --json
 *
 * Docs: https://developers.cloudflare.com/workers/platform/limits/#static-assets
 */
import { readdirSync, readFileSync, lstatSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Files per Worker *version*, by plan. Mirrors wrangler's server-side cap. */
export const FILE_COUNT_LIMITS = { free: 20_000, paid: 100_000 };
/** Per-file cap, both plans (wrangler's MAX_ASSET_SIZE). */
export const MAX_ASSET_SIZE = 25 * 1024 * 1024;
/** Print a warning (but still exit 0) at this share of the limit. */
const WARN_AT = 0.8;

/** wrangler skips these regardless of `.assetsignore`. */
const ALWAYS_IGNORED = new Set([".assetsignore", ".DS_Store"]);

/**
 * Strip `//` and comments from JSONC without mangling
 * comment-like sequences inside strings (wrangler.jsonc has "https://…" vars).
 */
export function stripJsonComments(text) {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += c;
      }
    } else if (inBlock) {
      if (c === "*" && next === "/") {
        inBlock = false;
        i++;
      }
    } else if (inString) {
      out += c;
      if (c === "\\") {
        out += next ?? "";
        i++;
      } else if (c === '"') {
        inString = false;
      }
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && next === "/") {
      inLine = true;
      i++;
    } else if (c === "/" && next === "*") {
      inBlock = true;
      i++;
    } else {
      out += c;
    }
  }
  // Trailing commas are legal in wrangler.jsonc but not in JSON.parse.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/** The assets directory wrangler will upload, read from wrangler.jsonc. */
function assetsDirectory() {
  const configPath = join(ROOT, "wrangler.jsonc");
  const config = JSON.parse(stripJsonComments(readFileSync(configPath, "utf8")));
  const dir = config.assets?.directory;
  if (!dir) {
    throw new Error(`No "assets.directory" in ${configPath}`);
  }
  return resolve(ROOT, dir);
}

/**
 * Every file wrangler would put in the asset manifest: recursive, directories
 * and symlinks skipped (wrangler resolves neither), `.assetsignore` honoured.
 */
export function collectAssets(root, isIgnored = () => false) {
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const rel = relative(root, path).split(sep).join("/");
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        walk(path);
      } else if (!ALWAYS_IGNORED.has(name) && !isIgnored(rel)) {
        files.push({ path: rel, size: stat.size });
      }
    }
  };
  walk(root);
  return files;
}

/**
 * `.assetsignore` is gitignore syntax. wrangler uses the `ignore` package for
 * it; borrow the same one (a wrangler dependency) so the semantics match
 * exactly. If it can't be resolved, say so rather than silently undercounting
 * — this only matters once the file exists, which today it does not.
 */
async function assetsIgnoreMatcher(root) {
  const ignoreFile = join(root, ".assetsignore");
  if (!existsSync(ignoreFile)) return { isIgnored: () => false, note: null };
  try {
    const { default: ignore } = await import("ignore");
    const matcher = ignore().add(readFileSync(ignoreFile, "utf8"));
    return { isIgnored: (rel) => matcher.ignores(rel), note: null };
  } catch {
    return {
      isIgnored: () => false,
      note: "`.assetsignore` found but the `ignore` package could not be loaded; its rules were NOT applied, so this count is an upper bound.",
    };
  }
}

/** Files grouped by their top-level directory, largest group first. */
function byTopLevel(files) {
  const counts = new Map();
  for (const { path } of files) {
    const top = path.includes("/") ? `${path.split("/")[0]}/` : "(root)";
    counts.set(top, (counts.get(top) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

const mib = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`;

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const plan =
    argv.find((a) => a.startsWith("--plan="))?.slice("--plan=".length) ??
    process.env.ASSETS_PLAN ??
    "paid";
  const limit = FILE_COUNT_LIMITS[plan];
  if (!limit) {
    console.error(`Unknown plan "${plan}" (expected: free, paid)`);
    process.exit(2);
  }

  const root = assetsDirectory();
  if (!existsSync(root)) {
    console.error(
      `Assets directory not found: ${relative(ROOT, root)}\n` +
        `Run \`npx opennextjs-cloudflare build\` first — the count only exists after a build.`,
    );
    process.exit(2);
  }

  const { isIgnored, note } = await assetsIgnoreMatcher(root);
  const files = collectAssets(root, isIgnored);
  const oversized = files.filter((f) => f.size > MAX_ASSET_SIZE);
  const largest = files.reduce((a, b) => (b.size > a.size ? b : a), files[0]);
  const pct = (files.length / limit) * 100;

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          directory: relative(ROOT, root),
          plan,
          files: files.length,
          limit,
          headroom: limit - files.length,
          percentUsed: Number(pct.toFixed(2)),
          largest: largest && { path: largest.path, size: largest.size },
          oversized: oversized.map((f) => ({ path: f.path, size: f.size })),
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Static assets in ${relative(ROOT, root)} (Workers ${plan} plan)\n`);
    console.log(
      `  ${files.length.toLocaleString()} files — ${pct.toFixed(1)}% of the ${limit.toLocaleString()} limit ` +
        `(${(limit - files.length).toLocaleString()} to spare)`,
    );
    if (largest) {
      console.log(`  largest file: ${mib(largest.size)} (25 MiB limit) — ${largest.path}`);
    }
    console.log("");
    for (const [top, count] of byTopLevel(files)) {
      console.log(`  ${String(count).padStart(7)}  ${top}`);
    }
    if (note) console.log(`\n  Note: ${note}`);
  }

  let failed = false;
  if (files.length > limit) {
    console.error(
      `\nERROR: ${files.length.toLocaleString()} files exceeds the ${limit.toLocaleString()}-file limit for the Workers ${plan} plan. This deploy will be rejected.`,
    );
    failed = true;
  } else if (files.length > limit * WARN_AT) {
    console.warn(
      `\nWARNING: past ${WARN_AT * 100}% of the ${limit.toLocaleString()}-file limit.`,
    );
  }
  for (const file of oversized) {
    console.error(`\nERROR: ${file.path} is ${mib(file.size)}, over the 25 MiB per-file limit.`);
    failed = true;
  }
  if (failed) process.exit(1);
}

// Importable by tests without running the CLI.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
