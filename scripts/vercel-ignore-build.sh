#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — skip deployments for pushes that can't change
# the deployed site.
#
# Wired up via the repo's vercel.json:
#   { "ignoreCommand": "bash scripts/vercel-ignore-build.sh" }
# (ignoreCommand overrides the dashboard "Ignored Build Step", so no UI step is
# needed. The same command also works if pasted into that dashboard setting.)
#
# Exit-code contract defined by Vercel:
#   exit 1 → continue the build / create a deployment
#   exit 0 → cancel the build (no deployment)
#
# Two rules:
#   1. Branches prefixed `wip/` never deploy — push throwaway work there
#      without paying for a preview build.
#   2. Otherwise, build only when something OUTSIDE the non-shipping paths
#      below changed in this push. Reports, tests, CI config, and top-level
#      docs don't affect the deployed output, so a push touching only those
#      skips the build.
#
# If the commit range can't be determined we err on the side of building so
# a real change is never silently dropped.

set -uo pipefail

# Never deploy work-in-progress branches.
ref="${VERCEL_GIT_COMMIT_REF:-}"
case "$ref" in
  wip/*)
    echo "vercel-ignore-build: branch '$ref' is wip/-prefixed — skipping build."
    exit 0
    ;;
esac

# Paths that should not, on their own, trigger a deployment. Everything here
# must be provably absent from the production bundle. Note: content/ lessons
# are .mdx (and pageExtensions includes .md), so markdown is excluded only as
# the specific top-level doc files, never as a blanket *.md pattern.
EXCLUDE_PATHSPECS=(
  ':(exclude)agent-outputs/'
  ':(exclude)__tests__/'
  ':(exclude)e2e/'
  ':(exclude).github/'
  ':(exclude)cloudflare-cors-proxy/'
  ':(exclude)README.md'
  ':(exclude)AGENTS.md'
  ':(exclude)script-runner-src/README.md'
)

head_sha="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
base_sha="${VERCEL_GIT_PREVIOUS_SHA:-}"

# Fall back to the parent commit when Vercel doesn't give us a usable previous
# SHA (empty, or absent from this shallow clone — e.g. the first deploy).
if [ -z "$base_sha" ] || ! git rev-parse --verify --quiet "${base_sha}^{commit}" >/dev/null 2>&1; then
  if git rev-parse --verify --quiet "${head_sha}^" >/dev/null 2>&1; then
    base_sha="${head_sha}^"
  else
    echo "vercel-ignore-build: no diff range available — proceeding with the build."
    exit 1
  fi
fi

if git diff --quiet "$base_sha" "$head_sha" -- . "${EXCLUDE_PATHSPECS[@]}"; then
  echo "vercel-ignore-build: only non-shipping paths changed (${base_sha}..${head_sha}) — skipping build."
  exit 0
fi

echo "vercel-ignore-build: changes outside non-shipping paths detected — proceeding with the build."
exit 1
