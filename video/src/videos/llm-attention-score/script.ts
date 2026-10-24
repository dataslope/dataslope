import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "How one attention score is computed" (16:9), a deep dive in
 * How Large Language Models Work, Unit 2. It embeds on its own at
 * content/courses/how-llms-work/attention-intuition.mdx, "Query, key, value"
 * and "Doing it properly, with real vectors", beside the unit video
 * (llm-meaning), which states the mechanism and has no time to run it. This
 * one runs it, on the lesson's own vectors, start to finish:
 *
 *   1. The question ("hook" to "toy"): the trophy and the suitcase, and the
 *      three vectors every token makes from its embedding (query, key,
 *      value), as the lesson words them.
 *   2. The dot product ("arrows" to "cosine"): the query and the three keys
 *      as arrows; for each key, the matching numbers multiplied and added;
 *      the name; and cosine similarity, which the course taught, as the same
 *      sum on arrows shrunk to length one.
 *   3. Scores to weights ("scale" to "weights"): the division by the square
 *      root of two (d = 2 numbers per vector), then softmax in its two steps,
 *      e to the power of each score, then each over the total.
 *   4. The blend and the flip ("blend" to "answer"): the new vector as the
 *      values weighted and added; then the lesson's own suggestion, the query
 *      turned to 0.2, 1.0, and the weights swapping to suitcase.
 *   5. The recap ("recap", "heads"): the five steps in one line, and that a
 *      real model runs them for every pair of tokens in many heads.
 *
 * No series intro and no bridge: the video opens on its question and ends on
 * its takeaway, so it works for a viewer who has not seen the unit.
 *
 * Facts. Every number on screen is measure.py's (NumPy 2.4.6, the site's
 * Pyodide version) re-run of the lesson's block, through measurements.json
 * and data.ts. measure.py asserts the page's printed output
 * (lib/generated/block-outputs.json: scores 0.721 0.283 0.078, weights 0.461
 * 0.297 0.242, new vector 4.849 3.214) and the unit video's own numbers for
 * the same quantities against its run, so both videos tell one story.
 *   - The lesson's keys: trophy 1.0, 0.2; suitcase 0.3, 1.0; it 0.1, 0.1.
 *     Values: 10, 0; 0, 10; 1, 1. The query from "it": 1.0, 0.1.
 *   - Dot products, written out: 1.0 x 1.0 + 0.1 x 0.2 = 1.02 ("one point
 *     oh two"), 0.3 + 0.1 = 0.40 ("point four"), 0.1 + 0.01 = 0.11 ("point
 *     one one"). Divided by the square root of 2 (1.414): 0.721, 0.283,
 *     0.078, as the page prints them (it labels them "raw scores").
 *   - Softmax as two steps. The e-powers on screen are e raised to the shown
 *     scores, so a calculator agrees with the screen: 2.056, 1.327, 1.081,
 *     total 4.464. Unrounded, the first is 2.057 and the total 4.465; the
 *     weights are 0.461 ("point four six"), 0.297 and 0.242 either way, and
 *     add to one. The lesson's softmax subtracts the largest score before
 *     exponentiating, for safety; that changes no weight.
 *   - The new vector, 0.461 x (10, 0) + 0.297 x (0, 10) + 0.242 x (1, 1),
 *     is shown to two decimals, 4.85, 3.21: the shown weights give 4.852,
 *     3.212 to three, the unrounded ones the page's 4.849, 3.214, and to two
 *     decimals they agree.
 *   - The query 0.2, 1.0 (the lesson's "change query to [0.2, 1.0]"): dot
 *     products 0.40, 1.06 ("one point oh six"), 0.12; scores 0.283, 0.750,
 *     0.085; weights 0.293, 0.467 ("point four seven"), 0.240; new vector
 *     3.17, 4.91. Its e-powers are not drawn.
 *   - Cosine: the lesson's formula (similarity.mdx) divides the dot product
 *     by both lengths, which is the dot product of the two arrows scaled to
 *     length one. The figure draws the length-one circle and no cosine
 *     number; measure.py records cosine 0.995 for trophy's key and 0.774 for
 *     the pronoun's short one (length 0.141), which is why "attention keeps
 *     the lengths" matters: that key scores only 0.11.
 *   - "Real queries and keys hold many more numbers, so these sums get
 *     big": measure.py measures the spread of a dot product of two random
 *     vectors (seeded, entries of spread one): about 1.4 with 2 numbers and
 *     11 with 128 (a common size for one head's query and key), and about 1
 *     at any size once divided by the square root of the size. Not shown;
 *     the narration names no size, since it differs from model to model.
 *   - The three vectors per token "from its embedding" and the question each
 *     one asks are the lesson's own words. The embedding is drawn as cells
 *     without numbers, because the lesson gives none.
 *
 * Written for Drew, casual and curious: short spoken sentences, numbers as
 * they are said, no symbols. "The pronoun" stands in for the word "it"
 * aloud; the screen sets it in mono.
 */
export const script: NarrationScript = {
  id: "llm-attention-score",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  // One take: the recap's two beats would otherwise be a 198-character take
  // of their own.
  takeChars: 1900,
  beats: [
    // ── 1. The question ───────────────────────────────────────────────────
    { id: "hook", scene: true, text: "The trophy didn't fit in the suitcase because it was too big.", pauseAfter: 0.5 },
    {
      id: "ask",
      text: "Attention gives the pronoun a weight on every token, and trophy should win. Let's compute one, by hand.",
      pauseAfter: 0.7,
    },
    { id: "three", text: "Every token turns its embedding into three short vectors." },
    { id: "query", text: "A query: what am I looking for?", pauseAfter: 0.5 },
    { id: "key", text: "A key: what do I offer?", pauseAfter: 0.5 },
    { id: "value", text: "And a value: what I hand over.", pauseAfter: 0.7 },
    { id: "toy", text: "The lesson keeps them tiny. Two numbers each.", pauseAfter: 0.6 },

    // ── 2. The dot product ────────────────────────────────────────────────
    {
      id: "arrows",
      scene: true,
      text: "With two numbers, they're arrows. Here's the pronoun's query, and the three keys.",
      pauseAfter: 0.5,
    },
    { id: "along", text: "The query points almost along trophy's key, and far from suitcase's.", pauseAfter: 0.7 },
    {
      id: "multiply",
      text: "To score a key, multiply the matching numbers, and add. One times one, plus point one times point two. One point oh two.",
      pauseAfter: 0.8,
    },
    {
      id: "others",
      text: "Suitcase gets point three plus point one, so point four. The pronoun's own key, point one one.",
      pauseAfter: 0.7,
    },
    { id: "dot", text: "That multiply and add is the dot product.", pauseAfter: 0.9 },
    {
      id: "cosine",
      text: "You've met it before: cosine similarity is a dot product of arrows shrunk to length one. Attention keeps the lengths.",
      pauseAfter: 0.8,
    },

    // ── 3. Scores to weights ──────────────────────────────────────────────
    {
      id: "scale",
      scene: true,
      text: "One adjustment first. Real queries and keys hold many more numbers, so these sums get big, and softmax would hand nearly everything to the top one.",
      pauseAfter: 0.6,
    },
    {
      id: "root",
      text: "So each score is divided by the square root of how many numbers a vector holds. Here, root two.",
      pauseAfter: 0.8,
    },
    { id: "softmax", text: "Now softmax makes weights, in two steps. Raise e to the power of each score.", pauseAfter: 0.6 },
    { id: "divide", text: "Then divide each one by their total.", pauseAfter: 0.7 },
    { id: "weights", text: "Trophy takes point four six, the biggest share. And the three add up to one.", pauseAfter: 0.9 },

    // ── 4. The blend, and the flip ────────────────────────────────────────
    {
      id: "blend",
      scene: true,
      text: "The pronoun's new vector is the three values, each scaled by its weight, and added.",
      pauseAfter: 0.6,
    },
    { id: "lands", text: "So it lands nearest trophy's value.", pauseAfter: 0.8 },
    { id: "flip", text: "Now turn the query toward suitcase, and run it again.", pauseAfter: 0.6 },
    {
      id: "swap",
      text: "Suitcase's key wins the dot product, one point oh six. It takes point four seven, and the blend swings over.",
      pauseAfter: 0.8,
    },
    { id: "answer", text: "A different question, a different answer.", pauseAfter: 0.9 },

    // ── 5. The recap ──────────────────────────────────────────────────────
    {
      id: "recap",
      scene: true,
      text: "So that's one attention weight. Multiply and add, scale, raise e, divide, blend.",
      pauseAfter: 0.8,
    },
    {
      id: "heads",
      text: "A real model runs this for every pair of tokens, in many heads at once, each making its own queries, keys and values.",
    },
  ],
};
