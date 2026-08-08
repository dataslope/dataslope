/**
 * TypeScript → JavaScript, exactly as the TypeScript adapter does it.
 *
 * Extracted from `typescript-worker.ts` so something other than a Web Worker
 * can call it. That worker touches `self` at module scope, so a script cannot
 * import it; without this split a sweep would have to restate the compiler
 * options, and a restated compiler is a compiler that drifts. The one that
 * matters most is `module: CommonJS` — it is what makes almostnode's
 * `require()` resolve modules out of the VirtualFS, and getting it wrong turns
 * every multi-file TypeScript lesson into a module-resolution error that no
 * reader sees.
 *
 * `typescript-worker.ts` imports these, so there is one definition.
 */
import * as ts from "typescript";

const TS_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];

export function isTsPath(p: string): boolean {
  return TS_EXTENSIONS.some((ext) => p.endsWith(ext));
}

/** Replace a `.ts`/`.tsx`/`.mts`/`.cts` suffix with `.js`. Leaves any other
 *  suffix untouched. */
export function tsToJsPath(p: string): string {
  for (const ext of TS_EXTENSIONS) {
    if (p.endsWith(ext)) return p.slice(0, -ext.length) + ".js";
  }
  return p;
}

/** Transpile TS source → JS. Diagnostics are returned alongside the output
 *  text so the caller can surface them as stderr cells without aborting the
 *  run (the legacy adapter behaved the same way). */
export function transpileTs(
  source: string,
  fileName: string,
): { outputText: string; diagnostics: string[] } {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      // CommonJS so almostnode's `require()` resolves modules from
      // VirtualFS. Top-level `import`/`export` statements in user code
      // are downleveled to `require()`/`module.exports` automatically.
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      allowJs: true,
      isolatedModules: true,
      strict: false,
      removeComments: false,
    },
    reportDiagnostics: true,
    fileName,
  });
  const diagnostics = (result.diagnostics ?? [])
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"))
    .filter(Boolean);
  return { outputText: result.outputText, diagnostics };
}
