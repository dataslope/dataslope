// Shared web_fmt WASM loader used by the JavaScript and TypeScript
// playgrounds.  The singleton pattern means the WASM binary is fetched
// and compiled only once per page load, regardless of which language
// tab the user visits first.
//
// The version is pinned to match the installed npm package so the JS
// and WASM builds always stay in sync — update both together.
const WEB_FMT_VERSION = "0.2.9";

let webFmtInitPromise: Promise<{
  format: (src: string, filename: string) => string;
}> | null = null;

export function getWebFmt() {
  if (!webFmtInitPromise) {
    webFmtInitPromise = (async () => {
      const mod = await import("@wasm-fmt/web_fmt/web");
      await mod.default(
        `https://cdn.jsdelivr.net/npm/@wasm-fmt/web_fmt@${WEB_FMT_VERSION}/web_fmt_bg.wasm`,
      );
      return { format: mod.format };
    })();
  }
  return webFmtInitPromise;
}
