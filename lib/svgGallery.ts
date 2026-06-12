/**
 * Build-time collector for the custom SVG graphics gallery (`/svg-gallery`).
 *
 * Walks every lesson under `content/learn/`, extracts each hand-authored inline
 * `<svg>` graphic (via `extractSvgGraphics`), and groups them by course, tagging
 * each with the same globally-unique ID that `remarkSvgLabels` stamps onto the
 * rendered page (e.g. `svg-intro-sql-postgres-filtering-rows-f4f4db`) plus a
 * deep link back to the lesson that contains it.
 *
 * Mermaid charts are excluded — they're authored as ```mermaid fences, never
 * `<svg>` elements, so the `<svg>`-only collection skips them by construction.
 *
 * This module reads the filesystem and is server-only; it runs once at build
 * time when the static `/svg-gallery` route is pre-rendered.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { source } from "./source";
import { extractSvgGraphics } from "./extractSvgGraphics";

const CONTENT_DIR = path.join(process.cwd(), "content", "learn");

export interface GalleryGraphic {
  /** Globally-unique, content-hashed ID — identical to the on-page label. */
  id: string;
  /** Render-ready SVG markup (JSX-isms rewritten to valid HTML). */
  html: string;
  /** URL of the lesson that contains this graphic, anchored to its label. */
  href: string;
}

export interface GalleryCourse {
  /** Course folder slug (first path segment under content/learn/). */
  slug: string;
  /** Human-readable course title (from the course index page, if any). */
  title: string;
  graphics: GalleryGraphic[];
}

let cache: GalleryCourse[] | null = null;

/**
 * Collect every custom inline `<svg>` graphic across all `/learn` lessons,
 * grouped by course and tagged with its on-page ID and a link to its lesson.
 * Memoised so the work runs once per build.
 */
export function getSvgGallery(): GalleryCourse[] {
  if (cache) return cache;

  const courses = new Map<string, GalleryCourse>();
  // Course titles come from each course's index page (url === /learn/<slug>).
  const courseTitle = new Map<string, string>();

  for (const page of source.getPages()) {
    const rel = page.path; // e.g. "intro-sql-postgres/filtering-rows.mdx"
    const slug = rel.split("/")[0];
    if (rel === `${slug}/index.mdx` || rel === `${slug}/index.md`) {
      const t = page.data.title;
      if (typeof t === "string" && t) courseTitle.set(slug, t);
    }

    const abs = path.join(CONTENT_DIR, rel);
    let raw: string;
    try {
      raw = readFileSync(abs, "utf8");
    } catch {
      continue;
    }

    const graphics = extractSvgGraphics(raw, abs);
    if (graphics.length === 0) continue;

    let bucket = courses.get(slug);
    if (!bucket) {
      bucket = { slug, title: slug, graphics: [] };
      courses.set(slug, bucket);
    }
    for (const g of graphics) {
      bucket.graphics.push({ ...g, href: `${page.url}#${g.id}` });
    }
  }

  cache = [...courses.values()]
    .map((c) => ({ ...c, title: courseTitle.get(c.slug) ?? c.slug }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}
