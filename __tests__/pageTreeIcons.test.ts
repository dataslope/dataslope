/**
 * No page-tree icons in content.
 *
 * `lib/source.ts` deliberately runs without Fumadocs' `lucideIconsPlugin()`,
 * which imports lucide-react's full `icons` map to resolve names and costs the
 * Worker ~260 KB gzipped. Without it an `icon: "Cpu"` in frontmatter, or a
 * `---[Layers]Section---` separator in meta.json, reaches the sidebar as the
 * bare string "Cpu". If content needs icons, map the few it names explicitly
 * in `lib/source.ts` and relax this test to match.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CONTENT = join(process.cwd(), "content");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".mdx") || name === "meta.json") out.push(full);
  }
  return out;
}

/** The frontmatter block of an MDX file, or "" when it has none. */
function frontmatter(src: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  return m ? m[1] : "";
}

describe("page-tree icons", () => {
  const files = walk(CONTENT);

  it("finds the content tree", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("no page, folder or separator names an icon", () => {
    const offenders = files.filter((file) => {
      const src = readFileSync(file, "utf8");
      if (file.endsWith("meta.json")) {
        return /"icon"\s*:/.test(src) || /---\[[^\]]+\]/.test(src);
      }
      return /^icon\s*:/m.test(frontmatter(src));
    });
    expect(offenders.map((f) => f.slice(CONTENT.length + 1))).toEqual([]);
  });
});
