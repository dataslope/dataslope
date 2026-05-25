// PGlite (the Postgres WASM runtime) is loaded from the jsDelivr CDN at
// runtime rather than bundled by Next.js/Turbopack. This mirrors the pattern
// already used for SQLite (@sqlite.org/sqlite-wasm), DuckDB
// (@duckdb/duckdb-wasm), Pyodide, and PHP throughout this repo — keeping
// the large WASM payload off Vercel's bandwidth budget and avoiding
// Turbopack's inability to statically analyse PGlite's internal dynamic
// imports.
//
// IMPORTANT: keep PGLITE_VERSION in sync with the @electric-sql/pglite
// version pinned in package.json. The npm install only ships the TypeScript
// declarations to us; the actual runtime is fetched from jsDelivr.

import type { PGlite } from "@electric-sql/pglite";

const PGLITE_VERSION = "0.4.5";
const PGLITE_CDN = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/index.js`;
const PGLITE_WORKER_CDN = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/worker/index.js`;

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

