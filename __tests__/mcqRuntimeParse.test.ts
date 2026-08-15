import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { extractMcqBlocks, findMcqFiles } from "../scripts/check-mcq.mjs";
import { parseQuestion } from "../app/_components/multipleChoice/parseQuestion";

/**
 * Runs the REAL runtime parser (parseQuestion) over the authored MCQ corpus.
 * check-mcq.mjs's loose reimplementation drifted from it once and the gap
 * shipped: a lesson rendered a single blank radio button while every check
 * was green. Each block is checked twice — as authored and dedented — because
 * MDX strips the template literal's indent before the parser runs, and
 * asserting both keeps the corpus valid either way.
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
