/**
 * Type for the generated server-side search index
 * (`lib/generated/search-index.js`, produced by
 * `scripts/build-search-index.mjs`).
 *
 * Committed even though the `.js` it describes is gitignored: it lets tsc type
 * the import from the `.d.ts` instead of deep-inferring the multi-MB array
 * literal, and keeps typecheck/lint green on a fresh checkout before the build
 * script has run. Each entry matches the shape Fumadocs's Orama "simple"
 * search inserts (see `createSearchAPI("simple", …)` in `app/api/search`).
 */
declare const searchIndex: {
  /** Lesson URL, e.g. `/courses/intro-sql-postgres/filtering-rows`. */
  url: string;
  /** Page title (frontmatter `title`, falling back to the slug). */
  title: string;
  /** Page description (frontmatter `description`), or `""`. */
  description: string;
  /** Course title as a single breadcrumb, or `[]` for loose pages. */
  breadcrumbs: string[];
  /** Prose body — headings + paragraphs only (no code/components/SVG). */
  content: string;
  /** Reserved for future keyword boosting; currently `""`. */
  keywords: string;
}[];

export default searchIndex;
