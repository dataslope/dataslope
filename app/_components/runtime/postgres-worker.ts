// PGlite loads from jsDelivr at runtime, not the bundle: keeps the WASM
// payload off this origin and avoids Turbopack choking on PGlite's
// internal dynamic imports. CDN URLs/version live in cdn.ts.

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

