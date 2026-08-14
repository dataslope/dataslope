/**
 * Rewrite LaTeX math delimiters (`\[…\]` → `$$…$$`, `\(…\)` → `$…$`) into the
 * ones `remark-math` parses. Must run BEFORE Markdown parses: Markdown reads
 * `\[` as an escaped bracket, so the delimiter is gone by the time any plugin
 * could see it. Code (fenced blocks + inline spans) is split out first and
 * left untouched — `\[` is real syntax in regexes, Bash, strings.
 */

/** Fenced blocks (``` or ~~~) and inline code spans. Capturing, so `split`
 *  keeps them: even indices are prose, odd indices are code. */
const CODE_SEGMENT = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g;

/** Non-greedy, so two formulas in one paragraph stay two formulas. A display
 *  formula standing alone on its line is emitted in the three-line fenced form
 *  (`$$` / body / `$$`) — one-line `$$ x $$` parses as INLINE math — while a
 *  mid-sentence `\[…\]` keeps the one-line form so the paragraph isn't split. */
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
 * Normalize an answer's math delimiters for `remark-math`. Safe on a partial
 * answer: an unclosed formula simply doesn't match yet.
 */
export function normalizeMathDelimiters(markdown: string): string {
  if (!markdown.includes("\\[") && !markdown.includes("\\(")) return markdown;
  return markdown
    .split(CODE_SEGMENT)
    .map((segment, i) => (i % 2 === 1 ? segment : rewriteProse(segment)))
    .join("");
}
