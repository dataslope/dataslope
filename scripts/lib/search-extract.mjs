/**
 * MDX content extraction for the search corpus: everything `structure()` does
 * not return. Split out of scripts/build-search-corpus.mjs so the anchor
 * consistency contract (see lib/search/anchors.mjs) is testable: the ids this
 * module stamps on component rows must equal the DOM ids the
 * `remarkComponentAnchors` plugin injects at render time.
 *
 * ── What is collected, and where it lands ───────────────────────────────────
 *
 * Fenced code, mermaid sources, and the content carried in component
 * attributes (`remark-mdx` attaches an ESTree to every expression attribute,
 * so `files={[{ starterCode: `…` }]}` and `markdown={`…`}` are read from the
 * parsed tree by property name rather than scraped with a regex; keys are
 * classified by PROSE_KEYS / CODE_KEYS).
 *
 * Everything is attributed to the heading it sits under (`perHeading`), which
 * is what the per-section rows are built from. Content inside an *anchored*
 * component (lib/search/anchors.mjs) is ALSO collected under the component's
 * own anchor id (`perComponent`), from which the corpus builds one extra row
 * per component. The duplication is deliberate:
 *
 *   - the per-section row keeps matching queries whose terms span a paragraph
 *     AND a component under the same heading (FTS5 ANDs terms within one row,
 *     so splitting the content would stop those queries matching anything);
 *   - the per-component row is shorter, so BM25's length normalisation ranks
 *     it above the section row for matches inside the component, and its
 *     anchor scrolls the reader to the component itself rather than to the
 *     heading somewhere above it.
 *
 * The near-duplicate result entries this produces are collapsed at query time
 * (lib/search/ranking.ts), keeping the component's more precise anchor.
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkMath from "remark-math";
import { anchorIdFor, createAnchorAssigner, walkTree } from "../../lib/search/anchors.mjs";

/** Prose the reader reads. Weighted as body text. */
export const PROSE_KEYS = new Set([
  "instructions", "markdown", "title", "name", "description", "alt", "label",
  "caption", "prompt", "question", "explanation", "hint", "note",
]);

/** Code and identifiers. Indexed, but weighted well below prose. */
export const CODE_KEYS = new Set([
  "starterCode", "initCode", "solutionCode", "code", "source", "schema",
  "setup", "filename", "sql", "html", "css", "js", "tsx", "jsx", "expected",
]);

/** Components whose attributes carry content worth indexing. Anything else
 *  (layout wrappers, demo components) contributes only its child prose, which
 *  `structure()` already collects. */
export const CONTENT_COMPONENTS = new Set([
  "CodeBlock", "SqlCodeBlock", "ChallengeCard", "SqlChallengeCard",
  "MultipleChoice", "Chart", "Figure", "Callout", "Mermaid", "SvgLabel",
  "LivePreview", "ReactPreview", "IllustrationPrompt",
]);

/**
 * Pull every string out of an ESTree, tagged prose or code by the property key
 * that encloses it.
 *
 * A bare value (an attribute that is just a template literal, like
 * `markdown={`…`}`) inherits `fallback`, which the caller sets from the
 * attribute's own name.
 */
export function harvestEstree(node, fallback, out, key = fallback) {
  if (!node || typeof node !== "object") return;

  if (node.type === "TemplateLiteral") {
    const text = (node.quasis ?? []).map((q) => q.value?.cooked ?? "").join(" ");
    if (text.trim()) out[key === "code" ? "code" : "prose"].push(text);
    // Interpolations can hold strings too.
    for (const e of node.expressions ?? []) harvestEstree(e, fallback, out, key);
    return;
  }
  if (node.type === "Literal") {
    if (typeof node.value === "string" && node.value.trim()) {
      out[key === "code" ? "code" : "prose"].push(node.value);
    }
    return;
  }
  if (node.type === "Property") {
    const name = node.key?.name ?? node.key?.value;
    const next = CODE_KEYS.has(name) ? "code" : PROSE_KEYS.has(name) ? "prose" : key;
    harvestEstree(node.value, fallback, out, next);
    return;
  }

  for (const v of Object.values(node)) {
    if (Array.isArray(v)) for (const child of v) harvestEstree(child, fallback, out, key);
    else if (v && typeof v === "object" && typeof v.type === "string") {
      harvestEstree(v, fallback, out, key);
    }
  }
}

