"use client";

import dynamic from "next/dynamic";

// Client-only, matching the Postgres/DuckDB pages: the SQL playgrounds
// restore tabs and per-database state from localStorage on the client, so
// there is nothing useful to server-render and skipping SSR removes the
// whole class of hydration mismatches.
const SqlPlayground = dynamic(() => import("../../_components/SqlPlayground"), {
  ssr: false,
});

export default function SqlitePage() {
  return <SqlPlayground />;
}
