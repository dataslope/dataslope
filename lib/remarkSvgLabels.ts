/**
 * Remark plugin: insert a <SvgLabel figId="…" /> element after each graphic
 * (inline <svg> block and Mermaid diagram) in an MDX lesson.
 *
 * Why a remark plugin (not an MDX component override):
 * In MDX v3 with fumadocs-mdx dynamic compilation, the `svg` key in the
 * MDX components map does not reliably intercept inline <svg> elements —
 * the compiled output may call React.createElement("svg", …) directly
 * rather than going through `_components.svg`. A remark plugin runs during
 * compilation and injects a new MDAST node, the same approach
 * fumadocs-core/remarkMdxMermaid uses to turn ```mermaid fences into
 * <Mermaid /> elements. This plugin runs AFTER remarkMdxMermaid (see the
 * plugin order in source.config.ts), so those <Mermaid> nodes already
 * exist in the tree and get labelled here too — keeping a single,
 * consistent ID scheme for every graphic on the page.
 *
 * Globally-unique, location-encoding IDs:
 * Each ID is `svg-<page-slug>-<n>`, where `<page-slug>` is the lesson's
 * path under content/learn/ (slashes and punctuation flattened to dashes)
 * and `<n>` is the graphic's 1-based position in document order on that
 * page. Because the page slug includes the course folder, IDs are unique
 * across ALL courses, and any ID decodes straight back to its source file
 * + position — so a graphic can be referenced by its ID alone, without
 * also naming the course or page.
 *
 * Both inline <svg> blocks and <Mermaid> diagrams share one numbering
 * sequence, so the index reflects the graphic's visual order on the page
 * regardless of type.
 */

import type { Root } from "mdast";
import type { VFile } from "vfile";

type AnyNode = Record<string, unknown> & {
  type?: string;
  name?: string;
  children?: AnyNode[];
};

// Lowercase djb2 hash → short hex, used only as a namespace fallback when the
// source file path is unavailable (keeps IDs globally unique either way).
function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

// Derive a page slug from the lesson's absolute .mdx path: drop everything up
// to and including `content/learn/`, strip the extension and a trailing
// `/index`, then flatten to a dash-delimited lowercase slug.
function pageSlug(file: VFile | undefined): string {
  const raw = file?.path ?? file?.history?.[file.history.length - 1] ?? "";
  const marker = "content/learn/";
  const at = raw.indexOf(marker);
  const rel = at >= 0 ? raw.slice(at + marker.length) : raw;
  const slug = rel
    .replace(/\.mdx?$/i, "")
    .replace(/\/index$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || `x-${shortHash(raw)}`;
}

function isGraphic(node: AnyNode): boolean {
  return (
    node.type === "mdxJsxFlowElement" &&
    (node.name === "svg" || node.name === "Mermaid")
  );
}

function makeLabel(figId: string): AnyNode {
  return {
    type: "mdxJsxFlowElement",
    name: "SvgLabel",
    attributes: [{ type: "mdxJsxAttribute", name: "figId", value: figId }],
    children: [],
  };
}

export function remarkSvgLabels() {
  return (tree: Root, file: VFile): void => {
    const slug = pageSlug(file);
    const counter = { n: 0 };

    // Pre-order walk so IDs follow document (top-to-bottom) order. After
    // labelling a graphic we don't recurse into it: a graphic's own subtree
    // (e.g. decorative nested shapes) isn't a separate referenceable figure.
    const walk = (node: AnyNode): void => {
      const children = node.children;
      if (!Array.isArray(children)) return;

      const next: AnyNode[] = [];
      for (const child of children) {
        next.push(child);
        if (isGraphic(child)) {
          counter.n += 1;
          next.push(makeLabel(`svg-${slug}-${counter.n}`));
        } else {
          walk(child);
        }
      }
      node.children = next;
    };

    walk(tree as unknown as AnyNode);
  };
}

export default remarkSvgLabels;
