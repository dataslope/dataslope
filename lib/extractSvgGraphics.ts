/**
 * Pure extraction of custom inline `<svg>` graphics from a single lesson's MDX
 * source, the parsing core behind the build-time SVG gallery (lib/svgGallery.ts).
 *
 * Kept free of any Fumadocs `source` / filesystem dependency so it can be unit
 * tested directly (lib/svgGallery.ts layers the page-URL/course grouping on top).
 *
 * Parsing pipeline: the leading YAML frontmatter is blanked out (a handful of
 * lessons carry JSX-like text, `<Animal>`, `<T,>`, in their title/description,
 * which a frontmatter-unaware MDX parser would choke on), then the body is parsed
 * with the same micromark extensions the real build relies on, GFM, math, MDX,
 * and Mermaid, so every lesson parses and `<svg>` source offsets line up.
 *
 * IDs are computed with the very helpers `remarkSvgLabels` uses, so each ID here
 * is byte-for-byte the label the plugin stamps under the graphic on its page
 * (e.g. `svg-intro-sql-postgres-filtering-rows-f4f4db`). The hash is a pure
 * function of the graphic's own `<svg>` source, so blanking the frontmatter
 * (which never moves an svg's bytes) leaves it unchanged.
 *
 * Mermaid diagrams are authored as ```mermaid fences, never `<svg>` elements, so
 * collecting only `name === "svg"` nodes excludes them by construction.
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
