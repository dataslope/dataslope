/**
 * Fumadocs search API route (Orama), served server-side from the Worker.
 *
 * The docs sources run in Fumadocs `dynamic` mode, so the stock
 * `createFromSource(source)` would read each lesson's MDX from disk at request
 * time to build its index, which throws on Cloudflare Workers (no filesystem)
 * and 500s. Its "advanced" index is also ~54 MB, too big for a Worker.
 *
 * Instead we build a lightweight Orama "simple" index (one document per page)
 * from a compact, prose-only input array precomputed at build time by
 * `scripts/build-search-index.mjs`. The array is deliberately NOT imported
 * into this module: bundling it put ~1.4 MiB (gzipped) of page text into the
 * Worker script, whose hard ceiling is 10 MiB. It ships as a static asset
 * (`public/search-index.json`) instead and is fetched ONCE per isolate from
 * the Workers assets binding (in-datacenter, no egress), then held in Worker
 * memory as the built index. In `next dev` there is no assets binding, so
 * the fetch falls back to the app's own origin, where Next serves public/.
 *
 * The site is English-only, so the Orama English stemmer is used.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createSearchAPI, type Index } from "fumadocs-core/search/server";

type SearchServer = ReturnType<typeof createSearchAPI>;
/** Minimal shape of the assets binding; the generated CloudflareEnv types
 *  it as `Fetcher`, which isn't a global in this tsconfig. */
type AssetsFetcher = { fetch: (url: URL | string) => Promise<Response> };

let serverPromise: Promise<SearchServer> | null = null;

async function loadIndexJson(request: Request): Promise<string> {
  const url = new URL("/search-index.json", request.url);
  // Prefer the assets binding (production Workers); fall back to a plain
  // same-origin fetch for `next dev`.
  let assets: AssetsFetcher | undefined;
  try {
    assets = (getCloudflareContext().env as unknown as { ASSETS?: AssetsFetcher })
      .ASSETS;
  } catch {
    // no Cloudflare context (plain `next dev` without the proxy)
  }
  const res = assets ? await assets.fetch(url) : await fetch(url);
  if (!res.ok) {
    throw new Error(`search-index.json fetch failed (${res.status})`);
  }
  return res.text();
}

function getServer(request: Request): Promise<SearchServer> {
  serverPromise ??= (async () => {
    try {
      const indexes = JSON.parse(await loadIndexJson(request)) as Index[];
      return createSearchAPI("simple", { language: "english", indexes });
    } catch (err) {
      // Don't cache a failed boot: the next request retries the fetch.
      serverPromise = null;
      throw err;
    }
  })();
  return serverPromise;
}

export async function GET(request: Request) {
  const server = await getServer(request);
  const response = await server.GET(request);
  // The index only changes on deploy, so let the CDN hold query responses: a
  // repeat of the same query within a day is a free CDN hit instead of another
  // Worker invocation.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return response;
}
