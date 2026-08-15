// Shared clang-format WASM loader (C/C++/Java/C# playgrounds); singleton
// so the ~2 MB WASM compiles once per page. Keep the version in sync with
// the installed npm package — update both together.
export const CLANG_FORMAT_VERSION = "22.1.8";

let clangFormatInitPromise: Promise<{
  format: (src: string, fname: string, style?: string) => string;
}> | null = null;

export function getClangFormat() {
  if (!clangFormatInitPromise) {
    clangFormatInitPromise = (async () => {
      const mod = await import("@wasm-fmt/clang-format/web");
      await mod.default(
        `https://cdn.jsdelivr.net/npm/@wasm-fmt/clang-format@${CLANG_FORMAT_VERSION}/clang-format.wasm`,
      );
      return { format: mod.format };
    })();
  }
  return clangFormatInitPromise;
}
