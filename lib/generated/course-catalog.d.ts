/**
 * Type for the generated course catalog
 * (`lib/generated/course-catalog.js`, produced by
 * `scripts/build-course-catalog.mjs` from `content/courses/*​/meta.json` — the
 * single source of truth for which courses exist).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run.
 *
 * This is a raw mirror of what is on disk, sorted by slug. It carries no
 * ordering opinion — the hand-curated popularity ranking, and the sort that
 * uses it, live in `lib/courseCatalog.ts` where they can be reviewed.
 *
 * It exists so `/` and `/courses` can render without touching `node:fs`,
 * which workerd has no implementation for; see the script header.
 */
import type { CourseTags } from "@/app/_components/home/CoursesSection";

export interface GeneratedCourse {
  slug: string;
  title: string;
  description: string;
  tags: CourseTags;
}

declare const courseCatalog: GeneratedCourse[];

export default courseCatalog;
