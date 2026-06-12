/**
 * Fumadocs built-in search API route (Orama).
 *
 * Handles GET /api/search requests from the Fumadocs search UI.
 * `createFromSource` builds the Orama search index from every page
 * in the `/learn` source and serves it through a standard Next.js
 * Route Handler.
 *
 * The site is English-only, so the Orama English stemmer is used.
 *
 * Responses are cached hard at the CDN edge: the index only changes on
 * deploy (and Vercel purges its edge cache on deploy), so a repeat of the
 * same query within a day is served as a free CDN hit instead of another
 * function invocation + origin transfer.
 */
import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

const search = createFromSource(source, {
  language: "english",
});

export async function GET(request: Request) {
  const response = await search.GET(request);
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return response;
}
