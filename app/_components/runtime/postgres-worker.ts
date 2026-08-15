// PGlite loads from jsDelivr at runtime, not the bundle: keeps the WASM
// payload off this origin and avoids Turbopack choking on PGlite's
// internal dynamic imports. CDN URLs/version live in cdn.ts.

import type { PGlite } from "@electric-sql/pglite";

import { PGLITE_CDN, PGLITE_WORKER_CDN } from "./cdn";

interface PGliteWorkerModule {
  worker: (config: { init: (options: unknown) => Promise<PGlite> }) => void;
}

/** OIDs of the JSON types, whose default parser is `JSON.parse`. */
const OID_JSON = 114;
const OID_JSONB = 3802;

/** Type parsers must be installed here rather than passed in from the main
 *  thread: PGlite's options cross a `postMessage`, and functions are not
 *  structured-cloneable.
 *
 *  JSON columns keep their raw text instead of being parsed to a JS value.
 *  `JSON.parse` maps a stored JSON `null` onto JS `null`, making it
 *  indistinguishable from SQL NULL everywhere downstream — the grid showed
 *  both as an italic NULL and every exporter dropped the distinction. The raw
 *  text is also what round-trips: jsonb has already normalized it server-side,
 *  and an edited cell casts straight back with text -> jsonb. */
const PG_TYPE_PARSERS = {
  [OID_JSON]: (value: string) => value,
  [OID_JSONB]: (value: string) => value,
};

(async () => {
  const [{ PGlite }, { worker }] = (await Promise.all([
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PGLITE_CDN),
    import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PGLITE_WORKER_CDN),
  ])) as [{ PGlite: new (options?: unknown) => PGlite }, PGliteWorkerModule];

  worker({
    async init(options) {
      const opts = (options ?? {}) as Record<string, unknown>;
      return new PGlite({
        ...opts,
        parsers: {
          ...PG_TYPE_PARSERS,
          ...((opts.parsers as Record<number, unknown>) ?? {}),
        },
      });
    },
  });
})();