/** `remarkMath` is not decoration here. Without it, MDX reads the braces in
 *  `$$p_i = \frac{e^{z_i}}{…}$$` as a JSX expression and acorn rejects the
 *  file, which silently dropped 31 lessons from the previous index. The real
 *  render pipeline (source.config.ts) has always had it; the indexer did not. */
const processor = unified().use(remarkParse).use(remarkMath).use(remarkMdx);

/**
 * Walk the MDX for everything `structure()` does not return. Each find is
 * attributed to the heading it sits under, matched to `structure()`'s heading
 * ids by document order; content inside an anchored component additionally
 * lands under the component's own id (see the header comment).
 *
 * `charts` is the generated chart manifest: `<Chart slug>` names an asset, and
 * the asset's title/caption are real prose that live there, not in the MDX.
 *
 * Returns `{ perHeading, perComponent }`, both Map<key, {prose[], code[]}>.
 */
export function extractComponents(body, headingIds, charts = {}) {
  const perHeading = new Map();
  const perComponent = new Map();
  let headingIndex = -1;
  const assign = createAnchorAssigner();

  const headingBucket = () => {
    const id = headingIndex >= 0 ? headingIds[headingIndex] : null;
    const k = id ?? "";
    if (!perHeading.has(k)) perHeading.set(k, { prose: [], code: [] });
    return perHeading.get(k);
  };

  let tree;
  try {
    tree = processor.parse(body);
  } catch {
    return { perHeading, perComponent };
  }

  walkTree(tree, (node) => {
    if (node.type === "heading") {
      headingIndex++;
      return;
    }
    // Fenced blocks, including ```mermaid diagram sources.
    if (node.type === "code") {
      if (node.value?.trim()) headingBucket().code.push(node.value);
      return;
    }
    if (node.type !== "mdxJsxFlowElement" && node.type !== "mdxJsxTextElement") return;

    // The assigner must tick for every anchored component, content or not,
    // because the render-side plugin assigns ids unconditionally.
    const anchor = anchorIdFor(node, assign);

    if (!CONTENT_COMPONENTS.has(node.name)) return;

    const heading = headingBucket();
    let component = null;
    if (anchor) {
      component = perComponent.get(anchor) ?? { prose: [], code: [] };
      perComponent.set(anchor, component);
    }
    const out = {
      prose: { push: (v) => { heading.prose.push(v); component?.prose.push(v); } },
      code: { push: (v) => { heading.code.push(v); component?.code.push(v); } },
    };

    for (const attr of node.attributes ?? []) {
      if (attr.type !== "mdxJsxAttribute") continue;
      const name = attr.name;

      // A plain string attribute: alt="…", title="…".
      if (typeof attr.value === "string") {
        if (CODE_KEYS.has(name)) out.code.push(attr.value);
        else if (PROSE_KEYS.has(name)) out.prose.push(attr.value);
        // `<Chart slug>` and `<Figure slug>` name an asset, not content, but a
        // chart's title and caption are real prose held in the manifest.
        else if (name === "slug" && node.name === "Chart") {
          const entry = charts[attr.value];
          if (entry?.title) out.prose.push(entry.title);
          if (entry?.caption) out.prose.push(entry.caption);
        }
        continue;
      }

      // An expression attribute: read its ESTree rather than its source text.
      const estree = attr.value?.data?.estree;
      const fallback = CODE_KEYS.has(name) ? "code" : "prose";
      if (estree) harvestEstree(estree, fallback, out, fallback);
      else if (typeof attr.value?.value === "string") {
        out[fallback].push(attr.value.value);
      }
    }
  });

  return { perHeading, perComponent };
}
