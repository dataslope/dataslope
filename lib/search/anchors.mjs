/**
 * Deterministic anchor ids for the content components the search index
 * reaches into. Only headings render DOM ids, so a hit inside a component
 * could otherwise only link to the heading above it.
 *
 * Two consumers must agree on every id or search links point at nothing:
 * `remarkComponentAnchors` (MDX compile) injects the id as a DOM id, and
 * `scripts/lib/search-extract.mjs` stamps the same id on the search row. Both
 * import THIS module and use the same pre-order `walkTree`, so they cannot
 * drift. Ids are `x-<prefix>-<n>`, one counter per prefix per page; the `x-`
 * namespace keeps clear of heading slugs, and index + pages redeploy
 * together. Components synthesised by other plugins (Mermaid, SvgLabel) are
 * deliberately absent — they don't exist in the authored tree the indexer
 * parses, so anchoring them would desync the counters. An author-written
 * `id="…"` wins and does not consume a counter.
 */

/** Anchored component name → id prefix. Every name here must also be in
 *  CONTENT_COMPONENTS (scripts/lib/search-extract.mjs), or the indexer would
 *  assign ids to components whose content it never indexes. */
export const ANCHOR_COMPONENTS = new Map([
  ["MultipleChoice", "mcq"],
  ["CodeBlock", "code"],
  ["SqlCodeBlock", "sql"],
  ["ChallengeCard", "challenge"],
  ["SqlChallengeCard", "sqlchallenge"],
  ["Chart", "chart"],
  ["Figure", "figure"],
  ["Callout", "note"],
  ["LivePreview", "live"],
  ["ReactPreview", "react"],
]);

/** Plain pre-order walk over an mdast/MDX tree. Shared by the remark plugin
 *  and the index extractor so both see components in the same order. */
export function walkTree(node, fn) {
  fn(node);
  const children = node?.children;
  if (Array.isArray(children)) {
    for (const child of children) walkTree(child, fn);
  }
}

/** Per-page id assigner: one counter per prefix, `x-mcq-1`, `x-mcq-2`, … */
export function createAnchorAssigner() {
  const counters = new Map();
  return function assign(componentName) {
    const prefix = ANCHOR_COMPONENTS.get(componentName);
    if (!prefix) return null;
    const n = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, n);
    return `x-${prefix}-${n}`;
  };
}

/** The author-written string `id` attribute of a JSX element, or null. */
export function explicitAnchorId(node) {
  for (const attr of node.attributes ?? []) {
    if (
      attr.type === "mdxJsxAttribute" &&
      attr.name === "id" &&
      typeof attr.value === "string" &&
      attr.value.trim()
    ) {
      return attr.value;
    }
  }
  return null;
}

/**
 * The anchor id for a node, or null when the node is not an anchored
 * component. Consumes a counter from `assign` exactly when the render-side
 * plugin would, which is the invariant that keeps both sides aligned.
 */
export function anchorIdFor(node, assign) {
  if (node.type !== "mdxJsxFlowElement") return null;
  if (!ANCHOR_COMPONENTS.has(node.name)) return null;
  return explicitAnchorId(node) ?? assign(node.name);
}

/**
 * Remark plugin: inject `id="x-<prefix>-<n>"` into every anchored component.
 * Registered in source.config.ts, so it runs for every collection (the
 * fumadocs-dev gallery included, harmlessly: it is not indexed).
 */
export function remarkComponentAnchors() {
  return (tree) => {
    const assign = createAnchorAssigner();
    walkTree(tree, (node) => {
      const id = anchorIdFor(node, assign);
      if (!id || explicitAnchorId(node)) return;
      node.attributes ??= [];
      node.attributes.push({ type: "mdxJsxAttribute", name: "id", value: id });
    });
  };
}
