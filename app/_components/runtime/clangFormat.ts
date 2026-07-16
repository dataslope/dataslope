// Shared clang-format WASM loader used by the C, C++, Java, and C#
// playgrounds.  The singleton pattern means the ~2 MB WASM binary is
// fetched and compiled only once per page load, regardless of which
// language tab the user visits first.
//
// The version is pinned to match the installed npm package so the JS
// and WASM builds always stay in sync, update both together.
export const CLANG_FORMAT_VERSION = "22.1.8";

let clangFormatInitPromise: Promise<{
  format: (src: string, fname: string, style?: string) => string;
}> | null = null;

export function getClangFormat() {
  if (!clangFormatInitPromise) {
    clangFormatInitPromise = (async () => {
      const mod = await import("@wasm-fmt/clang-format/web");
      // Load the WASM binary from CDN, matching the installed package
      // version so the JS and WASM builds stay in sync.
      await mod.default(
        `https://cdn.jsdelivr.net/npm/@wasm-fmt/clang-format@${CLANG_FORMAT_VERSION}/clang-format.wasm`,
      );
      return { format: mod.format };
    })();
  }
  return clangFormatInitPromise;
}
