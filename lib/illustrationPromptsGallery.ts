/**
 * Build-time collector for the `/illustration-prompts` gallery.
 *
 * Walks every lesson under `content/courses/`, `content/fumadocs-dev/`, and
 * `content/interview/`, finds
 * each `<IllustrationPrompt …>` placeholder, and groups the placements by their
 * semantic file slug (see `lib/illustrationPrompt.ts`) so the gallery shows one
 * card per distinct illustration to be drawn — with its target file name, the
 * exact generation prompt, and deep links to every lesson that uses it.
 *
 * Unlike the SVG gallery (a multi-hundred-kB payload that had to be offloaded to
 * a static JSON asset to stay off the ISR read meter), this data set is tiny —
 * ~80 short prompts — so the page renders it directly as a prerendered server
 * component (see `app/illustration-prompts/page.tsx`); no separate data file or
 * client fetch is needed.
 *
 * Deliberately free of any Fumadocs `source` dependency: lesson URLs come from
 * file paths and course/role titles from each folder's `meta.json`, the same
 * approach as `lib/svgGallery.ts`. That keeps the module trivially testable and
 * importable from a server component.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildIllustrationPrompt,
  illustrationFileSlug,
} from "./illustrationPrompt";

const CONTENT_ROOT = path.join(process.cwd(), "content");

/** Content collections: directory name under content/ → public URL base
 *  (mirrors the loader baseUrls in lib/source.ts). */
type Collection = "courses" | "fumadocs-dev" | "interview";
const URL_BASE: Record<Collection, string> = {
  courses: "/courses",
  "fumadocs-dev": "/fumadocs-dev",
  interview: "/interview-prep",
};

export interface PromptUsage {
  /** Lesson URL (e.g. /courses/mastering-ggplot2/interesting-discussions). */
  route: string;
  /** Same URL anchored to this illustration's slug. */
  href: string;
  /** Course/role folder slug. */
  courseSlug: string;
  /** Human-readable course/role title. */
  courseTitle: string;
  /** Which collection the lesson lives in. */
  collection: Collection;
}

export interface IllustrationPromptEntry {
  /** Semantic file stem, e.g. "leland-wilkinson-portrait". */
  slug: string;
  /** Target asset file name, e.g. "leland-wilkinson-portrait.svg". */
  file: string;
  /** Representative subject (the most descriptive phrasing seen). */
  subject: string;
  /** Whether a reference photo is attached (specific named real people). */
  photo: boolean;
  /** The exact image-generation prompt. */
  prompt: string;
  /** Every lesson that embeds this illustration. */
  usages: PromptUsage[];
}

export interface IllustrationPromptsData {
  entries: IllustrationPromptEntry[];
  /** Number of distinct illustrations (= entries.length). */
  totalIllustrations: number;
  /** Number of `<IllustrationPrompt>` placements across all lessons. */
  totalPlacements: number;
  /** Number of distinct lessons that contain at least one placement. */
  totalLessons: number;
}

// `<IllustrationPrompt … />` (self-closing) with a subject attribute and an
// optional bare `photo` flag, in any attribute order.
const TAG_RE = /<IllustrationPrompt\b([^>]*?)\/>/gs;
const SUBJECT_RE = /subject="([^"]*)"/;
const PHOTO_RE = /(^|\s)photo(\s|=|\/|$)/;

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

