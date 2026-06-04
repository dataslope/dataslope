// Shared web_fmt WASM loader used by the JavaScript and TypeScript
// playgrounds.  The singleton pattern means the WASM binary is fetched
// and compiled only once per page load, regardless of which language
// tab the user visits first.
//
// The version is pinned to match the installed npm package so the JS
// and WASM builds always stay in sync — update both together.
const WEB_FMT_VERSION = "0.2.9";

// DataSlope's house style for JS/TS: 2-space indentation. web_fmt defaults
// to hard tabs, so we pass this on every formatCode() call to keep the
// formatter's output in sync with the editor's Tab width (see the
// `indentWidth` field on the JS/TS adapters). Structurally compatible with
// web_fmt's `Config` (which it extends from `LayoutConfig`).
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
