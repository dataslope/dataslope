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

describe("remarkSvgLabels", () => {
  it("labels each inline <svg> with a page-namespaced, document-ordered id", () => {
    const src = [
      "# Title",
      "",
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
      "",
      "Some prose.",
      "",
      '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" /></svg>',
    ].join("\n");

    const tree = process(src, `${LEARN}/python-basics/variables.mdx`);
    expect(labelIds(tree)).toEqual([
      "svg-python-basics-variables-1",
      "svg-python-basics-variables-2",
    ]);
  });

  it("labels Mermaid diagrams in the same numbering sequence as svgs", () => {
    const src = [
      '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>',
      "",
      "```mermaid",
      "flowchart LR",
      "  A --> B",
      "```",
    ].join("\n");

    const tree = process(src, `${LEARN}/ml/intro.mdx`);
    expect(labelIds(tree)).toEqual(["svg-ml-intro-1", "svg-ml-intro-2"]);
  });

  it("strips a trailing /index from the page slug", () => {
    const src = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>';
    const tree = process(src, `${LEARN}/machine-learning-scikit-learn/index.mdx`);
    expect(labelIds(tree)).toEqual([
      "svg-machine-learning-scikit-learn-1",
    ]);
  });

  it("produces ids that are unique across different course pages", () => {
    const svg = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>';
    const a = labelIds(process(svg, `${LEARN}/course-a/lesson.mdx`));
    const b = labelIds(process(svg, `${LEARN}/course-b/lesson.mdx`));
    expect(a).toEqual(["svg-course-a-lesson-1"]);
    expect(b).toEqual(["svg-course-b-lesson-1"]);
    expect(new Set([...a, ...b]).size).toBe(2);
  });

  it("inserts each label immediately after its graphic", () => {
    const src = '<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" /></svg>';
    const tree = process(src, `${LEARN}/python-basics/variables.mdx`);
    const idx = tree.children.findIndex(
      (n) => n.type === "mdxJsxFlowElement" && n.name === "svg",
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    const after = tree.children[idx + 1];
    expect(after?.type).toBe("mdxJsxFlowElement");
    expect(after?.name).toBe("SvgLabel");
  });
});
