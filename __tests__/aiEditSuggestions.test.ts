// Parser for `file=`-tagged code blocks in Ask AI answers (the "apply this
// suggestion to the editor" flow). The gating rule matters most: an answer
// with NO tagged block must yield [], so plain Q&A answers never grow the
// review-in-editor UI.
import { describe, expect, it } from "vitest";

import { parseAiEditSuggestions } from "../app/_components/ai/editSuggestions";

describe("parseAiEditSuggestions", () => {
  it("returns [] for a plain answer with no code blocks", () => {
    expect(parseAiEditSuggestions("Loops repeat work. Use `for`.")).toEqual([]);
  });

  it("returns [] for ordinary (untagged) code blocks", () => {
    const md = [
      "Here's an example:",
      "```python",
      "print('hi')",
      "```",
    ].join("\n");
    expect(parseAiEditSuggestions(md)).toEqual([]);
  });

  it("extracts a tagged block's filename and full contents", () => {
    const md = [
      "Replace the file with:",
      "```js file=index.js",
      "const a = 1;",
      "console.log(a);",
      "```",
      "Done!",
    ].join("\n");
    expect(parseAiEditSuggestions(md)).toEqual([
      { filename: "index.js", content: "const a = 1;\nconsole.log(a);" },
    ]);
  });

  it("finds the tag anywhere in the info string", () => {
    const md = "```tsx title=x file=App.tsx\n<div />\n```";
    expect(parseAiEditSuggestions(md)).toEqual([
      { filename: "App.tsx", content: "<div />" },
    ]);
  });

  it("keeps the LAST block when the same file is revised twice", () => {
    const md = [
      "```py file=main.py",
      "print(1)",
      "```",
      "Actually, better:",
      "```py file=main.py",
      "print(2)",
      "```",
    ].join("\n");
    expect(parseAiEditSuggestions(md)).toEqual([
      { filename: "main.py", content: "print(2)" },
    ]);
  });

  it("returns one suggestion per distinct file", () => {
    const md = [
      "```html file=index.html",
      "<h1>hi</h1>",
      "```",
      "```css file=styles.css",
      "h1 { color: red; }",
      "```",
    ].join("\n");
    expect(parseAiEditSuggestions(md).map((s) => s.filename)).toEqual([
      "index.html",
      "styles.css",
    ]);
  });

  it("preserves interior blank lines and indentation", () => {
    const md = [
      "```python file=main.py",
      "def f():",
      "    return 1",
      "",
      "print(f())",
      "```",
    ].join("\n");
    expect(parseAiEditSuggestions(md)[0].content).toBe(
      "def f():\n    return 1\n\nprint(f())",
    );
  });
});
