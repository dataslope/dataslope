import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "NLP and LLMs" (16:9), Part 6 of the Machine Learning
 * Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "6, NLP and LLMs"), after
 * content/interview/machine-learning-engineer/nlp-and-llms.mdx. It answers
 * all nineteen of the page's questions; deep-learning.mdx asks three of them
 * too (self-attention, multi-head attention, the transformer) and
 * ml-fundamentals.mdx asks "What are embeddings?", and each is answered once,
 * here, together with its twin, as the plan lists. Fourteen are worked
 * through and numbered aloud, in the order the ideas build (text to tokens to
 * vectors, attention and the transformer, what attention costs, training and
 * adapting, grounding), not the page's; five are quick (15 to 19, numbered
 * on screen only).
 *
 *   1. "What is tokenization, and why is subword tokenization standard?"
 *      ("q1").
 *   2. "What are word embeddings? Contrast word2vec and GloVe." ("q2"), with
 *      ml-fundamentals' "What are embeddings?" (dense, learned, for words,
 *      users or items; a lookup table, one row per id).
 *   3. "What is the difference between static and contextual embeddings?"
 *      ("q3").
 *   4. "What is self-attention?" ("q4"), on both pages.
 *   5. "What is multi-head attention, and why use it?" ("q5"), with
 *      deep-learning's "What is multi-head attention, and why use multiple
 *      heads?".
 *   6. "Describe the transformer architecture." ("q6"), on both pages.
 *   7. "Why did transformers replace RNNs for most NLP?" ("q7").
 *   8. "Why is attention's cost a scaling bottleneck for long documents?"
 *      ("q8").
 *   9. "What is a context window, and why does its size matter?" ("q9").
 *   10. "What is pretraining, and what objectives are used?" ("q10").
 *   11. "What is the difference between pretraining and fine-tuning?"
 *       ("q11").
 *   12. "What is parameter-efficient fine-tuning (e.g., LoRA)?" ("q12").
 *   13. "What is retrieval-augmented generation (RAG), and why use it?"
 *       ("q13").
 *   14. "When would you choose RAG over fine-tuning, and vice versa?"
 *       ("q14").
 *   Quick ("rapid-in"): 15. "What are embeddings used for beyond input
 *   representation?" ("r-beyond"); 16. "What causes hallucination, and how
 *   do you mitigate it?" ("r-halluc"); 17. "What is prompting, and what are
 *   zero-shot, few-shot, and chain-of-thought?" ("r-prompt"); 18. "How do
 *   you control an LLM's output randomness?" ("r-random"); 19. "How do you
 *   evaluate an LLM or NLP model?" ("r-eval").
 *
 * Each deep dive reads its question in a beat of its own ("q4") and answers
 * from the next ("q4-a"); a one-line turn closes a scene before the next
 * topic ("emb-in", "attn-in", "tf-in", "cost-in", "train-in", "lora-in",
 * "rag-in"), so the nineteen read as one argument.
 *
 * The angle is the ML engineer's: what each choice costs (vocabulary against
 * sequence length against the embedding table, attention's pairs against
 * the rest of a layer, a full fine-tuned copy against an adapter) and how
 * each part fails (an unseen word, a saturated softmax, retrieval that misses
 * by wording). Overlap kept out on purpose: the How LLMs Work videos own
 * strawberry's tokens, the trophy and the suitcase, and the cat and dog
 * temperatures; nlp-history owns king minus man plus woman; Part 9 owns the
 * KV cache and serving; Part 10 owns evaluating RAG and LLM judges, which
 * "r-eval" only names.
 *
 * Opening and bridge. It opens on the plan's 5 to 6 bridge (attention
 * replaced recurrence, and language models are built on it) by starting
 * from what a language model reads, without "in the last video"; it closes
 * on 6 to 7: a model in a notebook is not a product.
 *
 * On screen, beat by beat (for the builder; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap or the error, green the
 * right answer, yellow what the narration points at, blue data. The dolphin
 * hero sits beside the opening and the close only. Three small watercolor
 * spots (illustrations.json), each beside the figure it names: scissors at
 * "q1-a" (text cut into units), a card-catalog cabinet at "q13-a" (the
 * store passages are fetched from), a plug at "q12-serve" (adapters plugged
 * into one base model).
 *   hook: one sentence of text cut into token chips, the chips turning into
 *     small vectors (blue bars), then thin lines from one vector to every
 *     other (yellow), each stage inked on its words.
 *   plan: nineteen numbered chips, fourteen blue and five grey (quick).
 *   q1: question card; a balance with "vocabulary" on one pan and "sequence
 *     length" on the other.
 *   q1-word: two stacks of pages (the seven other topic pages, then the NLP
 *     page); "word vocabulary: 3,028" under the first; a few of the NLP
 *     page's unseen words fly out (hallucination, autoregressive, few-shot,
 *     RLHF, LoRA, bank: results.json tokens.unseenExamples) and each turns
 *     into the same red "unknown" chip on "unknown token" (not struck
 *     through: the words are right, the vocabulary can't hold them);
 *     "15% of words never seen" in red.
 *   q1-char: the same page as characters: a bar "11,727 characters" beside
 *     "2,330 tokens", "5x the positions", then a square grid growing to
 *     "25x the pairs" (red), the grid a square of positions.
 *   q1-sub: "hallucination" split into two chips, " halluc" and "ination"
 *     (results.json tokens.pieces, o200k_base), green; "1.36 tokens a word
 *     on this page";
 *     "o200k_base: 200,019 pieces" as its note.
 *   q1-cost: a tall table of rows, "200,019 rows x 4,096" and "819 million
 *     weights" (yellow); the balance tips back.
 *   q2, q2-a: question card; a lookup table, ids on the left, a row of numbers
 *     each, one row lit as an id comes in; three tiny icons, a word, a person
 *     and a box, beside it ("a word, a user, a product").
 *   q2-how: two panels with a vertical hairline: word2vec as a sliding window
 *     over a sentence, the centre word (yellow) with arrows out to its
 *     neighbours; GloVe as a word-by-word count grid (blue) split into two
 *     thin matrices. "One fixed vector per word" under both.
 *   q3, q3-a: one point labelled "bank" between a cluster of river words and
 *     a cluster of money words (static); then two sentences, "the river
 *     bank" and "the savings bank", sending two separate points into their
 *     clusters (contextual, green).
 *   q3-cost: under the two, "a pass through the model" against "a table
 *     lookup", each a short line; neither colored (it is a trade-off).
 *   q4, q4-a: question card; four token chips, each sprouting three small bars,
 *     query, key and value; one query's dot products against every key; the
 *     division by the square root of the key's dimension, "√d_k", lit on
 *     "divided"; a row of softmax weights
 *     summing to one; the weighted blend of values.
 *   q4-scale: two rows of sixteen weights from the simulation (results.json
 *     scaling.exampleRow): unscaled, one tall bar (red, "85% on one key, on
 *     average"); scaled, spread (green, "25%"); "simulation: 2,000 rows of
 *     16 keys, 64 numbers each" as its note.
 *   q4-hop: an n by n grid of pairs filling in.
 *   q5, q5-a, q5-cost: question card; the 512-wide vector projected into
 *     eight 64-wide heads, each its own query, key and value, eight small
 *     attention grids side by side, then concatenated; two of
 *     the grids labelled "syntax" and "which noun 'it' means"; then, on
 *     "five hundred and twelve", "8 x 64 = 512 multiply-adds per pair, as for
 *     one head" (green).
 *   q6, q6-a: question card; one block as outlined boxes, attention then
 *     feed-forward, each with a residual arrow around it and a "layer norm"
 *     box; the block stacked N times; positional encodings added at the
 *     bottom.
 *   q6-kinds: three attention masks as small grids: full (encoder, BERT),
 *     lower triangle (decoder, GPT), and both (encoder-decoder, T5), each lit
 *     as named.
 *   q7, q7-a: an RNN row of cells passing one state along, lighting one by one
 *     (slow); beside it, a transformer row where every pair is joined and all
 *     light at once (green), "in training" under it on "in training"
 *     (generation still runs one token at a time, Part 9's subject).
 *   q8, q8-a: question card; the pair grid at 1,000 (a million cells) then at 2,000
 *     (four million), the larger one four times the area; "2x length, 4x
 *     attention".
 *   q8-when: a chart of compute per token per layer against context length
 *     (results.json cost.curve): a flat line "the rest of the layer" and a
 *     rising line "attention", crossing at about 24,576 (yellow); "width
 *     4,096, feed-forward 4x: assumptions" as its note.
 *   q8-fix: two small mask grids (sparse, sliding window) and, for linear
 *     attention, which is not a mask, a straight row of n cells against the
 *     n by n square ("n, not n²"); then the card-catalog spot for retrieval
 *     on "retrieve".
 *   q9, q9-a: question card; a long bar of fixed width (the window) filled from
 *     the left by instructions, retrieved documents, history and the answer,
 *     each a labelled segment; what doesn't fit greys out past the edge (red
 *     edge line, "invisible").
 *   q10, q10-a: question card; one sentence twice: with a masked slot predicted from
 *     both sides (arrows from left and right), and with the next slot
 *     predicted from the left only (arrows from the left), "BERT" and "GPT"
 *     under them.
 *   q11, q11-a: a timeline of stages left to right, block widths for cost:
 *     pretraining (huge, unlabeled text), fine-tuning (small, labeled),
 *     instruction tuning, RLHF (human preferences), each lit as named.
 *   q12, q12-a: question card; a big square matrix (grey, frozen, a lock) and beside
 *     it a tall thin matrix times a short wide one (blue, trained).
 *   q12-math: "16,777,216" under the square, "65,536" under the pair,
 *     "0.39%" (green).
 *   q12-ship: "8.4 MB" against "12.9 GB" (results.json lora), the adapter a
 *     sliver beside the copy; "32 layers, 2 matrices each, rank 8, 16-bit:
 *     assumptions" as its note.
 *   q12-serve: the thin pair folding into the square on "merge"; then one
 *     base model box with several small adapter chips plugged in as "many
 *     adapters" is said.
 *   q13, q13-a: question card; the page's flow as outlined boxes: query, embed,
 *     vector search, top passages, prompt, answer, inked in order.
 *   q13-miss: the query "How do I stop an LLM making things up?" over a
 *     ranked list of the track's answers by shared words (results.json
 *     retrieval.top): "When should you not use an LLM?" first; the
 *     hallucination answer far below at "0.000" in red, with "shares none of
 *     the words" beside it; "word counts stand in for an embedding model
 *     here" as its note; "+ keyword search" as a small badge on "keyword".
 *   q14, q14-a: two columns with a vertical hairline: "RAG: knowledge" (facts that
 *     change, private, too many) and "Fine-tuning: behavior" (style,
 *     vocabulary, format); "fine-tune for behavior, retrieve for facts"
 *     across both (green).
 *   q14-cost: under the columns, "every request: retrieval time, prompt
 *     tokens" and "up front, and at each retrain", a clock and a coin
 *     drawn small beside each (neither column colored: it is a trade-off).
 *   The turns ("emb-in" and the rest) add nothing on screen: the finished
 *     figure holds under them until the cut.
 *   rapid-in: RapidFire rows 15 to 19.
 *   r-beyond: items as dots in a space, one query and its nearest neighbours
 *     ringed; four words under it: search, clustering, deduplication,
 *     recommendations.
 *   r-halluc: "probable, not true" as a line; the mitigations as a list,
 *     "Nothing removes it entirely" last.
 *   r-prompt: three small prompt shapes: a task line; a task line with three
 *     examples; a task line with "step by step".
 *   r-random: one distribution of bars sharpening and flattening as the
 *     temperature turns; a top-k cut and a top-p cut drawn on it.
 *   r-eval: the metrics as a row of names, each under its task; then "human"
 *     and "LLM judge" added on "human ratings".
 *   next: a small model box inside a notebook outline; the dolphin;
 *     <NextLine> "Next: ML system design" on "Next".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs runs in Pyodide 314.0.7 with NumPy, scikit-learn 1.8.0 and
 * tiktoken 0.12.0, and writes results.json, which data.ts reads; it fails if
 * a page stops saying what is quoted or the narration stops saying what was
 * measured. No language model runs here, and none is claimed to:
 *   - "q1-word": prose of the track's seven other topic pages (code, math
 *     and components stripped) gives a vocabulary of 3,028 words; the NLP
 *     page's 1,709 running words include 192 of its 708 distinct ones never
 *     seen, 14.8% of the running words ("fifteen percent"), among them
 *     hallucination. A real word vocabulary is far larger; the point is the
 *     mechanism, and the beat says the vocabulary's size. A word-level model
 *     maps every word outside its vocabulary to one shared unknown token
 *     (the page's "no way to handle out-of-vocabulary words").
 *   - "q1-char", "q1-sub": the NLP page's prose is 11,727 characters and
 *     2,330 o200k_base tokens, 5.03 characters a token ("five times as many
 *     positions", said "five times as long as subword tokens"), so 25
 *     times the pairs; 1.36 tokens a word on this page ("one point four");
 *     o200k_base has 200,019 tokens ("two hundred thousand pieces",
 *     glossed as a production tokenizer; the screen names it), and splits
 *     " hallucination" into " halluc" and "ination". The page's own
 *     illustration "tokenization" -> "token", "ization" matches o200k; its
 *     "unhappiness" -> "un", "happiness" does not (o200k: " unh",
 *     "appiness"), which the page labels illustrative (see the report).
 *   - "q1-cost": 200,019 rows at a width of 4,096 (an assumption, said) is
 *     819,277,824 weights ("over eight hundred million").
 *   - "q2-a", "q2-how", "q3-a": the pages (word2vec's prediction, GloVe's
 *     factorized co-occurrence matrix, static vectors, "bank", collaborative
 *     filtering's user and item embeddings). "A lookup table, one row per
 *     id" is ml-fundamentals' "a dedicated layer". "q3-cost": a contextual
 *     vector is computed by running the model, a static one is looked up;
 *     the engineering consequence of the page's definitions.
 *   - "q4-a", "q4-hop": the pages' formula and "one hop apart". "q4-scale": a
 *     seeded simulation, queries and keys of 64 standard normal numbers,
 *     2,000 rows of 16 keys: raw dot products have a standard deviation of
 *     8.0 ("eight times wider"); unscaled, the largest weight in a row
 *     averages 0.853 ("eighty-five percent"; 58% of rows put over 90% on one
 *     key); divided by 8, the square root of 64, it averages 0.249
 *     ("twenty-five"). The pages: the scaling "keeps dot products from
 *     saturating the softmax". "The key's dimension" is d_k, the number of
 *     values in a key, not its length as a vector.
 *   - "q5-a", "q5-cost": the pages (heads specialize, "syntax" and
 *     "coreference"; "about the same" cost). Each head has its own learned
 *     projections; "splits the representation into several subspaces" is
 *     the page's wording of the same thing. Eight heads of 64 against one
 *     of 512: the projections
 *     are 4 x 512^2 = 1,048,576 weights either way, and a pair costs 512
 *     multiply-adds either way.
 *   - "q6-a", "q6-kinds", "q7-a": the pages. "In training": the page's
 *     "Dropping recurrence makes training parallel across all positions";
 *     generation stays one token at a time.
 *   - "q8-a": a thousand tokens are a million pairs, two thousand four million;
 *     the page's "doubling the context roughly quadruples the attention
 *     cost". "q8-when": arithmetic from stated assumptions (width 4,096, a
 *     feed-forward four times as wide): the projections and feed-forward
 *     cost 12 d^2 multiply-adds per token per layer, the scores and the
 *     weighted sum 2 n d, equal at n = 6 d = 24,576 ("about twenty-five
 *     thousand"), said as attention's "arithmetic" because the crossover is
 *     in multiply-adds, not memory. It is per token at that position, so it
 *     holds for a decoder's newest token too; averaged over a masked
 *     sequence the attention term halves. "q8-fix": the page's variants and
 *     retrieval ("retrieval instead of stuffing everything into the
 *     prompt").
 *   - "q9-a", "q10-a", "q11-a": the pages.
 *   - "q12-math", "q12-ship": arithmetic from stated sizes. A 4,096 x 4,096
 *     matrix is 16,777,216 numbers ("nearly seventeen million"); rank 8 is
 *     2 x 4,096 x 8 = 65,536 ("sixty-five thousand"), 0.39% ("under half a
 *     percent"). Two matrices in each of 32 layers: 4,194,304 trained
 *     ("about four million"); a model of those layers, 12 d^2 per layer,
 *     6,442,450,944 ("six and a half billion"; embeddings left out); in 16-bit
 *     numbers, 8.4 MB against 12.9 GB ("eight-megabyte", "thirteen-
 *     gigabyte"). The page: "a few million parameters instead of billions".
 *     "q12-serve": the low-rank product can be added into the frozen matrix
 *     after training, so a merged adapter costs nothing at inference, and a
 *     frozen base can serve many adapters kept apart; standard LoRA
 *     practice, not the page's.
 *   - "q13-a": the page's flow and reasons. "q13-miss": the track's 167
 *     answers (one per question) searched with TF-IDF cosine for "How do I
 *     stop an LLM making things up?" (terms: stop, llm, making, things): the
 *     top answer is "When should you not use an LLM?" (0.118); the
 *     hallucination answer scores 0.000 and shares none of the terms, with
 *     13 answers above it. Word counts stand in for the retriever, and the
 *     screen says so; no embedding model's score is shown or claimed. That
 *     production retrievers usually combine embeddings with keyword search
 *     (hybrid search) is llm-systems-and-evals' "hybrid keyword search",
 *     which Part 10 recommends; said here so the two parts agree.
 *   - "q14-a", and the quick round: the page. "q14-cost": RAG's retrieval
 *     and longer prompts are paid per request, fine-tuning per training
 *     run; reasoning from the two mechanisms, with no number attached. "Temperature divides the
 *     scores" is the page's "scales the logits", said as what it does.
 *
 * Written for Drew's ear: initialisms in plain caps (NLP, LLM, RNN, GPU,
 * GPT, RLHF, RAG, BLEU, ROUGE, F1, ML), each expanded the first time a
 * beginner might not know it; BERT, LoRA, RAG, GloVe, BLEU and ROUGE are said
 * as words, and word2vec and T5 need a spoken form (see the report); no
 * sentence opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-nlp-llms",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ──────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A language model never sees your text. Text is cut into tokens, tokens become vectors, and attention lets every vector look at every other. Each step is a choice with a cost, and this round asks you to defend it.",
      pauseAfter: 0.7,
    },
    { id: "plan", text: "Nineteen questions: fourteen worked through, and five quickly at the end.", pauseAfter: 0.7 },
    // ── 1. Tokenization ──────────────────────────────────────────────────
    { id: "q1", scene: true, text: "Question one. What is tokenization, and why is subword tokenization standard?" },
    {
      id: "q1-a",
      text: "It splits text into the units a model reads, and every choice of unit trades vocabulary against length.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-word",
      text: "Whole words need a vast vocabulary and still miss new ones. Build one from this track's seven other pages, three thousand words, and read the NLP page with it: fifteen percent of its words were never seen, hallucination among them, and each becomes the same unknown token.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-char",
      text: "Characters never miss, but they make the page five times as long as subword tokens do, and attention's cost grows with the square: twenty-five times.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-sub",
      text: "Subwords split the difference: frequent words stay whole, and rare ones break into known pieces. A production tokenizer with two hundred thousand pieces cuts hallucination in two, and averages one point four tokens a word on this page.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-cost",
      text: "The vocabulary has a price too: each piece is a row of the embedding table, so at a width of four thousand and ninety-six, that's over eight hundred million weights.",
      pauseAfter: 0.7,
    },
    { id: "emb-in", text: "What goes in those rows is the next question." },
    // ── 2, 3. Embeddings ─────────────────────────────────────────────────
    { id: "q2", scene: true, text: "Question two. What are word embeddings? Contrast word2vec and GloVe." },
    {
      id: "q2-a",
      text: "An embedding is a learned, dense vector for something discrete, a word, a user, a product, placed so that similar things land near each other. In a model, it's a lookup table with one row per id.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-how",
      text: "word2vec learns word vectors by prediction: a shallow network, given a word, predicts its neighbors. GloVe counts how often words occur together across the whole corpus, and factorizes that table. Both give each word one fixed vector.",
      pauseAfter: 0.7,
    },
    { id: "q3", text: "Question three. What is the difference between static and contextual embeddings?" },
    {
      id: "q3-a",
      text: "A static vector puts bank at one point, river or money. A transformer computes a fresh vector for each occurrence from the words around it, so the two banks separate. That's a big reason transformers won.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-cost",
      text: "The price: a contextual vector costs a pass through the model, where a static one is a table lookup.",
      pauseAfter: 0.7,
    },
    { id: "attn-in", text: "The mechanism behind that is attention." },
    // ── 4, 5. Attention ──────────────────────────────────────────────────
    { id: "q4", scene: true, text: "Question four. What is self-attention?" },
    {
      id: "q4-a",
      text: "Each token is projected into a query, a key and a value. One token's weight on another is its query dotted with the other's key, divided by the square root of the key's dimension, and softmaxed. Its output is the weighted sum of the values.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-scale",
      text: "Why divide? Simulate queries and keys of sixty-four random numbers: their dot products spread eight times wider than the numbers do, and softmax puts on average eighty-five percent of a row's weight on one key, where its gradient is small. Divided by eight, the square root of sixty-four, the top weight averages twenty-five percent.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-hop",
      text: "Every pair of tokens is one hop apart, so distance costs nothing, but the pairs grow with the square of the length.",
      pauseAfter: 0.7,
    },
    { id: "q5", text: "Question five. What is multi-head attention, and why use it?" },
    {
      id: "q5-a",
      text: "Give each head its own smaller query, key and value, run attention in each, in parallel, and concatenate the results. One head can track syntax, another which noun a pronoun means.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-cost",
      text: "And eight heads of sixty-four cost the same multiply-adds as one head of five hundred and twelve.",
      pauseAfter: 0.7,
    },
    { id: "tf-in", text: "Now the whole model." },
    // ── 6, 7. The transformer ────────────────────────────────────────────
    { id: "q6", scene: true, text: "Question six. Describe the transformer architecture." },
    {
      id: "q6-a",
      text: "A stack of blocks: multi-head self-attention, then a feed-forward network at each position, each wrapped in a residual connection and layer norm. Attention ignores order, so positional encodings add it.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-kinds",
      text: "Encoder-only models like BERT attend both ways, for understanding. Decoder-only models like GPT mask the future, for generation. Encoder-decoder models like T5 turn one sequence into another.",
      pauseAfter: 0.7,
    },
    { id: "q7", text: "Question seven. Why did transformers replace RNNs for most NLP?" },
    {
      id: "q7-a",
      text: "An RNN squeezes everything through one hidden state, one step at a time: slow to train, and forgetful over distance. A transformer links any two tokens directly and, in training, processes every position at once, which is what a GPU is built for.",
      pauseAfter: 0.7,
    },
    { id: "cost-in", text: "The trade-off is attention's own cost." },
    // ── 8, 9. What attention costs ───────────────────────────────────────
    { id: "q8", scene: true, text: "Question eight. Why is attention's cost a scaling bottleneck for long documents?" },
    {
      id: "q8-a",
      text: "Every token is compared with every other. A thousand tokens make a million pairs; two thousand, four million. Double the context, and attention costs about four times as much.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-when",
      text: "The rest of a layer only grows linearly, though. For a model four thousand and ninety-six wide, with the usual feed-forward four times that, attention's arithmetic outweighs the rest only past about twenty-five thousand tokens.",
      pauseAfter: 0.7,
    },
    {
      id: "q8-fix",
      text: "Past that, teams reach for sparse, sliding-window or linear attention, or retrieve the passages that matter instead of pasting in everything.",
      pauseAfter: 0.6,
    },
    { id: "q9", text: "Question nine. What is a context window, and why does its size matter?" },
    {
      id: "q9-a",
      text: "It's the most tokens, prompt and output together, that the model can attend to at once. Instructions, documents and history all compete for it, a longer one costs more, and anything past the limit is invisible.",
      pauseAfter: 0.7,
    },
    { id: "train-in", text: "So much for the shape. Next, how it learns." },
    // ── 10, 11. Pretraining and fine-tuning ──────────────────────────────
    { id: "q10", scene: true, text: "Question ten. What is pretraining, and what objectives are used?" },
    {
      id: "q10-a",
      text: "Training on a huge unlabeled corpus, where the text is its own label. Masked language modeling, BERT's, hides tokens and predicts them from both sides. Causal language modeling, GPT's, predicts the next token from the left alone, which is what lets it generate.",
      pauseAfter: 0.6,
    },
    { id: "q11", text: "Question eleven. What is the difference between pretraining and fine-tuning?" },
    {
      id: "q11-a",
      text: "Pretraining is the expensive phase, once per model. Fine-tuning cheaply adapts it to one task, on a much smaller labeled set. Instruction tuning and RLHF, reinforcement learning from human feedback, then teach it to follow instructions and match human preferences.",
      pauseAfter: 0.7,
    },
    { id: "lora-in", text: "Even fine-tuning can be made far cheaper." },
    // ── 12. LoRA ─────────────────────────────────────────────────────────
    { id: "q12", scene: true, text: "Question twelve. What is parameter-efficient fine-tuning, for example LoRA?" },
    {
      id: "q12-a",
      text: "LoRA, low-rank adaptation, freezes the model and learns an update to some of its matrices, as the product of two thin ones.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-math",
      text: "A matrix four thousand and ninety-six square holds nearly seventeen million numbers. At rank eight, the two thin ones hold sixty-five thousand: under half a percent.",
      pauseAfter: 0.7,
    },
    {
      id: "q12-ship",
      text: "Adapt two matrices in each of thirty-two layers, and you train about four million weights out of six and a half billion, and ship an eight-megabyte adapter instead of a thirteen-gigabyte copy.",
      pauseAfter: 0.6,
    },
    {
      id: "q12-serve",
      text: "At serving, merge it into the weights and it adds no latency, or keep it separate, and one base model serves many adapters.",
      pauseAfter: 0.7,
    },
    { id: "rag-in", text: "Fine-tuning changes how a model behaves. What it knows is another matter." },
    // ── 13, 14. RAG ──────────────────────────────────────────────────────
    { id: "q13", scene: true, text: "Question thirteen. What is retrieval-augmented generation, RAG, and why use it?" },
    {
      id: "q13-a",
      text: "Embed the query, fetch the most similar passages from a vector store, and put them in the prompt for the model to answer from. It grounds answers, adds fresh or private knowledge without retraining, and lets you cite sources.",
      pauseAfter: 0.6,
    },
    {
      id: "q13-miss",
      text: "But the answer is only as good as the retrieval. Search this track's hundred and sixty-seven answers by shared words for how to stop an LLM making things up: the hallucination answer scores zero, sharing none of those words. Retrieval has to match meaning, which is what embeddings are for, usually alongside keyword search for exact names.",
      pauseAfter: 0.7,
    },
    { id: "q14", text: "Question fourteen. When would you choose RAG over fine-tuning, and vice versa?" },
    {
      id: "q14-a",
      text: "RAG for knowledge: facts that change, are private, or are too many to memorize, since updating the store needs no training. Fine-tuning for behavior: a style, a vocabulary, an output format. They compose: fine-tune for behavior, retrieve for facts.",
      pauseAfter: 0.6,
    },
    {
      id: "q14-cost",
      text: "And count the bill: RAG pays on every request, in retrieval time and prompt tokens, while fine-tuning pays up front, and again each time it's retrained.",
      pauseAfter: 0.8,
    },
    // ── Quick: 15 to 19 ──────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Five more, quickly.", pauseAfter: 0.5 },
    {
      id: "r-beyond",
      text: "Embeddings beyond the input: encode documents, products or users once, then find neighbors by cosine similarity, for search, clustering, deduplication and recommendations, with no labels.",
      pauseAfter: 0.6,
    },
    {
      id: "r-halluc",
      text: "Hallucination: a model is trained to write probable text, not true text, so it invents fluently, most of all on niche facts. Ground it with retrieval and citations, lower the temperature for facts, add checks, and keep a human in the loop where stakes are high. Nothing removes it entirely.",
      pauseAfter: 0.6,
    },
    {
      id: "r-prompt",
      text: "Prompting steers a frozen model with text alone. Zero-shot describes the task, few-shot adds worked examples, and chain-of-thought asks for step-by-step reasoning, which helps on multi-step problems. It's the cheapest lever, so try it before fine-tuning.",
      pauseAfter: 0.6,
    },
    {
      id: "r-random",
      text: "Randomness: temperature divides the scores before the softmax, so near zero is almost greedy, and higher is more varied. Top-k keeps the k likeliest tokens; top-p, the smallest set whose probabilities add up past p. Keep it low for extraction, higher for brainstorming.",
      pauseAfter: 0.6,
    },
    {
      id: "r-eval",
      text: "And evaluation depends on the task: perplexity for language modeling, BLEU for translation, ROUGE for summaries, exact match and F1 for extracted answers. Overlap misses meaning, so teams add human ratings and LLM judges, on a held-out set that looks like real use.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "But a model in a notebook isn't a product yet. Next: ML system design, the system around it.",
    },
  ],
};
