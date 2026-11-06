/**
 * The logo reveals' timing, in one place: when the mark lands for each
 * motion, the springs that decide it, the sounds cued to it, and when each
 * line of an opener starts. Plain TypeScript with no JSX, so
 * reveals.test.ts can check the numbers against the springs themselves.
 * Frames at 30 fps.
 */

/**
 * How the mark arrives (Mark.tsx). Each one builds the real file
 * (components/mark.ts), so the last frame of every motion is the logo exactly
 * as the site draws it.
 *
 * - `assemble`: the two slopes slide in from either side and meet, then the
 *   mark gives the small tilt the site's logo gives on hover (the series
 *   intro's move).
 * - `plot`: the mark draws itself like a curve being plotted, up the left
 *   slope and down the right, with the round cap as the pen.
 * - `histogram`: bars rise inside the mark's outline, left to right, then
 *   close their gaps and fuse into the smooth shape.
 * - `scatter`: points fly in from around the frame and settle into the two
 *   slopes, then the shape fills in under them.
 * - `rise`: the mark rises from behind a horizon, overshoots and settles.
 * - `unfold`: the peak drops in with its two slopes folded under it, bounces,
 *   and the slopes swing open like the legs of a compass.
 */
export type MarkMotion = "assemble" | "plot" | "histogram" | "scatter" | "rise" | "unfold";
export const MARK_MOTIONS: readonly MarkMotion[] = ["assemble", "plot", "histogram", "scatter", "rise", "unfold"];

/**
 * How a line of text arrives (Words.tsx). Every one holds the line's final box
 * from the first frame, so a lockup laid out around it never shifts.
 *
 * - `ink`: the editorial videos' left-to-right wipe with a brief blur.
 * - `letters`: each letter rises into place behind the baseline, in turn.
 * - `slide`: the whole line slides up from behind its own baseline.
 * - `blur`: the line comes into focus.
 * - `type`: typed out a letter at a time behind a caret.
 */
export type TextMotion = "ink" | "letters" | "slide" | "blur" | "type";

/** The springs the motions are built from (Remotion `spring` configs). */
export const SPRINGS = {
  /** Each half of `assemble`; the right half starts ASSEMBLE_LAG later. */
  assemble: { damping: 15, mass: 0.9, stiffness: 120 },
  /** Each bar of `histogram`, the i-th starting i * BAR_STAGGER later. */
  bar: { damping: 17, mass: 0.7, stiffness: 150 },
  /** Each point of `scatter`, starting up to SCATTER_DELAY later. */
  point: { damping: 16, mass: 0.8, stiffness: 90 },
  rise: { damping: 11, mass: 0.8, stiffness: 120 },
  /** `unfold`: the drop, then the slopes opening from UNFOLD_OPENS. */
  drop: { damping: 9, mass: 0.7, stiffness: 150 },
  open: { damping: 11, mass: 0.8, stiffness: 120 },
  /** Each letter of the `letters` text motion. */
  letter: { damping: 14, mass: 0.6, stiffness: 140 },
} as const;
export const ASSEMBLE_LAG = 5;
export const BARS = 13;
export const BAR_STAGGER = 1.5;
export const SCATTER_DELAY = 12;
export const UNFOLD_OPENS = 9;

/**
 * Frames from a motion's start to the moment the mark is whole. The words
 * and the landing sound are cued from it, so a motion that is re-timed moves
 * everything after it. reveals.test.ts checks each against its springs.
 */
export const MARK_LANDS: Record<MarkMotion, number> = {
  // The right half is home (98%) at 14.
  assemble: 15,
  // The pen covers both slopes over exactly this many frames.
  plot: 30,
  // The last bar is up at 27; the gaps close over the ten frames before this.
  histogram: 36,
  // The last points settle by 27; the shape fills over the ten frames before.
  scatter: 32,
  // At the top of its overshoot.
  rise: 8,
  // The slopes are open (98%) at 16 and swing 12% past it.
  unfold: 17,
};

/** The sounds a motion's events take (public/sfx/el-reveal-*.wav). */
export type EventSound = "whoosh" | "click" | "pen" | "marimba" | "shimmer" | "thud";

/**
 * What each motion's sounds are cued to: an event in the motion, as frames
 * from its start, where that sound's accent should fall (Sfx `accentAt`), and
 * its peak in dBFS. Every reveal then lands on the same sound (Landing), so
 * what comes before it varies with the motion and the ending is always the
 * brand's.
 */
export const MARK_EVENTS: Record<MarkMotion, { sound: EventSound; at: number; level: number }[]> = {
  // A whoosh as each half sweeps in, a click as they meet.
  assemble: [
    { sound: "whoosh", at: 4, level: -21 },
    { sound: "whoosh", at: 4 + ASSEMBLE_LAG, level: -23 },
    { sound: "click", at: 14, level: -20 },
  ],
  // The pen stroke across the whole drawing.
  plot: [{ sound: "pen", at: 15, level: -21 }],
  // A rising run while the bars come up.
  histogram: [{ sound: "marimba", at: 12, level: -20 }],
  // A shimmer that swells (it is played backwards) as the points gather.
  scatter: [{ sound: "shimmer", at: 30, level: -20 }],
  // A whoosh as it comes up through the horizon.
  rise: [{ sound: "whoosh", at: 4, level: -21 }],
  // A thud as the folded mark lands, a whoosh as it opens.
  unfold: [
    { sound: "thud", at: 5, level: -18 },
    { sound: "whoosh", at: UNFOLD_OPENS + 4, level: -22 },
  ],
};

/**
 * The sound every reveal lands on, the same whatever came before it: the
 * sonic half of the logo. Wood, felt or a soft synth, never a bell: the first
 * one was a bell, and its ringing upper partials read as metal. Marimba is the
 * house choice, a wooden sound like the rest of the palette.
 */
export type Landing = "marimba" | "felt" | "pluck";
export const LANDINGS: readonly Landing[] = ["marimba", "felt", "pluck"];
/** A reveal has nothing under it, so its landing sits well above an effect
 *  under narration (the series intro's logo is -21). */
export const LANDING_LEVEL = -11;
/** The soft card-slide under each opener line, its tap where the line lands. */
export const LINE_LEVEL = -27;

/** The first frame of the mark's motion: a few frames of the bare page first. */
export const MARK_AT = 4;

/** How long each kind runs, in frames: the reveal, then a hold. */
export const REVEAL_FRAMES = { sting: 105, opener: 150 } as const;

/** How long a text motion takes to finish a line of `n` letters, in frames. */
export const textFrames = (motion: TextMotion, n: number) =>
  motion === "letters" ? Math.round(n * 1.1) + 14 : motion === "type" ? Math.round(n * 1.4) + 2 : motion === "ink" ? 18 : 16;

/** A sting: the mark glides out of the wordmark's way, and the word starts
 *  once the mark is most of the way there. */
export function stingCues(motion: MarkMotion) {
  const land = MARK_AT + MARK_LANDS[motion];
  const glide = land - 2;
  return { land, glide, word: glide + 9 };
}

/** An opener: when each line starts, from when the mark lands. */
export function openerCues(motion: MarkMotion, text: TextMotion, unit: string) {
  const land = MARK_AT + MARK_LANDS[motion];
  const word = land - 6;
  const course = word + Math.min(16, textFrames(text, 9) - 4);
  const unitAt = course + Math.min(14, textFrames(text, 12) - 6);
  const titleAt = unitAt + (text === "type" ? textFrames("type", unit.length + 1) : 6);
  return { land, word, course, unitAt, titleAt };
}
