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
 * While the card graph downloads, the fallback is a content-bearing
 * skeleton (CustomItemSkeleton): the payload is already on the page, so
 * the visitor reads the real instructions / starter code / choices
 * immediately, in a box shaped like the card so the swap causes almost
 * no layout shift. `next/dynamic`'s `loading` component receives no
 * props, so the dynamic component is created per mount with the mount's
 * props captured in the closure — every consumer renders one item per
 * mount (viewers are per-request, builder previews remount via `key`),
 * so the captured props can't go stale while the fallback is visible.
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
