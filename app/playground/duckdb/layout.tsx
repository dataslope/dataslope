import type { ReactNode } from "react";

export const metadata = {
  title: "DuckDB Playground",
  description:
    "Run DuckDB queries against in-browser sample databases via duckdb-wasm.",
};

export default function DuckDbLayout({ children }: { children: ReactNode }) {
  return children;
}
