"use client";

import dynamic from "next/dynamic";

import PlaygroundLoading from "../_components/PlaygroundLoading";

// Client-only: the playground reads persisted state (tabs, active database)
// from localStorage and generates per-session tab ids in render-time
// initializers, so an SSR pass would always hydrate against different
// markup. Skipping SSR renders the persisted state directly on first
// client paint instead of flashing defaults and re-rendering.
const DuckDbPlayground = dynamic(
  () => import("../../_components/duckdb/DuckDbPlayground"),
  // The loading fallback is server-rendered (loading components are included
  // even under ssr: false), so first paint shows the boot screen, not a blank.
  { ssr: false, loading: PlaygroundLoading },
);

export default function DuckDbPage() {
  return <DuckDbPlayground />;
}
