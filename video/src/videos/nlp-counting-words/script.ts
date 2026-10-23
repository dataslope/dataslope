import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "What counting reveals" (16:9), Unit 3 of Natural Language
 * Processing with Python. One argument in three parts, after
 * content/courses/natural-language-processing-python/frequency-distributions.mdx,
 * pos-tagging.mdx and ngrams.mdx:
 *
 *   1. Counting words ("hook" to "tag-in"): FreqDist on the lesson's fox
 *      text, lexical diversity and why it falls with length, the long tail of
 *      a whole novel (Zipf's law, a vocabulary that never stops growing), and
 *      raw counts dominated by stopwords.
 *   2. Tagging words ("fish" to "pairs-in"): one spelling with two jobs, the
 *      Penn Treebank tags and their first letters, pulling patterns out by
 *      tag, and tag-then-lemmatize.
 *   3. Counting word pairs ("together" to "next"): the sliding window,
 *      order as meaning, phrases from counted bigrams, and why a bigger n
 *      is not better. It ends on Unit 4: a model wants numbers.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every count, ratio, tag and n-gram on screen comes from measure.py,
 * run with NLTK 3.9.4 (the site's Pyodide version) and the lessons' NLTK data;
 * data.ts reads its measurements.json. measure.py runs each lesson block the
 * video shows verbatim and exits non-zero unless its stdout is exactly what
 * the site's Pyodide printed for that block (lib/generated/block-outputs.json).
 *   - "fox", "tally", "common": frequency-distributions, "Counting words with
 *     FreqDist()": the fox-and-dog text is 30 alphabetic tokens, 13 distinct;
 *     most_common(5) is the 8, fox 4, dog 4, runs 2, and 2.
 *   - "very", "varied": "Lexical diversity": 2 distinct of 7 is 0.286 (said
 *     and shown to two places, 0.29); the varied sentence scores 1.0.
 *   - Emma: Jane Austen's novel from NLTK's Gutenberg corpus, loaded exactly
 *     as interesting-discussions.mdx loads it (its block is checked against
 *     the page too), with the lessons' own calls applied to it. Lexical
 *     diversity on the first 100, 1,000 and 10,000 words and the whole book is
 *     0.73, 0.42, 0.18 and 0.04 ("emma-length", the lesson's callout
 *     "Lexical diversity depends on length"). 161,600 words, 7,079 distinct
 *     ("book"); the top ten words are 22.1% of all of them ("over a fifth");
 *     fd.hapaxes() lists 2,739, 38.7% of the vocabulary ("nearly two in
 *     five"). Its last 10,000 words hold 188 words not used before ("grows",
 *     the lesson chart vocabulary-growth-heaps's point, on real text). Its
 *     six most common words are to, the, and, of, i, a; with NLTK's English
 *     stopwords removed first, mr 1,153, emma 865, could, would, mrs, miss
 *     ("without", the lesson's "A catch" on a whole book). "Zipf's law" is
 *     the lesson's name for the shape; its chart zipf-law is drawn on the
 *     Brown corpus's published counts, and Fig. 5 is Emma's own: all 7,079
 *     ranks on a linear rank axis, so the top ten take the first pixel and a
 *     half and the tail runs the width of the chart, its last 38.7% (the
 *     2,739 hapaxes, count 1) marked. The law itself is left to its own
 *     deep dive; the unit names it in one sentence.
 *   - pos-tagging: fish is NN in "I caught a big fish." and VBP in "We fish
 *     on weekends."; "The tall man reads books." is DT JJ NN VBZ NNS; the
 *     engineer sentence keeps nouns engineer, system, adjectives talented,
 *     young, brilliant, new, verb designed and adverb quietly; the runners
 *     sentence lemmatizes running and eaten unchanged without tags, and to
 *     be, run, have and eat with them. "About thirty-six" tags and the
 *     first-letter shortcut are the lesson's; VBZ is the lesson table's
 *     "3rd-person" verb ("a present-tense verb for he, she or it"). The Penn
 *     Treebank is the hand-tagged corpus NLTK's averaged perceptron tagger
 *     was trained on ("penn"). "Hand each word its tag's first letter" is
 *     the lesson's to_wordnet_pos, which maps J, V and R to WordNet's
 *     adjective, verb and adverb and everything else to noun; the full
 *     mapping is left to the lemmatizing deep dive.
 *   - ngrams: "the quick brown fox jumps" gives 4 bigrams and 3 trigrams
 *     (k - n + 1, said "the number of words, minus n, plus one"); "the food
 *     was not good" against "the food was good" differ only by not as sets,
 *     and only the first holds the bigram (not, good); in the machine
 *     learning lines (shown as nltk.sent_tokenize splits the block's text),
 *     ("machine", "learning") is the top bigram, 3 times.
 *     Over Emma, the commonest bigrams whose two words are both not
 *     stopwords are mr knightley 299, mrs weston 256, mr elton 229 ("cast").
 *   - "shares" (Fig. 15): of Emma's n-grams as read, every occurrence, the
 *     share whose n-gram appears again somewhere in the book, 1 - once /
 *     grams: 98.3%, 70.4%, 27.3%, 6.6%, 1.5% for n = 1 to 5 ("almost always",
 *     "seven times in ten", "about one in four", "one in fifteen", "almost
 *     never"). That is what a model counting them can reuse; the share of
 *     *distinct* n-grams seen once (38.7% to 99.3%) is in measurements.json
 *     too, but read as a share of the text it overstates the one-offs (by
 *     occurrence, 1.7% of Emma's words are). The lesson's own sparsity block
 *     (four repeated lines about a cat and a dog) prints 7, 9, 8 and 7
 *     n-grams "that repeat" for n = 1 to 4, which does not show the collapse
 *     its prose describes, so the video measures the point on Emma instead.
 *     Following the numbers rather than the lesson's "bigrams and trigrams
 *     are the sweet spot": on a novel, trigrams already recur only about one
 *     time in four, so the video says bigrams, and trigrams given plenty of
 *     text. "Not bad" ("bigram") is the lesson's own point that a lone "not"
 *     says nothing about what it negates; no count is attached to it.
 *
 * Written for Hope's voice, upbeat and clear: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, and the Penn tags
 * in plain caps so they are spelled out, each beside the word it means.
 */
export const script: NarrationScript = {
  id: "nlp-counting-words",
  voice: "hope",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. Counting words ────────────────────────────────────────────
    { id: "hook", scene: true, text: "Once your words are clean, the next thing to do is count them.", pauseAfter: 0.6 },
    { id: "fox", text: "Take a short text about a fox and a dog. Without its punctuation, it's thirty words.", pauseAfter: 0.5 },
    {
      id: "tally",
      text: "NLTK's FreqDist, short for frequency distribution, tallies every one: thirteen different words, and the word the comes first, eight times.",
      pauseAfter: 0.9,
    },
    { id: "common", text: "Ask it for the five most common, and you get words with their counts, highest first.", pauseAfter: 0.7 },
    { id: "ratio-in", text: "And thirteen out of thirty says something too. This text repeats itself." },
    {
      id: "diversity",
      scene: true,
      text: "That ratio, different words over total words, is called lexical diversity.",
      pauseAfter: 0.9,
    },
    {
      id: "very",
      text: "Very, very, very good, good, good, good has two different words in seven. That's zero point two nine.",
      pauseAfter: 0.7,
    },
    { id: "varied", text: "A sentence that never repeats scores a perfect one.", pauseAfter: 0.7 },
    { id: "length", text: "But the score falls as a text grows, because common words keep coming back.", pauseAfter: 0.5 },
    {
      id: "emma-length",
      text: "The first hundred words of Jane Austen's Emma score zero point seven three. The first thousand, zero point four two. Ten thousand, zero point one eight. The whole novel, zero point oh four.",
      pauseAfter: 0.9,
    },
    { id: "same", text: "So only compare texts of the same length.", pauseAfter: 0.7 },
    { id: "tail-in", text: "And a whole novel shows something bigger: the shape of language." },
    {
      id: "book",
      scene: true,
      text: "Emma runs to a hundred and sixty-one thousand words, but only about seven thousand different ones.",
      pauseAfter: 0.6,
    },
    { id: "giants", text: "Rank them by count, and the top ten alone make up over a fifth of the book.", pauseAfter: 1.0 },
    {
      id: "hapax",
      text: "At the other end, more than two thousand seven hundred words appear just once. They're called hapaxes.",
      pauseAfter: 0.9,
    },
    {
      id: "zipf",
      text: "That's nearly two in five of the vocabulary. A few giants and a long, thin tail: it's called Zipf's law, and almost every text has it.",
      pauseAfter: 0.9,
    },
    {
      id: "grows",
      text: "And the tail never closes. Even Emma's last ten thousand words bring a hundred and eighty-eight it hadn't used before.",
      pauseAfter: 0.9,
    },
    { id: "top-in", text: "[curious] So what does the top of the list tell you about the book?" },
    { id: "top", scene: true, text: "Emma's six most common words are to, the, and, of, I and a.", pauseAfter: 0.6 },
    { id: "nothing", text: "Not one of them says what the novel is about.", pauseAfter: 0.6 },
    { id: "without", text: "Drop the stopwords and count again: Mister, Emma, could, would, Missus, Miss.", pauseAfter: 0.7 },
    { id: "heroine", text: "Now the heroine's name comes second.", pauseAfter: 0.9 },
    { id: "commonplace", text: "Raw frequency rewards the commonplace. Filter first, and the topic comes through.", pauseAfter: 0.9 },
    { id: "tag-in", text: "But a count only sees spelling. It can't tell what job a word is doing." },

    // ── Part 2. Tagging words ─────────────────────────────────────────────
    {
      id: "fish",
      scene: true,
      text: "Take fish. In I caught a big fish, it's a noun. In we fish on weekends, it's a verb.",
      pauseAfter: 0.6,
    },
    { id: "jobs", text: "Same spelling, two jobs, and a counter can't tell them apart.", pauseAfter: 0.6 },
    {
      id: "tagging",
      text: "Part-of-speech tagging labels every word with its job, judged from the words around it.",
      pauseAfter: 0.9,
    },
    {
      id: "tagger",
      text: "NLTK's tagger learned from text that people tagged by hand. It calls the first fish NN, a noun, and the second VBP, a verb.",
      pauseAfter: 0.9,
    },
    { id: "penn", scene: true, text: "Those labels come from the Penn Treebank, the hand-tagged text it learned from.", pauseAfter: 0.6 },
    { id: "tall", text: "The tall man reads books comes back as DT, JJ, NN, VBZ and NNS.", pauseAfter: 0.5 },
    { id: "meanings", text: "A determiner, an adjective, a noun, a present-tense verb for he, she or it, and a plural noun.", pauseAfter: 0.8 },
    {
      id: "letters",
      text: "There are about thirty-six, but the first letter does most of the work: N for nouns, V for verbs, J for adjectives, R for adverbs.",
      pauseAfter: 0.9,
    },
    {
      id: "extract",
      text: "That's enough to pull patterns out of text. Tag the talented young engineer quietly designed a brilliant new system, and keep the tags that start with N.",
      pauseAfter: 0.4,
    },
    { id: "nouns", text: "You get the nouns: engineer and system.", pauseAfter: 0.6 },
    {
      id: "adjectives",
      text: "J gives the adjectives, talented, young, brilliant and new. V gives designed, and R, quietly.",
      pauseAfter: 0.9,
    },
    {
      id: "lemma",
      scene: true,
      text: "Tags fix lemmatizing, too. The WordNet lemmatizer treats every word as a noun, unless it's told otherwise.",
      pauseAfter: 0.6,
    },
    {
      id: "untouched",
      text: "So in the runners were running and they had eaten well, running and eaten come back untouched.",
      pauseAfter: 0.6,
    },
    { id: "tagfirst", text: "Tag first, hand each word its tag's first letter, and running becomes run, eaten becomes eat.", pauseAfter: 0.6 },
    { id: "even", text: "Even were and had become be and have.", pauseAfter: 0.9 },
    { id: "recipe", text: "Tag, then lemmatize: that's the accurate recipe.", pauseAfter: 0.9 },
    { id: "pairs-in", text: "Still, every step so far looks at one word at a time." },

    // ── Part 3. Counting word pairs ───────────────────────────────────────
    { id: "together", scene: true, text: "But New York, machine learning and not good only mean something together.", pauseAfter: 0.6 },
    { id: "ngram", text: "An n-gram is n words in a row. Two make a bigram, three make a trigram.", pauseAfter: 0.9 },
    {
      id: "slide",
      text: "Slide a window two words wide along the quick brown fox jumps, one step at a time, so the windows overlap.",
      pauseAfter: 0.5,
    },
    { id: "formula", text: "Five words give four bigrams, and three trigrams:", pauseAfter: 0.8 },
    { id: "rule", text: "the number of words, minus n, plus one.", pauseAfter: 0.9 },
    { id: "compare", scene: true, text: "Why bother? Compare the food was good with the food was not good.", pauseAfter: 0.5 },
    { id: "sets", text: "As sets of single words, they differ by one word: not.", pauseAfter: 0.6 },
    {
      id: "bigram",
      text: "As bigrams, only one has not good. A lone not turns up in praise too, like not bad. The pair is what a sentiment model can learn is negative.",
      pauseAfter: 0.9,
    },
    {
      id: "phrases",
      text: "Counting bigrams finds phrases, too. In three short lines about machine learning, the top pair is machine learning, three times.",
      pauseAfter: 0.6,
    },
    {
      id: "cast",
      text: "Over all of Emma, keep the pairs with no stopword in them, and out walks the cast: Mister Knightley, Missus Weston, Mister Elton.",
      pauseAfter: 0.9,
    },
    { id: "bigger-in", text: "[curious] So if two words in a row help, would five help more?" },
    { id: "sparse", scene: true, text: "Usually not. Take each n-gram in Emma, and ask: does it appear anywhere else?", pauseAfter: 0.5 },
    {
      id: "shares",
      text: "Single words almost always do. Bigrams, seven times in ten. Trigrams, about one in four. Four in a row, one in fifteen, and five, almost never.",
      pauseAfter: 0.9,
    },
    {
      id: "sparsity",
      text: "An n-gram seen only once tells you almost nothing: one sighting can't tell a pattern from an accident. That's sparsity.",
      pauseAfter: 0.8,
    },
    {
      id: "sweet",
      text: "So bigrams are the sweet spot, and trigrams with plenty of text: enough order to help, still common enough to count.",
      pauseAfter: 0.7,
    },
    { id: "next", text: "But a model wants numbers, not lists of words. So next, we'll turn text into features." },
  ],
};
