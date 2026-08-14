"use client";

/**
 * Client-only loader for `CustomItemRenderer`. The renderer's multi-MiB
 * graph must stay out of the server bundle — the deployed Worker sits close
 * to Cloudflare's 10 MiB gzipped ceiling — so `ssr: false` here, and every
 * route-level consumer must import THIS module, not CustomItemRenderer
 * directly, or the Worker regains the weight.
 */

import dynamic from "next/dynamic";
import { useState } from "react";
import CustomItemSkeleton from "./CustomItemSkeleton";
import type { CustomItemRendererProps } from "./CustomItemRenderer";

/**
 * Fallback is a content-bearing skeleton so the visitor reads real content
 * while the chunk downloads. `next/dynamic`'s `loading` gets no props, so
 * the dynamic component is created per mount with props captured in the
 * closure; every consumer renders one item per mount, so they can't go stale.
 */
export default function CustomItemRendererLazy(props: CustomItemRendererProps) {
  const [Card] = useState(() =>
    dynamic(() => import("./CustomItemRenderer"), {
      ssr: false,
      loading: () => <CustomItemSkeleton {...props} />,
    }),
  );
  return <Card {...props} />;
}
