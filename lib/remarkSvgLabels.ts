/**
 * Remark plugin: insert a <SvgLabel figId="…" /> after each graphic (inline
 * <svg> or Mermaid diagram) in an MDX lesson. A remark plugin rather than an
 * MDX component override because the `svg` components-map key does not
 * reliably intercept inline <svg> in MDX v3 (compiled output may call
 * React.createElement("svg", …) directly). Must run AFTER remarkMdxMermaid
 * (plugin order in source.config.ts) so <Mermaid> nodes exist and are
 * labelled too. IDs are `svg-<page-slug>-<hash>`: the slug makes them unique
 * across all courses and decodable back to the source file; the content hash
 * (not a positional index) keeps an ID stable when other graphics on the
 * page are added, removed, or reordered.
 */

import type { Root } from "mdast";
import type { VFile } from "vfile";

interface JsxAttribute {
  type?: string;
  name?: string;
  value?: unknown;
}

export type AnyNode = Record<string, unknown> & {
  type?: string;
  name?: string;
  children?: AnyNode[];
  attributes?: JsxAttribute[];
  position?: { start?: { offset?: number }; end?: { offset?: number } };
};

// FNV-1a 32-bit hash → 6 lowercase hex chars (the low 24 bits). Deterministic
// and dependency-free; 24 bits is ample to distinguish the handful of graphics
// on a page while staying short and opaque.
export function hash6(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) & 0xffffff).toString(16).padStart(6, "0");
}

// Derive a page slug from a lesson's absolute .mdx path: drop everything up
// to and including the content section dir (`content/courses/`,
// `content/fumadocs-dev/`, …), strip the extension and a trailing
// `/index`, then flatten to a dash-delimited lowercase slug. Exported so the
// build-time SVG gallery (lib/svgGallery.ts) can reproduce the exact same IDs
// this plugin stamps onto the rendered pages.
export function pageSlugFromPath(raw: string): string {
  const marker = /content\/[^/]+\//.exec(raw);
  const rel = marker ? raw.slice(marker.index + marker[0].length) : raw;
  const slug = rel
    .replace(/\.mdx?$/i, "")
    .replace(/\/index$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || `x-${hash6(raw)}`;
}

function pageSlug(file: VFile | undefined): string {
  const raw = file?.path ?? file?.history?.[file.history.length - 1] ?? "";
  return pageSlugFromPath(raw);
}

function isGraphic(node: AnyNode): boolean {
  return (
    node.type === "mdxJsxFlowElement" &&
    (node.name === "svg" || node.name === "Mermaid")
  );
}

// A stable text signature of the graphic's content, used to derive its hash:
// Mermaid's `chart` attribute, else the authored source sliced via position
// offsets, else a structural serialization. Whitespace is collapsed so
// reindenting a graphic doesn't change its ID.
export function graphicSignature(node: AnyNode, source: string): string {
  let raw: string | undefined;

  if (node.name === "Mermaid") {
    const chart = node.attributes?.find((a) => a.name === "chart")?.value;
    if (typeof chart === "string") raw = chart;
  }

  if (raw === undefined) {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    if (typeof start === "number" && typeof end === "number" && source) {
      raw = source.slice(start, end);
    }
  }

  raw ??= JSON.stringify(node, (key, value) => (key === "position" ? undefined : value));

  // Collapse runs of whitespace and drop whitespace between adjacent tags
  // (insignificant in SVG/XML) so reindenting a graphic doesn't change its ID.
  return raw.replace(/\s+/g, " ").replace(/>\s+</g, "><").trim();
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
    const source = String(file?.value ?? "");

    // Pre-order walk so labels are inserted in document order. After labelling
    // a graphic we don't recurse into it: a graphic's own subtree (e.g.
    // decorative nested shapes) isn't a separate referenceable figure.
    const walk = (node: AnyNode): void => {
      const children = node.children;
      if (!Array.isArray(children)) return;

      const next: AnyNode[] = [];
      for (const child of children) {
        next.push(child);
        if (isGraphic(child)) {
          const figId = `svg-${slug}-${hash6(graphicSignature(child, source))}`;
          next.push(makeLabel(figId));
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
