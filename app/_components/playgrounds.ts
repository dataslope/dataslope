// Canonical registry of language playgrounds (header dropdown, landing page).
// Keep in sync with the routes under `app/playground/<id>/`.

export interface PlaygroundEntry {
  /** Stable id matching the LanguageAdapter id and the route segment. */
  id: string;
  /** Human-readable language name shown in the dropdown / header. */
  label: string;
  /** Route the dropdown navigates to. */
  href: string;
  /** Runs in memory and is never saved or shared, so the workspace surfaces
   *  (recent lists, cloud storage, orphan recovery) skip it. Mirrors
   *  EPHEMERAL_PLAYGROUND_IDS in lib/workspaces/types.ts. */
  ephemeral?: boolean;
}

export const PLAYGROUNDS: PlaygroundEntry[] = [
  { id: "python", label: "Python", href: "/playground/python" },
  { id: "r", label: "R", href: "/playground/r" },
  { id: "javascript", label: "JavaScript", href: "/playground/javascript" },
  { id: "typescript", label: "TypeScript", href: "/playground/typescript" },
  { id: "web", label: "HTML", href: "/playground/web" },
  { id: "react", label: "React", href: "/playground/react" },
  { id: "php", label: "PHP", href: "/playground/php" },
  { id: "c", label: "C", href: "/playground/c" },
  { id: "cpp", label: "C++", href: "/playground/cpp" },
  { id: "java", label: "Java", href: "/playground/java" },
  { id: "csharp", label: "C#", href: "/playground/csharp" },
  // Databases, always in this order (PostgreSQL · SQLite · DuckDB); the
  // playground index and dashboard grids read the same list.
  { id: "postgres", label: "PostgreSQL", href: "/playground/postgres" },
  { id: "sqlite", label: "SQLite", href: "/playground/sqlite" },
  { id: "duckdb", label: "DuckDB", href: "/playground/duckdb" },
  // Memory-only: a repository is derived from the commands run against it, so
  // there is no workspace to persist.
  { id: "git", label: "Git", href: "/playground/git", ephemeral: true },
];

/** Playgrounds that own a saveable workspace — the recent-workspace lists,
 *  dashboard grids and orphan recovery all iterate these, never `PLAYGROUNDS`. */
export const PERSISTENT_PLAYGROUNDS: PlaygroundEntry[] = PLAYGROUNDS.filter(
  (p) => !p.ephemeral,
);
