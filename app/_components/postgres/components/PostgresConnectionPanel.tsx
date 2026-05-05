"use client";

import { Database, Plug, Unplug } from "lucide-react";
import { usePostgresPlaygroundStore } from "../stores/usePostgresPlaygroundStore";

export function PostgresConnectionPanel() {
  const connection = usePostgresPlaygroundStore((s) => s.connection);
  const connected = usePostgresPlaygroundStore((s) => s.connected);
  const setConnectionField = usePostgresPlaygroundStore(
    (s) => s.setConnectionField,
  );
  const connectMock = usePostgresPlaygroundStore((s) => s.connectMock);
  const disconnectMock = usePostgresPlaygroundStore((s) => s.disconnectMock);

  return (
    <aside className="sql-sidebar postgres-sidebar" aria-label="Postgres connection">
      <div className="sql-db-selector-wrap postgres-panel-heading">
        <Database size={15} aria-hidden="true" />
        <div>
          <strong>Connection</strong>
          <span>{connected ? "Mock session active" : "Not connected"}</span>
        </div>
      </div>
      <div className="postgres-form">
        {([
          ["host", "Host"],
          ["port", "Port"],
          ["database", "Database"],
          ["user", "User"],
        ] as const).map(([field, label]) => (
          <label key={field} className="postgres-field">
            <span>{label}</span>
            <input
              value={connection[field]}
              onChange={(event) => setConnectionField(field, event.target.value)}
              disabled={connected}
            />
          </label>
        ))}
        <label className="postgres-checkbox">
          <input
            type="checkbox"
            checked={connection.ssl}
            onChange={(event) => setConnectionField("ssl", event.target.checked)}
            disabled={connected}
          />
          Require SSL
        </label>
        <button
          type="button"
          className="sql-er-btn postgres-connect-btn"
          onClick={connected ? disconnectMock : connectMock}
        >
          {connected ? <Unplug size={14} /> : <Plug size={14} />}
          <span>{connected ? "Disconnect mock" : "Connect mock"}</span>
        </button>
      </div>
      <div className="sql-tree postgres-schema-mock">
        <div className="sql-tree-label">SCHEMA PREVIEW</div>
        <div className="postgres-schema-card">
          <strong>public.customers</strong>
          <span>id · name · plan · created_at</span>
        </div>
        <div className="postgres-schema-card">
          <strong>public.orders</strong>
          <span>id · customer_id · total · status</span>
        </div>
      </div>
    </aside>
  );
}
