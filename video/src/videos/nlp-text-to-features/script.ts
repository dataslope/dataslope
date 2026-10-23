import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "From text to features" (16:9), Unit 4 of Natural Language
 * Processing with Python. One argument in four parts, after the unit's four
 * lessons in content/courses/natural-language-processing-python/:
 *
 *   1. Choosing the pipeline ("hook" to "count-in"), after
 *      choosing-your-pipeline.mdx: the steps are a menu, not a recipe; the
 *      one question to ask of each; one review through a topic pipeline and
 *      a sentiment pipeline; the lesson's task-by-task table; and an
 *      ablation. It opens on Unit 3's last line, "a model wants numbers, not
 *      lists of words".
 *   2. Bag of words ("bag" to "common-in"), after bag-of-words.mdx: the
 *      vocabulary, the document-term matrix, counts against presence, and
 *      the three things the bag throws away.
 *   3. TF-IDF ("counts" to "decide-in"), after tf-idf.mdx and the TfIdf
 *      standalone video (src/videos/tf-idf/), whose measure.py approach and
 *      table scenes are adapted here: idf, tf, the column that drops to
 *      zero, and the four-way tie the lesson points out.
 *   4. Rule-based sentiment ("lexicon" to "next"), after
 *      rule-based-sentiment.mdx: a lexicon, the naive count and its failure,
 *      the negation flag and its reset, and the limits that motivate
 *      learning. It ends on Unit 5's subject, the field's history.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every token, vector, weight and verdict on screen is what the
 * lessons' own code printed when measure.py ran it (Python 3.13, NLTK 3.9.4,
 * NumPy 2.4.6, scikit-learn 1.8.0, the site's Pyodide versions) into
 * measurements.json, which data.ts reads. measure.py also compares each
 * printed result with the site's prepopulated output
 * (lib/generated/block-outputs.json) and exits if one differs; all eight
 * agree.
 *   - choosing-your-pipeline, "one text, two pipelines": the review "The plot
 *     was not good, but the acting was brilliant!"; the topic pipeline keeps
 *     plot, good, acting, brilliant; the sentiment pipeline keeps plot, not,
 *     good, but, acting, brilliant and adds five bigrams, ("not", "good")
 *     among them. "not" and "but" are on NLTK's English list ("never" is
 *     not, which the lesson's keep set covers anyway). The menu's four
 *     questions, the one question ("does the information this step changes
 *     or destroys matter to my task?"), the task table and the ablation are
 *     the lesson's prose; the table rows read aloud are its Search, Topic,
 *     Sentiment and Authorship rows.
 *   - bag-of-words, "Building it by hand": three documents, a sorted
 *     vocabulary of nine words, doc1's row (the twice; cat, mat, on, sat
 *     once). "Counts vs. presence": "free free free winner cheap" gives the
 *     count vector 1, 3, 0, 0, 1 and the binary vector 1, 1, 0, 0, 1. "dog
 *     bites man" and "man bites dog" are counted the lesson's way and give
 *     the same bag. "Tens of thousands of words" and "great" and
 *     "excellent" as unrelated columns are the lesson's limitations list.
 *   - tf-idf, "Step 2" and "Step 3", the lesson's textbook formula:
 *     tf = count / words in the document, idf = ln(N / df), the natural log
 *     with no smoothing. "the" is in 3 of 3 documents, idf ln 1 = 0; "cat"
 *     in 1, idf ln 3 = 1.0986 ("about one point one"); cat's tf 1/6 and
 *     tf-idf 0.183 ("about zero point one eight"); "the" 2/6 times 0 = 0;
 *     cat, mat, on and sat tie at 0.183 at the top of Doc 1, which the
 *     lesson's prose points out ("on" says nothing about the topic).
 *     measure.py checks the table against scikit-learn too. The lesson's
 *     callout on scikit-learn's default TfidfVectorizer(): idf =
 *     ln((1 + N) / (1 + df)) + 1, 1.00 for "the" and 1.69 for "cat"; with raw
 *     counts and each row scaled to length one, "the" scores 0.51 in every
 *     row against 0.43 for each other word ("it even stays on top").
 *   - rule-based-sentiment: the lesson's lexicon of seven positive and seven
 *     negative words; the naive counter gives positive, negative, positive
 *     for "I love this movie", "This film is terrible", "It is not good";
 *     the negation-aware version (negations not, no, never, n't; reset at
 *     . ! ? , ; and "but") gives negative for "It is not good", positive
 *     for "This is not bad at all", and neutral (+1 - 1) for "The plot was
 *     good but the acting was awful". The lesson's sarcasm line "Oh great,
 *     another delay" run through that classifier scores +1, positive, and
 *     "unpredictable" is in neither list, so it scores 0. The baseline's
 *     virtues ("fast, transparent, needs no labeled data, and gives you a
 *     score to beat") are the lesson's "Why start with rules?" callout.
 *   - The bridge's dates are the history lesson's (interesting-
 *     discussions.mdx): Spärck Jones's IDF paper, Journal of Documentation
 *     28(1), 1972; Shannon's "A Mathematical Theory of Communication", 1948,
 *     whose word approximations count which word follows which.
 *
 * Written for Hope's voice, upbeat and clear: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, an ellipsis where a
 * speaker would hold, and a breath after each new term or result.
 */
export const script: NarrationScript = {
  id: "nlp-text-to-features",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Choosing the pipeline ─────────────────────────────────────
    { id: "hook", scene: true, text: "A model wants numbers, not lists of words.", pauseAfter: 0.7 },
    {
      id: "unit",
      text: "So this unit turns text into features: rows of numbers a program can learn from.",
      pauseAfter: 0.8,
    },
    { id: "menu", text: "But first, a choice. The cleaning steps are a menu, not a recipe.", pauseAfter: 0.6 },
    {
      id: "steps",
      text: "You'll nearly always tokenize. After that, every step is a question. Lowercase? Drop stopwords? Stem or lemmatize? Add n-grams?",
      pauseAfter: 0.7,
    },
    {
      id: "test",
      text: "And each one has the same test. Does what this step throws away matter to your task? If it's noise, drop it. If it's signal, keep it.",
      pauseAfter: 1.0,
    },
    {
      id: "review",
      scene: true,
      text: "Take one review. The plot was not good, but the acting was brilliant.",
      pauseAfter: 0.6,
    },
    {
      id: "topic",
      text: "A topic pipeline drops every stopword. The words not and but are both on NLTK's list, so what's left is plot, good, acting, brilliant.",
      pauseAfter: 0.7,
    },
    {
      id: "about",
      text: "That's fine for what the review is about. But read it for feeling, and it now just says good.",
      pauseAfter: 0.9,
    },
    {
      id: "sentiment",
      text: "A sentiment pipeline keeps the negations, and adds word pairs, so not good survives as a unit.",
      pauseAfter: 1.0,
    },
    {
      id: "tasks",
      scene: true,
      text: "Every task chooses differently. Search wants stems. Topics want real words, so lemmas. Sentiment keeps its stopwords.",
      pauseAfter: 0.6,
    },
    {
      id: "author",
      text: "And to tell who wrote a text, the stopwords are the signal itself.",
      pauseAfter: 0.9,
    },
    {
      id: "ablate",
      text: "So don't guess. Change one step at a time, and measure on your own task. That's called an ablation.",
      pauseAfter: 1.0,
    },
    {
      id: "default",
      text: "A safe default: tokenize, lowercase, and keep the stopwords until a measurement says to drop them.",
      pauseAfter: 0.9,
    },
    { id: "count-in", text: "With the tokens chosen, the next job is to count them." },

    // ── Part 2. Bag of words ──────────────────────────────────────────────
    {
      id: "bag",
      scene: true,
      text: "The simplest way is a bag of words. Tip a document's words into a bag and shake it. You keep which words, and how many times, but not their order.",
      pauseAfter: 0.9,
    },
    {
      id: "vocab",
      text: "Take three tiny documents. First, build a vocabulary: every distinct word, sorted. Here, that's nine.",
      pauseAfter: 0.7,
    },
    {
      id: "rows",
      text: "Then give each document a row, with one column per word. The first document has the word the twice, and cat, mat, on and sat once each.",
      pauseAfter: 0.7,
    },
    {
      id: "matrix",
      text: "That's a document-term matrix. Every row has the same nine columns, so rows can be compared, added up, and handed to a classifier.",
      pauseAfter: 1.0,
    },
    {
      id: "binary",
      scene: true,
      text: "Sometimes all that matters is whether a word is there. This spam says free three times.",
      pauseAfter: 0.6,
    },
    {
      id: "vectors",
      text: "The count vector keeps the three. The binary vector just marks a one, for present.",
      pauseAfter: 1.0,
    },
    {
      id: "order",
      scene: true,
      text: "The bag has blind spots. Dog bites man and man bites dog make exactly the same bag.",
      pauseAfter: 0.8,
    },
    {
      id: "sparse",
      text: "Real vocabularies run to tens of thousands of words, so almost every cell is zero.",
      pauseAfter: 0.7,
    },
    {
      id: "meaning",
      text: "And great and excellent are just two unrelated columns. The bag knows nothing about meaning.",
      pauseAfter: 0.9,
    },
    {
      id: "common-in",
      text: "One weakness has a neat fix, though: the most common words get the biggest counts, and say the least.",
    },

    // ── Part 3. TF-IDF ────────────────────────────────────────────────────
    {
      id: "counts",
      scene: true,
      text: "Here are three new documents: a cat on a mat, a dog in a park, a comet in the sky. By raw count, the word the leads every row, with two.",
      pauseAfter: 0.6,
    },
    {
      id: "same",
      text: "But a column that's the same in every row can't tell the documents apart.",
      pauseAfter: 0.9,
    },
    {
      id: "idf",
      scene: true,
      text: "TF-IDF weighs each word by how telling it is. Start with inverse document frequency: divide the number of documents by how many contain the word, then take the natural log.",
      pauseAfter: 0.7,
    },
    { id: "idf-the", text: "The word the is in all three. Three over three is one, and the log of one is zero.", pauseAfter: 0.8 },
    { id: "idf-cat", text: "Cat is in just one, so it gets the log of three, about one point one.", pauseAfter: 0.9 },
    {
      id: "tf",
      scene: true,
      text: "Now multiply by term frequency, each word's share of its document. Cat is one word in six, so it scores about zero point one eight.",
      pauseAfter: 0.7,
    },
    {
      id: "flip",
      text: "The word the is two in six, times zero. The column that led every row drops to zero.",
      pauseAfter: 0.9,
    },
    {
      id: "tie",
      text: "At the top of the first document, cat, mat, on and sat tie. On says nothing about cats, but it's just as rare, and rarity is all IDF can see.",
      pauseAfter: 0.9,
    },
    {
      id: "rule",
      text: "So TF-IDF rewards words that are frequent here and rare elsewhere, with no stopword list at all.",
      pauseAfter: 0.8,
    },
    {
      id: "sklearn",
      scene: true,
      text: "One caution: that's the textbook formula. Scikit-learn's default smooths it and adds one, so the word the never reaches zero. On these three documents, it even stays on top.",
      pauseAfter: 0.9,
    },
    { id: "decide-in", text: "Counts and weights describe a text. The last step makes a call on one: is it positive, or negative?" },

    // ── Part 4. Rule-based sentiment ──────────────────────────────────────
    {
      id: "lexicon",
      scene: true,
      text: "The simplest sentiment classifier is two word lists: seven positive words, and seven negative.",
      pauseAfter: 0.6,
    },
    {
      id: "score",
      text: "Add one for each positive word, take one away for each negative word, and read the sign.",
      pauseAfter: 0.9,
    },
    {
      id: "naive",
      text: "I love this movie: positive. This film is terrible: negative. It is not good... positive.",
      pauseAfter: 0.6,
    },
    { id: "wrong", text: "The counter sees good, and never reads the not.", pauseAfter: 0.9 },
    {
      id: "blind",
      text: "Counting words one at a time is a bag of words, so it's blind to order, too.",
      pauseAfter: 0.8,
    },
    {
      id: "flag",
      scene: true,
      text: "The fix is one flag. A negation like not, no or never switches it on, and the next sentiment word flips its sign.",
      pauseAfter: 0.7,
    },
    {
      id: "reset",
      text: "A comma, a full stop, or the word but switches it off again, so a not can't reach into the next clause.",
      pauseAfter: 0.7,
    },
    {
      id: "fixed",
      text: "Now, it is not good comes out negative. And this is not bad at all comes out positive.",
      pauseAfter: 0.9,
    },
    {
      id: "mixed",
      text: "The plot was good but the acting was awful? Plus one, minus one... neutral.",
      pauseAfter: 0.9,
    },
    {
      id: "limits",
      scene: true,
      text: "Rules have ceilings. Take sarcasm: oh great, another delay scores positive, because the words can't see the wink.",
      pauseAfter: 0.7,
    },
    {
      id: "context",
      text: "Context, too: unpredictable is bad in brakes and good in a thriller. And a word missing from the lists counts for nothing.",
      pauseAfter: 0.7,
    },
    {
      id: "baseline",
      text: "Still, a rule-based baseline is worth building first. It's fast, it needs no training data, and it gives you a score to beat.",
      pauseAfter: 0.7,
    },
    {
      id: "learn",
      text: "When it falls short, models learn from labeled examples. But they still tokenize, clean and count, just like this unit did.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "And many of these ideas are much older than they look. IDF dates from nineteen seventy-two, and counting word pairs from nineteen forty-eight.",
    },
  ],
};
