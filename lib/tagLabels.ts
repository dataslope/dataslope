/**
 * Display labels for content tag slugs, shared by the homepage course cards
 * (`app/_components/home/CoursesSection.tsx`) and the `/courses` catalog.
 *
 * Proper display labels for tag slugs whose casing isn't just "capitalize
 * each word", languages, tools, and libraries with established names.
 * Anything not listed falls back to title-casing the hyphenated slug
 * (e.g. "exploratory-data-analysis" → "Exploratory Data Analysis").
 */
export const TAG_LABELS: Record<string, string> = {
  // Languages
  c: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  html: "HTML",
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
  // AI domains and tools
  "ai-tools": "AI Tools",
  chatgpt: "ChatGPT",
  "llm-internals": "LLM Internals",
  // Skills with acronyms that plain title-casing would get wrong
  "css-layout": "CSS Layout",
  "semantic-html": "Semantic HTML",
  "dom-manipulation": "DOM Manipulation",
};

/** Turn a tag slug into a badge label: a known proper name, or the slug
 *  title-cased with hyphens replaced by spaces. */
export function formatTagLabel(value: string): string {
  return (
    TAG_LABELS[value] ??
    value
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}
