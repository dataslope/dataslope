/**
 * Project-wide `next/link` wrapper that defaults `prefetch` to `false`.
 *
 * Next.js eagerly prefetches every `<Link>` that enters the viewport, so
 * link-dense pages (the homepage course grid, the playground index, the
 * playground headers) fan out dozens of background requests per view. On
 * Vercel each prefetch that misses the edge cache is billed as an ISR Read
 * + Edge Request + Fast Origin Transfer — see
 * agent-outputs/20260612-1620-vercel-isr-edge-usage-and-hosting-report.md.
 *
 * In the App Router `prefetch={false}` disables both viewport and hover
 * prefetching; navigation simply fetches on click, which is fine for this
 * fully static site. Opt back in per-link (`<Link href="/learn" prefetch>`)
 * only for primary navigation that should feel instant.
 *
 * Note: Fumadocs sidebar/TOC links don't go through this wrapper — their
 * prefetching is tamed via `sidebar={{ prefetch: false }}` on `DocsLayout`
 * in `app/learn/layout.tsx`.
 */
import NextLink from "next/link";
import type { ComponentProps } from "react";

export type LinkProps = ComponentProps<typeof NextLink>;

export default function Link({ prefetch = false, ...props }: LinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
