/**
 * Guards on the precompiled React bundles: the two things that would go
 * wrong quietly rather than loudly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { ESBUILD_WASM_VERSION } from "../app/_components/runtime/cdn";
import { blockOutputKey } from "../lib/blockOutputKey";
import { extractBlocks } from "../scripts/lib/mdx-blocks.mjs";

/** The shape `extractBlocks` returns, narrowed to what these guards use. */
interface ExtractedBlock {
  file: string;
  line: number;
  entry: string;
  expectError?: boolean;
  files: { filename: string; initCode?: string; starterCode: string }[];
}

const ROOT = join(__dirname, "..");
const MANIFEST = join(ROOT, "lib/generated/react-bundles.json");

function manifest(): Record<string, Record<string, { js: string; css?: string }>> {
  return existsSync(MANIFEST)
    ? JSON.parse(readFileSync(MANIFEST, "utf8"))
    : {};
}

describe("the esbuild pin", () => {
  it("matches the devDependency the generator bundles with", () => {
    // The browser worker loads esbuild from jsDelivr at ESBUILD_WASM_VERSION;
    // the generator bundles with the npm package. A different esbuild is a
    // different bundle, and the reader would see this one in the preview and
    // produce the other one by pressing Run. The generator exits non-zero on
    // a mismatch — this fails the suite before it gets that far.
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const dep: string = pkg.devDependencies["esbuild-wasm"];
    expect(dep, "esbuild-wasm must be a devDependency").toBeTruthy();
    // Exact pin, no range: `^0.28.1` would let `npm ci` install 0.28.9 and
    // silently change every bundle on the site.
    expect(dep).toBe(ESBUILD_WASM_VERSION);
  });
});

describe("the committed manifest", () => {
  const blocks = (extractBlocks("content", "react") as ExtractedBlock[]).filter(
    (b) => !b.expectError,
  );
  const entries = manifest();

  it("covers every react block in the content tree", () => {
    // A missing entry is not an error at runtime — the block falls back to
    // the empty panel — but it means a lesson silently lost its preview, and
    // nothing else would say so.
    const missing: string[] = [];
    for (const b of blocks) {
      const entry = b.files.find((f) => f.filename === b.entry) ?? b.files[0];
      const key = blockOutputKey("react", entry.initCode, entry.starterCode);
      if (!entries[b.file]?.[key]) missing.push(`${b.file}:${b.line}`);
    }
    expect(missing, "run `npm run build:react-bundles`").toEqual([]);
  });

  it("keys entries by content hash, not by position", () => {
    // Every key in the manifest must be reachable from some block's source.
    // A leftover key is a block that was edited or deleted without the
    // generator running, and it would keep serving a stale preview.
    const live = new Set<string>();
    for (const b of blocks) {
      const entry = b.files.find((f) => f.filename === b.entry) ?? b.files[0];
      live.add(
        `${b.file}|${blockOutputKey("react", entry.initCode, entry.starterCode)}`,
      );
    }
    const stale: string[] = [];
    for (const [file, byKey] of Object.entries(entries)) {
      for (const key of Object.keys(byKey)) {
        if (!live.has(`${file}|${key}`)) stale.push(`${file}:${key}`);
      }
    }
    expect(stale, "run `npm run build:react-bundles`").toEqual([]);
  });

  it("holds bundles that kept their imports external", () => {
    // The whole reason a bundle is small enough to commit: bare imports
    // rewrite to pinned esm.sh URLs and stay external, so a bundle carries
    // the block's own code and not a copy of React. If that ever changed,
    // every entry would grow by ~300 kB and the manifest would balloon.
    const all = Object.values(entries).flatMap((byKey) => Object.values(byKey));
    expect(all.length).toBeGreaterThan(0);
    const total = all.reduce((n, e) => n + e.js.length + (e.css?.length ?? 0), 0);
    expect(total).toBeLessThan(400_000);
    for (const e of all) {
      expect(e.js).toContain("https://esm.sh/react@");
    }
  });
});
