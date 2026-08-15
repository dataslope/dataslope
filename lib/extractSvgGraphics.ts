/**
 * Pure extraction of custom inline `<svg>` graphics from one lesson's MDX
 * source, the parsing core behind lib/svgGallery.ts; free of Fumadocs and
 * filesystem deps so it unit-tests directly. The leading YAML frontmatter is
 * blanked (some titles carry JSX-like text an MDX parser chokes on) with
 * byte offsets kept aligned, then the body is parsed with the same micromark
 * extensions the real build uses. IDs are computed with the same helpers as
 * `remarkSvgLabels`, so each ID is byte-for-byte the on-page label. Mermaid
 * diagrams are ```mermaid fences, never `<svg>`, so they are excluded by
 * construction.
 */
import { remark } from "remark";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { remarkMdxMermaid } from "fumadocs-core/mdx-plugins";
import { VFile } from "vfile";
import {
  hash6,
  graphicSignature,
  pageSlugFromPath,
  type AnyNode,
} from "./remarkSvgLabels";
import { jsxSvgToHtml } from "./jsxSvgToHtml";

export interface ExtractedSvg {
  /** Globally-unique, content-hashed ID, identical to the on-page label. */
  id: string;
  /** Render-ready SVG markup (JSX-isms rewritten to valid HTML). */
  html: string;
}

const processor = remark()
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkMdx)
  .use(remarkMdxMermaid);

// Replace a leading `---\n…\n---` YAML frontmatter block with whitespace of the
// exact same length (newlines preserved), so the body parses without a
// frontmatter extension while every byte offset stays aligned with the source.
export function blankFrontmatter(raw: string): string {
  const m = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/.exec(raw);
  if (!m) return raw;
  return m[0].replace(/[^\r\n]/g, " ") + raw.slice(m[0].length);
}

function collectSvgNodes(node: AnyNode, out: AnyNode[]): void {
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (const child of children) {
    if (child.type === "mdxJsxFlowElement" && child.name === "svg") {
      // Don't recurse into a graphic's own subtree, nested shapes aren't
      // separately referenceable figures.
      out.push(child);
    } else {
      collectSvgNodes(child, out);
    }
  }
}

/**
 * Extract every custom inline `<svg>` graphic from one lesson's MDX source.
 * `absPath` is the lesson's absolute path; it drives the page slug embedded in
 * each ID. Returns `[]` (and warns) if the source can't be parsed, so one bad
 * lesson never fails the whole gallery build.
 */
export function extractSvgGraphics(
  rawSource: string,
  absPath: string,
): ExtractedSvg[] {
  // Cheap early-out: most lessons have no inline SVG at all.
  if (!rawSource.includes("<svg")) return [];

  const src = blankFrontmatter(rawSource);
  const file = new VFile({ value: src, path: absPath });

  let tree: AnyNode;
  try {
    tree = processor.runSync(processor.parse(file), file) as unknown as AnyNode;
  } catch (err) {
    console.warn(
      `[svg] skipping ${absPath}: failed to parse (${
        (err as Error)?.message ?? err
      })`,
    );
    return [];
  }

  const nodes: AnyNode[] = [];
  collectSvgNodes(tree, nodes);
  if (nodes.length === 0) return [];

  const slug = pageSlugFromPath(absPath);
  const out: ExtractedSvg[] = [];
  for (const node of nodes) {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (typeof start !== "number" || typeof end !== "number") continue;
    out.push({
      id: `svg-${slug}-${hash6(graphicSignature(node, src))}`,
      html: jsxSvgToHtml(src.slice(start, end)),
    });
  }
  return out;
}
