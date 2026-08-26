/**
 * The STDIN panel `<CodeBlock stdin={…}>` renders, and the pieces that have
 * to agree about it.
 *
 * Three separate things read the prop and they fail differently when they
 * drift. `blockOutputKey` files the prepopulated output: get it wrong and a
 * lesson shows a panel produced from different input than the one on screen,
 * which is worse than showing nothing because nothing tells the reader which
 * to believe. `LanguageAdapter.supportsStdin` gates the panel: get it wrong
 * and a reader types into a box that cannot reach the program. And the
 * content sweep only feeds `stdin` to blocks it can parse it out of.
 */
import { describe, it, expect } from "vitest";
import { vi } from "vitest";

import { blockOutputKey } from "../lib/blockOutputKey";
import { extractBlocks } from "../scripts/lib/mdx-blocks.mjs";

// Adapters reference React JSX (packagesFooter); stub React so they import
// in Node without a renderer, exactly as adapters.test.ts does.
vi.mock("react", () => ({ default: { createElement: () => null } }));

/** Adapters whose runtime reads a staged `stdin.txt`. */
const STDIN_ADAPTERS = ["c", "cpp", "java", "csharp"];

describe("blockOutputKey with stdin", () => {
  it("changes when the input changes", () => {
    // The whole reason stdin is in the fingerprint: one program, two inputs,
    // two different recorded panels.
    expect(blockOutputKey("c", undefined, "scanf(...)", "30")).not.toBe(
      blockOutputKey("c", undefined, "scanf(...)", "31"),
    );
  });

  it("leaves the key of a block without stdin untouched", () => {
    // Every block that predates the panel must keep the key it already has,
    // or the first deploy blanks every prepopulated panel on the site.
    expect(blockOutputKey("python", "import x", "print(1)")).toBe("ca41ad2b");
    expect(blockOutputKey("c", undefined, "int main(void) {}")).toBe("b8feb05b");
  });

  it("distinguishes no panel from an empty panel", () => {
    // `stdin=""` is a block that offers the reader an empty box and runs on
    // no input; an absent prop is a block with no box at all. Both run on
    // nothing, but only one of them can have its input edited, so they are
    // not the same block and must not share an entry.
    expect(blockOutputKey("c", undefined, "x")).not.toBe(
      blockOutputKey("c", undefined, "x", ""),
    );
  });

  it("does not collide across the stdin boundary", () => {
    expect(blockOutputKey("c", undefined, "ab", "c")).not.toBe(
      blockOutputKey("c", undefined, "a", "bc"),
    );
  });
});

describe("supportsStdin", () => {
  it("is set exactly on the adapters whose runtime reads stdin.txt", async () => {
    const adapters = await import("../app/_components/runtime/adapters");
    const withStdin = Object.entries(adapters.ADAPTERS)
      .filter(([, a]) => a.supportsStdin === true)
      .map(([id]) => id)
      .sort();
    expect(withStdin).toEqual([...STDIN_ADAPTERS].sort());
  });
});

describe("authored stdin in content", () => {
  const authored = STDIN_ADAPTERS.flatMap((adapter) =>
    extractBlocks(undefined, adapter)
      .filter((b) => !b.unparsable && b.stdin !== undefined)
      .map((b) => ({ ...b, adapter })),
  );

  it("parses the prop out of the MDX", () => {
    // A silent parse failure here is the dangerous one: the sweep would run
    // every stdin block on an empty stream and report it as passing.
    expect(authored.length).toBeGreaterThan(0);
    for (const b of authored) {
      expect(typeof b.stdin, `${b.file}:${b.line}`).toBe("string");
    }
  });

  it("is never authored on an adapter that cannot be fed", () => {
    // `<CodeBlock>` ignores the prop off a supporting adapter, so this would
    // not crash — it would just quietly render a lesson whose input never
    // arrives, which is the failure this whole panel exists to remove.
    const NON_STDIN = ["python", "r", "javascript", "typescript", "php", "web", "react"];
    const stray = NON_STDIN.flatMap((adapter) =>
      extractBlocks(undefined, adapter)
        .filter((b) => !b.unparsable && b.stdin !== undefined)
        .map((b) => `${b.file}:${b.line} [${adapter}]`),
    );
    expect(stray).toEqual([]);
  });
});
