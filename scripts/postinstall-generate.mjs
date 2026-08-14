// Runs the content/asset generation half of postinstall — fumadocs-mdx and
// the build-* generators — EXCEPT on Cloudflare Workers Builds, where the
// build command re-runs every generator anyway and the postinstall pass was
// pure duplication (tens of seconds per deploy). Local installs and CI
// without `npm run build` still get the full pass so a fresh checkout
// typechecks and tests out of the box.
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

// Same order as the `build`/`dev` scripts. Order matters in one place:
// build-charts writes the chart manifest build-search-corpus reads titles and
// captions from, so running the search steps first loses every chart caption.
run("fumadocs-mdx");
run("node", ["scripts/build-almostnode-workers.mjs"]);
run("node", ["scripts/build-brand-fallbacks.mjs"]);
run("node", ["scripts/build-charts.mjs"]);
run("node", ["scripts/build-search-corpus.mjs"]);
run("node", ["scripts/build-search-sql.mjs"]);
run("node", ["scripts/build-created-at.mjs"]);
run("node", ["scripts/build-course-catalog.mjs"]);
run("node", ["scripts/build-home-stats.mjs"]);
run("node", ["scripts/build-images.mjs"]);
// build-block-outputs is deliberately absent: its manifest and figures are
// committed (see .github/workflows/block-outputs.yml), so an install has
// nothing to generate. `dev` and `build` still run it.
