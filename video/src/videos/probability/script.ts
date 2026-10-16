import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "Probability" (16:9), Unit 3 of the Statistics course: one
 * video for the whole unit, like Unit 1's ThinkingStatistically, in five
 * parts that each lead into the next:
 *
 *   1. Long-run frequency ("hook" to "swamp"), after probability-basics.mdx:
 *      what a probability means, simulation, the law of large numbers and the
 *      gambler's fallacy. It opens on Unit 2's bridge, what a probability even
 *      means.
 *   2. Conditioning and independence ("table" to "multiply"), after
 *      conditional-probability.mdx, "Conditional probability from a table",
 *      and the multiplication rule of probability-basics.mdx.
 *   3. Bayes and the 99% test ("test" to "rule"), after
 *      conditional-probability.mdx, "The centerpiece", and
 *      statistical-fallacies.mdx, "Base-rate neglect".
 *   4. Monty Hall ("doors" to "games"), after conditional-probability.mdx.
 *   5. Expectation and variance, and expected value for decisions ("rv" to
 *      "next"), after random-variables.mdx. It ends on Unit 4's question, the
 *      named distributions.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number is the output of the lessons' own code blocks, re-run
 * with their seeds by measure.py (python 3.13, numpy 2.5.3, pandas 3.0.5) into
 * measurements.json, which data.ts reads.
 *   - probability-basics, "The frequentist view" (seed 7): of 100,000 flips,
 *     50,121 are heads, 0.5012, "point five zero one"; the first seven of
 *     them are all heads.
 *   - probability-basics, "The Law of Large Numbers" (seed 1): the running
 *     share of heads is 0.75 after four flips, runs from 0.404 to 0.56
 *     between ten and a hundred, "forty percent to fifty-six", and stays
 *     within 0.014 of a half after a thousand, "a point and a half". The page
 *     prints 0.500, 0.500 and 0.496 at 10, 100 and 5,000. The gambler's
 *     fallacy, "five heads in a row" and "swamped", is the page's own callout.
 *   - probability-basics, the multiplication rule: ten fair heads in a row is
 *     0.5 to the tenth, about 0.001, "one in a thousand".
 *   - conditional-probability, the table: 1,000 users; 30 of 500 paid and
 *     120 of 500 free users churned, 6% and 24%; 150 in all, 15%.
 *   - conditional-probability, the 99% test: 1 in 1,000, 99% sensitivity and
 *     specificity; the page's tree on 100,000 people gives 100 sick (99
 *     caught), 99,900 healthy (999 flagged), 1,098 positives and
 *     99/1,098 = 9.0%; 999 false alarms against 99 real cases is "ten to
 *     one", and 99,900 against 100 "nearly a thousand to one"; its simulation of 2,000,000 people (seed 7) gives
 *     2,008 of 22,000, 9.1%. A second, independent test (the page's
 *     callout) keeps 98.0 real cases and 10.0 false alarms: 90.75%,
 *     "ninety-one". statistical-fallacies runs the same people with a
 *     sensitivity of 1.00 and gets 9.1%; the video follows the 0.99.
 *   - conditional-probability, Monty Hall (seed 0): of 100,000 games,
 *     staying wins 0.332 and switching 0.668, "thirty-three" and
 *     "sixty-seven". The 1990 column is the page's: Marilyn vos Savant in
 *     Parade, switching wins 2/3, thousands of readers wrote in to say she
 *     was wrong (Tierney, New York Times, 21 July 1991, puts it at about
 *     10,000 letters).
 *   - random-variables: two flips mapped to a number of heads; the weighted
 *     die (0.1 each, 0.5 on six) has E[X] = 4.5, mode 6, and a mean of
 *     4.500 over 500,000 draws (seed 0); Var 3.25 and SD 1.80; the warranty
 *     ($80, $300 payout, p = 0.15) expects a $45 payout and $35 profit, and
 *     a million sold (seed 3) average $35.05. The one-shot caveat and
 *     insurance are the page's own callout.
 *
 * Written for the ear: short spoken sentences, no symbols or parentheses,
 * numbers as words, contractions, an ellipsis where a speaker would hold, and
 * two capitalised stresses.
 */
