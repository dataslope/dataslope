// Shared ruff_fmt WASM loader used by the Python playground.
// The singleton pattern means the WASM binary is fetched and compiled
// only once per page load.
//
// The version is pinned to match the installed npm package so the JS
// and WASM builds always stay in sync — update both together.
const RUFF_FMT_VERSION = "0.15.12";

let ruffFmtInitPromise: Promise<{
  format: (input: string, path?: string) => string;
}> | null = null;

export function getRuffFmt() {
  if (!ruffFmtInitPromise) {
    ruffFmtInitPromise = (async () => {
      const mod = await import("@wasm-fmt/ruff_fmt/web");
      await mod.default(
        `https://cdn.jsdelivr.net/npm/@wasm-fmt/ruff_fmt@${RUFF_FMT_VERSION}/ruff_fmt_bg.wasm`,
      );
      return { format: mod.format };
    })();
  }
  return ruffFmtInitPromise;
}
