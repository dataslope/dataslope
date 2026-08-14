/**
 * Renders markdown-ish markup inside plain-string JSX attributes (callout
 * titles, Figure captions, …), which MDX hands over untouched. Exactly three
 * forms: code spans, strong, emphasis. Code spans are split out FIRST so
 * asterisks inside identifiers (`` `scan_*()` ``) stay literal, and emphasis
 * encodes markdown's flanking rule so `Why *args, **kwargs?` is not rewritten.
 * Underscores are deliberately not emphasis markers (identifiers appear bare
 * in attributes). Non-string values pass through untouched.
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
