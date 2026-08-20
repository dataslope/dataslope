import { describe, expect, it } from "vitest";

import {
  buildSourceLineMap,
  composeWebDocument,
} from "../app/_components/runtime/webPreview";

/** Where the composed document says a given composed line came from, using
 *  the same lookup the bridge does. */
function locate(doc: string, composedLine: number): string | null {
  const match = doc.match(/var SOURCES = (\[.*?\]);/);
  if (!match) return null;
  const ranges = JSON.parse(match[1]) as Array<{
    file: string;
    from: number;
    to: number;
    at: number;
  }>;
  for (const r of ranges) {
    if (composedLine >= r.from && composedLine <= r.to) {
      return `${r.file}:${composedLine - r.from + r.at}`;
    }
  }
  return null;
}

/** 1-based line of the composed document containing `needle`. */
function lineOf(doc: string, needle: string): number {
  const index = doc.split("\n").findIndex((l) => l.includes(needle));
  if (index === -1) throw new Error(`not found: ${needle}`);
  return index + 1;
}

describe("composed source line map", () => {
  it("places an injected script's first line at line 1 of its file", () => {
    const doc = composeWebDocument({
      entryHtml: "<!doctype html>\n<html>\n<head></head>\n<body>\n<h1>hi</h1>\n</body>\n</html>\n",
      token: "t",
      textFiles: new Map([
        ["styles.css", "body { color: red }\n"],
        ["script.js", "errorOnLineOne();\nconst two = 2;\nthrowOnLineThree();\n"],
      ]),
    });
    expect(locate(doc, lineOf(doc, "errorOnLineOne();"))).toBe("script.js:1");
    expect(locate(doc, lineOf(doc, "throwOnLineThree();"))).toBe("script.js:3");
    expect(locate(doc, lineOf(doc, "body { color: red }"))).toBe("styles.css:1");
  });

  it("does not move when an unrelated file grows", () => {
    const script = "boom();\n";
    const compose = (html: string) =>
      composeWebDocument({
        entryHtml: html,
        token: "t",
        textFiles: new Map([["script.js", script]]),
      });
    const short = compose("<head></head>\n<h1>a</h1>\n");
    const tall = compose("<head></head>\n<h1>a</h1>\n<p>b</p>\n<p>c</p>\n");
    expect(locate(short, lineOf(short, "boom();"))).toBe("script.js:1");
    expect(locate(tall, lineOf(tall, "boom();"))).toBe("script.js:1");
  });

  it("maps an explicitly referenced file at its tag's position", () => {
    const doc = composeWebDocument({
      entryHtml: '<head></head>\n<h1>x</h1>\n<script src="./script.js"></script>\n<p>after</p>\n',
      token: "t",
      textFiles: new Map([["script.js", "a();\nb();\n"]]),
    });
    expect(locate(doc, lineOf(doc, "b();"))).toBe("script.js:2");
    // The entry's own lines keep their numbering across the inlined block.
    expect(locate(doc, lineOf(doc, "<h1>x</h1>"))).toBe("index.html:2");
    expect(locate(doc, lineOf(doc, "<p>after</p>"))).toBe("index.html:4");
  });

  it("maps the entry's own inline script", () => {
    const doc = composeWebDocument({
      entryHtml: "<head></head>\n<script>\ninlineBoom();\n</script>\n",
      token: "t",
    });
    expect(locate(doc, lineOf(doc, "inlineBoom();"))).toBe("index.html:3");
  });

  it("accounts for the defer wrapper's extra line", () => {
    const doc = composeWebDocument({
      entryHtml: '<head></head>\n<script defer src="./script.js"></script>\n',
      token: "t",
      textFiles: new Map([["script.js", "first();\nsecond();\n"]]),
    });
    expect(locate(doc, lineOf(doc, "first();"))).toBe("script.js:1");
    expect(locate(doc, lineOf(doc, "second();"))).toBe("script.js:2");
  });

  it("returns nothing for a line the composer generated itself", () => {
    const doc = composeWebDocument({ entryHtml: "<head></head>\n<h1>x</h1>\n", token: "t" });
    // Inside the bridge, which belongs to no editor file.
    expect(locate(doc, 3)).toBe(null);
  });

  it("is empty for a document with no files at all", () => {
    expect(buildSourceLineMap("<h1>x</h1>", "index.html", new Map())).toEqual([
      { file: "index.html", from: 1, to: 1, at: 1 },
    ]);
  });
});
