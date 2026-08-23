/**
 * Compiler configuration shared by the language-service worker and its
 * tests: which globals a playground's code runs against, and how a
 * `ts.Diagnostic` becomes something the output pane can print.
 *
 * It lives outside the worker because the worker itself cannot be imported
 * (it calls `importScripts` at module scope), and type checking is worth
 * testing against the real compiler rather than through a browser.
 */
import type tsModule from "typescript";

import { NODE_AMBIENT_TYPES, NODE_AMBIENT_TYPES_PATH } from "./nodeAmbientTypes";

/** Which globals the code being analysed actually has. The JS/TS
 *  playgrounds run on almostnode inside a Web Worker; the web and React
 *  playgrounds run in a page. */
export type TsEnvironment = "node" | "dom";

/** A diagnostic, flattened for the surface: `file:line:column` plus TS's own
 *  error code, which is what a user pastes into a search engine. */
export interface TsDiagnosticMessage {
  file: string;
  /** 1-based, as editors and tsc count. */
  line: number;
  column: number;
  code: number;
  category: "error" | "warning" | "suggestion" | "message";
  message: string;
}

/** Worker globals rather than the DOM: `fetch` and `TextEncoder` exist in
 *  the runtime, `document` and `alert` do not. */
const NODE_LIBS = ["lib.es2022.d.ts", "lib.webworker.d.ts"];

export function compilerOptionsFor(
  ts: typeof tsModule,
  env: TsEnvironment,
): tsModule.CompilerOptions {
  const base: tsModule.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    // almostnode executes CommonJS output; Node10 resolution makes
    // `./utils` find /utils.ts without package.json machinery.
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    allowJs: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    // Only changes how .tsx/.jsx parse; the JS/TS adapters are unaffected.
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
    // The teaching default. A playground that accepts
    // `const n: number = "hello"` teaches the opposite of how TypeScript
    // works, which is the whole reason the TypeScript playground exists.
    strict: true,
    skipLibCheck: true,
  };
  return env === "node" ? { ...base, lib: NODE_LIBS } : base;
}

/** Lib files to fetch for an environment, as seeds for their reference
 *  closure. */
export function libSeedsFor(ts: typeof tsModule, env: TsEnvironment): string[] {
  const options = compilerOptionsFor(ts, env);
  return options.lib && options.lib.length > 0
    ? [...options.lib]
    : [ts.getDefaultLibFileName(options)];
}

/** Path of the browser playgrounds' ambient declarations. */
export const BROWSER_AMBIENT_TYPES_PATH = "/__pg/browser-globals.d.ts";

/**
 * A bare import in the React playground resolves to a pinned esm.sh URL at
 * bundle time, so the package is real at runtime but has no typings here
 * unless they were fetched. Without this, importing `clsx` would be
 * reported as a missing module: an error about the checker's own reach,
 * not about the reader's program. Concrete typings (React's) still win.
 */
export const BROWSER_AMBIENT_TYPES = `declare module "*";\n`;

/** Declarations mounted on top of the workspace: the Node surface for the
 *  playgrounds that run on almostnode, an escape hatch for un-typed npm
 *  imports for the browser ones. */
export function ambientFilesFor(env: TsEnvironment): Array<[string, string]> {
  return env === "node"
    ? [[NODE_AMBIENT_TYPES_PATH, NODE_AMBIENT_TYPES]]
    : [[BROWSER_AMBIENT_TYPES_PATH, BROWSER_AMBIENT_TYPES]];
}

/** Files worth analysing; data files in a workspace are not TypeScript. */
export const ANALYZABLE_SOURCE_RE = /\.(ts|tsx|js|jsx|mjs|cjs)$/i;

/** Cap so a file with hundreds of cascading errors can't flood the pane. */
export const MAX_DIAGNOSTICS = 100;

/** `ts.Diagnostic` → something printable, with the location tsc reports. */
export function toDiagnosticMessages(
  ts: typeof tsModule,
  diagnostics: readonly tsModule.Diagnostic[],
  fallbackPath: string,
): TsDiagnosticMessage[] {
  const categories: Record<number, TsDiagnosticMessage["category"]> = {
    [ts.DiagnosticCategory.Error]: "error",
    [ts.DiagnosticCategory.Warning]: "warning",
    [ts.DiagnosticCategory.Suggestion]: "suggestion",
    [ts.DiagnosticCategory.Message]: "message",
  };
  return diagnostics.map((d) => {
    const position = d.file
      ? ts.getLineAndCharacterOfPosition(d.file, d.start ?? 0)
      : { line: 0, character: 0 };
    return {
      file: d.file?.fileName ?? fallbackPath,
      line: position.line + 1,
      column: position.character + 1,
      code: d.code,
      category: categories[d.category] ?? "error",
      message: ts.flattenDiagnosticMessageText(d.messageText, "\n  "),
    };
  });
}
