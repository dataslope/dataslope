import { describe, expect, it } from "vitest";
import path from "node:path";
// Shared linter implementation also used by `npm run check:mcq`.
import { findMcqFiles, lintFiles } from "../scripts/check-mcq.mjs";

// Guards the authored <MultipleChoice> corpus against the bug classes the
// learn-courses UX audit found: unwinnable questions (no correct answer),
// contradictory duplicate options, too-few choices, and affirmative-opening
// explanations (which render as false praise for learners who answered
// wrong, see AGENTS.md). Runs as part of `npm test`.
describe("content/courses + content/fumadocs-dev <MultipleChoice> corpus", () => {
  const files = [
    ...findMcqFiles(path.join(process.cwd(), "content", "courses")),
    ...findMcqFiles(path.join(process.cwd(), "content", "fumadocs-dev")),
  ];

  it("locates the MCQ corpus", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("has no structural or wording violations", () => {
    const violations = lintFiles(files);
    const report = violations
      .map(
        (v: { rule: string; file: string; detail: string }) =>
          `  [${v.rule}] ${path.relative(process.cwd(), v.file)}: ${v.detail}`,
      )
      .join("\n");
    expect(violations, `MCQ lint violations:\n${report}`).toEqual([]);
  });
});
