/**
 * Remark plugin: preserve the authored indentation of code-bearing
 * template-literal props on `<CodeBlock>`, `<ChallengeCard>`,
 * `<SqlCodeBlock>` and `<SqlChallengeCard>`.
 *
 * Why this exists
 * ---------------
 * `@mdx-js/mdx` (micromark) strips a base indentation from the continuation
 * lines of a multi-line JSX attribute expression while tokenizing — so a
 * formatted snippet authored as
 *
 *   starterCode={`if (age >= 18) {
 *     console.log("You can vote.");
 *   }
 *   `}
 *
 * reaches the editor with the leading indentation collapsed:
 *
 *   if (age >= 18) {
 *   console.log("You can vote.");
 *   }
 *
 * i.e. the editor (and the "Format code" button) sees *un-formatted* code even
 * though the `.mdx` source is formatted. The strip happens during tokenization,
 * so the mdast/estree `value` is already collapsed by the time any plugin runs.
 *
 * The fix
 * -------
 * The estree `TemplateLiteral` quasis still carry a `range` (`start`/`end`
 * offsets) into the *original* source. We slice the original source back out
 * and restore each quasi's `raw` (and re-derive `cooked`), so the compiled
 * output — and therefore the editor — faithfully reflects the authored,
 * formatted indentation. Zero content changes required.
 *
 * Scoped to the props that render as editable/inspectable code so prose
 * (`instructions`) and the test harness (`tests`) keep their existing
 * behavior.
 */

// Attribute names whose template-literal value IS the code.
const CODE_ATTRS = new Set([
  "starterCode",
  "solutionCode",
  "solutionSql",
  "initCode",
  "initSql",
]);
// Object keys carrying code inside `files={[ { … } ]}` multi-file blocks.
const CODE_OBJECT_KEYS = new Set(["initialContent", "solutionContent"]);

type AnyNode = Record<string, unknown> & { type?: string };

function rangeOf(node: AnyNode): [number, number] | null {
  const r = node.range as [number, number] | undefined;
  if (Array.isArray(r)) return r;
  const start = node.start as number | undefined;
  const end = node.end as number | undefined;
  if (typeof start === "number" && typeof end === "number") return [start, end];
  return null;
}

// Restore each quasi of a TemplateLiteral from the original source text.
function restoreTemplateLiteral(tpl: AnyNode, src: string): void {
  const quasis = tpl.quasis as AnyNode[] | undefined;
  if (!Array.isArray(quasis)) return;
  for (const q of quasis) {
    const r = rangeOf(q);
    if (!r) continue;
    const original = src.slice(r[0], r[1]);
    const value = q.value as { raw?: string; cooked?: string } | undefined;
    if (!value || original === value.raw) continue;
    value.raw = original;
    try {
      // Re-derive the cooked value. Our snippets escape `${` as `\${`, so no
      // interpolation executes; this is only a fallback since the serializer
      // emits from `raw`.
      value.cooked = new Function("return `" + original + "`")() as string;
    } catch {
      /* leave cooked as-is; output is serialized from raw */
    }
  }
}

// Walk an estree, restoring code-bearing template literals. `topAttrName` is the
// JSX attribute this estree belongs to (so a bare `starterCode={`…`}` template
// is restored, while arbitrary template literals are not).
function restoreCodeTemplates(
  estree: AnyNode | undefined,
  src: string,
  topAttrName: string,
): void {
  if (!estree) return;
  const body = estree.body as AnyNode[] | undefined;
  const topExpr = body?.[0]?.expression as AnyNode | undefined;
  if (
    CODE_ATTRS.has(topAttrName) &&
    topExpr?.type === "TemplateLiteral"
  ) {
    restoreTemplateLiteral(topExpr, src);
  }

  const seen = new Set<AnyNode>();
  const walk = (node: AnyNode | null | undefined): void => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (
      node.type === "Property" &&
      !(node as { computed?: boolean }).computed
    ) {
      const key = node.key as { name?: string; value?: string } | undefined;
      const keyName = key?.name ?? key?.value;
      const value = node.value as AnyNode | undefined;
      if (
        keyName &&
        CODE_OBJECT_KEYS.has(keyName) &&
        value?.type === "TemplateLiteral"
      ) {
        restoreTemplateLiteral(value, src);
      }
    }
    for (const k of Object.keys(node)) {
      const child = (node as Record<string, unknown>)[k];
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c && typeof c === "object" && (c as AnyNode).type) walk(c as AnyNode);
        }
      } else if (child && typeof child === "object" && (child as AnyNode).type) {
        walk(child as AnyNode);
      }
    }
  };
  walk(estree);
}

export function remarkPreserveCodeIndent() {
  return (tree: AnyNode, file: { value?: unknown }): void => {
    const src = String(file?.value ?? "");
    if (!src) return;

    const walk = (node: AnyNode): void => {
      if (
        node.type === "mdxJsxAttribute" &&
        (node.value as AnyNode | undefined)?.type ===
          "mdxJsxAttributeValueExpression"
      ) {
        const attrName = (node as { name?: string }).name ?? "";
        const estree = ((node.value as AnyNode).data as { estree?: AnyNode })
          ?.estree;
        restoreCodeTemplates(estree, src, attrName);
      }
      for (const k of Object.keys(node)) {
        const child = (node as Record<string, unknown>)[k];
        if (Array.isArray(child)) {
          for (const c of child) {
            if (c && typeof c === "object" && (c as AnyNode).type)
              walk(c as AnyNode);
          }
        } else if (
          child &&
          typeof child === "object" &&
          (child as AnyNode).type
        ) {
          walk(child as AnyNode);
        }
      }
    };
    walk(tree);
  };
}

export default remarkPreserveCodeIndent;
