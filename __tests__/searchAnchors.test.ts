/**
 * The anchor-id contract between the render pipeline and the search indexer.
 *
 * `remarkComponentAnchors` (lib/search/anchors.mjs) injects DOM ids into
 * anchored MDX components at compile time; `extractComponents`
 * (scripts/lib/search-extract.mjs) stamps ids on the corpus rows at index
 * time. Search deep links only work while both derive identical ids from the
 * same authored MDX, so that equivalence is what this file pins down.
 */
import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { structure } from "fumadocs-core/mdx-plugins";
import {
  ANCHOR_COMPONENTS,
  remarkComponentAnchors,
  walkTree,
} from "@/lib/search/anchors.mjs";
import {
  CONTENT_COMPONENTS,
  extractComponents,
} from "@/scripts/lib/search-extract.mjs";

const MDX = `# Intro

An opening paragraph.

<MultipleChoice
  markdown={\`Which chart counts rows per category?

- [o] Bar chart
  > geom_bar counts rows per category.
- Scatter plot\`}
/>

## Position adjustments

Stack, dodge, fill.

<CodeBlock adapter="python" files={[{ filename: "main.py", starterCode: \`print("hello")\` }]} />

<MultipleChoice id="custom-quiz" markdown={\`Explicitly anchored question\`} />

<MultipleChoice markdown={\`Purely for historical reasons with no practical effect.\`} />

<Callout title="A note">

Some advice, with a nested block:

<CodeBlock adapter="r" files={[{ filename: "main.R", starterCode: \`plot(1)\` }]} />

</Callout>
`;

/** The ids the render pipeline ends up with, in document order. */
function renderedAnchorIds(source: string): (string | undefined)[] {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkMdx)
    .use(remarkComponentAnchors);
  const tree = processor.runSync(processor.parse(source));
  const ids: (string | undefined)[] = [];
  walkTree(tree, (node: { type?: string; name?: string; attributes?: { type: string; name: string; value?: unknown }[] }) => {
    if (node.type !== "mdxJsxFlowElement" || !node.name || !ANCHOR_COMPONENTS.has(node.name)) return;
    const id = node.attributes?.find(
      (a) => a.type === "mdxJsxAttribute" && a.name === "id",
    );
    ids.push(typeof id?.value === "string" ? id.value : undefined);
  });
  return ids;
}

function extract(source: string) {
  const sd = structure(source, [remarkMath, remarkMdx], {
    types: ["heading", "paragraph", "blockquote", "tableCell"],
  });
  const headingIds = sd.headings.map((h) => h.id);
  return { ...extractComponents(source, headingIds, {}), headingIds };
}

describe("anchor id contract", () => {
  it("every anchored component is also a content component", () => {
    for (const name of ANCHOR_COMPONENTS.keys()) {
      expect(CONTENT_COMPONENTS.has(name), name).toBe(true);
    }
  });

  it("render-side ids and index-side anchors agree, in order", () => {
    const rendered = renderedAnchorIds(MDX);
    const { perComponent } = extract(MDX);
    expect(rendered).toEqual([
      "x-mcq-1",
      "x-code-1",
      "custom-quiz", // author-written id wins and consumes no counter
      "x-mcq-2",
      "x-note-1",
      "x-code-2", // nested inside the Callout, still numbered in document order
    ]);
    expect([...perComponent.keys()]).toEqual(rendered);
  });

  it("component content lands under the component's own anchor", () => {
    const { perComponent } = extract(MDX);
    expect(perComponent.get("x-mcq-1")?.prose.join("\n")).toContain(
      "Which chart counts rows per category?",
    );
    expect(perComponent.get("x-mcq-2")?.prose.join("\n")).toContain(
      "historical reasons with no practical effect",
    );
    expect(perComponent.get("x-code-1")?.code.join("\n")).toContain('print("hello")');
    expect(perComponent.get("custom-quiz")?.prose.join("\n")).toContain(
      "Explicitly anchored question",
    );
  });

  it("component content also stays in its section bucket, so multi-term queries spanning a paragraph and a component keep matching one row", () => {
    const { perHeading } = extract(MDX);
    const section = perHeading.get("position-adjustments");
    expect(section?.prose.join("\n")).toContain(
      "historical reasons with no practical effect",
    );
    expect(section?.code.join("\n")).toContain('print("hello")');
    // Pre-first-heading content buckets under the page key ("") …
    expect(perHeading.get("intro")?.prose.join("\n")).toContain(
      "Bar chart",
    );
  });

  it("an id attribute is only injected where the author wrote none", () => {
    const rendered = renderedAnchorIds(
      '<MultipleChoice id="mine" markdown={`Q`} />\n\n<MultipleChoice markdown={`Q2`} />\n',
    );
    expect(rendered).toEqual(["mine", "x-mcq-1"]);
  });
});
