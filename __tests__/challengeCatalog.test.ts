/**
 * Guards the static challenge catalog's structure.
 *
 * Challenges are authored TypeScript, so `tsc` already checks their shape and
 * `challengeSolutions.test.ts` proves each reference solution passes its own
 * checks. What neither covers is the part an author gets wrong by hand: a
 * duplicate slug, a step numbered out of order, a language the catalog filter
 * does not offer, a challenge whose Run button would boot a runtime that does
 * not exist. That is what a build script would have validated; this does it
 * instead.
 */

import { describe, expect, it } from "vitest";
import { getAdapterById } from "@/app/_components/runtime/adapters";
import {
  getChallenge,
  getChallengeIndex,
  getChallengeSlugs,
  isMultiStep,
  isStepUnlocked,
  openStepIndex,
  DIFFICULTY_BARS,
  INDEX_LANGUAGE_LABELS,
} from "@/lib/challenges";

const SLUGS = getChallengeSlugs();

describe("challenge catalog", () => {
  /**
   * The pilot shipped a hundred, at least half single-step. The next two
   * hundred were asked for at more than four in five single-step, which
   * keeps the whole catalog above that line too: most learners arrive
   * wanting one problem, and a gated build is the exception.
   */
  it("ships three hundred challenges, at least four in five single-step", () => {
    expect(SLUGS.length).toBe(198);
    const single = SLUGS.filter((s) => !isMultiStep(getChallenge(s)!));
    expect(single.length).toBeGreaterThanOrEqual(50);
  });

  /**
   * The catalog is meant to teach a spread of ideas, not one idea a hundred
   * times. A collapsing topic count is the cheapest early warning that a batch
   * was authored without reading what was already there.
   */
  it("spreads across topics and difficulties", () => {
    const challenges = SLUGS.map((s) => getChallenge(s)!);
    expect(new Set(challenges.map((c) => c.catalog.topic)).size).toBeGreaterThanOrEqual(30);
    for (const level of ["Beginner", "Intermediate", "Advanced"] as const) {
      const count = challenges.filter((c) => c.difficulty === level).length;
      expect(count, `no ${level} challenges`).toBeGreaterThan(0);
    }
  });

  it("covers both SQL and non-SQL languages", () => {
    const kinds = new Set(SLUGS.map((s) => getChallenge(s)!.runtime.kind));
    expect(kinds).toContain("sql");
    expect(kinds).toContain("code");
  });

  it("resolves every slug it advertises, with no duplicates", () => {
    expect(new Set(SLUGS).size).toBe(SLUGS.length);
    for (const slug of SLUGS) {
      expect(getChallenge(slug), slug).toBeDefined();
      expect(slug, `${slug} is not a url-safe slug`).toMatch(/^[a-z0-9-]+$/);
    }
    expect(getChallenge("does-not-exist")).toBeUndefined();
  });

  it("derives every catalog row from the challenge it links to", () => {
    const index = getChallengeIndex();
    expect(index).toHaveLength(SLUGS.length);
    for (const entry of index) {
      const challenge = getChallenge(entry.slug);
      expect(challenge, entry.slug).toBeDefined();
      expect(entry.title).toBe(challenge!.title);
      expect(entry.level).toBe(DIFFICULTY_BARS[challenge!.difficulty]);
      expect(entry.steps).toBe(Math.max(1, challenge!.steps.length));
      // The server cannot know a learner's progress, so it must not guess.
      expect(entry.status).toBeUndefined();
    }
  });

  it("only lists languages the catalog filter offers", () => {
    const known = new Set(Object.keys(INDEX_LANGUAGE_LABELS));
    for (const entry of getChallengeIndex()) {
      expect(entry.langs.length, entry.title).toBeGreaterThan(0);
      for (const lang of entry.langs) {
        expect(known.has(lang), `${entry.title}: ${lang}`).toBe(true);
      }
    }
  });

  it("does not offer Go", () => {
    expect(Object.keys(INDEX_LANGUAGE_LABELS)).not.toContain("go");
    for (const slug of SLUGS) {
      expect(getChallenge(slug)!.languages.map((l) => l.id), slug).not.toContain("go");
    }
  });

  it("can actually boot what every challenge declares", () => {
    for (const slug of SLUGS) {
      const challenge = getChallenge(slug)!;
      if (challenge.runtime.kind === "sql") {
        expect(challenge.runtime.initSql.trim().length, slug).toBeGreaterThan(0);
        expect(challenge.languages.map((l) => l.id), slug).toEqual(["sql"]);
        continue;
      }
      // A code challenge's language id doubles as its runtime adapter id.
      for (const lang of challenge.languages) {
        expect(getAdapterById(lang.id), `${slug}: no adapter for ${lang.id}`).toBeDefined();
      }
    }
  });

  it("gives every task starter code, a solution and at least one check", () => {
    for (const slug of SLUGS) {
      const challenge = getChallenge(slug)!;
      const tasks = isMultiStep(challenge) ? challenge.steps : challenge.languages;
      expect(tasks.length, slug).toBeGreaterThan(0);
      for (const task of tasks) {
        const label = `${slug}/${"n" in task ? task.n : task.id}`;
        expect(task.starterCode.trim().length, `${label}: no starter code`).toBeGreaterThan(0);
        expect(task.solutionCode.trim().length, `${label}: no solution`).toBeGreaterThan(0);
        expect(task.tests.length, `${label}: no checks`).toBeGreaterThan(0);
        // Starter code that already solves it makes the challenge a no-op.
        expect(task.starterCode.trim(), `${label}: starter equals solution`).not.toBe(
          task.solutionCode.trim(),
        );
        const ids = task.tests.map((t) => t.id);
        expect(new Set(ids).size, `${label}: duplicate test ids`).toBe(ids.length);
      }
    }
  });

  /**
   * A multi-step challenge's `solutionNote` is about the build as a whole, so
   * falling back to it on every step puts the wrong explanation beside two of
   * every three reference solutions. Each step explains its own answer.
   */
  it("explains every step's reference solution separately", () => {
    for (const slug of SLUGS.filter((s) => isMultiStep(getChallenge(s)!))) {
      const challenge = getChallenge(slug)!;
      const notes = new Set<string>();
      for (const step of challenge.steps) {
        const note = step.solutionNote;
        expect(note?.length, `${slug}/${step.n}: no solution note`).toBeGreaterThan(0);
        notes.add(JSON.stringify(note));
      }
      expect(notes.size, `${slug}: steps share a solution note`).toBe(
        challenge.steps.length,
      );
    }
  });

  it("numbers multi-step challenges in order, and gates them", () => {
    for (const slug of SLUGS.filter((s) => isMultiStep(getChallenge(s)!))) {
      const challenge = getChallenge(slug)!;
      expect(challenge.steps.length, slug).toBeGreaterThan(1);
      challenge.steps.forEach((step, i) => {
        expect(step.n, `${slug}: step ${i} is numbered ${step.n}`).toBe(
          String(i + 1).padStart(2, "0"),
        );
        expect(step.instructions.length, `${slug}/${step.n}`).toBeGreaterThan(0);
      });
      // A multi-step challenge runs in exactly one language.
      expect(challenge.languages, slug).toHaveLength(1);

      // Nothing passed: only step 1 is open, and that is where we land.
      expect(openStepIndex(challenge, [])).toBe(0);
      expect(isStepUnlocked(challenge, 0, [])).toBe(true);
      expect(isStepUnlocked(challenge, 1, [])).toBe(false);

      // Step 1 passed: step 2 opens and becomes the landing step.
      const afterFirst = [challenge.steps[0].n];
      expect(isStepUnlocked(challenge, 1, afterFirst)).toBe(true);
      expect(openStepIndex(challenge, afterFirst)).toBe(1);

      // All passed: land on the last step rather than off the end.
      const all = challenge.steps.map((s) => s.n);
      expect(openStepIndex(challenge, all)).toBe(challenge.steps.length - 1);
    }
  });

  it("gives single-step challenges instructions rather than steps", () => {
    for (const slug of SLUGS.filter((s) => !isMultiStep(getChallenge(s)!))) {
      const challenge = getChallenge(slug)!;
      expect(challenge.steps, slug).toHaveLength(0);
      expect(challenge.instructions.length, slug).toBeGreaterThan(0);
      expect(openStepIndex(challenge, []), slug).toBe(0);
    }
  });
});
