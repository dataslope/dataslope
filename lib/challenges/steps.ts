/**
 * Step gating, kept out of `./index` so client code can use it.
 *
 * `./index` imports every authored challenge module, and each of those calls
 * a builder at load time, so a bundler cannot drop them as unused: a client
 * component importing so much as a label from `@/lib/challenges` ships the
 * whole catalog to the browser. The workspace only needs these three
 * functions and the labels in `./types`, so client code imports from those
 * two modules directly, and `__tests__/challengeClientImports` keeps it that
 * way. `./index` re-exports both, so server code is unchanged.
 */

import type { Challenge } from "./types";

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
