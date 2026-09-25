/**
 * No client code may import the challenge catalog.
 *
 * `lib/challenges/index.ts` imports every authored challenge module, and each
 * of those calls a builder at load time. A bundler cannot prove those calls
 * pure, so any client module that imports a *value* from `@/lib/challenges`,
 * even a label map, pulls the whole catalog into the browser. Measured on a
 * production build with 300 challenges, that was a 1.1 MB chunk (300 KB
 * gzipped) loaded by the workspace and the catalog list, which need neither
 * the prompts nor the reference solutions of any challenge but the one on
 * screen.
 *
 * Client code imports from `@/lib/challenges/types`, `/steps` and
 * `/progress` instead, which carry no challenge content. This walks the
 * import graph from every `"use client"` module, so an indirect import
 * through a shared helper is caught too. Type-only imports are erased and
 * therefore allowed.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..");
const BARREL = join(ROOT, "lib/challenges/index.ts");

function walkDir(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkDir(full, out);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Specifiers this module imports or re-exports at runtime. */
function valueImports(source: string): string[] {
  const specs: string[] = [];
  const re =
    /(?:^|\n)\s*(import|export)\s+(type\s+)?([^;]*?)\s*from\s*["']([^"']+)["']|(?:^|\n)\s*import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    if (m[5]) specs.push(m[5]);
    else if (m[6]) specs.push(m[6]);
    else if (!m[2]) {
      // `import { type A, type B } from` is erased too.
      const clause = m[3].trim();
      const named = clause.match(/^\{([\s\S]*)\}$/);
      if (named && named[1].split(",").every((p) => !p.trim() || /^type\s/.test(p.trim()))) {
        continue;
      }
      specs.push(m[4]);
    }
  }
  return specs;
}

function isClientModule(source: string): boolean {
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(source);
}

describe("challenge catalog stays out of client bundles", () => {
  const files: string[] = [];
  for (const dir of ["app", "components"]) walkDir(join(ROOT, dir), files);
  const clientEntries = files.filter((f) => isClientModule(readFileSync(f, "utf8")));

  it("finds client modules to check", () => {
    expect(clientEntries.length).toBeGreaterThan(0);
  });

  it("never reaches lib/challenges/index.ts from a client module", () => {
    const seen = new Map<string, string | null>();
    const offenders: string[] = [];
    const stack = clientEntries.map((f) => ({ file: f, via: [relative(ROOT, f)] }));
    while (stack.length) {
      const { file, via } = stack.pop()!;
      if (seen.has(file)) continue;
      seen.set(file, null);
      for (const spec of valueImports(readFileSync(file, "utf8"))) {
        const target = resolveImport(file, spec);
        if (!target) continue;
        if (target === BARREL) {
          offenders.push(via.join(" → "));
          continue;
        }
        stack.push({ file: target, via: [...via, relative(ROOT, target)] });
      }
    }
    expect(offenders, `client code imports the challenge catalog:\n${offenders.join("\n")}`).toEqual([]);
  });
});
