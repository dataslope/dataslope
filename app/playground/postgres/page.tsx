"use client";

import { SqlPlaygroundShell } from "../../_components/sql/shared/SqlPlaygroundShell";
import { createPostgresAdapter } from "../../_components/postgres/postgresAdapter";

const adapter = createPostgresAdapter();

export default function PostgresPage() {
  return <SqlPlaygroundShell adapter={adapter} />;
}