export const script: NarrationScript = {
  id: "probability",
  voice: "hope",
  // Room for the series intro (SeriesIntro, INTRO_SECONDS) before the first word.
  leadIn: 4.6,
  tail: 3,
  // A little more than the default 1.6 s before each scene, so each finished
  // figure holds a moment longer before the cut.
  sceneGap: 2.2,
  beats: [
    // ── Part 1. Long-run frequency ────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A summary and a plot describe the data you already have. To reason about data you haven't seen, you need probability... starting with what a probability even means.",
      pauseAfter: 0.4,
    },
    {
      id: "half",
      text: "Say a coin lands heads with probability one half. But a single flip is heads or tails. There's no half a head.",
      pauseAfter: 0.4,
    },
    {
      id: "longrun",
      text: "So read it the frequentist way, as the long run. A probability is the fraction of times something happens, when you repeat it over and over.",
      pauseAfter: 0.35,
    },
    {
      id: "flips",
      text: "That's easy to repeat in code. Flip a coin a hundred thousand times, and fifty thousand, one hundred and twenty-one come up heads.",
      pauseAfter: 0.3,
    },
    {
      id: "share",
      text: "Point five zero one. Close to a half... even though the first seven flips were all heads.", pauseAfter: 0.6,
    },
    { id: "lln-in", text: "So how long does the long run take?" },
    {
      id: "lln",
      scene: true,
      text: "Here's the share of heads so far, after every one of five thousand flips.",
      pauseAfter: 0.3,
    },
    {
      id: "early",
      text: "After four flips, it's at three quarters. Out to a hundred, it still swings from forty percent to fifty-six.",
      pauseAfter: 0.35,
    },
    {
      id: "late",
      text: "After a thousand, it never strays more than a point and a half from one half.",
      pauseAfter: 0.4,
    },
    {
      id: "law",
      text: "That's the law of large numbers. The short run is noisy... the long run is stable.",
      pauseAfter: 0.45,
    },
    {
      id: "memory",
      text: "But it doesn't work by balancing out. After five heads in a row, a fair coin is still fifty-fifty. It has no memory.",
      pauseAfter: 0.35,
    },
    {
      id: "swamp",
      text: "A streak is never paid back. It just gets swamped by everything that comes after it.",
    },
    { id: "table-in", text: "Most probabilities change, though, the moment you learn something." },

    // ── Part 2. Conditioning and independence ─────────────────────────────
    {
      id: "table",
      scene: true,
      text: "Here are a thousand users, split by plan, and by whether they churned this quarter.",
      pauseAfter: 0.3,
    },
    { id: "overall", text: "Across everyone, a hundred and fifty churned. Fifteen percent.", pauseAfter: 0.4 },
    {
      id: "paid",
      text: "Now condition on the plan. Of the five hundred paid users, thirty churned... six percent.",
      pauseAfter: 0.3,
    },
    { id: "free", text: "Of the five hundred free users, a hundred and twenty. Twenty-four percent.", pauseAfter: 0.4 },
    {
      id: "zoom",
      text: "That's all conditioning is. Keep only the rows where the condition holds, and take the fraction inside them.",
    },
    { id: "split-in", text: "And comparing those fractions tells you whether the two things are linked." },
    {
      id: "split",
      scene: true,
      text: "Draw each plan as a bar, split where its users churned.",
      pauseAfter: 0.3,
    },
    {
      id: "flat",
      text: "If knowing the plan told you nothing, both would split at the same height. Fifteen percent.",
      pauseAfter: 0.3,
    },
    {
      id: "indep",
      text: "That's independence: the chance given the plan is the same as the chance without it.",
      pauseAfter: 0.4,
    },
    {
      id: "step",
      text: "Here, the split jumps from six percent to twenty-four. Plan and churn are dependent, and that gap is information you can act on.",
      pauseAfter: 0.4,
    },
    {
      id: "multiply",
      text: "Independence is also what lets you multiply. Ten heads in a row is ten halves multiplied together... about one in a thousand.", pauseAfter: 0.6,
    },
    { id: "test-in", text: "And which way round you read a conditional matters more than it looks." },

    // ── Part 3. Bayes and the 99% test ────────────────────────────────────
    {
      id: "test",
      scene: true,
      text: "A disease affects one person in a thousand. A test for it is ninety-nine percent accurate, both ways. You test positive.",
      pauseAfter: 0.35,
    },
    {
      id: "gut",
      text: "What are the chances you have it? Your gut says ninety-nine percent. The answer is about nine.",
      pauseAfter: 0.7,
    },
    {
      id: "walk",
      text: "Walk a hundred thousand people through it. A hundred have the disease. Ninety-nine thousand, nine hundred don't.",
      pauseAfter: 0.3,
    },
    { id: "caught", text: "The test catches ninety-nine of the hundred.", pauseAfter: 0.3 },
    {
      id: "flagged",
      text: "But it also flags one percent of the healthy by mistake. That's nine hundred and ninety-nine false alarms.",
      pauseAfter: 0.6,
    },
    {
      id: "lineup",
      text: "Now line up everyone who tested positive. One thousand and ninety-eight people... and only ninety-nine of them are sick.",
      pauseAfter: 0.5,
    },
    { id: "nine", text: "That's nine percent.", pauseAfter: 0.3 },
    { id: "sim", text: "Simulate two million people instead, and you get nine point one." },
    {
      id: "inverse",
      scene: true,
      text: "The gut answer reads the conditional backwards. Ninety-nine percent of sick people test positive. That does NOT mean ninety-nine percent of positives are sick.",
      pauseAfter: 0.4,
    },
    {
      id: "bayes",
      text: "Bayes' rule turns one into the other, and it can't work without the base rate: how common the disease was before anyone was tested.",
      pauseAfter: 0.4,
    },
    {
      id: "neglect",
      text: "Healthy people outnumber the sick nearly a thousand to one, so their false alarms beat the real cases ten to one. Forgetting that is base-rate neglect.",
      pauseAfter: 0.5,
    },
    {
      id: "retest",
      text: "So test the positives again, with a second, independent test. Ninety-eight of the real cases stay positive... and only about ten of the false alarms.",
      pauseAfter: 0.4,
    },
    { id: "ninety", text: "Now nine positives in ten are real. Ninety-one percent.", pauseAfter: 0.5 },
    { id: "rule", text: "So before you trust a positive, ask how rare the thing is.", pauseAfter: 0.6 },
    { id: "doors-in", text: "Conditioning has fooled experts, too." },

    // ── Part 4. Monty Hall ────────────────────────────────────────────────
    {
      id: "doors",
      scene: true,
      text: "A game show has three doors. Behind one is a car, and behind the other two, goats. You pick a door.",
      pauseAfter: 0.35,
    },
    {
      id: "host",
      text: "Then the host, who knows where the car is, opens another door... and shows you a goat. Do you switch?",
      pauseAfter: 0.7,
    },
    {
      id: "column",
      text: "In nineteen ninety, a magazine columnist said yes: switching wins two times in three. Thousands of readers wrote in to tell her she was wrong.",
    },
    {
      id: "cases",
      scene: true,
      text: "She was right. Your first pick hides the car one time in three.",
      pauseAfter: 0.35,
    },
    {
      id: "goat",
      text: "The other two times, you've picked a goat... so the host has to open the other goat. The door he leaves shut has the car.",
      pauseAfter: 0.4,
    },
    {
      id: "knows",
      text: "His choice isn't random. It depends on where the car is, and that's information.",
      pauseAfter: 0.4,
    },
    {
      id: "games",
      text: "Play a hundred thousand games in code. Staying wins thirty-three percent of them. Switching wins sixty-seven.", pauseAfter: 0.6,
    },
    {
      id: "rv-in",
      text: "So far, the outcomes have been labels. Heads, a goat, a positive. To average them, you need numbers.",
    },

    // ── Part 5. Expected value ────────────────────────────────────────────
    {
      id: "rv",
      scene: true,
      text: "A random variable puts a number on each outcome. Flip two coins, and count the heads. Two, one, one... or zero.",
      pauseAfter: 0.4,
    },
    {
      id: "die",
      scene: true,
      text: "Its most useful summary is the expected value, the long-run average. Take a loaded die that lands on six half the time, and on each other face a tenth.",
      pauseAfter: 0.35,
    },
    { id: "weight", text: "Multiply each face by its chance, and add. Four point five.", pauseAfter: 0.4 },
    {
      id: "balance",
      text: "Picture the chances as weights on a beam. It balances at four and a half... which isn't a face on the die, and isn't the likeliest roll, either. That's six.",
      pauseAfter: 0.5,
    },
    {
      id: "rolls",
      text: "Roll it half a million times in code, and the average comes out four point five.",
      pauseAfter: 0.4,
    },
    {
      id: "spread",
      text: "Its spread is the variance, the average squared distance from that mean. Three point two five. Its square root, the standard deviation, is about one point eight.", pauseAfter: 0.6,
    },
    { id: "decide-in", text: "And that long-run average is how you weigh a decision." },
    {
      id: "warranty",
      scene: true,
      text: "A store sells an eighty-dollar warranty. It pays out three hundred if the device fails, and fifteen percent of them do.",
      pauseAfter: 0.35,
    },
    {
      id: "expect",
      text: "So the expected payout is fifteen percent of three hundred, forty-five dollars. The store expects to keep thirty-five per warranty.",
      pauseAfter: 0.35,
    },
    {
      id: "million",
      text: "Sell a million in code, and the average profit is thirty-five dollars and five cents. Good for the store... and, on average, a losing bet for the buyer.",
      pauseAfter: 0.4,
    },
    {
      id: "once",
      text: "But an average is for a gamble you face many times. For one loss you couldn't survive, the spread matters MORE... which is why people buy insurance at all.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "An expected value and a variance sum up one random variable. And many random variables share a handful of familiar shapes... the named distributions.",
    },
  ],
};
