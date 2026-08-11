/**
 * Renders the markup a reader expects inside a plain-string JSX attribute.
 *
 * Some of what a learner reads arrives as a JSX *attribute* rather than as MDX
 * body text: a callout's `title`, a `<Figure>`'s `caption`, a chart spec's
 * exported `caption`. MDX hands those over as plain strings, so markdown never
 * touches them, and markup that renders one line below in the body arrived on
 * the page as literal punctuation. It reads as a typo in the content, which is
 * why it went unnoticed across 1,117 callouts.
 *
 * Three pieces of markup are honoured, and no more: code spans, strong, and
 * emphasis.
 *
 * ## Code spans win, and they win first
 *
 * `` `scan_*()` `` is a real caption on the Polars reading-and-writing page.
 * Its asterisks are part of an identifier, so the string is split on code
 * spans *before* emphasis is looked for, and only the text between them is
 * scanned. Anything inside backticks is delivered to `<code>` verbatim.
 *
 * ## Emphasis, with markdown's flanking rule
 *
 * The obvious implementation, a bare `/\*(.+?)\*​/`, is wrong, and one existing
 * callout title proves it: `Why *args, **kwargs?`. Those asterisks are Python
 * syntax, and a naive pass would eat them and silently rewrite the heading of
 * a lesson about the very syntax it deleted.
 *
 * Markdown itself does not have that problem, because a closing delimiter has
 * to be *right-flanking*: preceded by something that is not whitespace. In
 * `Why *args, **kwargs?` every asterisk is preceded by a space, so none of
 * them can close, and the whole string stays literal. That rule is what the
 * patterns below encode, which is why the delimited text may neither begin nor
 * end with a space or another asterisk.
 *
 * Underscores are deliberately not emphasis markers here. They are far more
 * often part of an identifier (`was_missing`, `read_csv`) than an author's
 * intent, and an attribute is exactly where such a name appears bare.
 *
 * A value that is already JSX passes through untouched, so an author who needs
 * anything richer can still write it directly.
 */
import type { ReactNode } from "react";

/** Paired single backticks. An unpaired one stays literal, exactly as it
 *  would in markdown. */
const CODE_SPAN = /`([^`]+)`/g;

/**
 * Strong first, then emphasis, so `**both**` is not read as an empty pair
 * around a stray asterisk. In each, the delimited text may not start or end
 * with a space (markdown's flanking rule) nor with an asterisk (which would
 * let one half of a `**` pair close a single-asterisk span).
 */
const EMPHASIS = /\*\*([^\s*](?:[^*]*[^\s*])?)\*\*|\*([^\s*](?:[^*]*[^\s*])?)\*/g;

/** Emphasis within one run of text that is known to contain no code span. */
function withEmphasis(text: string, keyPrefix: string): ReactNode[] | string {
  if (!text.includes("*")) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(EMPHASIS)) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const key = `${keyPrefix}-${match.index}`;
    parts.push(
      match[1] === undefined ? <em key={key}>{match[2]}</em> : <strong key={key}>{match[1]}</strong>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

/**
 * Render code spans, strong and emphasis in a plain string. Anything that is
 * not a string, or a string with none of that markup in it, is returned
 * unchanged.
 */
export function withInlineMarkup(text: ReactNode): ReactNode {
  if (typeof text !== "string") return text;
  if (!text.includes("`") && !text.includes("*")) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  const push = (run: string, at: number) => {
    const rendered = withEmphasis(run, `e${at}`);
    if (Array.isArray(rendered)) parts.push(...rendered);
    else if (rendered) parts.push(rendered);
  };

  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > cursor) push(text.slice(cursor, match.index), cursor);
    parts.push(<code key={`c${match.index}`}>{match[1]}</code>);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) push(text.slice(cursor), cursor);

  // Nothing matched anywhere: hand the string back as it came rather than as
  // an array of one. A lone backtick is literal in markdown too.
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  if (parts.length === 0) return text;
  return parts;
}

export default withInlineMarkup;
