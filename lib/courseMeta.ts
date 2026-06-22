/**
 * Reads a course folder's `meta.json` (the Fumadocs folder config under
 * `content/learn/<course>/`). Used at build time to resolve the human course
 * name + description for breadcrumbs and Course JSON-LD — values that live in
 * `meta.json`, not in the page's own MDX frontmatter (the course index page's
 * frontmatter title is typically "Welcome", not the course name).
 *
 * Returns `null` for slugs that aren't course roots (e.g. loose demo pages
 * directly under `content/learn/` have no `meta.json`).
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
): Promise<CourseMeta | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "content", "learn", courseSlug, "meta.json"),
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
    // No meta.json (loose page) or unreadable — not a course root.
    return null;
  }
}
