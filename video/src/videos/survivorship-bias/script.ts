import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Survivorship bias" (16:9), after
 * content/courses/statistics-for-data-science-python/sampling-and-bias.mdx,
 * "Survivorship bias: the most famous trap" (Wald, and the mutual-fund
 * simulation) and statistical-fallacies.mdx, "Survivorship bias" (the habit:
 * ask what is missing from the data, and why).
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * History, and where each claim comes from:
 *   - Abraham Wald, "A Method of Estimating Plane Vulnerability Based on
 *     Damage of Survivors", eight memoranda of the Statistical Research Group,
 *     Columbia University, for the National Defense Research Committee, 1943.
 *     Read in the Center for Naval Analyses reprint, CRC 432 (July 1980),
 *     DTIC ADA091073. Mangel and Samaniego, "Abraham Wald's work on aircraft
 *     survivability", JASA 79(386), 1984, pp. 259-267, is the published guide
 *     to them and follows the same examples. From the memos: the question is
 *     the vulnerability of each part of a plane, the only data is the damage
 *     on planes that returned, and the worked example in Part V (pp. 62-65)
 *     is a bombing mission of 400 planes, 359 back, with two engines, the
 *     fuselage, the fuel system and the rest. Its numbers are hypothetical;
 *     the figure says so. measure.py copies the inputs and recomputes the
 *     outputs with his formulas.
 *   - "The military was inclined to provide protection for those parts that
 *     on returning planes showed the most hits": W. Allen Wallis, rejoinder to
 *     the discussion of "The Statistical Research Group, 1942-1945", JASA
 *     75(370), 1980, as quoted by Bill Casselman, "The Legend of Abraham
 *     Wald", AMS Feature Column, June 2016. The memos themselves recommend
 *     nothing; the narration says what the data shows and what follows from
 *     it, never that Wald told anyone where to bolt armor.
 *   - Not claimed, because neither source supports it: that the returning
 *     planes were hit "on the wings and fuselage" or "on the wings and tail"
 *     (the two lessons disagree), that the cockpit was a fatal spot, or any
 *     drawing of where the holes were. The familiar red-dot diagram is modern.
 *
 * Facts, from measure.py (measurements.json, read by data.ts):
 *   - engines are 35 of 130 sq ft, 26.9% of the area, "more than a quarter",
 *     and carry 39 of the 202 hits on returning planes, 19.3%, "fewer than one
 *     in five"; the fuselage is 34.6% of the area and carries 38.6% of hits;
 *   - Wald's estimates of the chance one hit downs the plane: engines .39,
 *     fuselage .05 (his printed q0 = .850; the exact root, .847, gives .055,
 *     so "about five"), fuel system .15, the rest .02;
 *   - the lesson's funds (numpy default_rng(3), 5,000 funds, normal mean 6
 *     and SD 8, closed below minus 4%): all funds average 6.04%, 515 close,
 *     the 4,485 left average 7.65%, an inflation of 1.61 points.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses, numbers
 * as words. Contractions, a question the next sentence answers, ellipses
 * where a speaker would hold, and capitals on one word. No voice is set:
 * the narrator is chosen when the course is voiced.
 */
export const script: NarrationScript = {
  id: "survivorship-bias",
  leadIn: 0.5,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      text: "In 1943, the statistician Abraham Wald took on a wartime question. Which parts of a bomber are the most vulnerable?",
      pauseAfter: 0.4,
    },
    { id: "evidence", text: "The evidence was the damage on the planes that made it home.", pauseAfter: 0.3 },
    {
      id: "instinct",
      text: "And the military's instinct was to protect the parts with the most holes.",
      pauseAfter: 0.5,
    },
    {
      id: "example",
      scene: true,
      text: "Wald's memos work through an example. Four hundred planes fly a mission... and three hundred fifty-nine come back.",
      pauseAfter: 0.4,
    },
    {
      id: "engines",
      text: "The two engines are more than a quarter of the plane. But they carry fewer than one in five of the holes.",
      pauseAfter: 0.3,
    },
    { id: "fuselage", text: "The fuselage carries more than its share.", pauseAfter: 0.45 },
    {
      id: "missing",
      text: "So where are the missing engine hits? On the planes that never came back.",
      pauseAfter: 0.5,
    },
    {
      id: "estimate",
      text: "In his numbers, one hit to an engine downs a plane thirty-nine times in a hundred. One to the fuselage... about five.",
      pauseAfter: 0.45,
    },
    {
      id: "holes",
      text: "The holes show where a plane can be hit and still come home. The protection belongs where they AREN'T.",
      pauseAfter: 0.5,
    },
    {
      id: "funds",
      scene: true,
      text: "Business data plays the same trick. Take five thousand simulated mutual funds, averaging six percent a year.",
      pauseAfter: 0.4,
    },
    {
      id: "close",
      text: "Now close every fund that lost more than four percent, and drop it from the database.",
      pauseAfter: 0.25,
    },
    { id: "gone", text: "That's five hundred and fifteen funds... gone.", pauseAfter: 0.4 },
    { id: "left", text: "Average the funds that are left, and you get seven point six five.", pauseAfter: 0.35 },
    { id: "deleted", text: "Not one fund got better. The losers were just deleted.", pauseAfter: 0.5 },
    {
      id: "habit",
      scene: true,
      text: "The planes that made it home. The funds still open. The customers who stayed.",
      pauseAfter: 0.35,
    },
    { id: "ask", text: "When your data is whoever's still here... ask what's missing from it, and why." },
  ],
};
