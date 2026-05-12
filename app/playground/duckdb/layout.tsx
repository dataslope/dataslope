import type { ReactNode } from "react";

export const metadata = {
  title: "DuckDB Playground",
  description:
    "In-browser DuckDB playground powered by duckdb-wasm. Write and run SQL queries against sample databases entirely in your browser.",
};

export default function DuckDbLayout({ children }: { children: ReactNode }) {
  return children;
}
