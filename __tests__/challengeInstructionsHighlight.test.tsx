/**
 * Syntax highlighting for fenced code in a challenge card's instructions.
 *
 * The instructions pipeline used to run `remarkGfm` alone, so a card that
 * spelled out a pandas one-liner rendered it as an unstyled grey box while the
 * same snippet in a multiple-choice question — which has always had
 * `rehypeHighlight` — came out coloured.
 *
 * The half of this that is easy to get wrong is the *language*: 89 of the 96
 * fenced blocks across the site's card instructions carry no info string, and
 * highlight.js's auto-detection on a two-line sample is a coin flip. So the
 * language comes from the card's own adapter, and `detect` stays off.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { eachTag, propText } from "../scripts/lib/mdx-blocks.mjs";
import {
  hljsLanguageFor,
  renderMarkdownInstructions,
  withFenceLanguage,
} from "@/app/_components/challengeShared";

const html = (source: string, lang?: string) =>
  renderToStaticMarkup(<>{renderMarkdownInstructions(source, lang)}</>);

describe("hljsLanguageFor", () => {
  it("maps every adapter a card can declare", () => {
    // The adapters that appear on a <ChallengeCard> in content/.
    for (const id of [
      "python",
      "typescript",
      "cpp",
      "r",
      "java",
      "javascript",
      "csharp",
      "c",
      "web",
      "react",
      "php",
    ]) {
      expect(hljsLanguageFor(id), id).toBeTruthy();
    }
  });

  it("maps every SQL dialect to sql", () => {
    for (const d of ["sqlite", "postgres", "duckdb"]) {
      expect(hljsLanguageFor(d)).toBe("sql");
    }
  });

  it("never claims `jsx`, which highlight.js has no grammar for", () => {
    expect(hljsLanguageFor("react")).toBe("javascript");
  });

  it("returns undefined for an unknown or missing adapter", () => {
    expect(hljsLanguageFor("klingon")).toBeUndefined();
    expect(hljsLanguageFor(undefined)).toBeUndefined();
  });
});

describe("withFenceLanguage", () => {
  it("labels an unlabelled opening fence", () => {
    expect(withFenceLanguage("```\nx = 1\n```", "python")).toBe(
      "```python\nx = 1\n```",
    );
  });

  it("leaves the closing fence alone", () => {
    const out = withFenceLanguage("```\nx = 1\n```", "python").split("\n");
    expect(out[2]).toBe("```");
  });

  it("keeps a language the author already wrote", () => {
    const src = "```sql\nSELECT 1\n```";
    expect(withFenceLanguage(src, "python")).toBe(src);
  });

  it("handles two blocks in one instructions string", () => {
    expect(withFenceLanguage("```\na\n```\n\ntext\n\n```\nb\n```", "r")).toBe(
      "```r\na\n```\n\ntext\n\n```r\nb\n```",
    );
  });

  it("does not touch a fence inside an already-open block", () => {
    // The middle line closes the first block; the third opens a second one.
    const out = withFenceLanguage("```\n```\n```\n```", "c").split("\n");
    expect(out).toEqual(["```c", "```", "```c", "```"]);
  });

  it("is a no-op with no language, and with no fences", () => {
    expect(withFenceLanguage("```\nx\n```", undefined)).toBe("```\nx\n```");
    expect(withFenceLanguage("just `prose`", "python")).toBe("just `prose`");
  });
});

describe("renderMarkdownInstructions", () => {
  // The exact snippet from the polars-vs-pandas card that reported this.
  const pandasCard = `Write the Polars equivalent of this pandas expression:

\`\`\`python
heavy = df[df["body_mass_g"] > 5000][["species", "body_mass_g"]]
\`\`\``;

  it("highlights a labelled fence", () => {
    const out = html(pandasCard, "python");
    expect(out).toContain("language-python");
    expect(out).toContain("hljs-");
  });

  it("highlights an unlabelled fence using the card's adapter", () => {
    const out = html("```\nheavy = df.filter(pl.col('x') > 1)\n```", "python");
    expect(out).toContain("hljs-");
  });

  it("picks the language the card declares, not one it guesses", () => {
    // `SELECT 1` is valid in several grammars; with detection off, the card's
    // own language decides, so the class is the one we asked for.
    expect(html("```\nSELECT 1 FROM t\n```", "sql")).toContain("language-sql");
    expect(html("```\nSELECT 1 FROM t\n```", "python")).toContain(
      "language-python",
    );
  });

  it("leaves inline code as an identifier, not a highlighted span", () => {
    const out = html("The frame `df` is loaded for you.", "python");
    expect(out).toContain("<code>df</code>");
    expect(out).not.toContain("hljs");
  });

  it("renders plain when the card has no language, as it did before", () => {
    const out = html("```\nx = 1\n```");
    expect(out).not.toContain("hljs-");
  });

  it("still renders GFM", () => {
    expect(html("- one\n- two", "python")).toContain("<li>");
    expect(html("**bold**", "python")).toContain("<strong>");
  });

  it("renders a `text` fence with no tokens at all", () => {
    // What an expected-output sample is labelled. `text` is a registered
    // plaintext alias, so this does not lean on `ignoreMissing`.
    const out = html("```text\nHello, Grace!\n```", "python");
    expect(out).toContain("Hello, Grace!");
    expect(out).not.toContain("hljs-");
  });
});

/**
 * Every fence in a card's instructions names its language.
 *
 * The adapter fallback exists for the author who forgets, but it should stay a
 * fallback: 87 of the 89 fences that had no info string were samples of what
 * the program *prints*, not code, and inheriting the card's language paints
 * highlight.js grammar over plain output. Labelling them says which is which
 * in the source, where the author can see it.
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
