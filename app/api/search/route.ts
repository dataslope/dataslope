/**
 * Fumadocs search API route (Orama), served server-side from the Worker.
 *
 * The `/learn` source runs in Fumadocs `dynamic` mode, so the stock
 * `createFromSource(source)` would read each lesson's MDX from disk at request
 * time to build its index — which throws on Cloudflare Workers (no filesystem)
 * and 500s. Its "advanced" index is also ~54 MB, too big for a Worker.
 *
 * Instead we build a lightweight Orama "simple" index (one document per page)
 * from a compact, prose-only input array that is precomputed at build time and
 * bundled into the Worker (`lib/generated/search-index.js`, see
 * `scripts/build-search-index.mjs`). The index is built once per isolate on
 * first request and lives only in Worker memory — never shipped to the
 * browser. No filesystem access happens at request time.
 *
 * The site is English-only, so the Orama English stemmer is used.
 */
import searchIndex from "@/lib/generated/search-index.js";
import { createSearchAPI } from "fumadocs-core/search/server";

const server = createSearchAPI("simple", {
  language: "english",
  indexes: searchIndex,
});

export async function GET(request: Request) {
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
