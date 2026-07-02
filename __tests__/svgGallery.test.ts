import { describe, expect, it } from "vitest";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { VFile } from "vfile";
import { readFileSync } from "node:fs";
import path from "node:path";
import { remarkSvgLabels } from "../lib/remarkSvgLabels";
import { extractSvgGraphics } from "../lib/extractSvgGraphics";
import { jsxSvgToHtml } from "../lib/jsxSvgToHtml";

// The gallery is only useful if its IDs match the labels rendered on the live
// lesson pages. These tests pin that parity: extractSvgGraphics() must yield the
// same IDs (for <svg> graphics) that the remarkSvgLabels plugin stamps onto the
// page — and never a Mermaid label.

const labeller = remark().use(remarkMdx).use(remarkMdxMermaid).use(remarkSvgLabels);

// figIds the plugin stamps; `svgOnly` keeps just those whose immediately
// preceding sibling is an <svg> node (the plugin inserts each label right after
// its graphic) — i.e. excluding Mermaid labels.
function onPageIds(raw: string, p: string, svgOnly: boolean): string[] {
  const vf = new VFile({ value: raw, path: p });
  const tree = labeller.runSync(labeller.parse(vf), vf) as unknown as {
    children: Array<Record<string, unknown>>;
  };
  const ids: string[] = [];
  const walk = (n: Record<string, unknown>) => {
    const kids = n.children as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(kids)) return;
    for (let i = 0; i < kids.length; i++) {
      const c = kids[i];
      if (c.type === "mdxJsxFlowElement" && c.name === "SvgLabel") {
        const prev = kids[i - 1];
        if (!svgOnly || (prev && prev.name === "svg")) {
          const attrs = c.attributes as Array<{ name?: string; value?: unknown }>;
          const v = attrs.find((a) => a.name === "figId")?.value;
          if (typeof v === "string") ids.push(v);
        }
      }
      walk(c);
    }
  };
  walk(tree);
  return ids;
}

const REPO = process.cwd();
const abs = (rel: string) => path.join(REPO, rel);
const read = (rel: string) => readFileSync(abs(rel), "utf8");

// Lessons that mix <svg> graphics with Mermaid diagrams, with clean frontmatter
// so the labeller can parse them for a direct on-page-vs-gallery comparison.
const samples = [
  "content/courses/intro-sql-postgres/filtering-rows.mdx",
  "content/courses/intro-sql-postgres/what-is-a-database.mdx",
];

describe("extractSvgGraphics", () => {
  it("computes IDs identical to the on-page <svg> labels, excluding Mermaid", () => {
    for (const rel of samples) {
      const raw = read(rel);
      const gallery = extractSvgGraphics(raw, abs(rel)).map((g) => g.id);
      // Reproduces exactly the svg labels, in document order…
      expect(gallery).toEqual(onPageIds(raw, abs(rel), true));
      // …and never a Mermaid label, even on pages that mix both.
      const svgIds = new Set(onPageIds(raw, abs(rel), true));
      const mermaidIds = onPageIds(raw, abs(rel), false).filter(
        (id) => !svgIds.has(id),
      );
      expect(mermaidIds.length).toBeGreaterThan(0); // sample really does mix
      for (const id of gallery) expect(mermaidIds).not.toContain(id);
    }
  });

  it("matches the example ID format from the task", () => {
    const rel = "content/courses/intro-sql-postgres/filtering-rows.mdx";
    const ids = extractSvgGraphics(read(rel), abs(rel)).map((g) => g.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(id).toMatch(/^svg-intro-sql-postgres-filtering-rows-[0-9a-f]{6}$/);
    }
  });

  it("parses lessons whose frontmatter contains JSX-like text", () => {
    // error-handling-with-types.mdx carries TSX generics (`<T,>`) in its
    // frontmatter — a frontmatter-unaware MDX parse would throw. Blanking the
    // frontmatter lets it through and still yields its two graphics.
    const rel = "content/courses/typescript-from-scratch/error-handling-with-types.mdx";
    const graphics = extractSvgGraphics(read(rel), abs(rel));
    expect(graphics.length).toBe(2);
    for (const g of graphics) {
      expect(g.id).toMatch(
        /^svg-typescript-from-scratch-error-handling-with-types-[0-9a-f]{6}$/,
      );
      expect(g.html.startsWith("<svg")).toBe(true);
    }
  });

  it("returns [] for unreadable/SVG-less content without throwing", () => {
    expect(extractSvgGraphics("# Just prose\n\nNo graphics here.", abs("x/y.mdx"))).toEqual([]);
  });
});

describe("jsxSvgToHtml", () => {
  it("converts style objects and camelCase attributes to valid SVG", () => {
    const src =
      '<svg viewBox="0 0 10 10" style={{ display: "block", maxWidth: "640px" }}>' +
      '<rect x="1" y="1" width="8" height="8" fillOpacity="0.75" />' +
      "</svg>";
    const html = jsxSvgToHtml(src);
    expect(html).toContain('viewBox="0 0 10 10"'); // casing preserved
    expect(html).toContain('style="display: block; max-width: 640px"');
    expect(html).toContain('fill-opacity="0.75"');
    expect(html).not.toContain("{{");
    expect(html).not.toContain("fillOpacity");
  });

  it("preserves real authored graphics structurally", () => {
    const rel = "content/courses/intro-sql-postgres/filtering-rows.mdx";
    const html = extractSvgGraphics(read(rel), abs(rel))[0].html;
    expect(html.startsWith("<svg")).toBe(true);
    expect(html.trimEnd().endsWith("</svg>")).toBe(true);
    expect(html).not.toContain("={{");
    expect(html).not.toContain("fillOpacity");
    expect(html).toContain("fill-opacity=");
  });
});
