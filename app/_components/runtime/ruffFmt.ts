// Shared ruff_fmt WASM loader (Python playground); singleton so the WASM
// compiles once per page. Keep the version in sync with the installed npm
// package — update both together.
const RUFF_FMT_VERSION = "0.15.20";

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
