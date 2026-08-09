/**
 * Query-time ranking and shaping for `/api/search`: the SQL the route runs,
 * and the transform from ranked FTS5 rows to the result list Fumadocs's
 * search dialog renders. Split out of the route so it is testable without a
 * Cloudflare context.
 */

/** Fumadocs's result shape (fumadocs-core `SortedResult`). */
export interface SortedResult {
  id: string;
  url: string;
  type: "page" | "heading" | "text";
  content: string;
  breadcrumbs?: string[];
}

/** One FTS5 row, as selected by `searchSql`. */
export interface SearchRow {
  url: string;
  page: string;
  anchor: string | null;
  section: string;
  title: string;
  heading: string;
  excerpt: string;
  codeExcerpt: string;
}

/**
 * The reader's current course or interview track, sent by the search dialog
 * as `?tag=courses/<slug>` / `?tag=interview/<slug>` (see DocsRootProvider).
 *
 * Unlike Fumadocs's stock APIs, the tag does not *filter*: it re-weights.
 * Someone searching "bar" inside the Plotly course almost always wants the
 * Plotly bar-chart lesson, but the ggplot2 lesson must stay reachable for
 * when they do not.
 */
export interface SearchScope {
  collection: "courses" | "interview";
  /** The scope's landing page, e.g. `/courses/mastering-ggplot2`. */
  page: string;
  /** SQL LIKE pattern matching every lesson under the scope. */
  pagePrefix: string;
}

const SCOPE_RE = /^(courses|interview)\/([a-z0-9][a-z0-9-]*)$/;
const COLLECTION_BASE = { courses: "/courses", interview: "/interview-prep" } as const;

/**
 * The tag the search dialog should send for a page: `/courses/<slug>/…` →
 * `courses/<slug>`, `/interview-prep/<slug>/…` → `interview/<slug>` (the
 * collection names the index uses), anything else → undefined. The client
 * half of `parseScope` (used by DocsRootProvider); kept beside it so the two
 * cannot drift.
 */
export function searchScopeFor(pathname: string): string | undefined {
  const m = /^\/(courses|interview-prep)\/([^/]+)/.exec(pathname);
  if (!m) return undefined;
  return `${m[1] === "courses" ? "courses" : "interview"}/${m[2]}`;
}

/**
 * Parse the dialog's `tag` parameter into a boost scope, or null for
 * anything that does not look like one (absent, malformed, or a slug outside
 * `[a-z0-9-]`, which also keeps LIKE metacharacters out of the pattern).
 */
