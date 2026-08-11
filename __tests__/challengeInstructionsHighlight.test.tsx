/**
 * Syntax highlighting for fenced code in a challenge card's instructions.
 *
 * The instructions pipeline used to run `remarkGfm` alone, so a card that
 * spelled out a pandas one-liner rendered it as an unstyled grey box while the
 * same snippet in a multiple-choice question — which has always had
 * `rehypeHighlight` — came out colored.
 *
 * The half of this that is easy to get wrong is the *language*. `detect` is
 * off, because auto-detection on a two-line sample is a coin flip, so every
 * fence names its own language and the tests at the bottom hold the corpus to
 * that. An author who forgets gets `text`, which is the safe default: of the
 * 89 fences that once carried no info string, 87 were samples of what the
 * program prints rather than code.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { eachTag, propText } from "../scripts/lib/mdx-blocks.mjs";
import {
  labelBareFences,
  renderMarkdownInstructions,
} from "@/app/_components/challengeShared";

const html = (source: string) =>
  renderToStaticMarkup(<>{renderMarkdownInstructions(source)}</>);

describe("labelBareFences", () => {
  it("labels an unlabelled opening fence `text`", () => {
    expect(labelBareFences("```\nHello, Grace!\n```")).toBe(
      "```text\nHello, Grace!\n```",
    );
  });

  it("leaves the closing fence alone", () => {
    expect(labelBareFences("```\nx\n```").split("\n")[2]).toBe("```");
  });

  it("keeps a language the author already wrote", () => {
    const src = "```python\nheavy = df.head()\n```";
    expect(labelBareFences(src)).toBe(src);
  });

  it("handles two blocks in one instructions string", () => {
    expect(labelBareFences("```\na\n```\n\ntext\n\n```sql\nb\n```")).toBe(
      "```text\na\n```\n\ntext\n\n```sql\nb\n```",
    );
  });

  it("does not touch a fence inside an already-open block", () => {
    expect(labelBareFences("```\n```\n```\n```").split("\n")).toEqual([
      "```text",
      "```",
      "```text",
      "```",
    ]);
  });

  it("is a no-op with no fences", () => {
    expect(labelBareFences("just `prose`")).toBe("just `prose`");
  });
});

describe("renderMarkdownInstructions", () => {
  // The exact snippet from the polars-vs-pandas card that reported this.
  const pandasCard = `Write the Polars equivalent of this pandas expression:

\`\`\`python
heavy = df[df["body_mass_g"] > 5000][["species", "body_mass_g"]]
\`\`\``;

  it("highlights a labelled fence", () => {
    const out = html(pandasCard);
    expect(out).toContain("language-python");
    expect(out).toContain("hljs-");
  });

  it("renders an unlabelled fence plain rather than guessing at it", () => {
    // `SELECT 1 FROM t` is valid in several grammars. With `detect` off and
    // the fallback at `text`, nothing is guessed and nothing is colored.
    const out = html("```\nSELECT 1 FROM t\n```");
    expect(out).toContain("language-text");
    expect(out).not.toContain("hljs-");
  });

  it("uses the language the fence names", () => {
    expect(html("```sql\nSELECT 1 FROM t\n```")).toContain("language-sql");
    expect(html("```r\nx <- 1\n```")).toContain("language-r");
  });

  it("leaves inline code as an identifier, not a highlighted span", () => {
    const out = html("The frame `df` is loaded for you.");
    expect(out).toContain("<code>df</code>");
    expect(out).not.toContain("hljs");
  });

  it("still renders GFM", () => {
    expect(html("- one\n- two")).toContain("<li>");
    expect(html("**bold**")).toContain("<strong>");
  });

  it("renders a `text` fence with no tokens at all", () => {
    // What an expected-output sample is labelled. `text` is a registered
    // plaintext alias, so this does not lean on `ignoreMissing`.
    const out = html("```text\nHello, Grace!\n```");
    expect(out).toContain("Hello, Grace!");
    expect(out).not.toContain("hljs-");
  });
});

/**
 * Every fence in a card's instructions names its language.
 *
 * `labelBareFences` exists for the author who forgets, but it should stay a
 * fallback: it cannot tell an expected-output sample from a code snippet, and
 * only the author can. Labelling in the source says which is which where it
 * can be seen and reviewed.
 */
describe("challenge card instructions name their fence languages", () => {
  const fences: { file: string; line: number; lang: string }[] = [];
  for (const tag of ["ChallengeCard", "SqlChallengeCard"]) {
    for (const { file, line, raw, unterminated } of eachTag(tag)) {
      if (unterminated) continue;
      const instructions = propText(raw, "instructions");
      if (!instructions) continue;
      let open = false;
      for (const l of instructions.split("\n")) {
        const m = /^ {0,3}(?:`{3,}|~{3,})\s*(\S*)/.exec(l);
        if (!m) continue;
        if (!open) fences.push({ file, line, lang: m[1] });
        open = !open;
      }
    }
  }

  it("finds the fenced blocks", () => {
    expect(fences.length).toBeGreaterThan(80);
  });

  it("leaves none of them unlabelled", () => {
    const bare = fences.filter((f) => !f.lang);
    const report = bare.map((f) => `  ${f.file}:${f.line}`).join("\n");
    expect(
      bare,
      `fenced blocks in card instructions with no language:\n${report}\n\n` +
        "Use ```text for a sample of what the program prints, or the card's " +
        "own language for a code snippet.",
    ).toEqual([]);
  });

  it("only uses languages the card renderer can highlight", () => {
    // `text` is plaintext; the rest have to be grammars highlight.js ships.
    const known = new Set([
      "text",
      "python",
      "r",
      "javascript",
      "js",
      "typescript",
      "ts",
      "php",
      "c",
      "cpp",
      "java",
      "csharp",
      "sql",
      "xml",
      "html",
      "css",
      "json",
      "bash",
    ]);
    const unknown = fences.filter((f) => f.lang && !known.has(f.lang));
    expect(unknown.map((f) => `${f.file}:${f.line} ${f.lang}`)).toEqual([]);
  });
});
