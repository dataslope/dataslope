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
 * as `?tag=courses/<slug>` / `?tag=interview/<slug>`. The tag re-weights
 * rather than filters: in-scope lessons win, out-of-scope stay reachable.
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
 * `courses/<slug>`, `/interview-prep/<slug>/…` → `interview/<slug>`, else
 * undefined. Client half of `parseScope`; kept beside it so they can't drift.
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
 * BM25 column weights, in the table's column order; the five UNINDEXED
 * columns lead and take 0 (`bm25()` wants one weight per column). Prose
 * outranks code ~7:1 so the lesson that explains an identifier beats the
 * dozen that merely use it in a starter file.
 */
export const WEIGHTS = "0, 0, 0, 0, 0, 8.0, 6.0, 4.0, 1.0, 0.15";

/**
 * Scope multipliers. `bm25()` returns negative scores (more negative = more
 * relevant), so multiplying amplifies: ×2 means an in-course lesson wins
 * unless a foreign one is more than twice as relevant. The collection nudge
 * is mild.
 */
const COURSE_BOOST = "2.0";
const COLLECTION_BOOST = "1.15";

/**
 * Component rows (empty `heading`, non-empty anchor) are tiny, and BM25's
 * length normalisation rewards tiny documents: undamped, an eight-word alt
 * text outranks the section that teaches the term. Damping keeps sections on
 * top; duplicate quotes still collapse onto the component's anchor in
 * `toResults`.
 */
const COMPONENT_ROW_DAMP = "0.75";

/**
 * The search statement. Two snippets because `snippet()` reads one column:
 * the code snippet is the fallback when the match lives only in `code` (see
 * `bestExcerpt`). The trailing `page, url` keeps equal-score rows stable
 * across replicas so the CDN-cached response is deterministic. Parameters:
 * ?1 MATCH, ?2 LIMIT; scoped adds ?3 scope page, ?4 LIKE prefix,
 * ?5 collection.
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

/** Rows one page may spend from the budget; without a cap, one page whose
 *  every section matches eats the whole result list. */
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
 * Group ranked rows into Fumadocs's page-then-children shape. The first row
 * seen for a page fixes that page's position. Component content is indexed
 * twice (section row + component row), so near-identical snippets are
 * collapsed keeping the component's anchor — the one that scrolls to the
 * matched text. `hl` (the searched tokens) is carried on every result URL so
 * the lesson page can highlight matches after navigation.
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

    // A component row with nothing to quote matched only via its `title`
    // column; that match also hit every other row of the page, so dropping
    // it costs nothing.
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
