import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "From ids to meaning" (16:9), Unit 2 of How Large Language
 * Models Work. One argument in four parts, after the unit's four lessons in
 * content/courses/how-llms-work/:
 *
 *   1. Embeddings ("hook" to "order-in"), after embeddings.mdx: an id is a
 *      label, so each one is swapped for a vector looked up in a learned
 *      table; nearby means related; the dimensions have no names; and the
 *      vectors alone cannot see order. It opens on Unit 1's last idea, that
 *      nothing in token 19772 says "berry" is like "cherry".
 *   2. Similarity ("ruler" to "sim-in"), after similarity.mdx: why a ruler
 *      is the wrong tool, cosine similarity, the lesson's working semantic
 *      search, and where it breaks.
 *   3. Attention ("trophy" to "attn-in"), after attention-intuition.mdx: the
 *      trophy and the suitcase, query, key and value, the lesson's weights
 *      and its real two-number vectors, heads and layers, and the cost that
 *      grows with the square of the length.
 *   4. The shape of a transformer ("path" to "next"), after
 *      the-shape-of-a-transformer.mdx: the full path of a prompt, where the
 *      parameters are, width and depth, mixture of experts, and the score for
 *      every token at the top. It ends on Unit 3's first question: something
 *      still has to pick one.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every id, vector, score and count on screen is what measure.py
 * printed when it re-ran the lessons' own code (NumPy 2.4.6 and tiktoken
 * 0.12.0, the site's Pyodide versions) into measurements.json, which data.ts
 * reads. The page's prepopulated outputs print the same numbers.
 *   - Ids are tiktoken o200k_base, the course's tokenizer: "berry" is 19772
 *     ("nineteen seven seven two"), the id two below it, 19770, is " teeth",
 *     and " cherry" (with the space it has inside a sentence) is 60225
 *     ("sixty thousand two twenty-five"). "A few thousand numbers" and
 *     "looked up from a table that was learned during training" are
 *     embeddings.mdx's; the table's rows are drawn as cells, not numbers,
 *     because no real model's table is on screen.
 *   - embeddings.mdx's tiny space (animal, size, domestic): distances from
 *     cat are kitten 0.100, dog 0.200, wolf 0.854 and truck 1.338, so
 *     "kitten's nearest, then dog ... truck's way over there". "Dimension
 *     1,847" and "the cat sat on the mat" are the lesson's.
 *   - Order: the lesson's dog, bites and man vectors sum to 1.5, 1.5 in both
 *     orders. Its position signal adds 0, 0.1 and 0.2 to the second number
 *     by slot, so dog first is 0.9, 0.2 and dog last is 0.9, 0.4 ("dog in the
 *     first slot gets a different vector from dog in the last"). The lesson
 *     then sums the positioned vectors too, and that sum is again the same
 *     for both sentences (1.5, 1.8 twice, as its page prints); the video
 *     shows the positioned vectors one by one instead, where the sentences
 *     really do differ, and never shows that sum.
 *   - similarity.mdx: short 1, 1 and long 5, 5 are 5.657 apart ("five point
 *     seven") with cosine 1.0; short against 1, -1 is cosine 0.0, at 90
 *     degrees; "length tracks token frequency" is the lesson's.
 *   - The lesson's search: five documents over finance, weather, sport and
 *     cooking; the finance query ("How did the company perform
 *     financially?") ranks "Earnings beat analyst expectations" first at
 *     0.998 ("point nine nine eight"), which shares no word with it
 *     (asserted in measure.py), then the revenue line at 0.993. The negation
 *     example and the reranking step are the lesson's "Where this breaks";
 *     the lesson gives no score for them, so none is shown.
 *   - attention-intuition.mdx: the hand-set scores from "it" give trophy
 *     0.722 of the weight ("point seven two"). The real vectors: keys and
 *     values for trophy, suitcase and it, the query 1.0, 0.1, scores 0.721,
 *     0.283, 0.078 after dividing by the square root of two, weights 0.461
 *     ("point four six"), 0.297, 0.242, and the new vector 4.849, 3.214.
 *     The lesson's "change query to 0.2, 1.0" gives weights 0.293, 0.467,
 *     0.240 and 3.168, 4.910 ("the blend follows"). Ten tokens make a
 *     hundred scores and twenty make four hundred, the lesson's "doubling
 *     the input quadruples the attention work".
 *   - the-shape-of-a-transformer.mdx's mid-sized model (vocabulary 128,000,
 *     width 4,096, 32 layers, feed-forward 14,336): embedding table 0.52
 *     billion ("half a billion"), attention 2.15 ("about two"),
 *     feed-forward 3.76 ("three point eight"), output projection 0.52,
 *     total 6.95 ("about seven billion"), feed-forward 54 percent. "There is
 *     no lookup table" and width and depth are the lesson's. DeepSeek-V3's
 *     671 billion parameters and 37 billion per token are the lesson's
 *     figures, cited there to the DeepSeek-V3 Technical Report
 *     (arXiv:2412.19437). The closing figure's four scores (cat 3.2, dog
 *     2.1, bird 1.5, rock -0.4) are sampling.mdx's example logits, the next
 *     unit's, labelled as an example; the vocabulary is the same model's
 *     128,000 ("a hundred and twenty-eight thousand").
 *
 * Written for Drew's voice, casual and curious: short spoken sentences, no
 * symbols or parentheses, numbers as they are said, contractions, questions
 * the next sentence answers. "The pronoun" stands in for the word "it" where
 * saying "it" would be ambiguous aloud. "ID" is written in capitals so the
 * voice spells it, as the README's initialism rule says; the screen keeps the
 * lessons' lowercase "id".
 */
export const script: NarrationScript = {
  id: "llm-meaning",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  // The closing scene is two short beats; this keeps them in the third take
  // rather than a 169-character take of their own.
  takeChars: 1900,
  beats: [
    // ── Part 1. Embeddings ────────────────────────────────────────────────
    { id: "hook", scene: true, text: "To a language model, berry is token nineteen seven seven two.", pauseAfter: 0.5 },
    {
      id: "teeth",
      text: "Two doors down, at nineteen seven seven oh, sits teeth. And cherry? Way off at sixty thousand two twenty-five.",
      pauseAfter: 0.6,
    },
    {
      id: "label",
      text: "By the numbers, berry's a lot more like teeth. Which is nonsense. IDs are just labels.",
      pauseAfter: 0.8,
    },
    {
      id: "vector",
      text: "So the first thing the model does is swap each ID for a vector, a list of a few thousand numbers.",
    },
    {
      id: "embedding",
      text: "That list is the token's embedding, looked up in a table the model learned in training.",
      pauseAfter: 0.9,
    },
    {
      id: "geometry",
      scene: true,
      text: "And lists of numbers have geometry. They can sit close together, or far apart.",
      pauseAfter: 0.5,
    },
    { id: "toy", text: "Here's the lesson's tiny version, with three numbers per word." },
    {
      id: "nearest",
      text: "Measure from cat. Kitten's nearest, then dog. Wolf's further out, and truck's way over there.",
      pauseAfter: 0.8,
    },
    {
      id: "learned",
      text: "Nobody wrote that down. Training pushes words that turn up in similar sentences toward similar vectors.",
      pauseAfter: 0.6,
    },
    {
      id: "generalize",
      text: "So once a model's seen the cat sat on the mat, the dog sat on the mat is half handled already.",
      pauseAfter: 0.8,
    },
    { id: "axes", text: "One catch. We named these three dimensions so we could read them. Real ones have no names." },
    {
      id: "nameless",
      text: "Dimension eighteen forty-seven of a real model doesn't mean anything you could point to. The meaning's in the whole arrangement.",
      pauseAfter: 0.8,
    },
    { id: "order", scene: true, text: "And embeddings on their own can't see order.", pauseAfter: 0.4 },
    { id: "bites", text: "Dog bites man, and man bites dog, are the same three vectors, shuffled." },
    { id: "set", text: "Add them up, and both sentences come out exactly the same.", pauseAfter: 0.7 },
    {
      id: "position",
      text: "So the model mixes in where each token sits. Dog in the first slot gets a different vector from dog in the last.",
      pauseAfter: 0.9,
    },
    { id: "order-in", text: "Now, if meaning is closeness, how do you measure close?" },

    // ── Part 2. Similarity ────────────────────────────────────────────────
    { id: "ruler", scene: true, text: "The obvious tool is a ruler. Straight-line distance.", pauseAfter: 0.4 },
    {
      id: "length",
      text: "But a ruler also counts how long each vector is. And in an embedding, length mostly tracks how common a word is, not what it means.",
      pauseAfter: 0.6,
    },
    { id: "cosine", text: "So we measure the angle instead. That's cosine similarity.", pauseAfter: 0.9 },
    {
      id: "same",
      text: "These two point the same way, and one's five times longer. The ruler says five point seven apart. Cosine says one. A perfect match.",
      pauseAfter: 0.8,
    },
    {
      id: "right",
      text: "At a right angle, cosine is zero. Unrelated. Pointing opposite ways, it's minus one.",
      pauseAfter: 0.8,
    },
    {
      id: "search",
      scene: true,
      text: "That's enough for a working search.",
    },
    { id: "docs", text: "Five tiny documents, each scored on four themes.", pauseAfter: 0.4 },
    { id: "query", text: "Now ask, how did the company perform financially?", pauseAfter: 0.5 },
    {
      id: "hit",
      text: "Top hit, earnings beat analyst expectations, at point nine nine eight. Not one word in common with the question.",
      pauseAfter: 0.9,
    },
    { id: "meaning", text: "The search runs on meaning, not on text.", pauseAfter: 0.8 },
    {
      id: "blind",
      scene: true,
      text: "It does have blind spots. The drug is effective, and the drug is not effective, land almost on top of each other.",
      pauseAfter: 0.7,
    },
    {
      id: "rerank",
      text: "Close isn't true, and it isn't always useful. So real systems add a second pass that actually reads the top hits.",
      pauseAfter: 0.7,
    },
    {
      id: "sim-in",
      text: "And one vector per word has a bigger problem. Some words mean nothing until you see their neighbours.",
    },

    // ── Part 3. Attention ─────────────────────────────────────────────────
    {
      id: "trophy",
      scene: true,
      text: "The trophy didn't fit in the suitcase because it was too big. What was too big? The trophy.",
      pauseAfter: 0.5,
    },
    { id: "small", text: "Make it too small, and now it's the suitcase.", pauseAfter: 0.8 },
    {
      id: "pronoun",
      text: "The pronoun never changed. Its meaning comes from the words around it.",
      pauseAfter: 0.6,
    },
    {
      id: "attention",
      text: "Attention is how each token pulls in information from the others, weighted by how relevant each one is.",
      pauseAfter: 0.9,
    },
    {
      id: "query-vec",
      scene: true,
      text: "To do that, every token makes three vectors. A query: what am I looking for?",
      pauseAfter: 0.5,
    },
    { id: "key", text: "A key: what do I offer?", pauseAfter: 0.5 },
    { id: "value", text: "And a value: what I hand over when I'm picked.", pauseAfter: 0.8 },
    {
      id: "scores",
      text: "The pronoun's query is compared with every key, for one score each.",
    },
    { id: "softmax", text: "Softmax turns the scores into weights that add up to one.", pauseAfter: 0.8 },
    {
      id: "weights",
      text: "In the lesson's example, the pronoun puts point seven two of its attention on trophy.",
      pauseAfter: 0.9,
    },
    { id: "real", scene: true, text: "Here's the actual arithmetic, on two-number vectors.", pauseAfter: 0.4 },
    {
      id: "dot",
      text: "The query against each key gives a score, and softmax makes them weights. Point four six for trophy.",
      pauseAfter: 0.6,
    },
    {
      id: "blend",
      text: "The pronoun's new vector is that blend of the values, pulled toward trophy's.",
      pauseAfter: 0.9,
    },
    {
      id: "flip",
      text: "Point the query at suitcase instead, and the blend follows. A different question gets a different answer.",
      pauseAfter: 0.9,
    },
    {
      id: "heads",
      scene: true,
      text: "A real model runs many of these side by side, called heads, each with its own idea of relevant. And it stacks them dozens of layers deep.",
      pauseAfter: 0.7,
    },
    {
      id: "square",
      text: "There's a price. Every token scores every other one.",
    },
    { id: "ten", text: "Ten tokens make a hundred scores. Double the text, and it's four times the work.", pauseAfter: 0.9 },
    { id: "attn-in", text: "So let's put all the pieces in order." },

    // ── Part 4. The shape of a transformer ────────────────────────────────
    {
      id: "path",
      scene: true,
      text: "Your text becomes token IDs. Each ID becomes its embedding, plus its position.",
      pauseAfter: 0.5,
    },
    {
      id: "block",
      text: "Then comes a block. Attention mixes information between tokens, then a feed-forward network works on each token alone.",
      pauseAfter: 0.6,
    },
    { id: "residual", text: "Around each half, the input's added back in, so nothing gets lost.", pauseAfter: 0.6 },
    { id: "repeat", text: "And the block repeats. Thirty-two times, in the lesson's mid-sized model.", pauseAfter: 0.8 },
    {
      id: "params",
      scene: true,
      text: "That model has about seven billion parameters. So where do they live?",
      pauseAfter: 0.5,
    },
    {
      id: "split",
      text: "The embedding table holds half a billion, and the output layer as much again.",
    },
    { id: "attn-share", text: "Attention, about two.", pauseAfter: 0.5 },
    {
      id: "ff",
      text: "The feed-forward networks hold three point eight billion. Fifty-four percent of the whole model.",
      pauseAfter: 0.9,
    },
    {
      id: "knowledge",
      text: "That's where much of what it knows lives. There's no fact database in there. Just weights.",
      pauseAfter: 0.7,
    },
    {
      id: "wide",
      text: "Width sets how much one token's vector can hold. Depth sets how many times it gets refined. You need both.",
      pauseAfter: 0.8,
    },
    {
      id: "experts",
      scene: true,
      text: "The biggest open models split that feed-forward half into many experts, and run only a few for each token.",
      pauseAfter: 0.5,
    },
    {
      id: "deepseek",
      text: "DeepSeek V3 stores six hundred seventy-one billion parameters, and each token uses thirty-seven billion of them.",
      pauseAfter: 0.9,
    },
    {
      id: "top",
      scene: true,
      text: "And at the very top, the last token's vector becomes one score for every token in the vocabulary. A hundred and twenty-eight thousand scores.",
      pauseAfter: 0.7,
    },
    { id: "next", text: "Something still has to pick one." },
  ],
};
