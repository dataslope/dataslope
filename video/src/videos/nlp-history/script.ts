import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "How the field got here" (16:9), Unit 5 of Natural Language
 * Processing with Python and the course's last video, after
 * content/courses/natural-language-processing-python/interesting-discussions.mdx.
 *
 * Order. The lesson tells its stories by theme (the goal, the hype, then the
 * techniques). The video tells them in the order they happened, oldest first,
 * because its opening claim is about age: Unit 4 ended on "many of these
 * ideas are much older than they look", so the video opens by putting three
 * of the course's own ideas on a timeline (Fig. 1) and then walks that line.
 * Told in order, the stories also fall into a shape the lesson's callouts
 * point at: counting (Zipf, Shannon), then the goal and the hype around it
 * (Turing, Georgetown–IBM, ELIZA), then counting again (Spärck Jones,
 * word2vec), and the close brings Fig. 1 back with all seven on it.
 *
 *   Opening ("hook" to "order"): three course ideas by birth year.
 *   1. Zipf, 1930s ("zipf" to "zipf-out"), with the lesson's Emma count.
 *   2. Shannon, 1948 ("shannon" to "shannon-out"), his book-at-random
 *      sampling and the lesson's next-word counts.
 *   3. Turing, 1950 ("turing" to "turing-out").
 *   4. Georgetown–IBM, 1954, and ALPAC, 1966 ("georgetown" to
 *      "georgetown-out").
 *   5. ELIZA, 1966 ("eliza" to "eliza-out"), with the lesson's rules.
 *   6. Spärck Jones and IDF, 1972 ("sparck" to "sparck-out").
 *   7. word2vec, 2013 ("w2v" to "great").
 *   Close ("close" to "end"): the lesson's "each advance kept the layer
 *   beneath it" and its two warnings. The course's last video: no NextLine.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts from a run (measure.py, NLTK 3.9.4 and NumPy 2.4.6, into
 * measurements.json, which data.ts reads):
 *   - Emma, the lesson's Zipf block verbatim: 161,600 alphabetic words, 7,079
 *     different, 2,739 of them once ("nearly four in ten"); the top hundred
 *     are 60.0% of the book ("sixty percent"); the top two are "to" 5,239 and
 *     "the" 5,201 ("almost tie"). Log count against log rank over ranks 1 to
 *     1,000 has slope -1.14: on log scales, close to the straight line of
 *     one over the rank. "The second word turns up about half as often as
 *     the first, the tenth a tenth as often" is the law's prediction, and the
 *     ghost cell beside "the" is half of 5,239, 2,620 (measure.py's
 *     secondByLaw). The page's own output (block-outputs.json 420e59ef)
 *     prints the same eight rows. Where the lesson's prose and its numbers
 *     disagree, the video follows the numbers: the lesson reads that table as
 *     rank times count staying "in the same ballpark" with the top word
 *     "roughly twice the second", but its own numbers run 5,239 to 19,752 and
 *     the top two nearly tie, so the video says the top is rough and gives
 *     the law on the whole vocabulary. The two shares (60% of the book, 39%
 *     of the different words) are drawn on linear bars as well, because the
 *     log rank axis gives the top hundred half its width.
 *   - Next-word counts, the lesson's block verbatim: after "the", cat 3 and
 *     dog 2, guess cat (block-outputs.json 3ed0a4c2).
 *   - ELIZA, the lesson's block verbatim: "I need a break" gives "Why do you
 *     need a break?", and the other three replies (207d9aa4).
 *   - Spärck Jones's weight, her paper's own rule and example (below),
 *     computed and asserted: in 200 documents, a term in 90 weighs 2 and one
 *     in 3 weighs 7. Her rule counts halvings, so it tracks log2(N / n) + 1:
 *     2.15 and 7.06, printed under each weight as the bridge to the course's
 *     log(N / df).
 *   - word2vec: NLTK's sample of the GoogleNews vectors (43,981 words, 300
 *     numbers each). Leaving out the three question words, the nearest word
 *     to king - man + woman is queen (cosine 0.712; "the nearest other
 *     word", since king itself is nearer, 0.799), then monarch and
 *     princess; "great" is among the six nearest to "excellent" (0.612).
 *
 * Facts from sources (the lesson's, each checked):
 *   - Zipf: George Kingsley Zipf (1902-1950), Harvard; the word-frequency law
 *     in The Psycho-Biology of Language (1935), ranked again in Human
 *     Behavior and the Principle of Least Effort (1949). Others noticed the
 *     regularity earlier (Estoup, Condon), so the video says Zipf "counted
 *     words" and names the law, and dates him to the thirties. The opening
 *     card for 1935 reads "Ranking word counts", not counting words, which is
 *     far older; 2026 - 1935 = 91, "over ninety".
 *   - Shannon: "A Mathematical Theory of Communication", Bell System
 *     Technical Journal 27, July and October 1948. Part I, section 3: the
 *     "second-order word approximation" begins "THE HEAD AND IN FRONTAL
 *     ATTACK ON AN ENGLISH WRITER THAT THE CHARACTER OF THIS POINT IS
 *     THEREFORE ANOTHER METHOD FOR THE LETTERS THAT THE TIME OF WHO EVER TOLD
 *     THE PROBLEM FOR AN UNEXPECTED." It was made by hand: "one opens a book
 *     at random and selects a letter at random on the page ... A similar
 *     process was used for (4), (5) and (6)" (the paper, p. 8 of the
 *     reprint). "Founded information theory" is the lesson's.
 *   - Turing: "Computing Machinery and Intelligence", Mind 59(236), October
 *     1950, pp. 433-460. It opens "I propose to consider the question, 'Can
 *     machines think?'", replaces it with the imitation game, and asks for
 *     typewritten answers, ideally by "a teleprinter communicating between
 *     the two rooms". "Turing test" is the later name, as the lesson says.
 *   - Georgetown–IBM: demonstrated 7 January 1954 at IBM's New York
 *     headquarters on an IBM 701; "250 words, 6 rules, limited sentences
 *     (just over 60)", front-page headlines; Leon Dostert forecast that
 *     "five, perhaps three, years hence, interlingual meaning conversion by
 *     electronic process in important functional areas of several languages
 *     may well be an accomplished fact" (Christian Science Monitor), all
 *     from J. Hutchins, "The Georgetown-IBM experiment demonstrated in
 *     January 1954" (AMTA 2004 slides). The lesson's "a few dozen Russian
 *     sentences" is consistent; the video says "about sixty".
 *   - ALPAC, the Automatic Language Processing Advisory Committee that US
 *     government agencies convened in 1964 ("a government committee"):
 *     Language and Machines: Computers in Translation and Linguistics
 *     (National Academy of Sciences, 1966) found "no immediate or
 *     predictable prospect of useful machine translation" (p. 32; said "no
 *     near-term prospect"), and US
 *     funding for machine translation largely ended (Hutchins, as above:
 *     "ended funding in US in favour of basic NLP").
 *   - ELIZA: Weizenbaum, "ELIZA: A Computer Program for the Study of Natural
 *     Language Communication Between Man and Machine", Communications of the
 *     ACM 9(1), January 1966, pp. 36-45, MIT; its DOCTOR script parodies a
 *     Rogerian psychotherapist. His secretary, who "had watched me work on
 *     the program for many months", after "only a few interchanges with it
 *     ... asked me to leave the room" (Computer Power and Human Reason,
 *     1976, p. 6). ALPAC and ELIZA share 1966 ("that same year").
 *   - Spärck Jones: "A statistical interpretation of term specificity and its
 *     application in retrieval", Journal of Documentation 28(1), 1972, pp.
 *     11-21: a match on a frequent term "counts for as much as a
 *     non-frequent one", so weight a term by collection frequency, "f(N) -
 *     f(n) + 1", "a term occurring ninety times has weight 2, while one
 *     occurring three times has weight 7" (Cranfield, 200 documents). She
 *     worked at Cambridge (Cambridge Language Research Unit, then the
 *     Computer Laboratory). "Spark" is how her name is said; the screen sets
 *     Spärck. Search engines "still lean on it": BM25, the default ranking in
 *     Lucene, Elasticsearch and Solr, carries an IDF term. The lesson's
 *     footnote goes further ("every search engine you use"), which the video
 *     does not repeat.
 *   - word2vec: Mikolov, Chen, Corrado and Dean (Google), "Efficient
 *     Estimation of Word Representations in Vector Space", arXiv 1301.3781,
 *     16 January 2013, all four authors at "Google Inc., Mountain View, CA"
 *     (the paper's own first page, shown as a card); "King - Man + Woman"
 *     gives "a vector very close to
 *     Queen" (Mikolov, Yih and Zweig, NAACL 2013). Said "word to vec",
 *     "Tomash" for Tomáš; the screen sets both as written.
 *   - The close is the lesson's own "Why the history matters" callout, with
 *     its two cautions (the Georgetown–IBM callout and the ELIZA section).
 *
 * Written for Hope, upbeat and clear: short spoken sentences, years as
 * spoken, no symbols or parentheses, and a breath after every term and
 * result.
 */
export const script: NarrationScript = {
  id: "nlp-history",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening: older than they look ─────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Counting words. Guessing the next word from the last one. Giving rare words extra weight. These ideas are much older than they look.",
      pauseAfter: 0.7,
    },
    {
      id: "age",
      text: "The youngest of the three is over fifty. The oldest is over ninety.",
      pauseAfter: 0.9,
    },
    {
      id: "order",
      text: "So here's how the field got here, oldest first.",
    },

    // ── 1. Zipf, the 1930s ────────────────────────────────────────────────
    {
      id: "zipf",
      scene: true,
      text: "It starts in the nineteen thirties, when the linguist George Zipf counted words.",
    },
    {
      id: "law",
      text: "Rank them by how common they are, and the second word turns up about half as often as the first, the tenth a tenth as often. On these log scales, that's a straight line: Zipf's law.",
      pauseAfter: 0.9,
    },
    {
      id: "emma",
      text: "Here's the course's count of Jane Austen's Emma. The top is rough: the first two words almost tie.",
      pauseAfter: 0.7,
    },
    {
      id: "tail",
      text: "But a hundred words make up sixty percent of the book, and of its seven thousand different words, nearly four in ten appear just once.",
      pauseAfter: 0.9,
    },
    { id: "zipf-out", text: "Next, counts like these became a way to predict." },

    // ── 2. Shannon, 1948 ──────────────────────────────────────────────────
    {
      id: "shannon",
      scene: true,
      text: "In nineteen forty-eight, Claude Shannon founded information theory.",
    },
    {
      id: "guess",
      text: "Tucked inside his paper: guess the next word from the one before, by how often each word follows another.",
      pauseAfter: 0.8,
    },
    {
      id: "book",
      text: "He even made text that way, by hand: open a book at random, find the word, copy the one after it, repeat.",
    },
    {
      id: "sample",
      text: "Here's what came out. The head and in frontal attack on an English writer... It reads like English, and says nothing.",
      pauseAfter: 0.9,
    },
    {
      id: "demo",
      text: "The course's tiny version does the same: after the word the, cat comes three times and dog twice, so it guesses cat.",
      pauseAfter: 0.8,
    },
    {
      id: "ngram",
      text: "That's an n-gram model. Today's language models still make that guess, with far more than counts behind it.",
      pauseAfter: 0.9,
    },
    { id: "shannon-out", text: "But could a machine that strings words together ever hold a conversation?" },

    // ── 3. Turing, 1950 ───────────────────────────────────────────────────
    {
      id: "turing",
      scene: true,
      text: "In nineteen fifty, Alan Turing asked whether machines can think, then swapped that question for a test.",
    },
    {
      id: "game",
      text: "A judge trades typed messages with a hidden person and a hidden machine. If the judge can't tell which is which, the machine passes.",
      pauseAfter: 0.7,
    },
    {
      id: "name",
      text: "He called it the imitation game. We call it the Turing test, and every chatbot since has been chasing it.",
      pauseAfter: 0.8,
    },
    { id: "turing-out", text: "Four years later, a demo made that goal look close." },

    // ── 4. Georgetown–IBM, 1954, and ALPAC, 1966 ──────────────────────────
    {
      id: "georgetown",
      scene: true,
      text: "In nineteen fifty-four, Georgetown and IBM showed a computer translating Russian into English.",
    },
    {
      id: "small",
      text: "It knew two hundred and fifty words and six grammar rules, and translated about sixty hand-picked sentences.",
      pauseAfter: 0.7,
    },
    {
      id: "hype",
      text: "The papers loved it. One of its leaders predicted working translation in five years, perhaps three.",
      pauseAfter: 0.7,
    },
    {
      id: "alpac",
      text: "Twelve years later, a government committee saw no near-term prospect of useful machine translation, and the funding dried up.",
      pauseAfter: 0.8,
    },
    { id: "moral", text: "A polished demo is not a working system.", pauseAfter: 1.0 },
    { id: "georgetown-out", text: "And that same year, a tiny program at MIT showed a subtler trap." },

    // ── 5. ELIZA, 1966 ────────────────────────────────────────────────────
    {
      id: "eliza",
      scene: true,
      text: "Joseph Weizenbaum wrote Eliza, a program that played a therapist.",
    },
    {
      id: "rules",
      text: "Its whole trick: spot a phrase like I need, and hand it back as a question.",
      pauseAfter: 0.7,
    },
    {
      id: "confided",
      text: "There's no understanding in it at all. Yet people confided in it. Weizenbaum's own secretary asked him to leave the room.",
      pauseAfter: 0.9,
    },
    {
      id: "effect",
      text: "Seeing real understanding in a simple text trick is now called the Eliza effect.",
      pauseAfter: 1.0,
    },
    { id: "eliza-out", text: "Meanwhile, the quiet counting kept paying off." },

    // ── 6. Spärck Jones and IDF, 1972 ─────────────────────────────────────
    {
      id: "sparck",
      scene: true,
      text: "In nineteen seventy-two, Karen Spark Jones, at Cambridge, saw a flaw in how search matched words.",
    },
    {
      id: "flaw",
      text: "A match on a common word counted just as much as a match on a rare one.",
      pauseAfter: 1.1,
    },
    {
      id: "fix",
      text: "Her fix: the fewer documents a word appears in, the more a match on it is worth.",
      pauseAfter: 0.9,
    },
    {
      id: "example",
      text: "In her example of two hundred documents, a word in ninety weighs two, and a word in just three weighs seven.",
      pauseAfter: 0.9,
    },
    {
      id: "idf",
      text: "That's inverse document frequency, the IDF in TF-IDF, and search engines still lean on it today.",
      pauseAfter: 0.8,
    },
    { id: "sparck-out", text: "The last story jumps ahead four decades." },

    // ── 7. word2vec, 2013 ─────────────────────────────────────────────────
    {
      id: "w2v",
      scene: true,
      text: "In twenty thirteen, Tomash Mikolov and colleagues at Google released word to vec.",
    },
    {
      id: "points",
      text: "It gives every word a point in space, and words used in similar places land close together.",
      pauseAfter: 0.7,
    },
    {
      id: "analogy",
      text: "And directions mean something. Start at king, take away man, add woman, and the nearest other word is queen.",
      pauseAfter: 1.0,
    },
    {
      id: "great",
      text: "Remember great and excellent, two unrelated columns in a bag of words? Here, they're neighbors.",
      pauseAfter: 0.9,
    },

    // ── Close: the layers ─────────────────────────────────────────────────
    {
      id: "close",
      scene: true,
      text: "Put it all on one line, and a thread runs through it: each new idea kept the one beneath it.",
      pauseAfter: 0.7,
    },
    {
      id: "layers",
      text: "Word vectors still start from tokens. Search still leans on IDF. Language models still guess the next word.",
      pauseAfter: 0.8,
    },
    {
      id: "warnings",
      text: "And two warnings came along: a demo isn't a system, and fluent text isn't understanding.",
      pauseAfter: 1.0,
    },
    {
      id: "end",
      text: "So what you learned here isn't a stage the field left behind. It's the ground everything since is built on.",
    },
  ],
};
