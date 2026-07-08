/**
 * Build-time collector for the custom SVG graphics gallery (`/svg-gallery`).
 *
 * Walks every lesson under `content/courses/` and `content/fumadocs-dev/`,
 * extracts each hand-authored inline
 * `<svg>` graphic (via `extractSvgGraphics`), and groups them by course, tagging
 * each with the same globally-unique ID that `remarkSvgLabels` stamps onto the
 * rendered page (e.g. `svg-intro-sql-postgres-filtering-rows-f4f4db`) plus a
 * deep link back to the lesson that contains it.
 *
 * Mermaid charts are excluded, they're authored as ```mermaid fences, never
 * `<svg>` elements, so the `<svg>`-only collection skips them by construction.
 *
 * Deliberately free of any Fumadocs `source` dependency: lesson URLs are
 * derived from file paths (the same `<base>/<path-without-extension>` mapping
 * the loaders use, with `index` collapsing to the folder) and course titles
 * come from each course's `meta.json` (same as the homepage course list),
 * falling back to the index page's frontmatter title, then the slug. That
 * keeps the module importable from `scripts/build-svg-gallery-data.mjs`,
 * which runs it ahead of `next build`/`next dev` to emit the gallery data as
 * a plain static asset (`public/svg-gallery/data.json`), served straight
 * from the CDN with no ISR involvement.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { extractSvgGraphics } from "./extractSvgGraphics";

// Sections to walk: content directory → URL base (mirrors lib/source.ts).
const SECTIONS = [
  { dir: path.join(process.cwd(), "content", "courses"), base: "/courses" },
  {
    dir: path.join(process.cwd(), "content", "fumadocs-dev"),
    base: "/fumadocs-dev",
  },
];

export interface GalleryGraphic {
  /** Globally-unique, content-hashed ID, identical to the on-page label. */
  id: string;
  /** Render-ready SVG markup (JSX-isms rewritten to valid HTML). */
  html: string;
  /** URL of the lesson that contains this graphic (e.g. /courses/foo/bar). */
  route: string;
  /** Same lesson URL, anchored to this graphic's label. */
  href: string;
}

export interface GalleryCourse {
  /** Course folder slug (first path segment under the section dir). */
  slug: string;
  /** Human-readable course title (from the course's meta.json, if any). */
  title: string;
  graphics: GalleryGraphic[];
}

/** Recursively collect lesson files, as /-separated paths relative to `dir`. */
function walkLessonFiles(dir: string, prefix = ""): string[] {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...walkLessonFiles(path.join(dir, entry.name), rel));
    } else if (/\.mdx?$/i.test(entry.name)) {
      out.push(rel);
    }
  }
  return out.sort();
}

/** `course/lesson.mdx` → `<base>/course/lesson`; `index` collapses away. */
function lessonUrl(base: string, rel: string): string {
  const stem = rel.replace(/\.mdx?$/i, "").replace(/(^|\/)index$/i, "");
  return stem ? `${base}/${stem}` : base;
}

/** Pull `title:` out of a leading YAML frontmatter block, if present. */
function frontmatterTitle(raw: string): string | undefined {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!block) return undefined;
  const line = /^title:[ \t]*(.+?)[ \t]*$/m.exec(block[1]);
  if (!line) return undefined;
  const title = line[1].replace(/^(["'])(.*)\1$/, "$2").trim();
  return title || undefined;
}

/** Course title from `<sectionDir>/<slug>/meta.json`, if present. */
function metaTitle(sectionDir: string, slug: string): string | undefined {
  try {
    const raw = readFileSync(path.join(sectionDir, slug, "meta.json"), "utf8");
    const meta = JSON.parse(raw) as { title?: unknown };
    return typeof meta.title === "string" && meta.title ? meta.title : undefined;
  } catch {
    return undefined;
  }
}

let cache: GalleryCourse[] | null = null;

/**
 * Collect every custom inline `<svg>` graphic across all course lessons and
 * fumadocs-dev demo pages,
 * grouped by course and tagged with its on-page ID and a link to its lesson.
 * Memoised so the work runs once per build.
 */
export function getSvgGallery(): GalleryCourse[] {
  if (cache) return cache;

  const courses = new Map<string, GalleryCourse>();
  const titles = new Map<string, string>();

  for (const { dir, base } of SECTIONS) {
    for (const rel of walkLessonFiles(dir)) {
      const abs = path.join(dir, rel);
      let raw: string;
      try {
        raw = readFileSync(abs, "utf8");
      } catch {
        continue;
      }

      // Nested lessons group under their course folder; loose demo pages
      // directly under the section dir group under their own file stem.
      const nested = rel.includes("/");
      const slug = nested ? rel.split("/")[0] : rel.replace(/\.mdx?$/i, "");

      if (!titles.has(slug)) {
        const title = nested
          ? (metaTitle(dir, slug) ??
            frontmatterTitle(readCourseIndex(dir, slug) ?? "") ??
            slug)
          : (frontmatterTitle(raw) ?? slug);
        titles.set(slug, title);
      }

      const graphics = extractSvgGraphics(raw, abs);
      if (graphics.length === 0) continue;

      let bucket = courses.get(slug);
      if (!bucket) {
        bucket = { slug, title: slug, graphics: [] };
        courses.set(slug, bucket);
      }
      const url = lessonUrl(base, rel);
      for (const g of graphics) {
        bucket.graphics.push({ ...g, route: url, href: `${url}#${g.id}` });
      }
    }
  }

  cache = [...courses.values()]
    .map((c) => ({ ...c, title: titles.get(c.slug) ?? c.slug }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return cache;
}

function readCourseIndex(sectionDir: string, slug: string): string | undefined {
  for (const name of ["index.mdx", "index.md"]) {
    try {
      return readFileSync(path.join(sectionDir, slug, name), "utf8");
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}
