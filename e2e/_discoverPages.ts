import * as fs from "node:fs";
import * as path from "node:path";

// Discovers the docs routes whose MDX source contains a given component,
// by walking content/courses + content/fumadocs-dev and mapping file paths
// to fumadocs routes:
//
//   content/fumadocs-dev/index.mdx                 -> /fumadocs-dev
//   content/fumadocs-dev/code-blocks-python.mdx    -> /fumadocs-dev/code-blocks-python
//   content/courses/python-basics/strings.mdx      -> /courses/python-basics/strings
//   content/courses/<course>/index.mdx             -> /courses/<course>
//
// Used by the courseware-wide e2e sweeps so they don't hardcode a page list.

const SECTIONS = [
  { dir: path.join(process.cwd(), "content", "courses"), base: "/courses" },
  {
    dir: path.join(process.cwd(), "content", "fumadocs-dev"),
    base: "/fumadocs-dev",
  },
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
