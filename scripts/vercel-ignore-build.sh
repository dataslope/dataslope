#!/usr/bin/env bash
#
# Vercel "Ignored Build Step" — skip deployments that only touch agent-outputs/.
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
# Rule: build whenever anything OUTSIDE agent-outputs/ changed in this push;
# otherwise skip. If the commit range can't be determined we err on the side
# of building so a real change is never silently dropped.

set -uo pipefail

# Path(s) that should not, on their own, trigger a deployment.
EXCLUDE_PATHSPEC=':(exclude)agent-outputs/'

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

if git diff --quiet "$base_sha" "$head_sha" -- . "$EXCLUDE_PATHSPEC"; then
  echo "vercel-ignore-build: only agent-outputs/ changed (${base_sha}..${head_sha}) — skipping build."
  exit 0
fi

echo "vercel-ignore-build: changes outside agent-outputs/ detected — proceeding with the build."
exit 1
