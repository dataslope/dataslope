/**
 * Helpers for the children + fenced-code authoring style of the learn
 * code blocks / challenge cards.
 *
 * Instead of passing code as a multi-line template-literal prop —
 *
 *   <CodeBlock adapter="javascript" starterCode={`…`} />
 *
 * which @mdx-js strips the base indentation from during tokenization,
 * authors write the code as a fenced code block child:
 *
 *   <CodeBlock adapter="javascript">
 *
 *   ```js
 *   const age = 17;
 *   if (age >= 18) {
 *     console.log("You can vote.");
 *   }
 *   ```
 *
 *   </CodeBlock>
 *
 * Markdown fenced code blocks are verbatim, so indentation is preserved.
 * Fumadocs' Shiki highlighter turns the block into a `<pre>` of token
 * `<span>`s, but it keeps every character (indentation included) as text
 * and separates lines with `"\n"` text nodes — so concatenating the text
 * leaves of the children reconstructs the exact source.
 */

import { isValidElement, type ReactNode } from "react";

/** Concatenate every text leaf of a React subtree, in document order. */
export function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * Extract the code authored as a fenced-code child and normalise it to the
 * same shape the formatters emit (no leading blank line, exactly one trailing
 * newline). Returns `undefined` when there is no meaningful child code, so
 * callers can fall back to the legacy `*Code` props during the migration.
 */
export function codeFromChildren(children: ReactNode): string | undefined {
  const raw = extractText(children);
  if (!raw.trim()) return undefined;
  return raw.replace(/^\n+/, "").replace(/\s+$/, "") + "\n";
}
