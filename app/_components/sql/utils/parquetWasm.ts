// Shared parquet-wasm singleton — guarantees the WASM binary is
// fetched from CDN at most once per page load regardless of whether
// the first caller is an import or an export operation.

let _init: Promise<typeof import("parquet-wasm/esm")> | null = null;

export function ensureParquetWasm(): Promise<typeof import("parquet-wasm/esm")> {
  if (!_init) {
    _init = (async () => {
      const mod = await import("parquet-wasm/esm");
      await mod.default(
        "https://cdn.jsdelivr.net/npm/parquet-wasm@0.7.1/esm/parquet_wasm_bg.wasm",
      );
      return mod;
    })();
  }
  return _init;
}