/** `course/lesson.mdx` → `<urlBase>/course/lesson`; `index` collapses away. */
function lessonUrl(collection: Collection, rel: string): string {
  const base = URL_BASE[collection];
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

/** Course/role title from `content/<base>/<slug>/meta.json`, if present. */
function metaTitle(base: string, slug: string): string | undefined {
  try {
    const raw = readFileSync(
      path.join(CONTENT_ROOT, base, slug, "meta.json"),
      "utf8",
    );
    const meta = JSON.parse(raw) as { title?: unknown };
    return typeof meta.title === "string" && meta.title ? meta.title : undefined;
  } catch {
    return undefined;
  }
}

function readCourseIndex(base: string, slug: string): string | undefined {
  for (const name of ["index.mdx", "index.md"]) {
    try {
      return readFileSync(path.join(CONTENT_ROOT, base, slug, name), "utf8");
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

interface RawPlacement {
  subject: string;
  photo: boolean;
  slug: string;
  route: string;
  courseSlug: string;
  courseTitle: string;
  collection: Collection;
}

function collectPlacements(base: Collection): RawPlacement[] {
  const dir = path.join(CONTENT_ROOT, base);
  const titles = new Map<string, string>();
  const out: RawPlacement[] = [];

  for (const rel of walkLessonFiles(dir)) {
    let raw: string;
    try {
      raw = readFileSync(path.join(dir, rel), "utf8");
    } catch {
      continue;
    }
    if (!raw.includes("<IllustrationPrompt")) continue;

    // Nested lessons group under their course/role folder; loose pages directly
    // under the collection group under their own file stem.
    const nested = rel.includes("/");
    const courseSlug = nested ? rel.split("/")[0] : rel.replace(/\.mdx?$/i, "");
    if (!titles.has(courseSlug)) {
      const title = nested
        ? (metaTitle(base, courseSlug) ??
          frontmatterTitle(readCourseIndex(base, courseSlug) ?? "") ??
          courseSlug)
        : (frontmatterTitle(raw) ?? courseSlug);
      titles.set(courseSlug, title);
    }

    const route = lessonUrl(base, rel);
    for (const m of raw.matchAll(TAG_RE)) {
      const attrs = m[1];
      const subjectMatch = SUBJECT_RE.exec(attrs);
      if (!subjectMatch) continue;
      const subject = subjectMatch[1];
      const photo = PHOTO_RE.test(attrs);
      out.push({
        subject,
        photo,
        slug: illustrationFileSlug(subject, photo),
        route,
        courseSlug,
        courseTitle: titles.get(courseSlug) ?? courseSlug,
        collection: base,
      });
    }
  }
  return out;
}

let cache: IllustrationPromptsData | null = null;

/**
 * Collect every `<IllustrationPrompt>` placement across the courses,
 * fumadocs-dev, and interview
 * collections, deduplicated into one entry per distinct illustration (semantic
 * file slug). Memoised so the scan runs once per build.
 */
export function getIllustrationPrompts(): IllustrationPromptsData {
  if (cache) return cache;

  const placements = [
    ...collectPlacements("courses"),
    ...collectPlacements("fumadocs-dev"),
    ...collectPlacements("interview"),
  ];

  const bySlug = new Map<string, IllustrationPromptEntry>();
  const routes = new Set<string>();

  for (const p of placements) {
    routes.add(p.route);
    let entry = bySlug.get(p.slug);
    if (!entry) {
      entry = {
        slug: p.slug,
        file: `${p.slug}.svg`,
        subject: p.subject,
        photo: p.photo,
        prompt: buildIllustrationPrompt(p.subject, p.photo),
        usages: [],
      };
      bySlug.set(p.slug, entry);
    } else if (p.subject.length > entry.subject.length) {
      // Keep the most descriptive phrasing as the representative prompt when a
      // slug is shared (e.g. two Datasaurus wordings → one drawing).
      entry.subject = p.subject;
      entry.prompt = buildIllustrationPrompt(p.subject, entry.photo);
    }
    // Record the usage, deduping repeated placements on the same route.
    if (!entry.usages.some((u) => u.route === p.route)) {
      entry.usages.push({
        route: p.route,
        href: `${p.route}#${p.slug}`,
        courseSlug: p.courseSlug,
        courseTitle: p.courseTitle,
        collection: p.collection,
      });
    }
  }

  const entries = [...bySlug.values()].sort((a, b) => {
    // People (portraits) first, then objects; alphabetical within each group.
    if (a.photo !== b.photo) return a.photo ? -1 : 1;
    return a.subject.localeCompare(b.subject);
  });
  for (const e of entries) {
    e.usages.sort((a, b) => a.route.localeCompare(b.route));
  }

  cache = {
    entries,
    totalIllustrations: entries.length,
    totalPlacements: placements.length,
    totalLessons: routes.size,
  };
  return cache;
}
