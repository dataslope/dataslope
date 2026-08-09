import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { extractMcqBlocks, findMcqFiles } from "../scripts/check-mcq.mjs";
import { parseQuestion } from "../app/_components/multipleChoice/parseQuestion";

/**
 * Runs the REAL runtime parser over the authored MCQ corpus.
 *
 * `mcqContent.test.ts` guards the same corpus for authoring rules, but through
 * `check-mcq.mjs`'s own loose reimplementation of the parser ("mirrors
 * parseQuestion.ts closely enough for linting purposes"). The two drifted, and
 * the gap shipped: `beginners-javascript/promises-and-async-await` authored its
 * four choices as a bare `- ` marker with the code fence on the line below,
 * which the linter read as four choices and `parseQuestion` read as one empty
 * one. The lesson rendered a question with a single blank radio button in
 * production, and every check was green.
 *
 * So this file deliberately imports the component's own parser: whatever the
 * linter believes, these are the assertions that describe what a learner
 * actually sees.
 *
 * Each block is checked twice, as authored and with one level of indentation
 * removed, because MDX strips the template literal's indent before the parser
 * runs (verified against `@mdx-js/mdx`: `  ```js` inside `markdown={` … `}`
 * reaches the runtime at column 0). Asserting both means the corpus stays
 * valid whether or not that behaviour holds in a future MDX release, without
 * this test having to model it exactly.
 */
describe("<MultipleChoice> corpus through the runtime parser", () => {
  const files = [
    ...findMcqFiles(path.join(process.cwd(), "content", "courses")),
    ...findMcqFiles(path.join(process.cwd(), "content", "interview")),
    ...findMcqFiles(path.join(process.cwd(), "content", "fumadocs-dev")),
  ];

  /** How MDX dedents a `markdown={` … `}` literal authored at indent 2. */
  const dedent = (block: string) =>
    block
      .split("\n")
      .map((line) => line.replace(/^ {2}/, ""))
      .join("\n");

  const cases: { file: string; block: string; variant: string }[] = [];
  for (const file of files) {
    for (const block of extractMcqBlocks(readFileSync(file, "utf8"))) {
      cases.push({ file, block, variant: "as authored" });
      cases.push({ file, block: dedent(block), variant: "dedented by MDX" });
    }
  }

  it("locates the MCQ corpus", () => {
    expect(cases.length).toBeGreaterThan(200);
  });

  it("parses every question into answerable choices", () => {
    const failures: string[] = [];
    for (const { file, block, variant } of cases) {
      const q = parseQuestion(block);
      const where = `${path.relative(process.cwd(), file)} (${variant})`;
      const stem = q.body.split("\n").find((l) => l.trim())?.slice(0, 60) ?? "";

      if (q.choices.length < 2) {
        failures.push(`${where}: ${q.choices.length} choice(s) — "${stem}"`);
        continue;
      }
      const blank = q.choices.filter((c) => c.text.trim() === "").length;
      if (blank > 0) {
        // The exact shape the promises lesson shipped: a radio with no label.
        failures.push(`${where}: ${blank} blank choice(s) — "${stem}"`);
      }
      if (q.correctId === null) {
        failures.push(`${where}: no choice marked [o] — "${stem}"`);
      }
    }
    expect(failures, `Unanswerable questions:\n  ${failures.join("\n  ")}`).toEqual(
      [],
    );
  });
});
