"use client";

/**
 * Lazily-loaded versions of the interactive widgets registered in
 * `mdx-components.tsx`. This module MUST be `"use client"`: a `dynamic()`
 * call from a Server Component silently does not split — every client
 * reference in the server graph joins the route's client entry. The `import()`
 * has to be evaluated in the client graph to become a split point, so add new
 * widgets HERE, not as `dynamic()` in a Server Component. SSR is unaffected
 * (`ssr: true` is the default), so prerendered HTML still contains every
 * widget.
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
