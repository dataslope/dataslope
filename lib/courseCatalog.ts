/**
 * Build-time data for the `/courses` catalog page.
 *
 * Every course folder's `meta.json` under `content/courses/` (the same source
 * of truth the homepage cards use, see `getCourses` in `app/page.tsx`) is
 * mirrored into `lib/generated/course-catalog.js` by
 * `scripts/build-course-catalog.mjs`. This module enriches that with a "most
 * popular" rank for the catalog's default sort.
 *
 * It reads the generated module rather than the filesystem ON PURPOSE. The
 * previous version called `readdir`/`readFile` here, which throws on
 * Cloudflare Workers — workerd has no filesystem — so any request that had to
 * render `/` or `/courses` on demand rather than serve them from the
 * incremental cache returned a 500. That happened for real on 2026-08-05 when
 * a cache cleanup deleted the folder a preview was serving. Importing the data
 * keeps a cache miss slow rather than fatal. Keep this module free of
 * `node:fs`.
 *
 * The popularity ranking is a hand-curated stand-in, the repo has no
 * analytics data, ordered roughly "friendliest entry points first". Replace
 * with real engagement figures when they exist. Courses missing from the list
 * sort after every ranked course, alphabetically. It stays here rather than in
 * the generated file because it is editorial judgement, not content.
 */
import generatedCourses from "@/lib/generated/course-catalog";
import type { CourseTags } from "@/app/_components/home/CoursesSection";

export interface CatalogCourse {
  slug: string;
  title: string;
  description: string;
  tags: CourseTags;
  /** 1 = most popular. `Infinity` (serialised as a large number) never, see
   *  POPULARITY_ORDER; unranked courses get rank 1000 + alphabetical index. */
  popularity: number;
}

// Most popular first. Stand-in ranking (no analytics in the repo yet).
const POPULARITY_ORDER: string[] = [
  "python-basics",
  "data-analysis-python-pandas",
  "intro-sql-postgres",
  "beginners-javascript",
  "intro-web-development",
  "react-from-the-ground-up",
  "modern-css-layout",
  "machine-learning-scikit-learn",
  "how-llms-work",
  "sqlite-for-beginners",
  "java-programming-for-beginners",
  "from-zero-to-cpp",
  "typescript-from-scratch",
  "c-programming-for-beginners",
  "statistics-for-data-science-python",
  "sql-analytics-duckdb",
  "practical-r-for-beginners",
  "intro-data-viz-plotly",
  "mastering-dsa-cpp",
  "intro-modern-csharp",
  "database-design-postgresql",
  "seaborn-foundations",
  "scientific-computing-python",
  "natural-language-processing-python",
  "time-series-analysis-python",
  "functional-programming-typescript",
  "oop-blueprint-java",
  "java-collections-and-generics-deep-dive",
  "mastering-ggplot2",
  "systems-programming-c",
  "csharp-linq-functional",
];

const RANK = new Map(POPULARITY_ORDER.map((slug, i) => [slug, i + 1]));

/** Every course (root folder with a titled meta.json) under content/courses,
 *  sorted by the stand-in popularity rank (ties: alphabetical).
 *
 *  Async purely to keep the call sites unchanged — the two callers await it
 *  from server components, and this stayed a promise so switching the data
 *  source is not also a refactor of `app/page.tsx` and `app/courses/page.tsx`. */
export async function getCourseCatalog(): Promise<CatalogCourse[]> {
  return generatedCourses
    .map((course) => ({
      ...course,
      popularity: RANK.get(course.slug) ?? 1000,
    }))
    .sort(
      (a, b) => a.popularity - b.popularity || a.title.localeCompare(b.title),
    );
}
