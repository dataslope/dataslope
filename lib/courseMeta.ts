/**
 * Reads a section folder's `meta.json` (the Fumadocs folder config under
 * `content/<section>/<folder>/`). Used at build time to resolve the human
 * course/role name + description for breadcrumbs and Course JSON-LD, values
 * that live in `meta.json`, not in the page's own MDX frontmatter (the index
 * page's frontmatter title is typically "Welcome"/"Overview", not the name).
 *
 * `section` defaults to `"courses"`; pass `"interview"` for the
 * interview-prep roles. Returns `null` for slugs that aren't section roots
 * (e.g. loose demo pages directly under the section have no `meta.json`).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface CourseMeta {
  title: string;
  description?: string;
  root: boolean;
}

export async function getCourseMeta(
  courseSlug: string,
  section = "courses",
): Promise<CourseMeta | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "content", section, courseSlug, "meta.json"),
      "utf-8",
    );
    const meta = JSON.parse(raw) as {
      title?: unknown;
      description?: unknown;
      root?: unknown;
    };
    if (typeof meta.title !== "string") return null;
    return {
      title: meta.title,
      description:
        typeof meta.description === "string" ? meta.description : undefined,
      root: meta.root === true,
    };
  } catch {
    // No meta.json (loose page) or unreadable, not a course root.
    return null;
  }
}
