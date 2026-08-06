// Guards the indentation of authored code that reaches a learner's screen.
//
// micromark strips a base indentation from the continuation lines of a
// multi-line JSX attribute expression while tokenizing, so a correctly
// formatted `.mdx` source compiles to code whose every line sits flush left.
// `remarkPreserveCodeIndent` undoes that by slicing each template quasi back
// out of the original source.
//
// It only does so for attribute names it knows about, which is the failure
// this suite exists for: `<LivePreview html={…} css={…}>` and
// `<ReactPreview code={…}>` were absent from that list until 2026-08, so
// every CSS rule body in the Modern CSS course and every JSX block in the
// React course rendered un-indented while the source looked fine. Adding a
// preview component with a new code-bearing prop reintroduces it silently,
// so the corpus check below is the real guard.
import { describe, expect, it } from "vitest";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import type { Plugin } from "unified";
import { VFile } from "vfile";

import { remarkPreserveCodeIndent } from "../lib/remarkPreserveCodeIndent";

const CONTENT_DIR = path.join(process.cwd(), "content");

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

async function mdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await mdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
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

  it("leaves no preview block in the corpus rendering flush left", { timeout: 60_000 }, async () => {
    const files = await mdxFiles(CONTENT_DIR);
    expect(files.length).toBeGreaterThan(500);

    const failures: string[] = [];
    let checked = 0;

    const names = Object.keys(PREVIEW_PROPS);
    for (const file of files) {
      const source = await readFile(file, "utf-8");
      // Parsing the whole corpus takes tens of seconds; only ~50 pages carry
      // a preview component, so skip the rest on a cheap substring test.
      if (!names.some((name) => source.includes(`<${name}`))) continue;
      let tree: AnyNode;
      try {
        tree = parse(source);
      } catch {
        continue; // frontmatter-only or otherwise unparseable here; not this suite's job
      }
      for (const [component, prop, raw] of previewCode(tree)) {
        checked++;
        const lines = raw.split("\n");
        // A block opens with `{` or an unclosed tag and has a following
        // content line. If that line is not indented further, the authored
        // indentation was lost between the source and the compiled output.
        for (let i = 0; i < lines.length - 1; i++) {
          const open = lines[i];
          const opensBlock =
            /\{\s*$/.test(open) || /^\s*<[a-zA-Z][^>]*[^/]>\s*$/.test(open);
          if (!opensBlock) continue;
          const next = lines[i + 1];
          if (!next.trim()) continue;
          if (/^\s*[})\]]/.test(next) || /^\s*<\//.test(next)) continue;
          const openIndent = /^\s*/.exec(open)![0].length;
          const nextIndent = /^\s*/.exec(next)![0].length;
          if (nextIndent > openIndent) continue;
          failures.push(
            `  ${path.relative(process.cwd(), file)} <${component} ${prop}>: ` +
              `"${open.trim()}" then "${next.trim()}"`,
          );
          break;
        }
      }
    }

    expect(checked).toBeGreaterThan(50);
    expect(
      failures,
      `preview code that reaches the page un-indented:\n${failures.join("\n")}\n\n` +
        "Add the component's code-bearing prop to CODE_ATTRS in " +
        "lib/remarkPreserveCodeIndent.ts.",
    ).toEqual([]);
  });
});
