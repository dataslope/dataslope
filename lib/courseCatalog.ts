/**
 * Build-time data for the `/courses` catalog page.
 *
 * Reads every course folder's `meta.json` under `content/courses/` (the same
 * source of truth the homepage cards use, see `getCourses` in `app/page.tsx`)
 * and enriches it with the description and a "most popular" rank for the
 * catalog's default sort.
 *
 * The popularity ranking is a hand-curated stand-in, the repo has no
 * analytics data, ordered roughly "friendliest entry points first". Replace
 * with real engagement figures when they exist. Courses missing from the list
 * sort after every ranked course, alphabetically.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
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

interface CourseMetaFile {
  title?: unknown;
  description?: unknown;
  root?: unknown;
  tags?: CourseTags;
}

/** Every course (root folder with a titled meta.json) under content/courses,
 *  sorted by the stand-in popularity rank (ties: alphabetical). */
export async function getCourseCatalog(): Promise<CatalogCourse[]> {
  const coursesDir = path.join(process.cwd(), "content", "courses");
  const entries = await readdir(coursesDir, { withFileTypes: true });

  const courses: CatalogCourse[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const raw = await readFile(
        path.join(coursesDir, entry.name, "meta.json"),
        "utf-8",
      );
      const meta = JSON.parse(raw) as CourseMetaFile;
      if (meta.root !== true || typeof meta.title !== "string") continue;
      courses.push({
        slug: entry.name,
        title: meta.title,
        description:
          typeof meta.description === "string" ? meta.description : "",
        tags: meta.tags ?? {},
        popularity: RANK.get(entry.name) ?? 1000,
      });
    } catch {
      // No meta.json or unreadable, skip
    }
  }

  return courses.sort(
    (a, b) => a.popularity - b.popularity || a.title.localeCompare(b.title),
  );
}
