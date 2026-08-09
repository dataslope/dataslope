/**
 * Deterministic anchor ids for the content components the search index reaches
 * into (`<MultipleChoice>`, `<CodeBlock>`, `<ChallengeCard>`, …).
 *
 * ── The problem this solves ─────────────────────────────────────────────────
 *
 * Only headings render with DOM ids, so a search hit on text that lives inside
 * a component could only ever link to the heading *above* the component. On
 * long lessons the component often sits several screens below that heading
 * (three `<MultipleChoice>` blocks routinely share one "Check your
 * understanding" section), so clicking the result landed the reader nowhere
 * near the text that matched.
 *
 * ── How the two sides stay in sync ──────────────────────────────────────────
 *
 * Two independent consumers must agree on every id, or search links point at
 * elements that do not exist:
 *
 *   - `remarkComponentAnchors` (this file) runs in the MDX compile
 *     (source.config.ts) and injects the id as a JSX `id` attribute, which
 *     `withSearchAnchor` in mdx-components.tsx renders as a real DOM id.
 *   - `scripts/lib/search-extract.mjs` runs at index build time and stamps the
 *     same id on the component's search row.
 *
 * They agree because both import THIS module and both walk the authored MDX in
 * document order with the same traversal (`walkTree`, a plain pre-order walk,
 * used instead of `unist-util-visit` so the two contexts cannot drift on a
 * library's visiting rules). Ids are `x-<prefix>-<n>` with one counter per
 * prefix per page: inserting a Callout does not renumber the MCQs below it,
 * and the `x-` namespace keeps clear of heading slugs (a heading would have to
 * literally read "X mcq 2" to collide). Renumbering within a type only happens
 * when a component of that type is added/removed/moved, and the index and the
 * pages redeploy together (README: deploy = `opennextjs-cloudflare deploy &&
 * db:seed:search:remote`), so index and DOM cannot disagree in production.
 *
 * Components synthesised by other plugins (`<Mermaid>` from ```mermaid fences,
 * `<SvgLabel>` from remarkSvgLabels) are deliberately absent: they do not
 * exist in the authored tree the indexer parses, so anchoring them would
 * desync the counters. Their content stays attributed to the enclosing
 * heading, as before.
 *
 * An author-written `id="…"` attribute wins: it becomes the anchor on both
 * sides and does not consume a counter.
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
