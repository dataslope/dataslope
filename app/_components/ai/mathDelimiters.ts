/**
 * Rewrite LaTeX's own math delimiters into the ones `remark-math` parses.
 *
 * ── The bug this exists for ────────────────────────────────────────────────
 *
 * Asked "what is a residual?", the model answered with standard LaTeX display
 * math:
 *
 *     \[ \text{residual} = y_{\text{actual}} - y_{\text{predicted}} \]
 *
 * and the panel rendered, literally:
 *
 *     [ \text{residual} = y_{\text{actual}} - y_{\text{predicted}} ]
 *
 * Two things went wrong at once. `remark-math` only recognises `$…$` and
 * `$$…$$`, so it never saw this as math — and Markdown treats `\[` as an
 * *escaped bracket*, so by the time anything else could look at it the
 * backslashes were already gone and only a stray pair of square brackets was
 * left. That is why the output looks like brackets rather than like a formula
 * that failed to render.
 *
 * So the rewrite has to happen **before** Markdown parses, which is what this
 * does: `\[…\]` becomes `$$…$$` and `\(…\)` becomes `$…$`. The prompt also now
 * asks for `$` delimiters (`lib/ai/prompt.ts`), but a model's formatting is a
 * request, not a guarantee, and the reader should not see raw brackets when it
 * drifts.
 *
 * ── Code is left completely alone ──────────────────────────────────────────
 *
 * `\[` is real syntax in plenty of languages the site teaches — a regex
 * character class, a Bash array subscript, an escaped bracket in a string — so
 * rewriting inside code would corrupt exactly the snippets these answers exist
 * to explain. Fenced blocks and inline spans are split out first and passed
 * through untouched.
 */

/** Fenced blocks (``` or ~~~) and inline code spans. Capturing, so `split`
 *  keeps them: even indices are prose, odd indices are code. */
const CODE_SEGMENT = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;

/** `\[ … \]` → `$$ … $$`, and `\( … \)` → `$ … $`. Non-greedy, so two formulas
 *  in one paragraph stay two formulas rather than merging into one that spans
 *  the prose between them.
 *
 *  A display formula standing alone on its line is emitted in the fenced form
 *  (`$$` / body / `$$` on three lines), which is what makes `remark-math` build
 *  a display node rather than an inline one — `$$ x $$` all on one line parses
 *  as inline math, and the formula ends up set at text size mid-paragraph
 *  instead of centred on its own line the way `\[ … \]` asked for. A `\[ … \]`
 *  that is genuinely mid-sentence keeps the one-line form, so the paragraph
 *  around it is not split in two. */
function rewriteProse(text: string): string {
  return text
    .replace(
      /(^|\n)([ \t]*)\\\[([\s\S]+?)\\\]([ \t]*)(?=\n|$)/g,
      (_match, before: string, _indent: string, body: string) =>
        `${before}$$\n${body.trim()}\n$$`,
    )
    .replace(/\\\[([\s\S]+?)\\\]/g, (_match, body: string) => `$$${body}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_match, body: string) => `$${body}$`);
}

/**
 * Normalize an answer's math delimiters for `remark-math`.
 *
 * Safe to run on a partial answer: a formula whose closing delimiter has not
 * streamed in yet simply does not match, and is rewritten on a later pass once
 * it does.
 */
export function normalizeMathDelimiters(markdown: string): string {
  if (!markdown.includes("\\[") && !markdown.includes("\\(")) return markdown;
  return markdown
    .split(CODE_SEGMENT)
    .map((segment, i) => (i % 2 === 1 ? segment : rewriteProse(segment)))
    .join("");
}
