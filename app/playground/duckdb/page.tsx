"use client";

import dynamic from "next/dynamic";

// Client-only: the playground reads persisted state from localStorage and
// generates per-session tab ids in render-time initializers, so an SSR pass
// would always hydrate against different markup. Deliberately no loading
// fallback: a pre-chunk skeleton can't know the persisted playground theme.
const DuckDbPlayground = dynamic(
  () => import("../../_components/duckdb/DuckDbPlayground"),
  { ssr: false },
);

export default function DuckDbPage() {
  return <DuckDbPlayground />;
}
