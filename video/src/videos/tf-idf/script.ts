import type { NarrationScript } from "../../narration/types";

/**
 * Narration for "TF-IDF" (16:9), after
 * content/courses/natural-language-processing-python/tf-idf.mdx, whose own
 * three-document corpus ("the cat sat on the mat", "the dog ran in the park",
 * "the comet streaked across the sky") and formulas are used throughout, with
 * the document-term layout of bag-of-words.mdx in the same course.
 *
 * The formula is the lesson's, and the textbook one:
 *   tf(w, d) = count of w in d / words in d,
 *   idf(w)   = ln(N / df(w)), the natural log with no smoothing,
 *   tfidf    = tf * idf.
 * scikit-learn's default is different, and the "sklearn" beat says so.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts, each computed by measure.py twice, by hand with Counter and math.log
 * and with scikit-learn 1.9.1, and asserted equal (measurements.json; every
 * number on screen comes from data.ts, which imports it):
 *   - every document is six words, and "the" appears twice in each, more than
 *     any other word, which appears once at most;
 *   - "the" is in all three documents, so idf = ln(3/3) = ln 1 = 0;
 *   - every other word, "cat" among them, is in exactly one document, so its
 *     idf is ln 3 = 1.0986, "about one point one";
 *   - "cat" is one word in six: tf = 0.1667, tf-idf = 0.1831, "about zero
 *     point one eight", as the lesson's own code prints (0.183);
 *   - "the" is two in six: tf-idf = 2/6 * 0 = 0 in every row;
 *   - every word in only one document scores the same 0.1831;
 *   - scikit-learn's TfidfVectorizer() defaults to smooth_idf=True, giving
 *     idf = ln((1 + N) / (1 + df)) + 1: 1.00 for "the" and 1.69 for "cat".
 *     With its raw counts and default L2 row scaling, "the" scores 0.509 in
 *     every row against 0.431 for each other word, so it stays on top.
 *
 * Written to be spoken: short sentences, no symbols, no parentheses.
 */
export const script: NarrationScript = {
  id: "tf-idf",
  leadIn: 0.5,
  tail: 2.4,
  beats: [
    {
      id: "hook",
      text: "Count the words in these three tiny documents. In every one, the most common word is the word the.",
      pauseAfter: 0.5,
    },
    {
      id: "counts",
      scene: true,
      text: "Here are the counts. The scores two in every row, more than any other word. But a column that is the same in every row cannot tell the documents apart.",
      pauseAfter: 0.6,
    },
    {
      id: "idf",
      scene: true,
      text: "Inverse document frequency fixes that. Divide the number of documents by how many contain the word, and take the natural log.",
      pauseAfter: 0.35,
    },
    { id: "idf-the", text: "The is in all three. Three over three is one, and the log of one is zero.", pauseAfter: 0.3 },
    { id: "idf-cat", text: "Cat is in just one, so it gets the log of three, about one point one.", pauseAfter: 0.6 },
    {
      id: "tf",
      scene: true,
      text: "Now multiply by term frequency, each word's share of its document. Cat is one word in six, so it scores about zero point one eight.",
      pauseAfter: 0.3,
    },
    { id: "flip", text: "The is two in six, times zero. The column that led every row drops to zero.", pauseAfter: 0.5 },
    {
      id: "distinct",
      text: "What stays high is what only one document says. Cat and mat. Dog and park. Comet and sky.",
      pauseAfter: 0.6,
    },
    {
      id: "sklearn",
      scene: true,
      text: "One warning. This is the textbook formula. Scikit-learn's default smooths it and adds one, so the never reaches zero. On these three documents, it even stays on top.",
      pauseAfter: 0.6,
    },
    {
      id: "rule",
      scene: true,
      text: "Raw counts reward common words. TF-IDF rewards the words that are frequent here and rare elsewhere.",
    },
  ],
};
