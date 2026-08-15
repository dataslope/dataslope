/**
 * Redirects from the flat `/courses/<lesson>` shape to the real
 * `/courses/<course>/<lesson>` URL. Flat requests arrive from unknown
 * sources and 404 on content that exists, so the shape is fixed rather than
 * the source chased; running in the router also keeps OpenNext from caching
 * those 404s into R2 forever. AMBIGUOUS LEAVES ARE SKIPPED: a lesson slug is
 * only unique within its course (61 leaves collide), so those keep 404ing
 * rather than being sent to an arbitrary course. Computed at build time from
 * the content tree — next.config.ts loads before anything else, and walking
 * the filenames beats trusting a manifest an entry point forgot to
 * regenerate.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

export interface CourseAliasRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

const COURSES_DIR = join(process.cwd(), "content", "courses");

/**
 * `<course>/<lesson>.mdx` → `["<course>", "<lesson>"]`, with `index` collapsing
 * into its directory. The same mapping `scripts/build-course-md.mjs` and
 * `scripts/build-search-corpus.mjs` use, and the one Fumadocs derives lesson
 * URLs by (no course file overrides `slug:` in frontmatter).
 */
function lessonSlugs(relPath: string): string[] {
  return relPath
    .replace(/\\/g, "/")
    .replace(/\.mdx?$/i, "")
    .replace(/(^|\/)index$/i, "")
    .split("/")
    .filter(Boolean);
}

/** Every lesson path under `content/courses`, as slug arrays. */
function collectLessons(dir: string, prefix = ""): string[][] {
  const out: string[][] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...collectLessons(join(dir, entry.name), rel));
    } else if (/\.mdx?$/i.test(entry.name)) {
      const slugs = lessonSlugs(rel);
      if (slugs.length) out.push(slugs);
    }
  }
  return out;
}

export function courseAliasRedirects(): CourseAliasRedirect[] {
  let lessons: string[][];
  try {
    lessons = collectLessons(COURSES_DIR);
  } catch {
    // No content tree (a partial checkout, or a tool loading the Next config
    // from elsewhere). Redirects are an enhancement, not a correctness
    // requirement, so degrade to none rather than failing the build.
    return [];
  }

  // A one-segment path that is already a real page — every course root — must
  // never be redirected away from itself.
  const reserved = new Set(lessons.filter((s) => s.length === 1).map((s) => s[0]));

  const byLeaf = new Map<string, string[][]>();
  for (const slugs of lessons) {
    if (slugs.length < 2) continue;
    const leaf = slugs[slugs.length - 1];
    const bucket = byLeaf.get(leaf);
    if (bucket) bucket.push(slugs);
    else byLeaf.set(leaf, [slugs]);
  }

  const redirects: CourseAliasRedirect[] = [];
  for (const [leaf, matches] of byLeaf) {
    // Ambiguous, or shadowing a course root: leave it alone.
    if (matches.length !== 1 || reserved.has(leaf)) continue;
    redirects.push({
      source: `/courses/${leaf}`,
      // 308, because the canonical URL is not going to change back and search
      // engines should transfer the link equity rather than keep the flat URL.
      destination: `/courses/${matches[0].join("/")}`,
      permanent: true,
    });
  }
  // Stable order so the routes manifest does not churn between builds on
  // filesystem iteration order alone.
  return redirects.sort((a, b) => (a.source < b.source ? -1 : 1));
}
