import * as fs from "node:fs";
import * as path from "node:path";

// Discovers the docs routes whose MDX source contains a given component, for
// the courseware-wide e2e sweeps. SECTIONS MUST stay in step with the
// collections in source.config.ts and the baseUrls in lib/source.ts — a
// missing collection is a silently narrower sweep (content/interview once
// went entirely unchecked). __tests__/discoverPages.test.ts pins the list.

const CONTENT_ROOT = path.join(process.cwd(), "content");

export const SECTIONS = [
  { dir: path.join(CONTENT_ROOT, "courses"), base: "/courses" },
  { dir: path.join(CONTENT_ROOT, "fumadocs-dev"), base: "/fumadocs-dev" },
  // content/interview is served at /interview-prep — deliberately different
  // (see interviewSource in lib/source.ts).
  { dir: path.join(CONTENT_ROOT, "interview"), base: "/interview-prep" },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function fileToRoute(dir: string, base: string, file: string): string {
  const rel = path.relative(dir, file).replace(/\\/g, "/");
  let slug = rel.replace(/\.mdx$/, "");
  slug = slug.replace(/(^|\/)index$/, "");
  slug = slug.replace(/\/$/, "");
  return slug ? `${base}/${slug}` : base;
}

export interface DiscoveredPage {
  route: string;
  file: string;
}

/** Routes whose MDX contains any of the given component opener tags
 *  (e.g. ["<CodeBlock", "<SqlCodeBlock"]). Sorted for stable ordering. */
export function discoverPages(openerTags: string[]): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];
  for (const { dir, base } of SECTIONS) {
    for (const file of walk(dir)) {
      const src = fs.readFileSync(file, "utf8");
      if (openerTags.some((t) => src.includes(t))) {
        pages.push({ route: fileToRoute(dir, base, file), file });
      }
    }
  }
  pages.sort((a, b) => a.route.localeCompare(b.route));
  return pages;
}
