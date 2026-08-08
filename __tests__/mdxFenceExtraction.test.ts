// Guards which `<Tag …/>` occurrences the sweeps' shared extractor treats as
// real components (`eachTag` in scripts/lib/mdx-blocks.mjs).
//
// Two opposite mistakes are pinned here, because each one is invisible in a
// green sweep:
//
//   • Counting a tag that only appears inside a ```jsx fence. The eleven
//     `content/fumadocs-dev/*` demo pages print each example's own MDX source
//     below the live example, so every item on them existed twice. Nothing
//     noticed until `check:browser` compared the extractor's count with what a
//     real browser found on the page and read the gap as half the page having
//     gone unswept.
//   • Mistaking an inline code span for a fence. Triple backticks are also
//     legal *inline* — pattern-matching.mdx writes
//     ``` `${current}:${emergency}` ``` mid-sentence — and treating that as an
//     opening fence silently swallowed the next real `<ChallengeCard>`.
//
// Both are exercised against fixtures written to a temp dir rather than
// against `content/`, so a lesson being edited cannot turn one of these red.
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
