/**
 * Reports the running Worker's OpenNext build ID, which keys the R2
 * incremental cache (`incremental-cache/<OPEN_NEXT_BUILD_ID>/…`). The
 * r2-cache-cleanup workflow fetches this to learn which build folder is LIVE
 * and must never be deleted; `OPEN_NEXT_BUILD_ID` is the exact value the R2
 * override uses, so it can't drift from the folder name. The build ID is not
 * sensitive — Next.js already exposes it in asset URLs.
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
