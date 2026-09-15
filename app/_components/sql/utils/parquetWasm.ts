// Shared parquet-wasm singleton, guarantees the WASM binary is
// fetched from CDN at most once per page load regardless of whether
// the first caller is an import or an export operation.

import { PARQUET_WASM_CDN } from "../../runtime/cdn";

let _init: Promise<typeof import("parquet-wasm/esm")> | null = null;

export function ensureParquetWasm(): Promise<typeof import("parquet-wasm/esm")> {
  if (!_init) {
    _init = (async () => {
      const mod = await import("parquet-wasm/esm");
      // The URL's version must match the glue imported above, which is the
      // installed package — see PARQUET_WASM_CDN.
      await mod.default(PARQUET_WASM_CDN);
      return mod;
    })();
  }
  return _init;
}
