/**
 * Project-wide `next/link` wrapper that defaults `prefetch` to `true`
 * (Next.js's own default). Link-dense grids/lists (homepage course grid,
 * playground index) should pass `prefetch={false}` explicitly to avoid
 * viewport-prefetch fan-out. Fumadocs sidebar/TOC links don't go through
 * this wrapper; they're tamed via `sidebar={{ prefetch: false }}` in the
 * docs-route layouts.
 */
import NextLink from "next/link";
import type { ComponentProps } from "react";

export type LinkProps = ComponentProps<typeof NextLink>;

export default function Link({ prefetch = true, ...props }: LinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
