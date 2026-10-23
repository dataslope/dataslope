import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Cleaning text" (16:9), Unit 2 of Natural Language Processing
 * with Python. One argument in four parts, after the unit's four lessons in
 * content/courses/natural-language-processing-python/:
 *
 *   1. Tokens ("hook" to "case-in"), after tokenization.mdx: split() against
 *      word_tokenize() on the lesson's sentence, what a token is, the period
 *      that sent_tokenize() (Punkt) reads correctly, and a tweet that the
 *      default tokenizer and TweetTokenizer cut differently. It opens on Unit
 *      1's last idea, deciding where one word ends.
 *   2. Normalization ("case" to "stop-in"), after text-normalization.mdx: case
 *      folding six words into two, what it throws away (US, WHO, Apple), and
 *      the three punctuation recipes that give three different answers.
 *   3. Stopwords ("stop" to "stem-in"), after stopwords.mdx: NLTK's English
 *      list, the fox sentence it trims, the negation words it holds, the
 *      review it flips, and the curated list that keeps "not".
 *   4. Stems and lemmas ("forms" to "next"), after
 *      stemming-and-lemmatization.mdx: Porter's suffix rules, the lemmatizer
 *      with and without a part of speech, and which to use when. It closes on
 *      what each step threw away, and ends on Unit 3's first question:
 *      counting the clean words.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every token, stem, lemma, count and filtered sentence on screen is
 * what the lessons' own code blocks return under NLTK 3.9.4 (the site's
 * Pyodide 314.0.7) with the pinned punkt_tab, stopwords and wordnet data.
 * measure.py runs each block's starterCode verbatim, checks that it prints
 * exactly what lib/generated/block-outputs.json (the page's prepopulated
 * output) shows for that lesson, all 13 of them, then makes the same calls
 * directly into measurements.json, which data.ts reads.
 *   - tokenization, "Word tokenization": split() gives 11 pieces ("work,",
 *     "see!", "don't" whole); word_tokenize() gives 16 tokens, with "do" and
 *     "n't", "Lee" and "'s", "we" and "'ll", "," and "!" apart, and "Mr."
 *     whole. The token definition is the lesson's first paragraph.
 *   - tokenization, "Sentence tokenization": split(".") gives 5 pieces
 *     ("Dr", " Lee earned 2", "5 million", " He smiled", " Wasn't that
 *     great?"), sent_tokenize() 3 sentences. The period's three jobs (end, the
 *     abbreviation "Dr.", the decimal in "2.5") are the lesson's.
 *   - tokenization, "When the right tokens depend on your domain": the default
 *     tokenizer gives "#" "NLP", "@" "dataslope" and ":" ")"; TweetTokenizer
 *     keeps "#NLP", "@dataslope" and ":)". "The correct tokenization is the
 *     one that preserves the units your task cares about" is the lesson's.
 *   - text-normalization: 6 distinct strings before lower() and 2 after, "the"
 *     and "dog" (the page prints the set in hash order; the video uses first
 *     appearance); "US".lower() is "us", "WHO" "who", "Apple" "apple", with
 *     the lesson's glosses. The three recipes on "Hello, World! It's a GREAT
 *     day... isn't it?": isalpha() keeps only "a" and "GREAT"; translate()
 *     gives "its" and "isnt"; the regex gives "isn" "t" and "it" "s". "Strip
 *     punctuation after tokenizing, not before" is the lesson's order tip.
 *   - stopwords: 198 English stopwords ("under 200"); the fox sentence's 12
 *     tokens lose 5 ("the" three times, "over", "in") and keep 7; "not",
 *     "no", "nor", "but", "don't" and "won't" are on the list and "never" is
 *     not; the review "The movie was not good at all" keeps "movie" and
 *     "good". The custom list is the lesson's (base minus not, no, nor, never,
 *     but; plus movie, film, watch): "not" is off it, "movie" and "the" on.
 *     The same review filtered against it keeps "not" and "good"; the lesson
 *     prints the list's membership, not that sentence, so measure.py makes
 *     the one extra call.
 *   - stemming-and-lemmatization: Porter (the lesson's "from 1980") turns
 *     runs and running into run, leaves ran, and gives studi for studies and
 *     studying, happi for happiness, and organ for organization, organize and
 *     organ ("over-stemming").
 *     WordNetLemmatizer with no part of speech returns running, ran, study,
 *     better and wa; with pos="v" run, run, study, be; with pos="a" better is
 *     good. "A stem is a key, not a word", and stemming for a search index
 *     against lemmatizing for real words, are the lesson's.
 *   - There are no dates, quotes or real-world figures beyond the lesson's
 *     own, and nothing on screen is typed by hand.
 *
 * Written for Hope's voice, upbeat and clear: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions. Initialisms are
 * plain caps (NLTK). The two that must not be read as words are written as
 * they are said, "U.S." and "W.H.O.", while the screen keeps the lesson's
 * "US" and "WHO".
 */
export const script: NarrationScript = {
  id: "nlp-cleaning-text",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  // Puts the closing scene in the last part's take rather than a 271-character
  // take of its own.
  takeChars: 2100,
  beats: [
    // ── Part 1. Tokens ────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Every text pipeline starts with one small decision: where does one word end, and the next one begin?",
      pauseAfter: 0.7,
    },
    { id: "sentence", text: "Take this sentence. I don't think Mr. Lee's plan will work, but we'll see!", pauseAfter: 0.6 },
    { id: "split", text: "The obvious move is to split it at the spaces. That gives eleven pieces.", pauseAfter: 0.6 },
    {
      id: "glued",
      text: "But work still carries its comma, and see its exclamation mark, so neither would ever match the plain word.",
    },
    { id: "hidden", text: "And the negation in don't is hidden inside a single piece.", pauseAfter: 0.8 },
    { id: "cuts", text: "NLTK's tokenizer, word tokenize, cuts the way a linguist would.", pauseAfter: 0.5 },
    {
      id: "pieces",
      text: "Don't splits in two, so the negation becomes a token of its own. Lee's sheds its possessive, we'll its will, and the comma and the exclamation mark stand alone.",
      pauseAfter: 0.7,
    },
    { id: "sixteen", text: "That's sixteen tokens. And Mr. keeps its period, right where it belongs.", pauseAfter: 0.7 },
    {
      id: "token",
      text: "Each piece is a token: one meaningful unit of text. Usually a word, but sometimes a number, a symbol, or a punctuation mark.",
      pauseAfter: 1.0,
    },
    { id: "sent-in", text: "One level up, the period itself gets tricky." },

    {
      id: "period",
      scene: true,
      text: "A period can end a sentence. It can also shorten a title, like doctor, or mark a decimal point.",
      pauseAfter: 0.6,
    },
    {
      id: "lee",
      text: "Here's a line with all three. Dr. Lee earned two point five million. He smiled. Wasn't that great?",
      pauseAfter: 0.6,
    },
    {
      id: "naive",
      text: "Split that at every period, and it falls into five pieces. It breaks after doctor, breaks inside two point five, and never notices the question mark.",
      pauseAfter: 0.7,
    },
    {
      id: "punkt",
      text: "NLTK's sentence tokenizer, called Punkt, knows about abbreviations and decimals. It returns three clean sentences.",
      pauseAfter: 0.9,
    },
    { id: "domain-in", text: "And even the right word cuts depend on what you're reading." },

    { id: "tweet", scene: true, text: "Take a tweet, with a hashtag, a handle and a smiley.", pauseAfter: 0.5 },
    {
      id: "default",
      text: "The default tokenizer breaks all three apart. The hash comes off NLP, the at sign comes off the name, and the smiley falls into a colon and a bracket.",
      pauseAfter: 0.6,
    },
    { id: "tweettok", text: "NLTK's tweet tokenizer keeps each one whole.", pauseAfter: 0.8 },
    {
      id: "task",
      text: "Neither one is wrong. The right tokens are the ones that keep the units your task cares about.",
      pauseAfter: 1.0,
    },
    { id: "case-in", text: "But even clean tokens can spell one word several ways." },

    // ── Part 2. Normalization ─────────────────────────────────────────────
    {
      id: "case",
      scene: true,
      text: "To a computer, the with a capital, the in lowercase, and the in all caps are three different strings.",
      pauseAfter: 0.6,
    },
    { id: "six", text: "Here are six words, and six distinct strings.", pauseAfter: 0.5 },
    {
      id: "fold",
      text: "Lowercase every one, which is called case folding, and six become two: the, and dog.",
      pauseAfter: 1.0,
    },
    { id: "door", text: "That's right for counting words. But case folding is a one-way door.", pauseAfter: 0.6 },
    {
      id: "lossy",
      text: "U.S., the country, becomes us, the pronoun. W.H.O., the health organization, becomes who. And Apple, the company, becomes the fruit.",
      pauseAfter: 0.8,
    },
    { id: "signal", text: "For counting, case is noise. For spotting a name, it's the signal.", pauseAfter: 1.0 },
    { id: "punct-in", text: "Punctuation comes off next, and there's more than one way to do it." },

    { id: "punct", scene: true, text: "Here are three common recipes, all run on one short line.", pauseAfter: 0.5 },
    {
      id: "alpha",
      text: "The first keeps only tokens made entirely of letters. So World is gone, because its exclamation mark came with it. You lose the word, not just the punctuation.",
      pauseAfter: 0.8,
    },
    {
      id: "translate",
      text: "The second deletes the punctuation characters. The words survive, but contractions get glued shut: the apostrophe in it's is gone, and so is the one in isn't.",
      pauseAfter: 0.6,
    },
    { id: "regex", text: "The third pulls out runs of letters, and splits isn't in two, at the apostrophe.", pauseAfter: 0.7 },
    {
      id: "look",
      text: "Three sensible recipes, three different answers. So always look at what your cleaning actually did.",
      pauseAfter: 0.8,
    },
    {
      id: "order",
      text: "And strip it after you tokenize, never before, or the sentence tokenizer loses its clues.",
      pauseAfter: 0.8,
    },
    { id: "stop-in", text: "Next, the words that turn up everywhere." },

    // ── Part 3. Stopwords ─────────────────────────────────────────────────
    {
      id: "stop",
      scene: true,
      text: "In almost any English text, the most common words, like the, is and of, tell you the least about its subject.",
      pauseAfter: 0.5,
    },
    {
      id: "define",
      text: "They're called stopwords. NLTK's English list has a hundred and ninety-eight of them.",
      pauseAfter: 1.0,
    },
    { id: "fox", text: "Filter a sentence against that list.", pauseAfter: 0.5 },
    {
      id: "removed",
      text: "Five of its twelve tokens drop out, and the seven left carry the meaning: quick brown fox, lazy dog, park.",
      pauseAfter: 0.9,
    },
    { id: "win", text: "For a search index, or for finding a text's topic, that's a clear win.", pauseAfter: 0.6 },
    { id: "trap-in", text: "But look at what else is on that list." },

    { id: "trap", scene: true, text: "Not. No. Nor. But. Even don't and won't.", pauseAfter: 0.5 },
    { id: "never", text: "Never, oddly enough, isn't.", pauseAfter: 0.7 },
    { id: "review", text: "Now run a review through the filter. The movie was not good at all.", pauseAfter: 0.5 },
    {
      id: "flipped",
      text: "Two words survive: movie, and good. A clearly negative review now reads like praise.",
      pauseAfter: 1.0,
    },
    {
      id: "custom",
      text: "So for sentiment, curate the list. Start from NLTK's, take out the words you must keep, like not, and add your own noise, like movie, in a pile of movie reviews.",
      pauseAfter: 0.6,
    },
    { id: "kept", text: "Run the same review again, and what survives is not good. The meaning made it through.", pauseAfter: 0.9 },
    { id: "stem-in", text: "One kind of repetition is left: one word, wearing different endings." },

    // ── Part 4. Stems and lemmas ──────────────────────────────────────────
    {
      id: "forms",
      scene: true,
      text: "Run, runs, running, ran. Four forms of one word, and there are two classic ways to fold them into one.",
      pauseAfter: 0.6,
    },
    {
      id: "porter",
      text: "The first is stemming: chop the suffix off by rule. The best-known stemmer is Porter's, from nineteen eighty.",
      pauseAfter: 0.6,
    },
    { id: "regular", text: "Runs and running both come out as run.", pauseAfter: 0.5 },
    { id: "irregular", text: "But ran stays ran. No rule knows it's the past tense.", pauseAfter: 0.6 },
    {
      id: "nonword",
      text: "Studies and studying both become studi, with an i where the y was, and happiness becomes happi. Those aren't words at all.",
      pauseAfter: 0.6,
    },
    {
      id: "over",
      text: "And organization, organize and organ all collapse into organ. That's called over-stemming.",
      pauseAfter: 0.9,
    },
    {
      id: "key",
      text: "A stem is a key, not a word. That's fine, as long as you only ever compare stems with stems.",
      pauseAfter: 0.8,
    },
    { id: "lemma-in", text: "The second way is to look the word up." },

    {
      id: "lemma",
      scene: true,
      text: "Lemmatizing finds a word's lemma, its dictionary form. NLTK's lemmatizer looks it up in WordNet, a database of English words.",
      pauseAfter: 0.9,
    },
    {
      id: "noun",
      text: "Here's the catch. By default, it treats every word as a noun. So running comes back running, ran comes back ran, and was comes back as wa.",
      pauseAfter: 0.7,
    },
    {
      id: "pos",
      text: "Tell it the part of speech, and it knows. As verbs, running and ran both become run, and was becomes be. As an adjective, better becomes good.",
      pauseAfter: 0.9,
    },
    { id: "know", text: "No suffix rule could turn was into be. That takes knowing the word.", pauseAfter: 0.8 },
    {
      id: "choose",
      text: "So stem for speed, when only a machine ever sees the key, like a search index. Lemmatize when the root has to be a real word.",
    },

    {
      id: "close",
      scene: true,
      text: "Look back at the four steps, and each one threw something away on purpose. The spaces. The capitals. The common words. The endings.",
      pauseAfter: 0.7,
    },
    {
      id: "needed",
      text: "Cleaning well means knowing what you threw away, and whether your task needed it.",
      pauseAfter: 0.8,
    },
    { id: "next", text: "With the words clean, the next thing to do is count them." },
  ],
};
