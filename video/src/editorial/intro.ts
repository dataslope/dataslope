/**
 * The series intro's timing, in one place. SeriesIntro.tsx draws the intro;
 * every course video opens on it, and every one of their scripts sets
 * `leadIn: INTRO_LEAD_IN` so the first word lands just after it. Change the
 * intro's length here and every course video moves with it: the scripts read
 * the lead-in from this file rather than each typing its own 4.6, which is
 * what `intro.test.ts` checks.
 *
 * Plain TypeScript with no JSX, so the Node scripts (narrate, the checks) can
 * import a script.ts that imports this.
 */

/** How long the intro runs before it hands over to the first scene. */
export const INTRO_SECONDS = 4.4;

/** Where a course video's first word lands: the intro, then a breath. */
export const INTRO_LEAD_IN = 4.6;