export function parseScope(tag: string | null): SearchScope | null {
  if (!tag) return null;
  const m = SCOPE_RE.exec(tag);
  if (!m) return null;
  const collection = m[1] as SearchScope["collection"];
  const page = `${COLLECTION_BASE[collection]}/${m[2]}`;
  return { collection, page, pagePrefix: `${page}/%` };
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
export const WEIGHTS = "0, 0, 0, 0, 0, 8.0, 6.0, 4.0, 1.0, 0.15";

/**
 * Scope multipliers. `bm25()` returns negative scores (more negative = more
 * relevant), so multiplying a row's score amplifies it: ×2 means a lesson in
 * the reader's current course wins unless a foreign lesson is more than twice
 * as relevant, which is exactly the "twice as good to interrupt me" bar a
 * context switch should have to clear. The collection nudge is mild: reading
 * a course signals little about which interview track is relevant.
 */
const COURSE_BOOST = "2.0";
const COLLECTION_BOOST = "1.15";

/**
 * Component rows (empty `heading`, non-empty anchor) are deliberately tiny
 * (one quiz, one figure caption), and BM25's length normalisation rewards
 * tiny documents heavily: unchecked, a figure's eight-word alt text outranks
 * the section that actually teaches the term. Shrinking their score keeps
 * sections on top while the component row still ranks close behind, and when
 * both quote the same match the response collapses them onto the component's
 * anchor anyway (`toResults`), so nothing precise is lost.
 */
const COMPONENT_ROW_DAMP = "0.75";

/**
 * The search statement. Two snippets, because `snippet()` reads one column:
 * a match that lives only in `code` produces a highlight-less prose snippet,
 * and the code one is the fallback that keeps the dialog's excerpt honest
 * (see `bestExcerpt`).
 *
 * The trailing `page, url` keeps equal-score rows in a stable order across
 * replicas, so the CDN-cached response does not depend on which replica
 * answered first.
 *
 * Parameters, in order: ?1 MATCH, ?2 LIMIT, and for the scoped variant
 * ?3 scope page, ?4 scope LIKE prefix, ?5 scope collection.
 */
export function searchSql(scoped: boolean): string {
  const damp = `(CASE WHEN heading = '' AND anchor != '' THEN ${COMPONENT_ROW_DAMP} ELSE 1.0 END)`;
  const rank = scoped
    ? `bm25(docs, ${WEIGHTS}) * ${damp} * (CASE
         WHEN page = ?3 OR page LIKE ?4 THEN ${COURSE_BOOST}
         WHEN collection = ?5 THEN ${COLLECTION_BOOST}
         ELSE 1.0 END)`
    : `bm25(docs, ${WEIGHTS}) * ${damp}`;
  return `
    SELECT url, page, anchor, section, title, heading,
           snippet(docs, 8, '<mark>', '</mark>', '…', 24) AS excerpt,
           snippet(docs, 9, '<mark>', '</mark>', '…', 24) AS codeExcerpt
    FROM docs
    WHERE docs MATCH ?1
    ORDER BY ${rank}, page, url
    LIMIT ?2
  `;
}

/** How many section/component rows one page may spend from the row budget.
 *  Without a cap, a page whose every section matches a common term eats the
 *  whole result list and the second-best page never appears. */
const PAGE_ROW_CAP = 4;

/** The dialog's excerpt: the prose snippet when it actually highlights
 *  something, else the code snippet, else nothing worth showing. */
function bestExcerpt(row: SearchRow): string {
  if (row.excerpt.includes("<mark>")) return row.excerpt;
  if (row.codeExcerpt.includes("<mark>")) return row.codeExcerpt;
  return "";
}

/** Excerpt text reduced to its content for duplicate detection: markup,
 *  ellipses and casing are presentation, not identity. */
function normalizeExcerpt(s: string): string {
  return s
    .replaceAll("<mark>", "")
    .replaceAll("</mark>", "")
    .replaceAll("…", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Two snippets show "the same" text when one contains the other: the section
 *  row and the component row snip the same source region, differing only in
 *  how much leading/trailing context fit the window. */
function sameText(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 12 || b.length < 12) return false;
  return a.includes(b) || b.includes(a);
}

interface TextEntry {
  page: string;
  norm: string;
  /** True when the entry's URL points at a component anchor (the more precise
   *  target), which is what a duplicate from a section row must not displace. */
  fromComponent: boolean;
  entry: SortedResult;
}

/**
 * Group ranked rows into Fumadocs's page-then-children shape.
 *
 * Sections arrive already ranked. The first row seen for a page fixes that
 * page's position in the output, so a lesson whose best section ranked third
 * overall lands third, rather than every page floating to wherever its
 * strongest and weakest sections happen to be.
 *
 * Component rows (empty `heading`, non-null anchor; see
 * scripts/build-search-corpus.mjs) render as text entries linking to the
 * component's own anchor. Because component content is indexed twice (in its
 * section row and in its component row), the same match often arrives as two
 * near-identical snippets; they are collapsed here, keeping the component's
 * anchor, which is the one that scrolls to the matched text rather than to
 * the heading above it.
 *
 * `hl` (the query's searched tokens) is carried on every result URL so the
 * lesson page can highlight the matched words after navigation.
 */
export function toResults(
  rows: SearchRow[],
  limit: number,
  hl: string[] = [],
): SortedResult[] {
  const hlQuery = hl.length > 0 ? `?hl=${encodeURIComponent(hl.join(" "))}` : "";
  const link = (page: string, anchor: string | null) =>
    anchor ? `${page}${hlQuery}#${anchor}` : `${page}${hlQuery}`;

  const out: SortedResult[] = [];
  const seenPage = new Set<string>();
  const perPage = new Map<string, number>();
  const textEntries: TextEntry[] = [];
  let spent = 0;

  const pushText = (row: SearchRow, excerpt: string, fromComponent: boolean) => {
    const norm = normalizeExcerpt(excerpt);
    const dup = textEntries.find((t) => t.page === row.page && sameText(t.norm, norm));
    if (dup) {
      // Same text twice: keep one entry, pointed at the more precise anchor.
      if (fromComponent && !dup.fromComponent) {
        dup.entry.id = row.url;
        dup.entry.url = link(row.page, row.anchor);
        dup.fromComponent = true;
      }
      return;
    }
    const entry: SortedResult = {
      id: row.url,
      url: link(row.page, row.anchor),
      type: "text",
      content: excerpt,
    };
    textEntries.push({ page: row.page, norm, fromComponent, entry });
    out.push(entry);
  };

  for (const row of rows) {
    if (spent >= limit) break;

    // A component row with nothing to quote matched only through its `title`
    // column (component rows carry no heading/description). Such a match also
    // matched every other row of the same page, its page row included, so
    // dropping this one costs nothing and frees its slot for a row a reader
    // can actually see.
    const isComponentRow = !row.heading && row.anchor !== null && row.anchor !== "";
    if (isComponentRow && !bestExcerpt(row)) continue;

    const used = perPage.get(row.page) ?? 0;
    if (used >= PAGE_ROW_CAP) continue;
    perPage.set(row.page, used + 1);
    spent++;

    if (!seenPage.has(row.page)) {
      seenPage.add(row.page);
      out.push({
        id: row.page,
        url: link(row.page, null),
        type: "page",
        content: row.title,
        breadcrumbs: row.section ? [row.section] : undefined,
      });
    }
    // The pre-heading chunk of a page has no anchor; its content is already
    // represented by the page result above, so it adds no second entry.
    if (!row.anchor) continue;

    const excerpt = bestExcerpt(row);
    if (row.heading) {
      out.push({
        id: row.url,
        url: link(row.page, row.anchor),
        type: "heading",
        content: row.heading,
      });
      if (excerpt) pushText({ ...row, url: `${row.url}-text` }, excerpt, false);
    } else if (excerpt) {
      pushText(row, excerpt, true);
    }
  }
  return out;
}
