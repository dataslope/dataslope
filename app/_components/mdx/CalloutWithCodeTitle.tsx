/**
 * Fumadocs's `<Callout>`, with backticks in its `title` rendered as code.
 *
 * A callout is authored as `<Callout title="`gets()` is so dangerous…">`, and
 * `title` is a JSX *attribute*, which markdown never sees. `withInlineMarkup`
 * (shared with `<Figure>` and `<Chart>` captions, which have the same problem)
 * is what turns those backticks into code chips, and what renders `*this*`
 * as emphasis; see that module for the rules it applies and why.
 */
import type { ComponentProps } from "react";
import { Callout } from "fumadocs-ui/components/callout";
import { withInlineMarkup } from "./inlineMarkup";

export function CalloutWithCodeTitle({
  title,
  ...props
}: ComponentProps<typeof Callout>) {
  return <Callout title={withInlineMarkup(title)} {...props} />;
}
