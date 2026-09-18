/**
 * The challenge catalog: the only way the app reads challenges.
 *
 * Challenges are **static**. Each one is an authored module in this directory,
 * imported explicitly below, so the whole catalog is resolved by the bundler
 * at build time. That is deliberate on this stack:
 *
 *  - workerd has no filesystem, so nothing here may scan a directory at
 *    request time (the same constraint that produced
 *    `scripts/build-course-catalog.mjs`). An explicit import list needs no
 *    codegen to satisfy it.
 *  - `tsc` validates an authored challenge against `./types` for free. A JSON
 *    or MDX format would need a schema validator and a build step to get the
 *    same guarantee.
 *  - A page view costs a Worker invocation and an R2 read either way; reading
 *    definitions from D1 would add a query per view to data that only changes
 *    when the site deploys, plus migrations and a deploy-time seed step. See
 *    DEVELOPMENT.md on what the search index's seed already costs.
 *
 * Adding a challenge: write `lib/challenges/<slug>.ts` exporting a
 * `Challenge`, add it to `CHALLENGES`, and delete its placeholder tuple from
 * `./catalog-rows` if it had one. No migration, no seed, no generated file.
 *
 * **These three accessors are the seam.** Every caller goes through them, so
 * moving definitions into D1 later means reimplementing this file (and making
 * the callers `await`), not touching the pages. Progress is deliberately not
 * here: it is per-learner, lives in the browser, and never mixes with the
 * definitions.
 */

import { CATALOG_ONLY, toEntry } from "./catalog-rows";
import { TOP_K_FREQUENT_WORDS } from "./top-k-frequent-words";
import { TOP_PRODUCTS_BY_MONTH } from "./top-products-by-month";
import { DIFFICULTY_BARS, type Challenge, type ChallengeIndexEntry } from "./types";

export * from "./types";

/** Every challenge with a workspace behind it, in catalog order. */
const CHALLENGES: Challenge[] = [TOP_PRODUCTS_BY_MONTH, TOP_K_FREQUENT_WORDS];

export function getChallenge(slug: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.slug === slug);
}

export function getChallengeSlugs(): string[] {
  return CHALLENGES.map((c) => c.slug);
}

/**
 * Every row of the catalog list. The built challenges come first and derive
 * their title, level and step count from the challenge itself, so a row can
 * never disagree with the page it links to.
 */
export function getChallengeIndex(): ChallengeIndexEntry[] {
  const built = CHALLENGES.map((c) => ({
    ...c.catalog,
    title: c.title,
    level: DIFFICULTY_BARS[c.difficulty],
    steps: Math.max(1, c.steps.length),
    slug: c.slug,
  }));
  return [...built, ...CATALOG_ONLY.map(toEntry)];
}

/** True when this challenge gates its steps behind the previous one. */
export function isMultiStep(challenge: Challenge): boolean {
  return challenge.steps.length > 0;
}

/** Index of the step the learner is working on, or 0 for a single-step problem. */
export function initialStepIndex(challenge: Challenge): number {
  const active = challenge.steps.findIndex((s) => s.state === "active");
  return active === -1 ? 0 : active;
}
