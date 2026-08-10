/**
 * Renders backtick spans inside a plain-string JSX attribute as `<code>`.
 *
 * Some of what a learner reads arrives as a JSX *attribute* rather than as MDX
 * body text: a callout's `title`, a `<Figure>`'s `caption`, a chart spec's
 * exported `caption`. MDX hands those over as plain strings, so markdown never
 * touches them, and a backtick that renders as a code chip one line below in
 * the body arrived on the page as a literal backtick. It reads as a typo in
 * the content, which is why it went unnoticed across 1,117 callouts.
 *
 * ## Only code spans, never emphasis
 *
 * The obvious generalisation, "run the string through a markdown renderer",
 * is wrong here, and one existing callout title proves it: `Why *args,
 * **kwargs?`. Those asterisks are Python syntax. An emphasis pass would eat
 * them and silently rewrite the heading of a lesson about the very syntax it
 * deleted. Backticks have no such second meaning in these short strings, so
 * they are the only markup this understands, and adding more is a mistake
 * rather than an improvement.
 *
 * A value that is already JSX passes through untouched, so an author who needs
 * anything richer can still write it directly.
 */
import type { ReactNode } from "react";

/** Paired single backticks. An unpaired one stays literal, exactly as it
 *  would in markdown. */
const CODE_SPAN = /`([^`]+)`/g;

/**
 * Render backtick spans in a plain string as `<code>` elements. Anything that
 * is not a string with a backtick in it is returned unchanged.
 */
export function withInlineCode(text: ReactNode): ReactNode {
  if (typeof text !== "string" || !text.includes("`")) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(CODE_SPAN)) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(<code key={match.index}>{match[1]}</code>);
    cursor = match.index + match[0].length;
  }
  // No pair matched: a lone backtick is literal in markdown too, so hand the
  // string back as it came rather than as an array of one.
  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
