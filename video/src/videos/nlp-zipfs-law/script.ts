import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for the deep dive "Zipf's law, read off a log-log plot" (16:9),
 * Natural Language Processing with Python, Unit 3. It is embedded at
 * frequency-distributions.mdx, "The long tail: language is lopsided", and
 * tells the story of interesting-discussions.mdx, "The quiet law: Zipf", on
 * that lesson's own data: Jane Austen's Emma from NLTK's Gutenberg corpus,
 * lowercased, alphabetic tokens only, counted with FreqDist.
 *
 * It exists because the two unit videos asserted the law without showing it
 * (agent-outputs/20261023-1030-nlp-llm-video-review.md: Nlp-3's Fig. 5 drew
 * the long tail as the shortest thing on screen, and Nlp-5's log rank axis
 * gave the top hundred words half the chart). So every share here is drawn
 * on a plain, linear bar, and the log axes carry only the shape.
 *
 * Parts:
 *   1. Linear (hook to tail): every word ranked, bars for the top twenty on
 *      plain axes, then the rank axis zooms out to all 7,079 ranks, and more
 *      than half the vocabulary lies on the floor (used once or twice).
 *   2. Log (switch to fit): the same data morphs onto log axes over a decade
 *      grid and straightens; the dashed 1/rank line, ten times the rank for
 *      a tenth the count (one grid step along, one step down: the slope is
 *      counted in steps, since a step is wider than it is tall), and the
 *      fitted slope.
 *   3. Prediction (predict to crowd): what one over the rank predicts for
 *      ranks 1 to 10, said and labelled as starting from the top word (Fig.
 *      2's dashed line is the same law fitted to the top thousand, a
 *      different line), as ghost bars, against Emma's real counts: "to" and
 *      "the" nearly tie, and the tenth word, "she", is more than four times
 *      its prediction, because the top words crowd together.
 *   4. Shares (warn to once): the top hundred ranks on a log rank axis (half
 *      the width, as if half the vocabulary) and on a plain one (1.4% of the
 *      vocabulary); then the plain shares: the top hundred words are 60% of
 *      the text, and 39% of the different words appear once.
 *   5. Why (why to idf): stopwords and IDF (inverse document frequency,
 *      weighted by how few documents a word is in), with two watercolor
 *      spots.
 *
 * Facts, every one from measure.py (NLTK 3.9.4, NumPy 2.4.6, the pinned
 * gutenberg data; measurements.json is its output, data.ts reads it). It runs
 * the lesson's Zipf block verbatim, checks its stdout against the site's
 * prepopulated output (lib/generated/block-outputs.json), and asserts that
 * every number it shares with the unit videos (nlp-counting-words,
 * nlp-history) is identical:
 *   - 161,600 words, 7,079 different; "to" 5,239, "the" 5,201, the top twenty
 *     on the bars, and the whole curve for the zoom and the log plot;
 *   - more than half the different words (3,766, 53.2%) appear once or twice;
 *   - one over the rank from the top word: the second at 2,620, the tenth at
 *     524; the tenth word, "she", appears 2,340 times, 4.47 times that ("more
 *     than four times");
 *   - the least-squares slope of log count on log rank over ranks 1 to 1,000
 *     is -1.136 ("minus one point one four"), the dashed line is count =
 *     18,719.8 / rank, fitted to those ranks (both as nlp-history has them);
 *   - the top hundred ranks are 1.41% of the different words ("one point
 *     four percent"), and half of a log rank axis from 1 to 10,000;
 *   - the top hundred words make up 59.98% of the book ("sixty percent"), and
 *     70 of them are on NLTK's English stopword list;
 *   - 2,739 words appear once, 38.69% of the different words ("thirty-nine").
 *
 * The lesson gives the law's ideal form (the second word half as common as
 * the first) and says real text follows it least closely at the very top;
 * in Emma the top two nearly tie, which part 3 shows.
 *
 * Written for the ear: short sentences, contractions, numbers as they are
 * said. Every animation is cued to a word below; a cue whose word disappears
 * throws in the Studio rather than drifting.
 */
export const script: NarrationScript = {
  id: "nlp-zipfs-law",
  voice: "hope",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    {
      id: "hook",
      scene: true,
      text: "Count every word in Jane Austen's Emma, and rank them from most common to least.",
      pauseAfter: 0.6,
    },
    {
      id: "top",
      text: "Top of the list is the little word to, five thousand two hundred and thirty-nine times.",
      pauseAfter: 0.7,
    },
    { id: "cliff", text: "On plain axes, the counts fall off a cliff.", pauseAfter: 0.6 },
    {
      id: "scroll",
      text: "And then the ranks just keep going, all the way out to seven thousand and seventy-nine.",
      pauseAfter: 0.7,
    },
    {
      id: "tail",
      text: "More than half of those words lie flat along the floor. They're used once or twice.",
      pauseAfter: 1.0,
    },
    {
      id: "switch",
      text: "Now switch both axes to a log scale, where each step is ten times the last.",
      pauseAfter: 0.6,
    },
    {
      id: "straight",
      text: "The curve straightens into a line. That straight line is Zipf's law.",
      pauseAfter: 1.0,
    },
    {
      id: "law",
      text: "It's one over the rank: go ten times further down the list, and a word turns up a tenth as often.",
      pauseAfter: 1.2,
    },
    { id: "slope", text: "That's a slope of minus one: one step down for every step along.", pauseAfter: 1.0 },
    {
      id: "fit",
      text: "Fit a line to the top thousand words, and its slope comes out at minus one point one four.",
      pauseAfter: 0.9,
    },
    { id: "predict", scene: true, text: "So the law makes a prediction.", pauseAfter: 0.8 },
    {
      id: "anchor",
      text: "Start from the top word: the second should turn up half as often, and the tenth, a tenth as often.",
      pauseAfter: 0.7,
    },
    {
      id: "real",
      text: "In Emma, the second word, the, turns up five thousand two hundred and one times. It nearly ties with to.",
      pauseAfter: 0.8,
    },
    { id: "rough", text: "And the tenth, she, comes in at more than four times its prediction.", pauseAfter: 0.7 },
    { id: "crowd", text: "The top words crowd together, so the law is rough at the very top.", pauseAfter: 0.9 },
    { id: "warn", scene: true, text: "Log axes show the shape, but they're bad at shares.", pauseAfter: 0.6 },
    {
      id: "logaxis",
      text: "On a log rank axis, the top hundred words fill half the width, as if they were half the vocabulary.",
      pauseAfter: 0.6,
    },
    {
      id: "plain",
      text: "On a plain one, they're one point four percent of the vocabulary.",
      pauseAfter: 0.9,
    },
    {
      id: "top100",
      text: "Count the text they fill instead, and those hundred words are sixty percent of the book.",
      pauseAfter: 0.9,
    },
    {
      id: "once",
      text: "And of its seven thousand and seventy-nine different words, thirty-nine percent appear only once.",
      pauseAfter: 1.0,
    },
    {
      id: "why",
      scene: true,
      text: "That lopsided split is why stopwords exist: a few words fill most of the text, and they say the least about it.",
      pauseAfter: 0.7,
    },
    { id: "stop", text: "Seventy of Emma's top hundred are on NLTK's stopword list.", pauseAfter: 0.7 },
    {
      id: "idf",
      text: "And it's why IDF, inverse document frequency, gives a word more weight the fewer documents it turns up in.",
    },
  ],
};
