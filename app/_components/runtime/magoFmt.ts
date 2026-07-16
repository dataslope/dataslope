// Shared mago_fmt WASM loader used by the PHP playground.
// The singleton pattern means the WASM binary is fetched and compiled
// only once per page load.
//
// The version is pinned to match the installed npm package so the JS
// and WASM builds always stay in sync, update both together.
const MAGO_FMT_VERSION = "0.10.7";

let magoFmtInitPromise: Promise<{
  format: (code: string, filename?: string) => string;
}> | null = null;

export function getMagoFmt() {
  if (!magoFmtInitPromise) {
    magoFmtInitPromise = (async () => {
      const mod = await import("@wasm-fmt/mago_fmt/web");
      await mod.default(
        `https://cdn.jsdelivr.net/npm/@wasm-fmt/mago_fmt@${MAGO_FMT_VERSION}/mago_fmt_bg.wasm`,
      );
      return { format: mod.format };
    })();
  }
  return magoFmtInitPromise;
}
