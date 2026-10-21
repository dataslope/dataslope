/**
 * Pacing every course video shares, in one place, as intro.ts holds the
 * intro's timing.
 *
 * Plain TypeScript with no JSX, so the Node scripts (narrate, the checks) can
 * import a script.ts that imports this.
 */

/**
 * The least silence after any beat of a course video, in seconds; every
 * course script sets `minPause: COURSE_MIN_PAUSE`, which `course.test.ts`
 * checks. The scripts were written with 0.3 to 0.45 s after most beats, and
 * the October 2026 review found that too little: a definition, a symbol or a
 * result was followed a third of a second later by the next one. Beats that
 * define a term or land a result take a longer `pauseAfter` of their own.
 *
 * Raising it costs no voicing. Each beat plays its own cut of the take, and
 * every animation is cued to a word, so the picture moves with it.
 */
export const COURSE_MIN_PAUSE = 0.55;
