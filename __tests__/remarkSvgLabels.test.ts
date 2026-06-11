import { describe, expect, it } from "vitest";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { VFile } from "vfile";
import { remarkSvgLabels } from "../lib/remarkSvgLabels";

// Run the same remark pipeline order as source.config.ts (mermaid first, then
// our plugin) and return the resulting MDAST so we can inspect inserted nodes.
function process(source: string, path: string) {
  const processor = remark()
    .use(remarkMdx)
    .use(remarkMdxMermaid)
    .use(remarkSvgLabels);
  const file = new VFile({ value: source, path });
  return processor.runSync(processor.parse(file), file) as unknown as {
    children: Array<Record<string, unknown>>;
  };
}

// Collect every <SvgLabel> figId attribute in document order.
function labelIds(tree: { children: Array<Record<string, unknown>> }): string[] {
  const ids: string[] = [];
  const walk = (node: Record<string, unknown>) => {
    const children = node.children as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(children)) return;
    for (const child of children) {
      if (child.type === "mdxJsxFlowElement" && child.name === "SvgLabel") {
        const attrs = child.attributes as Array<{ name?: string; value?: unknown }>;
        const figId = attrs.find((a) => a.name === "figId")?.value;
        if (typeof figId === "string") ids.push(figId);
      }
      walk(child);
    }
  };
  walk(tree);
  return ids;
}

const LEARN = "/repo/content/learn";
const SVG_A = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>';
const SVG_B = '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" /></svg>';
const HASH = /^[0-9a-f]{6}$/;

describe("remarkSvgLabels", () => {
  it("labels each inline <svg> with a page-namespaced, content-hashed id", () => {
    const src = `# Title\n\n${SVG_A}\n\nSome prose.\n\n${SVG_B}`;
    const ids = labelIds(process(src, `${LEARN}/python-basics/variables.mdx`));

    expect(ids).toHaveLength(2);
    for (const id of ids) {
      const m = id.match(/^svg-python-basics-variables-([0-9a-f]{6})$/);
      expect(m, id).not.toBeNull();
    }
    // Different content → different hash suffixes.
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("labels Mermaid diagrams with the same scheme as svgs", () => {
    const src = `${SVG_A}\n\n\`\`\`mermaid\nflowchart LR\n  A --> B\n\`\`\``;
    const ids = labelIds(process(src, `${LEARN}/ml/intro.mdx`));

    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(id.startsWith("svg-ml-intro-"), id).toBe(true);
      expect(id.slice("svg-ml-intro-".length)).toMatch(HASH);
    }
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("derives the Mermaid hash from the chart text (not its position)", () => {
    // Same chart on two different pages → identical hash suffix (the suffix is
    // a pure function of the graphic's own content).
    const chart = "```mermaid\nflowchart LR\n  A --> B\n```";
    const a = labelIds(process(chart, `${LEARN}/course-a/lesson.mdx`))[0];
    const b = labelIds(process(chart, `${LEARN}/course-b/lesson.mdx`))[0];
    expect(a.replace("svg-course-a-lesson-", "")).toBe(
      b.replace("svg-course-b-lesson-", ""),
    );
  });

  it("keeps each id stable when other graphics are reordered or removed", () => {
    const both = `${SVG_A}\n\n${SVG_B}`;
    const reordered = `${SVG_B}\n\n${SVG_A}`;
    const onlyB = `Intro.\n\n${SVG_B}`;

    const page = `${LEARN}/python-basics/variables.mdx`;
    const idsBoth = labelIds(process(both, page));
    const idsReordered = labelIds(process(reordered, page));
    const idsOnlyB = labelIds(process(onlyB, page));

    const idA = idsBoth[0];
    const idB = idsBoth[1];

    // Reordering swaps document order but each graphic keeps its own id.
    expect(idsReordered).toEqual([idB, idA]);
    // Deleting SVG_A leaves SVG_B's id untouched (no positional shift).
    expect(idsOnlyB).toEqual([idB]);
  });

  it("is deterministic: identical input yields identical ids", () => {
    const src = `${SVG_A}\n\n${SVG_B}`;
    const page = `${LEARN}/python-basics/variables.mdx`;
    expect(labelIds(process(src, page))).toEqual(labelIds(process(src, page)));
  });

  it("ignores indentation/whitespace differences in the hash", () => {
    const inline = `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>`;
    const indented = `<svg viewBox="0 0 10 10">\n  <circle cx="5" cy="5" r="4" />\n</svg>`;
    const page = `${LEARN}/python-basics/variables.mdx`;
    expect(labelIds(process(inline, page))[0]).toBe(
      labelIds(process(indented, page))[0],
    );
  });

  it("strips a trailing /index from the page slug", () => {
    const ids = labelIds(
      process(SVG_A, `${LEARN}/machine-learning-scikit-learn/index.mdx`),
    );
    expect(ids[0]).toMatch(/^svg-machine-learning-scikit-learn-[0-9a-f]{6}$/);
  });

  it("produces ids that are unique across different course pages", () => {
    const a = labelIds(process(SVG_A, `${LEARN}/course-a/lesson.mdx`));
    const b = labelIds(process(SVG_A, `${LEARN}/course-b/lesson.mdx`));
    expect(a[0]).toMatch(/^svg-course-a-lesson-[0-9a-f]{6}$/);
    expect(b[0]).toMatch(/^svg-course-b-lesson-[0-9a-f]{6}$/);
    expect(a[0]).not.toBe(b[0]);
  });

  it("inserts each label immediately after its graphic", () => {
    const tree = process(SVG_A, `${LEARN}/python-basics/variables.mdx`);
    const idx = tree.children.findIndex(
      (n) => n.type === "mdxJsxFlowElement" && n.name === "svg",
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    const after = tree.children[idx + 1];
    expect(after?.type).toBe("mdxJsxFlowElement");
    expect(after?.name).toBe("SvgLabel");
  });
});
