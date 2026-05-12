import type { ReactNode } from "react";

export const metadata = {
  title: "DuckDB Playground",
  description:
    "Browser-based DuckDB playground powered by DuckDB-Wasm — query Parquet, CSV, and JSON entirely in your browser.",
};

export default function DuckDbLayout({ children }: { children: ReactNode }) {
  return children;
}
