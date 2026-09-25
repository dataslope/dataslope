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
import { normalizeStdin } from "../app/_components/runtime/stdinFile";
import { eachTag, propString, propText } from "../scripts/lib/mdx-blocks.mjs";

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

/**
 * Every `stdin` prop authored on a `<CodeBlock>` or `<ChallengeCard>`, read in
 * one pass over the corpus. (Asking the sweep's extractors per adapter walks
 * every lesson once per adapter, which was most of this file's runtime.)
 */
const authored = (["CodeBlock", "ChallengeCard"] as const).flatMap((tag) =>
  [...eachTag(tag)]
    .filter((t) => !t.unterminated)
    .map((t) => ({
      where: `${t.file}:${t.line}`,
      adapter: propString(t.raw, "adapter"),
      stdin: propText(t.raw, "stdin"),
    }))
    .filter((t) => t.stdin !== undefined),
);

describe("authored stdin in content", () => {
  it("parses the prop out of the MDX", () => {
    // A silent parse failure here is the dangerous one: the sweep would run
    // every stdin block on an empty stream and report it as passing.
    expect(
      authored.filter((b) => STDIN_ADAPTERS.includes(b.adapter)).length,
      "no stdin prop found on any c/cpp/java/csharp block or card",
    ).toBeGreaterThan(0);
  });

  it("is never authored on an adapter that cannot be fed", () => {
    // `<CodeBlock>` ignores the prop off a supporting adapter, so this would
    // not crash — it would just quietly render a lesson whose input never
    // arrives, which is the failure this whole panel exists to remove.
    const stray = authored
      .filter((b) => !STDIN_ADAPTERS.includes(b.adapter))
      .map((b) => `${b.where} [${b.adapter}]`);
    expect(stray, `stdin on an adapter without supportsStdin:\n${stray.join("\n")}`).toEqual([]);
  });

  it("never carries a trailing newline", () => {
    // Staging terminates the last line, so a trailing newline in the prop is
    // the empty row the panel then draws under the real input.
    const trailing = authored.filter((b) => b.stdin.endsWith("\n")).map((b) => b.where);
    expect(trailing, `stdin ending in a newline:\n${trailing.join("\n")}`).toEqual([]);
  });
});

describe("normalizeStdin", () => {
  it("terminates the last line", () => {
    // The panel draws line numbers, so its last line has to be a line: a
    // `fgets` loop that drops the final entry because the author forgot a
    // `\n` gets blamed on the lesson's code.
    expect(normalizeStdin("30")).toBe("30\n");
    expect(normalizeStdin("a\nb")).toBe("a\nb\n");
    // …exactly once: `stdin={`30\n`}` once showed an empty line 2 under a
    // one-line input.
    expect(normalizeStdin("30\n")).toBe("30\n");
  });

  it("leaves empty input empty", () => {
    // Handing a program one newline is not the same as handing it nothing:
    // `getchar()` returns the newline and then EOF, rather than EOF at once.
    expect(normalizeStdin("")).toBe("");
  });
});
