// Shared web_fmt WASM loader (JS/TS playgrounds); singleton so the WASM
// compiles once per page. Keep the version in sync with the installed npm
// package — update both together.
const WEB_FMT_VERSION = "0.2.9";

// House style: 2-space indentation (web_fmt defaults to hard tabs); keep
// in sync with the adapters' `indentWidth`.
export const WEB_FMT_2SPACE = {
  indentStyle: "space",
  indentWidth: 2,
} as const;

let webFmtInitPromise: ReturnType<typeof loadWebFmt> | null = null;

async function loadWebFmt() {
  const mod = await import("@wasm-fmt/web_fmt/web");
  await mod.default(
    `https://cdn.jsdelivr.net/npm/@wasm-fmt/web_fmt@${WEB_FMT_VERSION}/web_fmt_bg.wasm`,
  );
  return { format: mod.format };
}

export function getWebFmt() {
  if (!webFmtInitPromise) {
    webFmtInitPromise = loadWebFmt();
  }
  return webFmtInitPromise;
}
