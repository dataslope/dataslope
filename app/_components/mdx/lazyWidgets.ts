"use client";

/**
 * Lazily-loaded versions of the interactive widgets registered in
 * `mdx-components.tsx`. Why they are lazy at all is documented there.
 *
 * ## Why this module has to be `"use client"`
 *
 * The obvious version of this — calling `dynamic()` straight from
 * `mdx-components.tsx` — does nothing, and silently. In the App Router a
 * client component reached from a Server Component becomes a *client
 * reference*, and every client reference in a route's server graph joins that
 * route's client entry whether it was imported statically or through
 * `dynamic()`. Tried on 2026-08-09, it left all 41 chunks as eager
 * `<script src>` tags in the prerendered HTML and added a 42nd.
 *
 * The `import()` has to be evaluated inside the *client* graph for the bundler
 * to treat it as a split point, which is what the directive above buys: these
 * calls now run in a client module, so each widget becomes its own async chunk
 * that a lesson fetches only when it actually renders that widget.
 *
 * So: add new widgets HERE, not as a `dynamic()` call in a Server Component.
 *
 * Server rendering is unaffected. `ssr: true` is `dynamic()`'s default, so the
 * prerendered HTML still contains every widget — no SEO loss, no blank frame,
 * and Next preloads the chunks for widgets present in the RSC payload, so a
 * lesson that does use `<CodeBlock>` fetches it in parallel rather than in a
 * waterfall behind hydration.
 */

import { lazyWidget } from "./lazyWidget";

export const MdxCodeBlock = lazyWidget(
  () => import("@/app/_components/MdxCodeBlock"),
);
export const MdxChallengeCard = lazyWidget(
  () => import("@/app/_components/MdxChallengeCard"),
);
export const MdxSqlChallengeCard = lazyWidget(
  () => import("@/app/_components/MdxSqlChallengeCard"),
);
export const MdxSqlCodeBlock = lazyWidget(
  () => import("@/app/_components/MdxSqlCodeBlock"),
);
export const MdxMultipleChoiceQuestion = lazyWidget(
  () => import("@/app/_components/multipleChoice/MdxMultipleChoiceQuestion"),
);
export const Mermaid = lazyWidget(() =>
  import("@/app/_components/mdx/mermaid").then((mod) => mod.Mermaid),
);
export const IllustrationPrompt = lazyWidget(
  () => import("@/app/_components/mdx/IllustrationPrompt"),
);
export const LoadingAnimationsGallery = lazyWidget(
  () => import("@/app/_components/mdx/loadingAnimations"),
);
export const RuntimeLoadingStates = lazyWidget(
  () => import("@/app/_components/RuntimeBootNotice"),
);
export const LivePreview = lazyWidget(() =>
  import("@/app/_components/mdx/LivePreview").then((mod) => mod.LivePreview),
);
export const ReactPreview = lazyWidget(() =>
  import("@/app/_components/mdx/ReactPreview").then((mod) => mod.ReactPreview),
);
