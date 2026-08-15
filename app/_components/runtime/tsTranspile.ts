/**
 * TypeScript → JavaScript, exactly as the TypeScript adapter does it.
 * Extracted from typescript-worker.ts (which touches `self` at module
 * scope) so scripts can import it — one definition, no drifting compiler
 * options. `module: CommonJS` is the critical one: it's what lets
 * almostnode's require() resolve modules out of the VirtualFS.
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

/** Transpile TS source → JS. Diagnostics return alongside the output so
 *  the caller can surface them as stderr without aborting the run. */
export function transpileTs(
  source: string,
  fileName: string,
): { outputText: string; diagnostics: string[] } {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      // CommonJS so almostnode's require() resolves modules from VirtualFS.
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
