/**
 * Data for the `/courses` catalog page: enriches the generated course catalog
 * (lib/generated/course-catalog.js) with a "most popular" rank for the
 * default sort. Reads the generated module rather than the filesystem ON
 * PURPOSE: workerd has no filesystem, so fs calls 500 any request rendered on
 * demand instead of from the incremental cache — keep this module free of
 * `node:fs`. The ranking is a hand-curated stand-in (no analytics yet);
 * unranked courses sort after every ranked one, alphabetically.
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
  "data-wrangling-python-polars",
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

/** Every course under content/courses, sorted by the stand-in popularity
 *  rank (ties: alphabetical). Async purely to keep the call sites unchanged. */
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
