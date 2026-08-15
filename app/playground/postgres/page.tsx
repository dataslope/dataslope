"use client";

import dynamic from "next/dynamic";

// Client-only: the playground reads persisted state from localStorage and
// generates per-session tab ids in render-time initializers, so an SSR pass
// would always hydrate against different markup. Deliberately no loading
// fallback: a pre-chunk skeleton can't know the persisted playground theme.
const PostgresPlayground = dynamic(
  () => import("../../_components/postgres/PostgresPlayground"),
  { ssr: false },
);

export default function PostgresPage() {
  return <PostgresPlayground />;
}
