import { describe, expect, it } from "vitest";
import path from "node:path";
// Shared linter implementation also used by `npm run check:mcq`.
import {
  findMcqFiles,
  interviewMcqBanks,
  lintFiles,
  lintLengthBiasFiles,
  longestAnswerRate,
} from "../scripts/check-mcq.mjs";

// Guards the authored <MultipleChoice> corpus against the bug classes the
// learn-courses UX audit found: unwinnable questions (no correct answer),
// contradictory duplicate options, too-few choices, and affirmative-opening
// explanations (which render as false praise for learners who answered
// wrong, see AGENTS.md). Runs as part of `npm test`.
describe("content/courses + content/interview + content/fumadocs-dev <MultipleChoice> corpus", () => {
  const files = [
    ...findMcqFiles(path.join(process.cwd(), "content", "courses")),
    ...findMcqFiles(path.join(process.cwd(), "content", "interview")),
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

// Option length must not give the answer away. The interview question banks
// were rewritten for this (the justification moved out of the correct option
// and into its explanation); the course concept-checks still carry the bias
// and are deliberately not covered yet. See AGENTS.md, "Option length".
describe("interview question banks are not guessable by option length", () => {
  const banks = interviewMcqBanks();

  it("locates the banks", () => {
    expect(banks.length).toBe(6);
  });

  it("has no question whose correct option towers over every distractor", () => {
    const violations = lintLengthBiasFiles(banks);
    const report = violations
      .map(
        (v: { file: string; detail: string }) =>
          `  ${path.relative(process.cwd(), v.file)}: ${v.detail}`,
      )
      .join("\n");
    expect(violations, `length-bias violations:\n${report}`).toEqual([]);
  });

  it("picks the longest option as the answer at close to chance", () => {
    const { total, longest, rate } = longestAnswerRate(banks);
    expect(total).toBe(600);
    // Chance is 25% for four options. 40% leaves room for questions whose
    // answer legitimately needs a few more words, while a corpus that has
    // regressed to "always pick the longest" fails loudly.
    expect(rate, `correct option is the single longest in ${longest}/${total}`).toBeLessThan(0.4);
  });
});
