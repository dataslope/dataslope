// The /playground hub advertises a version caption per language, and each
// adapter separately declares runtimeInfo.version; nothing tied the two
// together and they drifted badly (e.g. Python 3.12 vs Pyodide's 3.14).
// These tests re-derive each caption from the source the runtime actually
// loads. Captions are short (major.minor or dialect), so the rule is "caption
// is a prefix of the authoritative version", not equality.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

/** The `{ id, label, version }` tiles from the /playground hub. */
function hubVersions(): Record<string, string> {
  const src = read("app/playground/_components/LanguageCategories.tsx");
  const out: Record<string, string> = {};
  const re =
    /\{\s*id:\s*"([^"]+)",\s*label:\s*"[^"]*",\s*version:\s*"([^"]*)"\s*\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out[m[1]] = m[2];
  return out;
}

/** A named constant's string value from a runtime module. */
function constant(rel: string, name: string): string {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]+)"`).exec(read(rel));
  if (!m) throw new Error(`${name} not found in ${rel}`);
  return m[1];
}

/** An adapter's `runtimeInfo.version` literal, when it is a plain string. */
function adapterVersion(rel: string): string {
  const src = read(rel);
  const m = /runtimeInfo:\s*\{[^}]*?version:\s*"([^"]+)"/s.exec(src);
  if (!m) throw new Error(`runtimeInfo.version not found in ${rel}`);
  return m[1];
}

/** Strip a leading "v" and any non-numeric prefix noise. */
function digits(value: string): string {
  return value.replace(/^v/, "");
}

/** Assert `full` begins with `caption`, naming both in the failure. */
function expectStartsWith(full: string, caption: string, what: string): void {
  expect(
    full.startsWith(caption),
    `${what}: /playground says "${caption}" but the runtime reports "${full}"`,
  ).toBe(true);
}

const hub = hubVersions();

describe("/playground version captions", () => {
  it("lists a caption for every playground tile", () => {
    // A sanity floor: if the regex stops matching, every assertion below
    // would vacuously pass.
    expect(Object.keys(hub).length).toBeGreaterThanOrEqual(14);
  });

  it("Python matches the Pyodide build actually loaded", () => {
    // Pyodide's version tracks the CPython it embeds: v314.x ships 3.14.
    const pyodide = digits(
      constant("app/_components/runtime/pyodide-worker.ts", "PYODIDE_VERSION"),
    );
    const major = pyodide.slice(0, 1);
    const minor = pyodide.slice(1, 3).replace(/^0/, "");
    expect(hub.python).toBe(`${major}.${minor}`);
    expectStartsWith(
      adapterVersion("app/_components/runtime/python.tsx"),
      hub.python,
      "python",
    );
  });

  it("TypeScript matches the compiler pin in cdn.ts", () => {
    const pinned = constant("app/_components/runtime/cdn.ts", "TYPESCRIPT_VERSION");
    expectStartsWith(pinned, hub.typescript, "typescript");
  });

  it("React matches REACT_VERSION", () => {
    const pinned = constant("app/_components/runtime/esmResolve.ts", "REACT_VERSION");
    expectStartsWith(pinned, hub.react, "react");
  });

  it("SQLite matches the sqlite-wasm pin", () => {
    const pinned = constant(
      "app/_components/runtime/sqlite-wasm.ts",
      "SQLITE_WASM_VERSION",
    );
    expectStartsWith(pinned, hub.sqlite, "sqlite");
  });

  it("DuckDB matches DUCKDB_VERSION", () => {
    const pinned = constant("app/_components/runtime/duckdb.ts", "DUCKDB_VERSION");
    expectStartsWith(pinned, hub.duckdb, "duckdb");
  });

  // The rest have no separate pin: the adapter's runtimeInfo is the
  // authoritative statement, so the hub must agree with it.
  const FROM_ADAPTER: Array<[string, string]> = [
    ["r", "app/_components/runtime/r.tsx"],
    ["php", "app/_components/runtime/php.tsx"],
    ["java", "app/_components/runtime/java.tsx"],
    ["csharp", "app/_components/runtime/csharp.tsx"],
    ["javascript", "app/_components/runtime/javascript.tsx"],
  ];

  for (const [id, rel] of FROM_ADAPTER) {
    it(`${id} agrees with its adapter's runtimeInfo`, () => {
      const declared = adapterVersion(rel);
      // The hub caption may add context the adapter omits (".NET 10"), so
      // compare on the leading version token of each.
      const token = (value: string) => value.split(/[\s·(]/)[0];
      expectStartsWith(token(declared), token(hub[id]), id);
    });
  }

  it("C and C++ match the compiler's -std flags", () => {
    const worker = read("app/_components/runtime/browsercc-worker.ts");
    expect(worker).toContain('"-std=gnu17"');
    expect(worker).toContain('"-std=c++20"');
    expect(hub.c).toBe("C17");
    expect(hub.cpp).toBe("C++20");
  });
});
