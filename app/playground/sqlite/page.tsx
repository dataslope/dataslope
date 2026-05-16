"use client";

import { SqlPlaygroundShell } from "../../_components/sql/shared/SqlPlaygroundShell";
import { createSqliteAdapter } from "../../_components/sql/sqliteAdapter";

const adapter = createSqliteAdapter();

export default function SqlitePage() {
  return <SqlPlaygroundShell adapter={adapter} />;
}
