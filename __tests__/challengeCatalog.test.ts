/**
 * Guards the static challenge catalog.
 *
 * Challenges are authored TypeScript modules, so `tsc` already checks their
 * shape. What it cannot check is the part an author gets wrong by hand: a
 * duplicate slug, a row whose language list emptied out, a catalog tuple left
 * behind after the challenge it described was written. That is what a build
 * script would have validated; this file does it instead.
 */

import { describe, expect, it } from "vitest";
import {
  getChallenge,
  getChallengeIndex,
  getChallengeSlugs,
  initialStepIndex,
  isMultiStep,
  DIFFICULTY_BARS,
  INDEX_LANGUAGE_LABELS,
  type IndexLanguage,
} from "@/lib/challenges";

describe("challenge catalog", () => {
  it("resolves every slug it advertises", () => {
    const slugs = getChallengeSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(new Set(slugs).size).toBe(slugs.length); // no duplicates
    for (const slug of slugs) {
      expect(getChallenge(slug), slug).toBeDefined();
    }
    expect(getChallenge("does-not-exist")).toBeUndefined();
  });

  it("puts the built challenges first, with rows derived from the challenge", () => {
    const index = getChallengeIndex();
    const built = index.filter((e) => e.slug);
    expect(built).toHaveLength(getChallengeSlugs().length);
    // Built entries lead the list, so the catalog opens on real work.
    expect(index.slice(0, built.length).every((e) => e.slug)).toBe(true);

    for (const entry of built) {
      const challenge = getChallenge(entry.slug!);
      expect(challenge, entry.slug).toBeDefined();
      // A row can never disagree with the page it links to.
      expect(entry.title).toBe(challenge!.title);
      expect(entry.level).toBe(DIFFICULTY_BARS[challenge!.difficulty]);
      expect(entry.steps).toBe(Math.max(1, challenge!.steps.length));
    }
  });

  it("never lists a challenge without a language, or an unknown one", () => {
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
    const langs = getChallengeIndex().flatMap((e) => e.langs as IndexLanguage[]);
    expect(langs).not.toContain("go");
    for (const slug of getChallengeSlugs()) {
      const ids = getChallenge(slug)!.languages.map((l) => l.id);
      expect(ids, slug).not.toContain("go");
    }
  });

  it("has no placeholder row shadowing a built challenge", () => {
    const builtTitles = new Set(
      getChallengeSlugs().map((s) => getChallenge(s)!.title),
    );
    const placeholders = getChallengeIndex().filter((e) => !e.slug);
    for (const entry of placeholders) {
      expect(builtTitles.has(entry.title), entry.title).toBe(false);
    }
  });

  it("opens a multi-step challenge on the step the learner is working on", () => {
    for (const slug of getChallengeSlugs()) {
      const challenge = getChallenge(slug)!;
      const index = initialStepIndex(challenge);

      if (!isMultiStep(challenge)) {
        expect(index, slug).toBe(0);
        // A single-step challenge carries its own instructions instead.
        expect(challenge.instructions.length, slug).toBeGreaterThan(0);
        continue;
      }

      expect(challenge.steps[index]?.state, slug).toBe("active");
      // Every step needs something to show, and step numbers stay unique.
      const ns = challenge.steps.map((s) => s.n);
      expect(new Set(ns).size, slug).toBe(ns.length);
      for (const step of challenge.steps) {
        expect(step.instructions.length, `${slug}/${step.n}`).toBeGreaterThan(0);
      }
      // A locked step has no editor; an open one does.
      const locked = challenge.steps.filter((s) => s.state === "locked");
      for (const step of locked) {
        expect(step.source, `${slug}/${step.n}`).toBeUndefined();
      }
    }
  });

  it("keeps the tests badge consistent with the checks it counts", () => {
    for (const slug of getChallengeSlugs()) {
      const challenge = getChallenge(slug)!;
      const passed = challenge.tests.filter((t) => t.pass).length;
      expect(challenge.testsBadge, slug).toBe(`${passed}/${challenge.tests.length}`);
    }
  });
});
