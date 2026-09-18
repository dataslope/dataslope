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
 * `Challenge` and add it to `CHALLENGES`. No migration, no seed, no generated
 * file. `__tests__/challengeSolutions` then holds it to its own checks.
 *
 * **These three accessors are the seam.** Every caller goes through them, so
 * moving definitions into D1 later means reimplementing this file (and making
 * the callers `await`), not touching the pages. Progress is deliberately not
 * here: it is per-learner, lives in the browser, and never mixes with the
 * definitions.
 */

import { CODE_ALGORITHMS } from "./code-algorithms";
import { CODE_CLASSICS } from "./code-classics";
import { CODE_FUNDAMENTALS } from "./code-fundamentals";
import { CODE_MULTI_JS } from "./code-multi-js";
import { CODE_MULTI_JS_WEB } from "./code-multi-js-web";
import { CODE_MULTI_PYTHON } from "./code-multi-python";
import { CODE_MULTI_PYTHON_TOOLS } from "./code-multi-python-tools";
import { CODE_SHAPING } from "./code-shaping";
import { SQL_LIBRARY } from "./sql-library";
import { SQL_MULTI } from "./sql-multi";
import { SQL_MULTI_BILLING } from "./sql-multi-billing";
import { SQL_MULTI_LIBRARY } from "./sql-multi-library";
import { SQL_SUBSCRIPTIONS } from "./sql-subscriptions";
import { SQL_SINGLE } from "./sql-single";
import { TOP_K_FREQUENT_WORDS } from "./top-k-frequent-words";
import { TOP_PRODUCTS_BY_MONTH } from "./top-products-by-month";
import { DIFFICULTY_BARS, type Challenge, type ChallengeIndexEntry } from "./types";

export * from "./types";

/** Every challenge with a workspace behind it, in catalog order. */
const CHALLENGES: Challenge[] = [
  TOP_PRODUCTS_BY_MONTH,
  TOP_K_FREQUENT_WORDS,
  ...SQL_SINGLE,
  ...SQL_MULTI,
  ...CODE_FUNDAMENTALS,
  ...CODE_ALGORITHMS,
  ...CODE_MULTI_PYTHON,
  ...CODE_MULTI_JS,
  ...SQL_SUBSCRIPTIONS,
  ...SQL_LIBRARY,
  ...SQL_MULTI_BILLING,
  ...SQL_MULTI_LIBRARY,
  ...CODE_SHAPING,
  ...CODE_CLASSICS,
  ...CODE_MULTI_PYTHON_TOOLS,
  ...CODE_MULTI_JS_WEB,
];

export function getChallenge(slug: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.slug === slug);
}

export function getChallengeSlugs(): string[] {
  return CHALLENGES.map((c) => c.slug);
}

/**
 * Every row of the catalog list, derived from the challenges themselves so a
 * row can never disagree with the page it links to. `status` is left unset:
 * the server has no idea how far a learner got, and the list fills it in from
 * stored progress after mount.
 */
export function getChallengeIndex(): ChallengeIndexEntry[] {
  return CHALLENGES.map((c) => ({
    ...c.catalog,
    title: c.title,
    level: DIFFICULTY_BARS[c.difficulty],
    steps: Math.max(1, c.steps.length),
    slug: c.slug,
  }));
}

/** True when this challenge gates its steps behind the previous one. */
export function isMultiStep(challenge: Challenge): boolean {
  return challenge.steps.length > 0;
}

/**
 * The step to open on: the first one the learner has not passed yet, or the
 * last step once they have passed them all. Progress comes from the browser,
 * so this takes it as an argument rather than reading storage itself — which
 * also keeps it usable from the server and from tests.
 */
export function openStepIndex(challenge: Challenge, passedSteps: string[]): number {
  if (challenge.steps.length === 0) return 0;
  const next = challenge.steps.findIndex((s) => !passedSteps.includes(s.n));
  return next === -1 ? challenge.steps.length - 1 : next;
}

/**
 * Whether a step is reachable. Step 1 always is; every later step opens only
 * once the one before it has passed.
 */
export function isStepUnlocked(
  challenge: Challenge,
  index: number,
  passedSteps: string[],
): boolean {
  if (index <= 0) return true;
  const previous = challenge.steps[index - 1];
  return previous ? passedSteps.includes(previous.n) : true;
}
