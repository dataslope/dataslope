"use client";

import dynamic from "next/dynamic";
import { playgroundTitle } from "../_components/PlaygroundTitle";

// Client-only, matching the Postgres/DuckDB pages: the SQL playgrounds
// restore tabs from localStorage, so skipping SSR removes the whole class of
// hydration mismatches. No visible loading fallback: a pre-chunk
// skeleton can't know the persisted playground theme.
const SqlPlayground = dynamic(() => import("../../_components/SqlPlayground"), {
  ssr: false,
  loading: playgroundTitle("sqlite"),
});

export default function SqlitePage() {
  return <SqlPlayground />;
}
