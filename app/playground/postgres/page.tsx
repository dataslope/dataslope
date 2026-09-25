"use client";

import dynamic from "next/dynamic";
import { playgroundTitle } from "../_components/PlaygroundTitle";

// Client-only: the playground reads persisted state from localStorage and
// generates per-session tab ids in render-time initializers, so an SSR pass
// would always hydrate against different markup. No visible loading
// fallback: a pre-chunk skeleton can't know the persisted playground theme.
const PostgresPlayground = dynamic(
  () => import("../../_components/postgres/PostgresPlayground"),
  { ssr: false, loading: playgroundTitle("postgres") },
);

export default function PostgresPage() {
  return <PostgresPlayground />;
}
