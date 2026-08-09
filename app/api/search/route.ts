/**
 * Fumadocs search API, backed by SQLite FTS5 on D1.
 *
 * ── Why this is not Orama any more ──────────────────────────────────────────
 *
 * The previous version fetched a multi-megabyte prose blob from the Workers
 * assets binding and built an Orama index from it, memoised per isolate. That
 * meant the first search in every fresh isolate paid a fetch, a JSON parse and
 * a full tokenise-and-index pass, and isolates are per-data-centre, evicted on
 * idle, and replaced wholesale on every deploy. So the cost was not paid once,
 * it was paid continuously, everywhere, and it grew linearly with the content.
 *
 * FTS5 moves that work to build time. The index is already built, sitting in
 * the database; a query is a SELECT. There is nothing to warm up.
 *
 * ── The response contract ───────────────────────────────────────────────────
 *
 * This route no longer uses `createSearchAPI`, so it owns the contract that
 * Fumadocs's default fetch client expects (fumadocs-core/dist/endpoint):
 * `GET ?query=…&limit=…&tag=…` returning `SortedResult[]`, and `[]` for an
 * empty query. Results are ordered page-first-then-sections so the dialog
 * groups naturally: a `page` result carrying the lesson title, followed by
 * `heading`/`text` results linking to the `#anchor` that actually matched;
 * for text that lives inside a component (`<MultipleChoice>`, `<CodeBlock>`,
 * …) that anchor is the component's own id, not the heading above it (see
 * lib/search/anchors.mjs).
 *
 * `tag` is the dialog's current course / interview track. Stock Fumadocs
 * treats tags as filters; here it *boosts* (see lib/search/ranking.ts), so
 * the reader's own course rises without hiding the rest of the site.
 *
 * Snippets come back with `<mark>` around the matched terms, which is the form
 * Fumadocs renders highlights in, and every result URL carries the searched
 * tokens as `?hl=…` so the lesson page can highlight them after navigation
 * (app/_components/SearchHighlight.tsx).
 *
 * ── Read replication ────────────────────────────────────────────────────────
 *
 * Queries go through `withSession("first-unconstrained")`. Without a session,
 * D1 sends every read to the primary region regardless of whether replication
 * is enabled, so this is the line that makes turning replication on later a
 * dashboard toggle instead of a code change. `first-unconstrained` is the
 * loosest constraint, which is exactly right here: the index only changes at
 * deploy, so there is no read-after-write hazard to protect against and any
 * replica's answer is as good as the primary's.
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

  // Fetch more rows than the response spends: the per-page cap in
  // `toResults` skips rows, and skipped rows must be replaceable by
  // lower-ranked pages rather than shrinking the result list.
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
    // A malformed MATCH should be impossible after sanitising, so anything
    // landing here is the database being unreachable or unseeded. Report it
    // rather than returning an empty result that looks like "no matches".
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `search unavailable: ${message}` }, { status: 503 });
  }

  const response = Response.json(toResults(rows, limit, searchTokens(raw)));
  // The index only changes on deploy, so a repeat of the same query inside a
  // day is a CDN hit rather than another Worker invocation *and* another D1
  // round trip. This is also what keeps the primary-region latency off the
  // common path when read replication is not enabled. `tag` and `query` are
  // both in the cache key, so scoped and unscoped answers never mix.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return response;
}
