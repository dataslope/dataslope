/**
 * Fumadocs search API, backed by SQLite FTS5 on D1. Owns the contract that
 * Fumadocs's default fetch client expects: `GET ?query=…&limit=…&tag=…` →
 * `SortedResult[]`, `[]` for an empty query. `tag` *boosts* rather than
 * filters (see lib/search/ranking.ts). Result URLs carry `?hl=…` for
 * post-navigation highlighting (SearchHighlight.tsx). Queries go through
 * `withSession("first-unconstrained")` so enabling D1 read replication later
 * is a dashboard toggle; it's safe because the index only changes at deploy.
 */
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { searchTokens, toMatchQuery } from "@/lib/search/query";
import { parseScope, searchSql, toResults, type SearchRow } from "@/lib/search/ranking";

function db() {
  const env = getCloudflareContext().env as unknown as { SEARCH_DB?: D1Database };
  if (!env.SEARCH_DB) throw new Error("SEARCH_DB binding is not configured");
  return env.SEARCH_DB;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("query");
  if (!raw) return Response.json([]);

  // Never hand user input to MATCH: FTS5 throws on syntax it cannot parse, and
  // an ordinary query like "pre-attentive" is syntax it cannot parse.
  const match = toMatchQuery(raw);
  if (!match) return Response.json([]);

  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 24;
  const scope = parseScope(url.searchParams.get("tag"));

  // Overfetch: `toResults`'s per-page cap skips rows, and skipped rows must be
  // replaceable by lower-ranked pages rather than shrinking the list.
  const fetchLimit = Math.min(limit * 3, 120);

  let rows: SearchRow[];
  try {
    const session = db().withSession("first-unconstrained");
    const stmt = session.prepare(searchSql(scope !== null));
    const bound = scope
      ? stmt.bind(match, fetchLimit, scope.page, scope.pagePrefix, scope.collection)
      : stmt.bind(match, fetchLimit);
    const result = await bound.all<SearchRow>();
    rows = result.results ?? [];
  } catch (err) {
    // After sanitising, anything landing here is the database unreachable or
    // unseeded; report it rather than return [] that looks like "no matches".
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `search unavailable: ${message}` }, { status: 503 });
  }

  const response = Response.json(toResults(rows, limit, searchTokens(raw)));
  // The index only changes on deploy, so repeats of a query are CDN hits.
  // `tag` and `query` are both in the cache key, so scopes never mix.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return response;
}
