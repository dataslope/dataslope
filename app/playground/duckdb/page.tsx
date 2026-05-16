"use client";

import { SqlPlaygroundShell } from "../../_components/sql/shared/SqlPlaygroundShell";
import { createDuckDbAdapter } from "../../_components/duckdb/duckdbAdapter";

const adapter = createDuckDbAdapter();

export default function DuckDbPage() {
  return <SqlPlaygroundShell adapter={adapter} />;
}
