import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Why text is hard" (16:9), Unit 1 of Natural Language
 * Processing with Python, the course's first video. One argument in three
 * parts, after content/courses/natural-language-processing-python/
 * what-is-nlp.mdx and the-nlp-pipeline.mdx:
 *
 *   1. Text is unstructured, ambiguous and messy ("hook" to "do-in"): the
 *      lesson's opening sentence and its questions, the flat string a
 *      computer gets, what NLP is for; lexical, structural and referential
 *      ambiguity on the lesson's own examples; the five kinds of mess; and
 *      split() against word_tokenize() on the lesson's sentence.
 *   2. What an NLP system does ("layers" to "pipe-in"): structure added in
 *      layers, processing that is not understanding, and rules against
 *      learning, briefly.
 *   3. The pipeline ("pipeline" to "next"): the lesson's sentence through
 *      its five steps, cleaning against analysis, and the lesson's proof that
 *      order matters. It ends on Unit 2's first question: where one word
 *      ends.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every token, list and count on screen is what NLTK 3.9.4 returned
 * when measure.py ran the lessons' own code (measurements.json; data.ts reads
 * it), and measure.py checks each printed line against the site's own
 * prepopulated output (lib/generated/block-outputs.json):
 *   - The opening sentence is what-is-nlp's: "I can't believe Dr. Smith's
 *     startup raised $2.5M, it's unreal!", 62 characters ("sixty-two"). The
 *     three questions are the lesson's, shortened for the ear. Its tokens
 *     under "structure a program can compute with" are word_tokenize's 16.
 *   - "turn unstructured text into structure a program can compute with" and
 *     the definition of NLP are what-is-nlp's.
 *   - The three ambiguities ("bank", "I saw the man with the telescope", the
 *     trophy and the case) and the five kinds of mess (contractions,
 *     punctuation, casing, morphology, multi-word units) are the lesson's
 *     own examples. The lesson leads with "lead" and adds "bank"; the video
 *     takes "bank", because spoken, "lead" the metal and "lead" the verb
 *     sound different and the ear would resolve what the eye cannot. "Each
 *     of these is a reason a later step exists" is its
 *     "Every one of these is a reason a later page exists"; the step tags in
 *     Fig. 5 are the ones the lesson names (tokenization, case folding,
 *     stemming and lemmatization) plus n-grams for multi-word units, the
 *     course's ngrams.mdx and pos-tagging.mdx ("New York" as a unit whose
 *     meaning lives in the combination).
 *   - "I can't believe it's not butter, Mr. Jones!": split() gives eight
 *     pieces, word_tokenize() twelve tokens (ca, n't; the comma and the
 *     exclamation mark on their own; Mr. kept whole), as the page prints.
 *   - The layers are what-is-nlp's diagram (characters, tokens, normalized
 *     tokens, tagged tokens, patterns and counts); "count, match and
 *     transform" and the spam filter are its callout; rules against learning
 *     is its table.
 *   - The pipeline: "The Cats are RUNNING quickly, and the dogs are barking
 *     loudly!" through the lesson's five steps: 13 tokens, 13 lowercased, 11
 *     cleaned, 6 after stopwords (five dropped: the, are, and, the, are),
 *     then cat, running, quickly, dog, barking,
 *     loudly. "running" stays as it is because the lemmatizer reads every
 *     word as a noun unless told otherwise (Unit 2's subject); the video
 *     shows it and does not comment. `tokens = [t.lower() for t in tokens]`
 *     is the lesson's own case-folding line.
 *   - Order: "The The THE end is near". Lowercase then filter gives end,
 *     near; filter then lowercase gives the, the, the, end, near (all three
 *     survive, which is what the page prints; the lesson's figure caption
 *     says "one survives", reported, not repeated). NLTK's English list has
 *     198 words, all lowercase.
 *
 * Written for Hope's voice, upbeat and clear: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers.
 */
export const script: NarrationScript = {
  id: "nlp-why-text-is-hard",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Text is unstructured ──────────────────────────────────────
    { id: "hook", scene: true, text: "Here's an easy question. How many words are in this sentence?", pauseAfter: 0.8 },
    {
      id: "questions",
      text: "Is can't one word, or two? Does the period after Doctor end the sentence? Is the dollar sign a word?",
      pauseAfter: 0.9,
    },
    { id: "human", text: "You read it in a second. A computer gets one flat string of sixty-two characters.", pauseAfter: 0.7 },
    {
      id: "implied",
      text: "Nothing in it says where a word starts, where a sentence ends, or what any of it means.",
      pauseAfter: 0.9,
    },
    {
      id: "nlp",
      text: "Natural language processing, NLP for short, closes that gap. It turns unstructured text into structure a program can compute with.",
      pauseAfter: 1.0,
    },
    {
      id: "sixteen",
      text: "NLTK, the Python toolkit this course uses, says sixteen: can't becomes two, Doctor keeps its period, and the dollar sign stands alone.",
      pauseAfter: 0.9,
    },
    { id: "ambig-in", text: "Part of what makes that hard is ambiguity." },

    {
      id: "ambiguity",
      scene: true,
      text: "Language is full of it, and we resolve it so easily that we rarely notice.",
      pauseAfter: 0.6,
    },
    {
      id: "lexical",
      text: "One word can mean two things. A bank is the side of a river, or a place for money. That's lexical ambiguity.",
      pauseAfter: 0.9,
    },
    {
      id: "structural",
      text: "One sentence can group two ways. I saw the man with the telescope. Did I use it, or was he holding it? That's structural ambiguity.",
      pauseAfter: 0.9,
    },
    {
      id: "referential",
      text: "And a word can point two ways. The trophy didn't fit in the case because it was too big. What was too big?",
      pauseAfter: 0.8,
    },
    { id: "answer", text: "You know it's the trophy. A computer has no idea. That's referential ambiguity.", pauseAfter: 0.9 },
    { id: "mess-in", text: "Real text is also messy in plainer ways." },

    { id: "contractions", scene: true, text: "Contractions hide words. Don't is do, and not.", pauseAfter: 0.6 },
    { id: "period", text: "One period ends a sentence, shortens Doctor, and marks a decimal point.", pauseAfter: 0.6 },
    { id: "casing", text: "A capital letter at the start of a sentence doesn't make a new word.", pauseAfter: 0.6 },
    { id: "forms", text: "Run, runs, running and ran are four spellings of one idea.", pauseAfter: 0.6 },
    { id: "units", text: "And New York is one place, written as two words.", pauseAfter: 0.8 },
    { id: "reasons", text: "Contractions and punctuation are why we tokenize, and casing is why we lowercase.", pauseAfter: 0.6 },
    {
      id: "roots",
      text: "Word forms are why we stem or lemmatize, reducing each to a root. And multi-word units are why we count runs of words, called n-grams.",
      pauseAfter: 0.9,
    },
    { id: "split-in", text: "So why not just split on the spaces?" },

    { id: "split", scene: true, text: "Here's the lesson's sentence. I can't believe it's not butter, Mister Jones!", pauseAfter: 0.6 },
    { id: "pieces", text: "Python's split cuts at every space, and gives eight pieces.", pauseAfter: 0.7 },
    {
      id: "glued",
      text: "But can't stays whole, hiding its not. And butter keeps its comma, so it would count as a different word from plain butter.",
      pauseAfter: 0.9,
    },
    { id: "tokens", text: "NLTK's word tokenizer gives twelve tokens instead: words and punctuation, each on its own.", pauseAfter: 0.7 },
    {
      id: "fixed",
      text: "It cuts can't in two, so the negation shows, peels off the punctuation, and keeps Mister with its period.",
      pauseAfter: 0.8,
    },
    { id: "real", text: "Breaking text into words is a real problem, not a one-liner.", pauseAfter: 1.0 },
    { id: "do-in", text: "So what does an NLP system actually do?" },

    // ── Part 2. What an NLP system does ───────────────────────────────────
    { id: "layers", scene: true, text: "It adds structure in layers. Characters become tokens.", pauseAfter: 0.8 },
    {
      id: "layers-up",
      text: "Tokens get normalized, tagged with their part of speech, and turned into counts and patterns.",
      pauseAfter: 0.9,
    },
    {
      id: "understand",
      text: "None of this understands the text. It counts, matches and transforms. A spam filter scores words without knowing what they mean.",
      pauseAfter: 0.9,
    },
    {
      id: "rules",
      scene: true,
      text: "A step can follow rules that write down what people already know, like a list of stopwords, the little words to skip.",
      pauseAfter: 1.0,
    },
    { id: "readable", text: "Rules need no training data, and you can read exactly why they did what they did.", pauseAfter: 0.8 },
    { id: "learning", text: "Or it can be learned from labeled examples. That's powerful, but opaque.", pauseAfter: 0.8 },
    { id: "course", text: "This course sticks to rules and counts, where the intuition lives.", pauseAfter: 0.8 },
    { id: "pipe-in", text: "And rules like these run in a pipeline." },

    // ── Part 3. The pipeline ──────────────────────────────────────────────
    {
      id: "pipeline",
      scene: true,
      text: "A pipeline is a fixed sequence of steps, where each step's output is the next step's input.",
      pauseAfter: 0.9,
    },
    { id: "tokenized", text: "Tokenizing this sentence gives thirteen tokens, punctuation included.", pauseAfter: 0.6 },
    { id: "lowercased", text: "Lowercasing folds the capitals away.", pauseAfter: 0.6 },
    { id: "cleaned", text: "Cleaning drops the comma and the exclamation mark. Eleven left.", pauseAfter: 0.6 },
    { id: "stopped", text: "Removing stopwords drops five little words. Six left.", pauseAfter: 0.6 },
    { id: "lemmatized", text: "And lemmatizing turns cats into cat, and dogs into dog.", pauseAfter: 0.6 },
    { id: "running", text: "Running and barking stay as they are: nobody told the lemmatizer they're verbs.", pauseAfter: 0.9 },
    {
      id: "list",
      text: "After tokenizing, each step is one Python list comprehension. The code is easy. Choosing the steps is the hard part.",
      pauseAfter: 0.9,
    },
    { id: "cleaning", scene: true, text: "Those are the cleaning steps, and every project picks from the same toolbox.", pauseAfter: 0.7 },
    {
      id: "analysis",
      text: "Analysis comes after: counting, tagging, building features. It depends on your goal, and so should the cleaning, because most of its steps are optional.",
      pauseAfter: 0.9,
    },
    { id: "order-in", text: "The order you run them in matters, too." },

    {
      id: "order",
      scene: true,
      text: "Here's the lesson's tiny test: the word the, written three ways, followed by end is near.",
      pauseAfter: 0.7,
    },
    { id: "order-a", text: "Lowercase first, then remove stopwords, and every the is gone. End, near.", pauseAfter: 0.9 },
    {
      id: "order-b",
      text: "Remove stopwords first, and all three slip through. The stopword list is all lowercase, and none of the three is.",
      pauseAfter: 0.9,
    },
    { id: "silent", text: "Nothing crashed. You just got a list that looks fine, and is wrong. Order bugs are silent.", pauseAfter: 0.8 },
    {
      id: "next",
      text: "Every one of these steps works on tokens. So the first step of the pipeline is deciding where one word ends.",
    },
  ],
};
