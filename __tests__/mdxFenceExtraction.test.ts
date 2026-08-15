// Guards which `<Tag …/>` occurrences the sweeps' shared extractor treats as
// real components (`eachTag` in scripts/lib/mdx-blocks.mjs). Two opposite
// mistakes are pinned, each invisible in a green sweep: counting a tag that
// only appears inside a ```jsx fence (demo pages print each example's own MDX
// source, doubling every item), and mistaking an inline triple-backtick span
// for an opening fence (which swallowed the next real <ChallengeCard>).
// Fixtures live in a temp dir so editing content/ cannot turn these red.
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { extractBlocks, extractChallengeCards } from "../scripts/lib/mdx-blocks.mjs";

const tmpRoot = mkdtempSync(join(tmpdir(), "mdx-fence-"));
afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

/** A directory holding exactly one .mdx file. The extractors walk a whole
 *  tree, so each case needs its own root or the previous case's fixture is
 *  still in the count. */
function fixture(name: string, body: string): string {
  const dir = join(tmpRoot, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${name}.mdx`), body);
  return dir;
}

const LIVE_BLOCK = `<CodeBlock
  adapter="java"
  files={[{ filename: "Main.java", starterCode: \`class Main {}\` }]}
/>`;

describe("eachTag fence handling", () => {
  it("counts a live block once and ignores its documentation copy", () => {
    const root = fixture(
      "demo",
      `---
title: Demo
---

${LIVE_BLOCK}

The MDX source for the example above:

\`\`\`jsx
${LIVE_BLOCK}
\`\`\`
`,
    );
    const blocks = extractBlocks(root, "java");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].line).toBe(5);
  });

  it("does not treat an inline triple-backtick span as an opening fence", () => {
    const root = fixture(
      "inline",
      `---
title: Inline
---

Match on a derived discriminant such as
\`\`\` \`\${a}:\${b}\` \`\`\`.

${LIVE_BLOCK}
`,
    );
    expect(extractBlocks(root, "java")).toHaveLength(1);
  });

  it("keeps a tag whose own props contain a fenced block", () => {
    // The reverted document-wide backtick count died here: `markdown={…}` and
    // `instructions={…}` carry fences of their own, and a parity counter that
    // sees them starts discarding every real tag that follows.
    const root = fixture(
      "props",
      `---
title: Props
---

<ChallengeCard
  adapter="java"
  title="Fenced prop"
  instructions={\`Read this first:

\\\`\\\`\\\`java
class Demo {}
\\\`\\\`\\\`
\`}
  files={[{ filename: "Main.java", starterCode: \`class Main {}\` }]}
  tests={[{ id: "t", name: "t", expect: { stdout: "" } }]}
/>

${LIVE_BLOCK}
`,
    );
    expect(extractChallengeCards(root, "java")).toHaveLength(1);
    expect(extractBlocks(root, "java")).toHaveLength(1);
  });

  it("ignores a tag inside a tilde fence too", () => {
    const root = fixture(
      "tilde",
      `---
title: Tilde
---

~~~jsx
${LIVE_BLOCK}
~~~
`,
    );
    expect(extractBlocks(root, "java")).toHaveLength(0);
  });
});

// A props block ends at the first `/>` outside its template literals: the
// literals hold whole programs whose self-closing JSX looks like the tag's
// end, and getting it wrong silently misplaces components — a ReferenceError
// only a browser run catches.
describe("codeRegions template literals", () => {
  it("does not end a props block at a `/>` inside a template literal", async () => {
    const { codeRegions } = await import("../scripts/lib/mdx-regions.mjs");
    const lines = [
      "<CodeBlock",
      "  files={[",
      "    {",
      "      starterCode: `function App() {",
      "  return (",
      "    <SplitPanel",
      "      left={<img />}",
      "    />",
      "  );",
      "}",
      "",
      "render(<App />);",
      "`,",
      "    },",
      "  ]}",
      "/>",
      "",
      "Real prose again.",
    ];
    const code = codeRegions(lines);
    // Every line of the sample, including the blank one and the `/>` that closes
    // SplitPanel, stays inside the block.
    for (let i = 0; i <= 15; i++) expect(code[i]).toBe("props");
    expect(code[16]).toBeNull();
    expect(code[17]).toBeNull();
  });

  it("still ends a props block at its own `/>`", async () => {
    const { codeRegions } = await import("../scripts/lib/mdx-regions.mjs");
    const code = codeRegions(["<Figure", '  slug="x"', "/>", "", "Prose."]);
    expect(code.slice(0, 3)).toEqual(["props", "props", "props"]);
    expect(code[3]).toBeNull();
    expect(code[4]).toBeNull();
  });
});
