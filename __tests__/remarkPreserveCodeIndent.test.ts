// Guards the indentation of authored code that reaches a learner's screen.
// micromark strips base indentation from multi-line JSX attribute expressions,
// so formatted .mdx compiles to flush-left code; remarkPreserveCodeIndent
// slices each template quasi back out of the source, but only for attribute
// names it knows (CODE_ATTRS). A preview component with a new code-bearing
// prop needs that prop added there.
import { describe, expect, it } from "vitest";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import type { Plugin } from "unified";
import { VFile } from "vfile";

import { remarkPreserveCodeIndent } from "../lib/remarkPreserveCodeIndent";

// Components that render authored code read-only, and the props holding it.
// Keep in step with CODE_ATTRS in lib/remarkPreserveCodeIndent.ts.
const PREVIEW_PROPS: Record<string, string[]> = {
  LivePreview: ["html", "css"],
  ReactPreview: ["code"],
  CodeBlockLoadingPreview: ["code"],
};

type AnyNode = Record<string, unknown>;

function parse(source: string) {
  // The plugin types its tree as a loose record (it walks arbitrary estree
  // nodes), which does not line up with remark's `Plugin` signature. Same
  // cast source.config.ts's plugin list relies on.
  const plugin = remarkPreserveCodeIndent as unknown as Plugin<[]>;
  const processor = remark().use(remarkMdx).use(plugin);
  const file = new VFile({ value: source, path: "/repo/content/x.mdx" });
  return processor.runSync(processor.parse(file), file) as unknown as AnyNode;
}

/** Every [component, prop, rawTemplateText] triple in a parsed tree. */
function previewCode(tree: AnyNode): Array<[string, string, string]> {
  const found: Array<[string, string, string]> = [];
  const walk = (node: AnyNode) => {
    const name = node.name as string | undefined;
    const props = name ? PREVIEW_PROPS[name] : undefined;
    if (props) {
      const attributes = (node.attributes ?? []) as AnyNode[];
      for (const attribute of attributes) {
        const attrName = attribute.name as string | undefined;
        if (!attrName || !props.includes(attrName)) continue;
        const estree = (
          (attribute.value as AnyNode | undefined)?.data as
            | { estree?: AnyNode }
            | undefined
        )?.estree;
        const expression = (
          (estree?.body as AnyNode[] | undefined)?.[0] as AnyNode | undefined
        )?.expression as AnyNode | undefined;
        if (expression?.type !== "TemplateLiteral") continue;
        const quasis = expression.quasis as AnyNode[];
        const raw = quasis
          .map((q) => (q.value as { raw?: string }).raw ?? "")
          .join("");
        found.push([name!, attrName, raw]);
      }
    }
    for (const key of Object.keys(node)) {
      const child = (node as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c === "object") walk(c as AnyNode);
        }
      } else if (child && typeof child === "object" && (child as AnyNode).type) {
        walk(child as AnyNode);
      }
    }
  };
  walk(tree);
  return found;
}

const LIVE_PREVIEW = `# Page

<LivePreview
  title="Grid"
  html={\`<div class="grid">
  <div>one</div>
</div>\`}
  css={\`.grid {
  display: grid;
  gap: 10px;
}\`}
/>
`;

const REACT_PREVIEW = `# Page

<ReactPreview
  code={\`function Row() {
  return (
    <div>hello</div>
  );
}\`}
>
  <div />
</ReactPreview>
`;

describe("remarkPreserveCodeIndent", () => {
  it("keeps the indentation of LivePreview html and css", () => {
    const code = Object.fromEntries(
      previewCode(parse(LIVE_PREVIEW)).map(([, prop, raw]) => [prop, raw]),
    );

    expect(code.css).toContain("\n  display: grid;");
    expect(code.css).toContain("\n  gap: 10px;");
    expect(code.html).toContain("\n  <div>one</div>");
  });

  it("keeps the indentation of ReactPreview code", () => {
    const [entry] = previewCode(parse(REACT_PREVIEW));
    expect(entry).toBeDefined();
    expect(entry[2]).toContain("\n  return (");
    expect(entry[2]).toContain("\n    <div>hello</div>");
  });
});
