// Pins the freshness rules every content generator now sits behind
// (scripts/lib/build-cache.mjs). The failure mode this guards is the quiet
// one: a cache that says "fresh" when an input moved doesn't crash, it serves
// yesterday's search index, yesterday's Markdown mirrors, and yesterday's
// image dimensions, and the first person to notice is a reader.
//
// The two tiers are asserted separately, because they answer different
// questions: the stat tier is what makes the check cheap, and the content tier
// is what keeps it honest when a clone or a branch switch rewrites every mtime
// without changing a byte.
import { mkdtempSync, mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { freshness, readManifest } from "../scripts/lib/build-cache.mjs";

let root: string;

const write = (rel: string, body: string) => {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
  return p;
};

/** Rewrite a file's mtime without touching its bytes — a clone, a checkout, or
 *  `npm ci` doing what they do, made deterministic. */
const restamp = (p: string) => {
  const when = new Date(statSync(p).mtimeMs + 60_000);
  utimesSync(p, when, when);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "dataslope-build-cache-"));
  // The manifests live under node_modules/.cache of whatever root they're
  // given, which is what makes a temp root a complete sandbox.
  mkdirSync(join(root, "node_modules"), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("freshness", () => {
  it("is stale until something has been committed", () => {
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");

    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(false);
    freshness(root, "t", { inputs: [input], outputs: [output] }).commit();
    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(true);
  });

  it("goes stale when an input's content changes", () => {
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [input], outputs: [output] }).commit();

    writeFileSync(input, "a much longer body");
    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(false);
  });

  it("goes stale on a same-size rewrite inside one clock tick", () => {
    // The racy case, and the reason tier 1 requires the stamp to be strictly
    // newer than every input: "one" → "two" is the same three bytes, and a
    // rewrite this fast can land on the same millisecond, so size+mtime alone
    // would call it unchanged. A typo fix in a lesson is exactly this shape.
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [input], outputs: [output] }).commit();

    writeFileSync(input, "two");
    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(false);
  });

  it("stays fresh when only the mtime moved, and re-stamps so the next check is cheap", () => {
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [input], outputs: [output] }).commit();
    const before = readManifest(root, "t")!.statSig;

    restamp(input);
    // Tier 2: the stat signature no longer matches, the bytes still do.
    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(true);

    const after = readManifest(root, "t")!.statSig;
    expect(after).not.toBe(before);
    // …and the run after that is settled back on tier 1, against the new stamp.
    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(true);
    expect(readManifest(root, "t")!.statSig).toBe(after);
  });

  it("goes stale when a declared output is missing", () => {
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [input], outputs: [output] }).commit();

    rmSync(output);
    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).fresh).toBe(false);
  });

  it("goes stale when an input appears or disappears", () => {
    const a = write("a.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [a], outputs: [output] }).commit();

    const b = write("b.txt", "two");
    expect(freshness(root, "t", { inputs: [a, b], outputs: [output] }).fresh).toBe(false);
  });

  it("treats the salt as an input, for answers that depend on more than files", () => {
    // build-created-at reads git history, so its salt is HEAD: the same files
    // on a new commit must regenerate.
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [input], outputs: [output], salt: "commit-a" }).commit();

    expect(freshness(root, "t", { inputs: [input], outputs: [output], salt: "commit-a" }).fresh).toBe(true);
    expect(freshness(root, "t", { inputs: [input], outputs: [output], salt: "commit-b" }).fresh).toBe(false);
  });

  it("round-trips extra manifest data to the next run", () => {
    // How the worker bundler carries its learned esbuild input list forward.
    const input = write("in.txt", "one");
    const output = write("out.txt", "generated");
    freshness(root, "t", { inputs: [input], outputs: [output] }).commit({ bundleInputs: ["x.ts"] });

    expect(freshness(root, "t", { inputs: [input], outputs: [output] }).stored?.bundleInputs).toEqual(["x.ts"]);
  });

  it("stamps the input set discovered during the run, so the next run is a hit", () => {
    // The worker bundler's case: it is checked against last run's list, then
    // commits the closure esbuild actually reported. Without the override the
    // very next run would miss and every build would cost two.
    const guessed = write("entry.ts", "entry");
    const discovered = write("dep.ts", "dep");
    const output = write("out.js", "bundle");

    const cache = freshness(root, "t", { inputs: [guessed], outputs: [output] });
    expect(cache.fresh).toBe(false);
    cache.commit({}, [guessed, discovered]);

    expect(freshness(root, "t", { inputs: [guessed, discovered], outputs: [output] }).fresh).toBe(true);
    writeFileSync(discovered, "dep changed");
    expect(freshness(root, "t", { inputs: [guessed, discovered], outputs: [output] }).fresh).toBe(false);
  });
});
