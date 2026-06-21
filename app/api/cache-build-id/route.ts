/**
 * Reports the running Worker's OpenNext build ID.
 *
 * The R2 incremental cache keys every object as
 * `incremental-cache/<OPEN_NEXT_BUILD_ID>/<hash>.cache` (see
 * open-next.config.ts). Each deploy — production *and* every preview — writes a
 * fresh ~0.6 GB folder under a new build ID and nothing is pruned automatically
 * (the key includes the build ID and OpenNext never deletes old ones).
 *
 * The scheduled cleanup workflow (.github/workflows/r2-cache-cleanup.yml) deletes
 * stale build folders but must never delete the one the LIVE production Worker is
 * serving from. The only authoritative source for "which build is live" is the
 * running Worker itself, so it exposes its build ID here: the cleanup job fetches
 * https://dataslope.com/api/cache-build-id and preserves that folder regardless of
 * age. `OPEN_NEXT_BUILD_ID` is the exact value the R2 override uses for the key,
 * so this can't drift from the actual folder name.
 *
 * The build ID is not sensitive — Next.js already exposes it in page payloads and
 * `/_next/static/<buildId>/…` asset URLs. `/api/` is disallowed in robots.ts.
 */

// Always reflect the running Worker, never a prerendered/cached value.
export const dynamic = "force-dynamic";

export function GET() {
  const buildId = process.env.OPEN_NEXT_BUILD_ID ?? "";
  return new Response(buildId, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
