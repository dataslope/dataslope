import Link from "../Link";
import { ArrowRight } from "lucide-react";

export interface CourseTags {
  language?: string[];
  libraries?: string[];
  domain?: string[];
  skills?: string[];
  tools?: string[];
  level?: string[];
}

export interface Course {
  slug: string;
  title: string;
  tags: CourseTags;
}

// Most-scannable categories first (difficulty, language), then specifics.
const TAG_CATEGORY_ORDER: (keyof CourseTags)[] = [
  "level",
  "language",
  "libraries",
  "tools",
  "domain",
  "skills",
];

// Brand-coloured chips: blue / green / red carry the categorical accents;
// the remaining categories stay neutral so the row never gets noisy.
const CHIP_CLASSES: Record<string, string> = {
  level:
    "border-[var(--ds-green-200)] bg-[var(--ds-green-50)] text-[var(--ds-green-800)] capitalize dark:border-[var(--ds-green-500)]/30 dark:bg-[var(--ds-green-500)]/10 dark:text-[var(--ds-green-300)]",
  language:
    "border-[var(--ds-blue-200)] bg-[var(--ds-blue-50)] text-[var(--ds-blue-700)] dark:border-[var(--ds-blue-500)]/30 dark:bg-[var(--ds-blue-500)]/10 dark:text-[var(--ds-blue-300)]",
  libraries:
    "border-[var(--ds-red-200)] bg-[var(--ds-red-50)] text-[var(--ds-red-700)] dark:border-[var(--ds-red-500)]/30 dark:bg-[var(--ds-red-500)]/10 dark:text-[var(--ds-red-300)]",
  default:
    "border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] text-[var(--ds-gray-600)] dark:border-white/10 dark:bg-white/5 dark:text-[var(--ds-gray-300)]",
};

// Proper display labels for tag slugs whose casing isn't just "capitalize each
// word" — languages, tools, and libraries with established names. Anything not
// listed falls back to title-casing the hyphenated slug (e.g.
// "exploratory-data-analysis" → "Exploratory Data Analysis").
const TAG_LABELS: Record<string, string> = {
  // Languages
  c: "C",
  cpp: "C++",
  csharp: "C#",
  java: "Java",
  javascript: "JavaScript",
  python: "Python",
  r: "R",
  sql: "SQL",
  typescript: "TypeScript",
  // Tools / databases
  dotnet: ".NET",
  duckdb: "DuckDB",
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
  // Libraries (kept at their canonical casing)
  dplyr: "dplyr",
  ggplot2: "ggplot2",
  linq: "LINQ",
  matplotlib: "Matplotlib",
  nltk: "NLTK",
  numpy: "NumPy",
  pandas: "pandas",
  plotly: "Plotly",
  "scikit-learn": "scikit-learn",
  scipy: "SciPy",
  seaborn: "seaborn",
  statsmodels: "statsmodels",
};

/** Turn a tag slug into a badge label: a known proper name, or the slug
 *  title-cased with hyphens replaced by spaces. */
function formatTagLabel(value: string): string {
  return (
    TAG_LABELS[value] ??
    value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function flattenTags(tags: CourseTags): { category: string; value: string }[] {
  const chips: { category: string; value: string }[] = [];
  for (const category of TAG_CATEGORY_ORDER) {
    for (const value of tags[category] ?? []) {
      chips.push({ category, value });
    }
  }
  return chips;
}

export function CoursesSection({ courses }: { courses: Course[] }) {
  if (courses.length === 0) return null;
  return (
    <section id="courses" className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
          Courses
        </h2>
        <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
          Hands-on, browser-based tracks across data and engineering.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map(({ slug, title, tags }) => {
          const chips = flattenTags(tags);
          return (
            <Link
              key={slug}
              href={`/learn/${slug}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-[var(--ds-gray-200)] bg-white p-5 transition-colors hover:border-[var(--ds-blue-300)] hover:bg-[var(--ds-gray-50)] dark:border-white/10 dark:bg-white/5 dark:hover:border-white/20 dark:hover:bg-white/[0.07]"
            >
              <span className="flex min-w-0 flex-col gap-2.5">
                <span className="font-semibold text-[var(--ds-gray-900)] dark:text-white">
                  {title}
                </span>
                {chips.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {chips.map(({ category, value }) => (
                      <span
                        key={`${category}:${value}`}
                        className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium ${
                          CHIP_CLASSES[category] ?? CHIP_CLASSES.default
                        }`}
                      >
                        {formatTagLabel(value)}
                      </span>
                    ))}
                  </span>
                )}
              </span>
              <ArrowRight
                size={18}
                className="shrink-0 text-[var(--ds-blue-500)] transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
