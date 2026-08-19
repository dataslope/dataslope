/**
 * The bundled multi-file examples, compiled for real.
 *
 * These are the workspaces the audit followed one step further and watched
 * collapse, so they are the natural regression guard for how a workspace
 * becomes a translation unit. browsercc's clang is unavailable here (it is
 * a ~95 MB CDN download), but it is the same compiler built for wasm, so a
 * host clang answers the question this test asks: does the composed unit
 * still compile, and does it name the reader's files.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cppAdapter } from "../app/_components/runtime/cpp";
import { cAdapter } from "../app/_components/runtime/c";
import { composeTranslationUnit } from "../app/_components/runtime/browserccBuild";

describe("bundled multi-file examples still build", () => {
  const haveClang = (() => {
    try { execFileSync("clang", ["--version"], { stdio: "pipe" }); return true; } catch { return false; }
  })();

  for (const [label, adapter, lang, std] of [
    ["C", cAdapter, "c", "-std=gnu17"],
    ["C++", cppAdapter, "cpp", "-std=c++20"],
  ] as const) {
    it.skipIf(!haveClang)(`${label}`, () => {
      const examples = adapter.examples ?? [];
      let checked = 0;
      for (const ex of examples) {
        // `code` is the entry; `files` are the extra ones alongside it.
        if (!ex.files || ex.files.length === 0) continue;
        const entry = ex.entryFilename ?? (lang === "c" ? "main.c" : "main.cpp");
        const unit = composeTranslationUnit({
          language: lang,
          entryPath: entry,
          entryCode: ex.code,
          files: ex.files.map((f) => [f.filename, f.content] as [string, string]),
        });
        const dir = mkdtempSync(join(tmpdir(), "ds-ex-"));
        for (const [p, c] of Object.entries(unit.extraFiles)) writeFileSync(join(dir, p), c);
        writeFileSync(join(dir, unit.fileName), unit.source);
        const r = spawnSync("clang", ["-fsyntax-only", std, "-Wall", unit.fileName], { cwd: dir, encoding: "utf8" });
        console.log(`\n[${label}] ${ex.title}: exit=${r.status}\n${r.stderr || "(clean)"}`);
        expect(r.status, `${ex.title}\n${r.stderr}`).toBe(0);
        checked += 1;
      }
      expect(checked, "no multi-file example was compiled").toBeGreaterThan(0);
    });
  }
});
