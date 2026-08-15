"use client";

import dynamic from "next/dynamic";

// Client-only, matching the Postgres/DuckDB pages: the SQL playgrounds
// restore tabs from localStorage, so skipping SSR removes the whole class of
// hydration mismatches. Deliberately no loading fallback: a pre-chunk
// skeleton can't know the persisted playground theme.
const SqlPlayground = dynamic(() => import("../../_components/SqlPlayground"), {
  ssr: false,
});

export default function SqlitePage() {
  return <SqlPlayground />;
}
