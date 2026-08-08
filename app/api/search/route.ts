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
 * `GET ?query=…&limit=…` returning `SortedResult[]`, and `[]` for an empty
 * query. Results are ordered page-first-then-sections so the dialog groups
 * naturally: a `page` result carrying the lesson title, followed by `heading`
 * results linking to the `#anchor` that actually matched.
 *
 * Snippets come back with `<mark>` around the matched terms, which is the form
 * Fumadocs renders highlights in.
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

import { toMatchQuery } from "@/lib/search/query";

/** Fumadocs's result shape (fumadocs-core `SortedResult`). */
interface SortedResult {
  id: string;
  url: string;
  type: "page" | "heading" | "text";
  content: string;
  breadcrumbs?: string[];
}

interface Row {
  url: string;
  page: string;
  anchor: string;
  section: string;
  title: string;
  heading: string;
  excerpt: string;
}

/**
 * BM25 column weights, in the table's column order. The five UNINDEXED columns
 * lead and take 0, because `bm25()` wants one weight per column and they carry
 * no tokens.
 *
 * Prose outranks code by roughly seven to one. That ratio is what makes
 * indexing code safe: a search for a common identifier should surface the
 * lesson that *explains* it above the dozen that merely use it in a starter
 * file, and without the split there is no way to express that.
 */
const WEIGHTS = "0, 0, 0, 0, 0, 8.0, 6.0, 4.0, 1.0, 0.15";

const SQL = `
  SELECT url, page, anchor, section, title, heading,
         snippet(docs, 8, '<mark>', '</mark>', '…', 24) AS excerpt
  FROM docs
  WHERE docs MATCH ?
  ORDER BY bm25(docs, ${WEIGHTS})
  LIMIT ?
`;

function db() {
  const env = getCloudflareContext().env as unknown as { SEARCH_DB?: D1Database };
  if (!env.SEARCH_DB) throw new Error("SEARCH_DB binding is not configured");
  return env.SEARCH_DB;
}

/**
 * Group the flat section rows into Fumadocs's page-then-headings shape.
 *
 * Sections arrive already ranked. The first section seen for a page fixes that
 * page's position in the output, so a lesson whose best section ranked third
 * overall lands third, rather than every page floating to wherever its
 * strongest and weakest sections happen to be.
 */
function toResults(rows: Row[]): SortedResult[] {
  const out: SortedResult[] = [];
  const seenPage = new Set<string>();

  for (const row of rows) {
    if (!seenPage.has(row.page)) {
      seenPage.add(row.page);
      out.push({
        id: row.page,
        url: row.page,
        type: "page",
        content: row.title,
        breadcrumbs: row.section ? [row.section] : undefined,
      });
    }
    // The pre-heading chunk of a page has no anchor; its content is already
    // represented by the page result above, so it adds no second entry.
    if (!row.anchor) continue;
    out.push({
      id: row.url,
      url: row.url,
      type: "heading",
      content: row.heading || row.excerpt,
    });
    if (row.excerpt && row.heading) {
      out.push({ id: `${row.url}-text`, url: row.url, type: "text", content: row.excerpt });
    }
  }
  return out;
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

  let rows: Row[];
  try {
    const session = db().withSession("first-unconstrained");
    const result = await session.prepare(SQL).bind(match, limit).all<Row>();
    rows = result.results ?? [];
  } catch (err) {
    // A malformed MATCH should be impossible after sanitising, so anything
    // landing here is the database being unreachable or unseeded. Report it
    // rather than returning an empty result that looks like "no matches".
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: `search unavailable: ${message}` }, { status: 503 });
  }

  const response = Response.json(toResults(rows));
  // The index only changes on deploy, so a repeat of the same query inside a
  // day is a CDN hit rather than another Worker invocation *and* another D1
  // round trip. This is also what keeps the primary-region latency off the
  // common path when read replication is not enabled.
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800",
  );
  return response;
}
