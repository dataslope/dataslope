/**
 * Runtimes whose JS glue ships from npm while their WASM binary is fetched
 * from a CDN are one build split across two places. If the version in the URL
 * and the version npm installed drift apart, nothing degrades gracefully:
 * wasm-bindgen instantiation fails with a LinkError naming a `__wbg_*` symbol
 * and the whole feature is dead.
 *
 * That is not hypothetical. `parquet-wasm` was declared as `^0.7.1` while the
 * URL said `0.7.1`; npm resolved 0.7.2, and every parquet import and export in
 * the SQL playgrounds failed with
 *
 *     WebAssembly.instantiate(): Import #32 "wbg"
 *     "__wbg_slice_224856d46230c13c": function import requires a callable
 *
 * These tests re-derive each pin from the source that builds the URL and
 * compare it against the version in package-lock.json, which is what a
 * `npm ci` actually installs.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

/** A named string constant's value from a source module. */
function constant(rel: string, name: string): string {
  const m = new RegExp(`${name}\\s*=\\s*"([^"]+)"`).exec(read(rel));
  if (!m) throw new Error(`${name} not found in ${rel}`);
  return m[1];
}

interface LockFile {
  packages: Record<string, { version?: string } | undefined>;
}

/** The version `npm ci` installs for a dependency. */
function lockedVersion(pkg: string): string {
  const lock = JSON.parse(read("package-lock.json")) as LockFile;
  const entry = lock.packages[`node_modules/${pkg}`];
  if (!entry?.version) throw new Error(`${pkg} not found in package-lock.json`);
  return entry.version;
}

/** The range declared in package.json, which decides whether npm is free to
 *  move the installed version out from under a pinned URL. */
function declaredRange(pkg: string): string {
  const manifest = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const range =
    manifest.dependencies?.[pkg] ?? manifest.devDependencies?.[pkg];
  if (!range) throw new Error(`${pkg} is not a dependency`);
  return range;
}

/** Each CDN-fetched runtime: the npm package, and the constant that builds
 *  its URL. */
const PINS: { pkg: string; file: string; name: string }[] = [
  {
    pkg: "parquet-wasm",
    file: "app/_components/runtime/cdn.ts",
    name: "PARQUET_WASM_VERSION",
  },
  {
    pkg: "@electric-sql/pglite",
    file: "app/_components/runtime/cdn.ts",
    name: "PGLITE_VERSION",
  },
  {
    pkg: "@sqlite.org/sqlite-wasm",
    file: "app/_components/runtime/cdn.ts",
    name: "SQLITE_WASM_VERSION",
  },
  {
    // Not split glue/binary like the rest, but the same drift in a different
    // costume: the browser loads this pin while the block-output generator
    // executes lessons on the npm package, so a mismatch means a lesson's
    // prepopulated output came from a different Python than the reader's Run.
    pkg: "pyodide",
    file: "app/_components/runtime/cdn.ts",
    name: "PYODIDE_VERSION",
  },
  {
    pkg: "wasm-xlsxwriter",
    file: "app/_components/runtime/cdn.ts",
    name: "WASM_XLSXWRITER_VERSION",
  },
  {
    pkg: "typescript",
    file: "app/_components/runtime/cdn.ts",
    name: "TYPESCRIPT_VERSION",
  },
];

describe("CDN version pins match the installed packages", () => {
  for (const { pkg, file, name } of PINS) {
    it(`${name} matches the ${pkg} in package-lock.json`, () => {
      const pinned = constant(file, name);
      const locked = lockedVersion(pkg);
      expect(
        pinned,
        `${name} in ${file} is "${pinned}" but npm installs ${pkg}@${locked}. ` +
          `Bump the constant and the dependency together.`,
      ).toBe(locked);
    });
  }

  it("builds the parquet URL from the pin rather than a second literal", () => {
    const src = read("app/_components/runtime/cdn.ts");
    expect(src).toContain("parquet-wasm@${PARQUET_WASM_VERSION}");
    // Nothing else may hard-code a parquet-wasm version.
    const loader = read("app/_components/sql/utils/parquetWasm.ts");
    expect(loader).not.toMatch(/parquet-wasm@[\d.]+/);
    expect(loader).toContain("PARQUET_WASM_CDN");
  });

  it("pins one browsercc toolchain for the browser and both headless runners", () => {
    // The C/C++ block-output generator and content sweep compile lessons with
    // their own download of the toolchain; a different clang there would
    // record output the reader's Run does not reproduce.
    const worker = "app/_components/runtime/browsercc-worker.ts";
    for (const name of ["BROWSERCC_VERSION", "WASI_SHIM_VERSION"]) {
      const pinned = constant(worker, name);
      for (const script of ["scripts/check-cpp-blocks.mjs", "scripts/lib/block-runners.mjs"]) {
        expect(constant(script, name), `${name} in ${script}`).toBe(pinned);
      }
    }
  });

  it("names the webR that npm installs in the R adapter's engine label", () => {
    // webR is bundled from npm and fetches its R build from its own versioned
    // base URL, so the lockfile is the version that runs.
    const src = read("app/_components/runtime/r.tsx");
    const label = /engine:\s*"WebR ([^"]+)"/.exec(src)?.[1];
    expect(label).toBe(lockedVersion("webr"));
  });

  for (const pkg of ["parquet-wasm", "wasm-xlsxwriter"]) {
    it(`pins ${pkg} exactly, since its glue and binary must be one build`, () => {
      // A caret range lets `npm update` move the glue while the URL stays
      // put, which is exactly how the LinkError above got shipped.
      expect(declaredRange(pkg)).toBe(lockedVersion(pkg));
    });
  }
});
