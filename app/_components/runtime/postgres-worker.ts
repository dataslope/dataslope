// PGlite (the Postgres WASM runtime) is loaded from the jsDelivr CDN at
// runtime rather than bundled by Next.js/Turbopack. This mirrors the pattern
// already used for SQLite (@sqlite.org/sqlite-wasm), DuckDB
// (@duckdb/duckdb-wasm), Pyodide, and PHP throughout this repo, keeping
// the large WASM payload off this app's own origin and avoiding
// Turbopack's inability to statically analyse PGlite's internal dynamic
// imports. CDN URLs and version are defined in cdn.ts.

import type { PGlite } from "@electric-sql/pglite";

import { PGLITE_CDN, PGLITE_WORKER_CDN } from "./cdn";

interface PGliteWorkerModule {
  worker: (config: { init: (options: unknown) => Promise<PGlite> }) => void;
}

(async () => {
  const [{ PGlite }, { worker }] = (await Promise.all([
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PGLITE_CDN),
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PGLITE_WORKER_CDN),
  ])) as [{ PGlite: new (options?: unknown) => PGlite }, PGliteWorkerModule];

  worker({
    async init(options) {
      return new PGlite(options);
    },
  });
})();

