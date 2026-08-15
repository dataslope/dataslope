/**
 * MDX content extraction for the search corpus: everything `structure()` does
 * not return — fenced code, mermaid sources, and component attribute content
 * (read from remark-mdx's ESTree by property name, classified by PROSE_KEYS /
 * CODE_KEYS). Split out of scripts/build-search-corpus.mjs so the anchor
 * contract is testable: ids stamped here must equal the DOM ids
 * `remarkComponentAnchors` injects at render time.
 *
 * Content lands under its heading (`perHeading`) AND, inside an anchored
 * component, under the component's anchor id (`perComponent`). The
 * duplication is deliberate: FTS5 ANDs terms within one row, so the section
 * row keeps cross-paragraph/component queries matching, while the shorter
 * component row wins BM25 for in-component matches and scrolls to the
 * component itself. Near-duplicate results are collapsed at query time
 * (lib/search/ranking.ts).
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

/** `remarkMath` is required: without it MDX reads `$$…$$` braces as a JSX
 *  expression, acorn rejects the file, and lessons silently drop from the
 *  index. The render pipeline (source.config.ts) has it too. */
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
