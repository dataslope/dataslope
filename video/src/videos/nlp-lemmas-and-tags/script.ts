import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Lemmatizing needs the part of speech" (16:9), a deep dive
 * in Natural Language Processing with Python, Unit 2. It is embedded on its
 * own at stemming-and-lemmatization.mdx, "Lemmatization: looking up the
 * dictionary form" (and its callout "The number-one lemmatization bug"), and
 * pos-tagging.mdx's "POS tagging makes lemmatization accurate" covers the same
 * step, so it opens straight on its question and assumes no unit video. Three
 * parts:
 *
 *   1. The noun default ("hook" to "lookup-in"): the lesson's lemmatize()
 *      with no part of speech returns running, ran and wa, because its
 *      signature defaults pos to "n"; it sees one word, never the sentence;
 *      and running is a noun too, "the running of the race" (the lesson's).
 *   2. Inside the lookup ("list" to "tag-in"): WordNet's three steps, traced
 *      on six lookups, which is how ran becomes run, was be, better good, and
 *      was, as a noun, wa.
 *   3. Tag, then lemmatize ("tagger" to "close"): the pos-tagging lesson's
 *      own sentence through pos_tag, each Penn tag cut to its first letter
 *      and mapped to WordNet's n, v, a or r, then lemmatized, beside Porter's
 *      stems of the same sentence.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every tag, lemma, stem and lookup step on screen comes from
 * measure.py, run with NLTK 3.9.4 (the site's Pyodide 314.0.7) and the pinned
 * punkt_tab, averaged_perceptron_tagger_eng and wordnet data; data.ts reads
 * its measurements.json. measure.py runs the two lesson blocks it draws on
 * verbatim and exits non-zero unless each prints exactly what the site's
 * Pyodide printed (lib/generated/block-outputs.json), and asserts its values
 * equal the unit videos' own (nlp-cleaning-text's lemmas, nlp-counting-words'
 * runners sentence).
 *   - "hook", "noun": lemmatize("running"), ("ran") and ("was") give running,
 *     ran and wa (stemming-and-lemmatization, the lemma block); the default
 *     pos="n" is read off WordNetLemmatizer.lemmatize's signature.
 *   - "race": "running" is a WordNet noun as it stands (one of its five noun
 *     senses is "the act of participating in an athletic competition
 *     involving running on a track"). The phrase is the lesson's.
 *   - The lookup is NLTK 3.9.4's own (nltk/corpus/reader/wordnet.py,
 *     _morphy, and lemmatize() in nltk/stem/wordnet.py), re-done step by step
 *     in measure.py's trace() and asserted against lemmatize() for every word
 *     traced. Its order is: the part of speech's exception list (WordNet's
 *     noun.exc, verb.exc, adj.exc, adv.exc); if the word is not on it, that
 *     part of speech's suffix rules, each applied once; then the word and its
 *     candidates are kept only if WordNet has them under that part of speech,
 *     and the shortest is returned, or the word itself if none survives.
 *     (The review that asked for this video put the exception list last; the
 *     library checks it first, instead of the rules, so the video follows
 *     the library.)
 *   - Fig. 3's six traces: ran (verb) is listed as run; was (verb) as be;
 *     better (adjective) as good and well, and all three of better, good and
 *     well are WordNet adjectives, so the shortest wins: good, which ties
 *     well at four letters and comes first (Python's min keeps the first).
 *     was (noun) is not listed, the noun rule "s" gives wa, was is not a
 *     WordNet noun and wa is (Washington, the state, "WA"), so wa. running
 *     (noun): no noun rule fits, and running itself is a noun. ran (noun): no
 *     rule fits and ran is no noun, so nothing survives and ran comes back.
 *   - The rules shown are _morphy's table: nouns drop s, or turn ses, xes,
 *     zes, ches, shes into s, x, z, ch, sh, ves into f, ies into y, men into
 *     man; verbs drop s, es, ed and ing, or turn ies into y and es, ed, ing
 *     into e; adjectives drop er and est, or turn them into e; adverbs have
 *     none.
 *   - The sentence is pos-tagging.mdx's, "The runners were running and they
 *     had eaten well.": tags DT NNS VBD VBG CC PRP VBD VBN RB and the period's
 *     own tag; to_wordnet_pos (the lesson's) maps J to a, V to v, R to r and
 *     everything else to n; lemmas The runner be run and they have eat well.
 *     Every verb there (were, running, had, eaten) is on the verb exception
 *     list; runners loses its s by the noun rule. Without tags the lemmas are
 *     The runner were running and they had eaten well.
 *   - Porter's stems of the same tokens, PorterStemmer as the stemming lesson
 *     builds it: the runner were run and they had eaten well (it lowercases).
 *     The lessons never stem this sentence; it is measure.py's one extra call.
 *
 * Written for Hope's voice, upbeat and clear: short spoken sentences, no
 * symbols or parentheses, contractions, the Penn tags in plain caps so they
 * are spelled out, each beside the word it tags.
 */
export const script: NarrationScript = {
  id: "nlp-lemmas-and-tags",
  voice: "hope",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. The noun default ──────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Ask NLTK's lemmatizer for the dictionary form of running, and you get running back.",
      pauseAfter: 0.5,
    },
    { id: "more", text: "Ran stays ran. And was comes back as wa.", pauseAfter: 0.8 },
    {
      id: "noun",
      text: "It isn't broken. Unless you say otherwise, it treats every word as a noun.",
      pauseAfter: 0.9,
    },
    {
      id: "alone",
      text: "It sees one word at a time, never the sentence, so it can't tell what job that word is doing.",
      pauseAfter: 0.6,
    },
    {
      id: "race",
      text: "And running really can be a noun, as in the running of the race. As a noun, it's already a dictionary form.",
      pauseAfter: 0.9,
    },
    { id: "lookup-in", text: "So what does the lookup actually do?" },

    // ── Part 2. Inside the lookup ─────────────────────────────────────────
    {
      id: "list",
      scene: true,
      text: "It takes three steps. First, each part of speech keeps a list of irregular forms.",
      pauseAfter: 0.5,
    },
    {
      id: "listed",
      text: "As a verb, ran is listed under run, and was under be. As an adjective, better is listed under good and well.",
      pauseAfter: 0.6,
    },
    {
      id: "rules",
      text: "If a word isn't listed, suffix rules make the guesses instead, like a noun's s, or a verb's ed or ing.",
      pauseAfter: 0.6,
    },
    {
      id: "check",
      text: "Last, the word and every guess are checked against WordNet. Only real entries survive, and the shortest one wins.",
      pauseAfter: 0.9,
    },
    {
      id: "wa",
      text: "That's where wa comes from. Was isn't on the noun list, so the s comes off, and wa is a real entry: it's short for Washington, the state.",
      pauseAfter: 0.9,
    },
    {
      id: "nothing",
      text: "Running passes as itself. But ran isn't a noun at all, so nothing survives, and you just get ran back.",
      pauseAfter: 0.9,
    },
    { id: "tag-in", text: "So where does the part of speech come from?" },

    // ── Part 3. Tag, then lemmatize ───────────────────────────────────────
    {
      id: "tagger",
      scene: true,
      text: "From a tagger, which reads the whole sentence. Take the runners were running and they had eaten well.",
      pauseAfter: 0.6,
    },
    {
      id: "tags",
      text: "It gives each word a Penn Treebank tag: NNS for runners, VBD for were, VBG for running.",
      pauseAfter: 0.6,
    },
    {
      id: "letter",
      text: "WordNet knows just four parts of speech, so keep each tag's first letter. J is an adjective, V a verb, R an adverb, and anything else, a noun.",
      pauseAfter: 0.9,
    },
    {
      id: "lemmas",
      text: "Now lemmatize with those. Runners becomes runner, were becomes be, running run, had have, and eaten eat.",
      pauseAfter: 0.9,
    },
    {
      id: "porter",
      text: "Porter's stemmer gets runner and run, too. But were, had and eaten pass straight through, because it only cuts endings.",
      pauseAfter: 0.9,
    },
    {
      id: "close",
      text: "So the lemmatizer was never broken. It needed the part of speech. Tag first, then lemmatize.",
    },
  ],
};
