import * as fs from "node:fs";
import * as path from "node:path";

// Discovers the /learn routes whose MDX source contains a given component,
// by walking content/learn and mapping file paths to fumadocs routes:
//
//   content/learn/index.mdx                  -> /learn
//   content/learn/code-blocks-python.mdx     -> /learn/code-blocks-python
//   content/learn/python-basics/strings.mdx  -> /learn/python-basics/strings
//   content/learn/<course>/index.mdx         -> /learn/<course>
//
// Used by the courseware-wide e2e sweeps so they don't hardcode a page list.

const CONTENT = path.join(process.cwd(), "content", "learn");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function fileToRoute(file: string): string {
  const rel = path.relative(CONTENT, file).replace(/\\/g, "/");
  let slug = rel.replace(/\.mdx$/, "");
  slug = slug.replace(/(^|\/)index$/, "");
  slug = slug.replace(/\/$/, "");
  return slug ? `/learn/${slug}` : "/learn";
}

export interface DiscoveredPage {
  route: string;
  file: string;
}

/** Routes whose MDX contains any of the given component opener tags
 *  (e.g. ["<CodeBlock", "<SqlCodeBlock"]). Sorted for stable ordering. */
export function discoverPages(openerTags: string[]): DiscoveredPage[] {
  const pages: DiscoveredPage[] = [];
  for (const file of walk(CONTENT)) {
    const src = fs.readFileSync(file, "utf8");
    if (openerTags.some((t) => src.includes(t))) {
      pages.push({ route: fileToRoute(file), file });
    }
  }
  pages.sort((a, b) => a.route.localeCompare(b.route));
  return pages;
}
