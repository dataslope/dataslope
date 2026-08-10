/**
 * Fumadocs's `<Callout>`, with backticks in its `title` rendered as code.
 *
 * A callout is authored as `<Callout title="`gets()` is so dangerous…">`, and
 * `title` is a JSX *attribute*, which markdown never sees. `withInlineCode`
 * (shared with `<Figure>` and `<Chart>` captions, which have the same problem)
 * is what turns those backticks into code chips; see that module for why it
 * understands code spans and nothing else.
 */
import type { ComponentProps } from "react";
import { Callout } from "fumadocs-ui/components/callout";
import { withInlineCode } from "./inlineCode";

export function CalloutWithCodeTitle({
  title,
  ...props
}: ComponentProps<typeof Callout>) {
  return <Callout title={withInlineCode(title)} {...props} />;
}
