/**
 * Type checking for the TypeScript playground, against the real compiler.
 *
 * The playground used to run `ts.transpileModule`, which strips types
 * without checking them, so `const n: number = "hello"` ran happily — the
 * one thing a TypeScript playground exists to catch. These assert the
 * configuration the language-service worker analyses with: what it reports,
 * where it says the error is, and just as importantly what it does *not*
 * report for a program using Node's shimmed modules.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import * as ts from "typescript";
import { describe, expect, it } from "vitest";

import {
  ambientFilesFor,
  compilerOptionsFor,
  libSeedsFor,
  toDiagnosticMessages,
  type TsDiagnosticMessage,
  type TsEnvironment,
} from "../app/_components/runtime/tsAnalysisConfig";

const require_ = createRequire(import.meta.url);
const LIB_DIR = path.dirname(require_.resolve("typescript"));

/** The lib files the worker fetches from the CDN, read off disk instead. */
function loadLibClosure(seeds: string[]): Map<string, string> {
  const files = new Map<string, string>();
  const pending = [...seeds];
  while (pending.length > 0) {
    const name = pending.pop() as string;
    const key = `/__lib/${name}`;
    if (files.has(key)) continue;
    const text = readFileSync(path.join(LIB_DIR, name), "utf8");
    files.set(key, text);
    for (const match of text.matchAll(/\/\/\/\s*<reference\s+lib="([^"]+)"/g)) {
      pending.push(`lib.${match[1]}.d.ts`);
    }
  }
  return files;
}

/** A language service over an in-memory workspace, wired exactly as
 *  ts-language-worker.ts wires its own. */
function analyze(
  files: Array<[string, string]>,
  env: TsEnvironment = "node",
  semantic = true,
): TsDiagnosticMessage[] {
  const libs = loadLibClosure(libSeedsFor(ts, env));
  const scripts = new Map<string, string>([
    ...files.map(([p, c]) => [p.startsWith("/") ? p : `/${p}`, c] as [string, string]),
    ...ambientFilesFor(env),
  ]);
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...scripts.keys()],
    getScriptVersion: () => "1",
    getScriptSnapshot: (f) => {
      const content = scripts.get(f) ?? libs.get(f);
      return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content);
    },
    getCurrentDirectory: () => "/",
    getCompilationSettings: () => compilerOptionsFor(ts, env),
    getDefaultLibFileName: (opts) => `/__lib/${opts.lib?.[0] ?? ts.getDefaultLibFileName(opts)}`,
    fileExists: (f) => scripts.has(f) || libs.has(f),
    readFile: (f) => scripts.get(f) ?? libs.get(f),
    readDirectory: () => [],
    directoryExists: () => true,
    getDirectories: () => [],
  };
  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const out: TsDiagnosticMessage[] = [];
  for (const [rawPath] of files) {
    const file = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    out.push(
      ...toDiagnosticMessages(
        ts,
        [
          ...service.getSyntacticDiagnostics(file),
          ...(semantic ? service.getSemanticDiagnostics(file) : []),
        ],
        file,
      ),
    );
  }
  return out;
}

describe("type checking", () => {
  it("reports the type errors tsc reports, with locations", () => {
    const source = [
      `const n: number = "not a number";`,
      `const arr: string[] = [1, 2, 3];`,
      `const f = (x: number): string => x;`,
    ].join("\n");
    const diagnostics = analyze([["index.ts", source]]);
    // TS2322 for each: the string, each element of the array literal, and
    // the arrow's return type.
    expect(new Set(diagnostics.map((d) => d.code))).toEqual(new Set([2322]));
    expect(diagnostics[0].line).toBe(1);
    expect(diagnostics[0].column).toBe(7);
    expect(diagnostics[0].message).toMatch(/not assignable/);
    expect(new Set(diagnostics.map((d) => d.line))).toEqual(new Set([1, 2, 3]));
  });

  it("is strict: null is not assignable to undefined", () => {
    const diagnostics = analyze([["index.ts", `const u: undefined = null;`]]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe(2322);
  });

  it("rejects an excess property in an object literal", () => {
    const diagnostics = analyze([["index.ts", `const o: { a: number } = { a: 1, b: 2 };`]]);
    expect(diagnostics.map((d) => d.code)).toContain(2353);
  });

  it("checks across files in a workspace", () => {
    const diagnostics = analyze([
      ["lib.ts", `export function double(n: number): number { return n * 2; }`],
      ["index.ts", `import { double } from "./lib";\ndouble("nope");`],
    ]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].file).toBe("/index.ts");
    expect(diagnostics[0].line).toBe(2);
  });

  it("accepts a clean program", () => {
    expect(
      analyze([["index.ts", `const n: number = 42;\nconsole.log(n.toFixed(2));`]]),
    ).toEqual([]);
  });

  it("reports a parse error with its position", () => {
    const diagnostics = analyze([["index.ts", `console.log("before");\nconst broken: = 5;`]]);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].line).toBe(2);
    expect(diagnostics[0].message).toMatch(/Type expected/);
  });

  it("locates a parse error in JavaScript without checking types", () => {
    const diagnostics = analyze(
      [["index.js", `console.log("ok");\nthis is ( not js`]],
      "node",
      false,
    );
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].line).toBe(2);
  });
});

describe("the Node environment", () => {
  it("knows the globals almostnode provides", () => {
    const source = [
      `const fs = require("fs");`,
      `fs.writeFileSync("out.txt", "hi");`,
      `import path from "node:path";`,
      `console.log(path.join(__dirname, process.cwd()), Buffer.from("x"), module.exports);`,
      `setImmediate(() => process.stdout.write("done"));`,
      `const t: string = new TextDecoder().decode(new Uint8Array());`,
    ].join("\n");
    expect(analyze([["index.ts", source]])).toEqual([]);
  });

  it("does not offer browser globals that do not exist at runtime", () => {
    const diagnostics = analyze([
      ["index.ts", `alert("hi");\ndocument.querySelector("body");\nnew ActiveXObject();`],
    ]);
    // One "Cannot find name" each: none of these exist in the worker.
    expect(diagnostics).toHaveLength(3);
    for (const d of diagnostics) expect(d.message).toMatch(/Cannot find name/);
  });

  it("still has the worker globals that do exist", () => {
    expect(
      analyze([["index.ts", `void fetch("https://example.com");\nqueueMicrotask(() => {});`]]),
    ).toEqual([]);
  });

  it("keeps the DOM for the browser playgrounds", () => {
    expect(analyze([["index.ts", `document.title = "hi";`]], "dom")).toEqual([]);
  });
});
