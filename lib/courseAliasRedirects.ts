/**
 * Redirects from the flat `/courses/<lesson>` shape to the real
 * `/courses/<course>/<lesson>` URL.
 *
 * Every lesson lives two segments deep (`content/courses/<course>/<lesson>.mdx`
 * → `/courses/<course>/<lesson>`), and `app/sitemap.ts` only ever emits that
 * shape. Requests for the one-segment shape nevertheless arrive and 404 —
 * confirmed live on 2026-08-14, `/courses/capstone-data-pipeline` 404s while
 * `/courses/csharp-linq-functional/capstone-data-pipeline` is a real page, and
 * likewise for `/courses/setup-and-tsconfig`. Where those links come from was
 * never identified (an older URL scheme, inbound external links, or guessed
 * URLs), which is precisely why this is fixed by shape rather than by chasing
 * the source: they are broken links to content that exists, and that is an SEO
 * and UX bug whatever minted them.
 *
 * It also removes a storage bug at its source. An unmatched `/courses/*` path
 * used to render the not-found page and OpenNext cached that 404 into the live
 * build's R2 folder — ~1.8 MB apiece with `revalidate: false`, i.e. forever,
 * for URLs whose hit rate is near zero (see open-next.config.ts). The catch-all
 * route now sets `dynamicParams = false` so nothing renders for an unknown
 * path at all; these redirects run one phase earlier still, in the router,
 * so a flat lesson link never reaches the route.
 *
 * AMBIGUOUS LEAVES ARE SKIPPED. A lesson slug is only unique within its course:
 * `next-steps` exists in 31 courses, `computational-thinking` in 5, and 61
 * leaves collide overall. There is no honest destination for those, so they
 * keep 404ing rather than being sent to an arbitrary course. That leaves ~620
 * of ~685 distinct leaves covered.
 *
 * Computed at build time from the content tree rather than from a generated
 * artifact: `next.config.ts` is loaded before anything else runs, and walking
 * ~830 filenames costs a few milliseconds against the risk of reading a
 * manifest some entry point forgot to regenerate.
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
