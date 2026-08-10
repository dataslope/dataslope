/**
 * Project-wide `next/link` wrapper that defaults `prefetch` to `true`
 * (matching Next.js's own default), so primary navigation and in-content
 * links feel instant.
 *
 * History: this wrapper used to default `prefetch` to `false`. Next.js
 * eagerly prefetches every `<Link>` that enters the viewport, and on Vercel
 * each prefetch that missed the edge cache was billed as an ISR Read + Edge
 * Request + Fast Origin Transfer, so the viewport fan-out across our many
 * static pages exhausted the free quota. The site now runs on Cloudflare
 * (Workers + OpenNext), which has no ISR-read meter, prerendered pages and
 * their prefetch (`.rsc`) payloads are served as free static assets with
 * unlimited bandwidth and don't count against the Workers request limit. So
 * the charge that forced prefetch off no longer exists, and we re-enable it.
 *
 * Selective opt-out: viewport-prefetching a *dense list/index* (the homepage
 * course grid, the playground index) still fans out dozens of background
 * requests from the visitor's browser for little benefit. Those keep
 * `prefetch={false}` explicitly at the call site. Use the same opt-out for
 * any new link-dense grid/list.
 *
 * Note: Fumadocs sidebar/TOC links don't go through this wrapper, their
 * prefetching is tamed separately via `sidebar={{ prefetch: false }}` on
 * `DocsLayout` in the docs-route layouts (courses/fumadocs-dev/interview-prep).
 */
import NextLink from "next/link";
import type { ComponentProps } from "react";

export type LinkProps = ComponentProps<typeof NextLink>;

// INCIDENT MITIGATION (2026-08-10): the default is `false` until the prefetch
// request storm is fully resolved. Deployed builds carry
// `PrefetchHint.InliningHintsStale` in their prerendered payloads (a poisoned
// prefetch-hints manifest in the Workers Builds build cache is the suspected
// source; `prefetchInlining: false` in next.config.ts closes the other setter),
// and this origin serves the same frozen payload for every prefetch variant —
// so each prefetching link re-fetched its route forever, ~150 req/s per open
// tab. No scheduled prefetch, no loop: this default is the client-side
// guarantee that holds regardless of which build produced the payloads.
// Restore `prefetch = true` only after a deployed payload shows bit 512 clear
// (see the next.config.ts comment for the check).
export default function Link({ prefetch = false, ...props }: LinkProps) {
  return <NextLink prefetch={prefetch} {...props} />;
}
