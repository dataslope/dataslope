/**
 * Fumadocs's `<Callout>`, with backticks in its `title` rendered as code.
 *
 * A callout is authored as `<Callout title="`gets()` is so dangerous…">`, and
 * `title` is a JSX *attribute*: MDX hands it over as a plain string, so the
 * backticks arrived on the page as literal backticks while the same spelling
 * one line below, in the callout's markdown body, rendered as a code chip. It
 * read as a typo in the content, which is why it survived 1,117 callouts.
 *
 * ## Only code spans, never emphasis
 *
 * The obvious generalisation, "run the title through a markdown renderer",
 * is wrong here, and one existing title proves it: `Why *args, **kwargs?`.
 * Those asterisks are Python syntax. An emphasis pass would eat them and
 * silently rewrite the heading of a lesson about the very syntax it deleted.
 * Backticks have no such second meaning in a title, so they are the only
 * markup this understands, and adding more is a mistake rather than an
 * improvement.
 *
 * A `title` that is already JSX passes through untouched, so an author who
 * needs anything richer can still write it directly.
 */
import type { ComponentProps, ReactNode } from "react";
import { Callout } from "fumadocs-ui/components/callout";

/** Paired single backticks. An unpaired one stays literal, exactly as it
 *  would in markdown. */
const CODE_SPAN = /`([^`]+)`/g;

/**
 * Render backtick spans in a plain-string title as `<code>` elements.
 * Anything that is not a string with a backtick in it is returned unchanged.
 */
export function withInlineCode(title: ReactNode): ReactNode {
  if (typeof title !== "string" || !title.includes("`")) return title;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of title.matchAll(CODE_SPAN)) {
    if (match.index > cursor) parts.push(title.slice(cursor, match.index));
    parts.push(<code key={match.index}>{match[1]}</code>);
    cursor = match.index + match[0].length;
  }
  // No pair matched: a lone backtick is literal in markdown too, so hand the
  // string back as it came rather than as an array of one.
  if (cursor === 0) return title;
  if (cursor < title.length) parts.push(title.slice(cursor));
  return parts;
}

export function CalloutWithCodeTitle({
  title,
  ...props
}: ComponentProps<typeof Callout>) {
  return <Callout title={withInlineCode(title)} {...props} />;
}
