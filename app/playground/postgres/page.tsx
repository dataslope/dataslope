"use client";

import dynamic from "next/dynamic";

// Client-only: the playground reads persisted state (tabs, active database)
// from localStorage and generates per-session tab ids in render-time
// initializers, so an SSR pass would always hydrate against different
// markup. Skipping SSR renders the persisted state directly on first
// client paint instead of flashing defaults and re-rendering.
const PostgresPlayground = dynamic(
  () => import("../../_components/postgres/PostgresPlayground"),
  { ssr: false },
);

export default function PostgresPage() {
  return <PostgresPlayground />;
}
