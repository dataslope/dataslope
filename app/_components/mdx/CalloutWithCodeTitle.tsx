/**
 * Fumadocs's `<Callout>` with backticks/asterisks in its `title` rendered via
 * `withInlineMarkup` — `title` is a JSX attribute markdown never sees.
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
