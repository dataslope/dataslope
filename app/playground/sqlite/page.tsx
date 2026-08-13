"use client";

import dynamic from "next/dynamic";

import PlaygroundLoading from "../_components/PlaygroundLoading";

// Client-only, matching the Postgres/DuckDB pages: the SQL playgrounds
// restore tabs and per-database state from localStorage on the client, so
// there is nothing useful to server-render and skipping SSR removes the
// whole class of hydration mismatches. The loading fallback is
// server-rendered (loading components are included even under ssr: false),
// so first paint shows the boot screen, not a blank.
const SqlPlayground = dynamic(() => import("../../_components/SqlPlayground"), {
  ssr: false,
  loading: PlaygroundLoading,
});

export default function SqlitePage() {
  return <SqlPlayground />;
}
