// Shared mago_fmt WASM loader (PHP playground); singleton so the WASM
// compiles once per page. Keep the version in sync with the installed npm
// package — update both together.
const MAGO_FMT_VERSION = "1.44.0";

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
