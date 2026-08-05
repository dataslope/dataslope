// Runs the content/asset generation half of postinstall — fumadocs-mdx and
// the build-* generator scripts — EXCEPT on Cloudflare Workers Builds.
//
// Why: Workers Builds runs `npm ci` (which triggers postinstall) and then the
// configured build command (`npx opennextjs-cloudflare build` → `npm run
// build`), whose script re-runs fumadocs-mdx and every generator anyway. The
// postinstall pass was pure duplication: a second remark parse of ~800 course
// MDX files (build-search-index), a second esbuild+minify of the almostnode
// worker bundles, and a second hash pass over assets/images — tens of seconds
// per deploy for outputs that are immediately regenerated.
//
// Local installs (and CI that runs tests/lint without `npm run build`, e.g. a
// GitHub Actions PR check) still get the full generation pass so a fresh
// checkout typechecks and tests out of the box.
//
// NOTE: scripts/patch-almostnode.mjs is NOT gated here — it patches
// node_modules in place and must run after every install (package.json runs
// it before this script).
import { spawnSync } from "node:child_process";
import { join, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Workers Builds sets WORKERS_CI=1 (and WORKERS_CI_COMMIT_SHA to the deployed
// commit — the same variable next.config.ts keys the build ID off).
if (process.env.WORKERS_CI || process.env.WORKERS_CI_COMMIT_SHA) {
  console.log(
    "[postinstall] Workers Builds detected — skipping generators " +
      "(the `build` script regenerates everything before `next build`).",
  );
  process.exit(0);
}

// Make node_modules/.bin resolvable even when this script is invoked
// directly (outside an npm lifecycle, where npm normally prepends it).
const env = {
  ...process.env,
  PATH: `${join(ROOT, "node_modules", ".bin")}${delimiter}${process.env.PATH ?? ""}`,
};

function run(command, args = []) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`[postinstall] ${command} ${args.join(" ")} failed`);
    process.exit(result.status ?? 1);
  }
}

// Same order the `build`/`dev` scripts use.
run("fumadocs-mdx");
run("node", ["scripts/build-almostnode-workers.mjs"]);
run("node", ["scripts/build-search-index.mjs"]);
run("node", ["scripts/build-brand-fallbacks.mjs"]);
run("node", ["scripts/build-course-catalog.mjs"]);
run("node", ["scripts/build-home-stats.mjs"]);
run("node", ["scripts/build-images.mjs"]);
