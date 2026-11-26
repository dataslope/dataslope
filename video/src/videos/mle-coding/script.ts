import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Coding for machine learning" (16:9), Part 3 of the Machine
 * Learning Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "3, Coding for machine learning"), after
 * content/interview/machine-learning-engineer/coding.mdx. It answers all
 * fifteen of the page's questions: ten worked through, numbered aloud and
 * read in the page's words, then five quick ones (11 to 15, numbered on
 * screen only).
 *
 *   1. "Why does NumPy vectorization beat a Python `for` loop?" ("q1").
 *   2. "How do you compute cosine similarity in NumPy?" ("q2").
 *   3. "How do you find the top-k scores efficiently?" ("q3").
 *   4. "What is broadcasting, and why is it useful?" ("q4").
 *   5. "How do you compute pairwise Euclidean distances between rows?" ("q5").
 *   6. "Why do float32 vs float64 matter for ML data?" ("q6"; read "float
 *      thirty-two versus float sixty-four").
 *   7. "Why subtract the max before exponentiating in softmax?" ("q7").
 *   8. "How do you implement mini-batching for training?" ("q8").
 *   9. "How do you shuffle features and labels together correctly?" ("q9").
 *   10. "What is reservoir sampling and when is it useful?" ("q10").
 *   Quick ("rapid-in"): 11. "When do you reach for a hash map in an ML coding
 *   task?" ("r-hash"); 12. "How do you deduplicate a list while preserving
 *   order?" ("r-dedup"); 13. "How do you decode class predictions from a
 *   probability matrix?" ("r-argmax"); 14. "How would you compute accuracy,
 *   precision, and recall from scratch?" ("r-metrics"); 15. "What's the
 *   complexity of building a k-NN prediction naively vs with a heap?"
 *   ("r-knn").
 *
 * The page asks them in another order. Here the first three build one
 * retrieval step (score a catalog, as cosine similarity, and keep the top
 * ten), the next three are what arrays cost in shape, memory and rounding,
 * the next three are training (a stable softmax, batches, shuffling), and
 * reservoir sampling closes on data that arrives as a stream. No other part
 * asks these; the Data Scientist pandas video times a loop against a
 * vectorized column, so this one times NumPy called once per row as well,
 * which that one does not.
 *
 * The one video in the series with code on screen, and only where the
 * question is what the code does: the softmax's three lines, the
 * argpartition call, and the shapes of a broadcast. Never a walk through an
 * implementation; each scene argues cost or correctness.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap or the error, green the
 * right answer, yellow what the narration points at, blue data.
 *   hook: a single user's vector (a short arrow, blue) beside a tall column
 *     of thin item rows, "100,000 items" under it; the ten nearest rows lift
 *     out to the right on "ten closest". The tree frog at the right. On
 *     "a few lines", three short code lines ink in, small, in the mono face:
 *     normalize, one product, argpartition; they fade before "q1".
 *   plan: fifteen numbered dots in a row, ten blue, five grey (quick).
 *   q1: question card.
 *   q1-time: three horizontal bars from VECTOR.ms (results.json), in this
 *     order: "Python loop", "NumPy per row", "one matrix product"; the loop's
 *     bar drawn first, the matrix product's last and green; on "hundred"
 *     the ratio "×{VECTOR.ratio.loop}" in yellow beside the loop bar; a note
 *     under the axis: "Timed once in Pyodide, the browser's Python; the
 *     ratio is the point", with the stopwatch spot beside it on "Timed".
 *     On "same answers", a small "Max difference < 1e-9" note (maxDiff).
 *   q1-why: two short lanes under the bars: the loop as a row of cells each
 *     passing through an "Interpreter" box one at a time; the product as one
 *     arrow over a contiguous strip of cells, four lit at once on "several
 *     numbers at once".
 *   q1-row: the middle bar lit yellow, "×{VECTOR.ratio.perRow}" beside it;
 *     then the lanes' takeaway, "One array operation per step", green.
 *   q2: question card; the cosine formula (the page's), the dot product over
 *     the two lengths; then the six catalog items (COSINE.items) as arrows
 *     from one origin, the user's arrow in blue, each item's score
 *     (COSINE.guardedScores, except item 4) written at its tip as "one matrix
 *     product" is said. Item 4 is a dot at the origin, unlabelled for now.
 *   q2-zero: the dot at the origin labelled "new item: all zeros"; its score
 *     appears as "nan" in red; then a "Top 3" list beside it, built with the
 *     page's own idiom (COSINE.pageTop), with the empty item first, in red,
 *     on "first"; "For every user" under it.
 *   q2-guard: "+ 1e-12" lights in the formula's denominator, green; the red
 *     row's score becomes 0 and the list re-ranks to COSINE.guardedTop, green.
 *   q3: question card; a million scores drawn as one long strip, "sort: n
 *     log n" over it; then `np.argpartition(scores, -k)[-k:]`
 *     on one line, the k cells pulled to the right end, unordered, then
 *     sorted among themselves on "only those k" (the page's five scores,
 *     TOPK.scores, as the worked strip: 0.9 and 0.7 end up at the right).
 *   q3-time: two bars, "full sort" and "argpartition", TOPK.ms, ratio
 *     "×{TOPK.ratio}" in yellow; then a small heap of k slots beside a
 *     stream arrow, "n log k", on "heap".
 *   q4: question card; the page's 3×2 matrix (BROADCAST.X) and the mean row
 *     [3, 4] under it, the row stamped down onto each of the three rows
 *     (dashed, "not copied"), the result standardized (BROADCAST.Z).
 *   q4-trap: shapes as two labelled blocks, "(1000, 1)" and "(1000,)", and
 *     their difference growing into a square "(1000, 1000)" in red on "a
 *     thousand by a thousand"; two numbers: "MSE 0.24" (green, the right
 *     one) and "MSE 2.29" (red); "No error raised" under the red one; then
 *     "Check shapes before you reduce" in green.
 *   q5: question card; the broadcast block "(n, n, d)" as a cube, "10,000 ×
 *     10,000 × 128 × 8 bytes ≈ 102 GB" in red.
 *   q5-identity: the identity written out in words and symbols, ‖a‖² + ‖b‖²
 *     − 2 a·b, beside a flat square "(n, n) ≈ 800 MB" in green.
 *   q5-neg: a strip of 1,000 small cells, one per row's distance to itself,
 *     PAIRWISE.selfNegative of them red ("negative → nan after the root");
 *     then "np.maximum(d², 0)" on one line and every cell turns green.
 *   q6: question card; two blocks of memory, "float64: 10.24 GB" and
 *     "float32: 5.12 GB" (FLOATS.bytes64, bytes32), the second half the
 *     first's height.
 *   q6-cost: a counter running up, "+0.1 × 10,000,000", ending at
 *     "1,087,937" in red, against "Should be 1,000,000"; "+9%" in red; then
 *     a number line near a million with ticks a sixteenth apart, "0.1 lands
 *     on 0.125" on "an eighth".
 *   q6-fix: "np.sum, adds in pairs: 1,000,000.125" in green;
 *     "float64 running total: 1,000,000.0" in green.
 *   q7: question card; the scores 1000, 1001, 1002; "e^709.78 = largest
 *     float64"; three "inf" then three "nan" in red.
 *   q7-fix: the three lines of the page's softmax in the mono face, the
 *     first (`z = z - np.max(z)`) lit yellow; the shifted scores −2, −1, 0;
 *     the probabilities 0.09, 0.24, 0.67 as three green bars.
 *   q7-log: two scores, 1000 and 100; "p = 0.0", "log p = −inf" in red;
 *     "log-softmax: −900" in green.
 *   q8: question card; ten numbered cells, shuffled into the page's order
 *     (BATCHES.epoch1: 4 6 2 7 | 3 5 9 0 | 8 1), split into three batches,
 *     the last one short (no color: a short batch is normal); a label row
 *     under the feature row, moving with it.
 *   q8-seed: "epoch 2" under "epoch 1", the same order again, yellow;
 *     "one generator for the run" in green beside it, and epoch 2
 *     reshuffled (BATCHES.epoch2Shared).
 *   q9: question card; two columns, features and labels, joined row by row
 *     with short lines; shuffled with one permutation, the lines stay; then
 *     shuffled separately, the lines cross and break, red. Two bars:
 *     "shuffled together 95.9%" green, "shuffled apart 52.6%" red, and a
 *     dashed line "always guess benign: 62.6%" (grey, a baseline). The
 *     cards spot on "Shuffle them separately".
 *   q10: question card; a stream of lines flowing past ten slots (the
 *     reservoir; the rain barrel spot); "Keep with probability k / i" lit as
 *     a line replaces a slot.
 *   q10-why: the product written as a chain, k/i × i/(i+1) × … × (n−1)/n
 *     = k/n, collapsing on "every item". q10-sim: ten bars, one per tenth of
 *     the stream (RESERVOIR.tenths), all at about 10%, labelled "Simulation:
 *     20,000 streams of 1,000 lines".
 *   q10-alt: two red alternatives under the bars: "First 10" (all from the
 *     first tenth) and "Each with p = 1%" (a spread of sample sizes, 5 to
 *     15, RESERVOIR.coinSizes).
 *   rapid-in: the quick round's five numbered rows (RapidFire), 11 to 15.
 *   r-hash: the page's six labels counted into a small table, cat 3, dog 2,
 *     bird 1; "Baseline: cat, 50%".
 *   r-dedup: b a b c a → b a c, the repeats struck as they are skipped.
 *   r-argmax: a 4×3 probability matrix (RAPID.probs), each row's largest lit
 *     green on "axis one", the answer "(4,)"; then the column maxima lit
 *     red, "(3,)", on "axis zero" (the wrong axis: the trap).
 *   r-metrics: two rows of 0/1, true and predicted, masks lit; then
 *     predictions all zero, "precision = 0 / 0", "NumPy: nan" and
 *     "scikit-learn: 0, with a warning".
 *   r-knn: "n·d" over a wide bar, "n log n" and "n log k" over shorter ones
 *     (RAPID.knn.ms, the distances' bar the longest); "KD-tree · ball tree ·
 *     HNSW" on "index".
 *   next: <NextLine> "Next: statistics and probability" on "Next" (not on
 *     "Statistics", which the beat says first in "Statistics says").
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a
 * cue whose word disappears throws in the Studio rather than silently
 * drifting.
 *
 * Facts. check.mjs runs every one in Pyodide 314.0.7 (NumPy 2.4.6,
 * scikit-learn 1.8.0), the runtime the page's blocks run in, into
 * results.json, which data.ts reads, and fails if the page stops saying what
 * is quoted or the narration stops saying what was measured:
 *   - "plan": the page's opening, "a normal data-structures interview
 *     pointed at ML-adjacent tasks".
 *   - q1: the page's answer (interpreted bytecode per element; one call into
 *     precompiled C over a contiguous, typed buffer; SIMD and cache
 *     locality; reserve loops for steps that can't be array math). The
 *     timing is the video's own: 100,000 seeded rows of 64 numbers against
 *     one vector, as a pure Python loop, as np.dot per row, and as E @ q,
 *     best of several runs (1,000 for the product, whose single runs swing
 *     from 3 to 14 ms on a busy shared machine; with 15, three reruns on
 *     2026-11-20 came out 31 to 38 times), measured once. Over five
 *     runs on this machine the loop came out 85 to 118 times the product and
 *     per-row NumPy 29 to 38 times (the committed run: VECTOR.ratio);
 *     check.mjs fails if a rerun leaves "roughly a hundred times" (50 to
 *     200) or "roughly forty times" (30 to 55). The committed run's per-row
 *     ratio is 38, drawn as ×38, so the 2026-11-26 review re-voiced the
 *     sentence from "roughly thirty" to match the bar. The page's own range,
 *     "one to two orders of magnitude", agrees.
 *   - q2: the formula, normalize once and one product, and "the guard on the
 *     denominator is the one people forget": the page. The catalog is the
 *     video's own six two-dimensional items, one all zeros (a new item with
 *     no history): unguarded, its score is nan; the page's top-k idiom
 *     (argpartition, then argsort of those k, reversed) and the challenge's
 *     solution (argsort, reversed) both rank it first, and so does argmax,
 *     because NumPy sorts nan after every number. With the page's + 1e-12
 *     it scores 0 and leaves the top three.
 *   - q3: O(n log n), argpartition O(n) and unordered, sort only the k,
 *     heapq.nlargest O(n log k): the page. Its five scores give indices 1 and
 *     3. Timed on a million seeded scores: a full argsort took 13 to 16
 *     times as long as argpartition over five runs ("more than ten times";
 *     check.mjs: 10 to 40).
 *   - q4: the page's 3×2 standardization (column means 3 and 4, Z = ±1.225
 *     and 0). The bug is the video's own seeded 1,000 labels and a model's
 *     column of predictions: (1000, 1) minus (1000,) broadcasts to (1000,
 *     1000), mean squared error 2.29 against the true 0.24, no error.
 *   - q5: the (n, n, d) broadcast and the norm identity: the page.
 *     Arithmetic: 10,000² × 128 × 8 bytes = 102.4 GB; 10,000² × 8 = 800 MB.
 *     The video's own 1,000 seeded rows of 128 standard normals in float32:
 *     the identity's squared distance from a row to itself is negative for 409 of
 *     them ("four in ten"), nan after the root (the same draws kept in
 *     float64: 411, so the narration does not name the dtype); clipped at
 *     zero, none, and the distances match the broadcast ones to within 0.1%
 *     of a typical distance.
 *   - q6: halves memory and bandwidth, GPUs, precision lost when
 *     accumulating, reductions in float64: the page. Arithmetic: 10 million
 *     × 128 × 4 bytes = 5.12 GB, × 8 = 10.24 GB. Measured: a float32 running
 *     total (cumsum) of 0.1 ten million times ends at 1,087,937, 8.8% high;
 *     near a million float32 values are 1/16 apart and 1e6 + 0.1 rounds to
 *     1e6 + 0.125; np.sum (pairwise) gives 1,000,000.125; float64 1,000,000.
 *     About seven significant digits: float32's epsilon, 1.2e-7.
 *   - q7: exp(1000) beyond float64, invariance to a shift, the page's block
 *     (0.09, 0.2447, 0.6652). Measured: log of the largest float64 is
 *     709.78; unshifted, nan three times; scores 1000 and 100, the second's
 *     probability is 0.0 and its log −inf, log-softmax −900. "A loss should
 *     take the raw scores" is the consequence, said as a rule, not as any
 *     framework's API.
 *   - q8: the page's ten rows: batches [4, 6, 2, 7], [3, 5, 9, 0], [8, 1].
 *     A generator that reseeds itself (the page's own until 2026-11-20,
 *     when this video's writer found it) deals the same three again; the
 *     page's fix, one random generator passed through the run, deals
 *     [2, 9, 3, 6], [0, 4, 8, 7], [5, 1] the second time.
 *   - q9: one permutation for both: the page. Measured: scikit-learn's
 *     breast cancer set (398 training, 171 test, stratified, seed 0),
 *     standardized logistic regression: 95.9% trained on aligned rows, 52.6%
 *     on features and labels shuffled separately; always guessing benign,
 *     62.6%.
 *   - q10: the algorithm, one pass, O(k) memory, k / i: the page. The
 *     survival product k/i × i/n = k/n is the standard proof. Simulation
 *     (seed 11): 20,000 streams of 1,000 lines, k = 10; each tenth of the
 *     stream supplies 9.9% to 10.1% of the kept lines; keeping each line
 *     with probability 1% gives a sample of 5 to 15 lines (5th to 95th
 *     percentile), not 10 in 87% of runs.
 *   - quick: Counter on the page's six labels (cat 3, dog 2, bird 1, so the
 *     baseline is cat, half); dict.fromkeys keeps b, a, c; argmax along axis
 *     1 of a 4×3 matrix has shape (4,), along axis 0 (3,); precision with no
 *     predicted positives is nan in NumPy and 0.0 with a warning in
 *     scikit-learn; the k-NN costs O(nd), O(n log n), O(n log k) and the
 *     index kinds are the page's, and timed on 100,000 seeded rows of 64,
 *     computing the distances takes longer than a full sort of them.
 *   - the bridge is the plan's 3 → 4.
 *
 * Written for Drew's ear: ML, GPU, SIMD (glossed: one instruction on several
 * numbers at once), KD and HNSW in plain caps; the dtypes said as "float
 * thirty-two" and "float sixty-four"; nan said "not a number"; no sentence
 * opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-coding",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "One user, a hundred thousand items, and an embedding for each. Score every item, and return the ten closest. In NumPy, that's a few lines, and the coding round asks what those lines cost, and where they break.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "It's a normal data-structures interview, pointed at machine learning. Fifteen questions: ten worked through, then five quick ones.",
      pauseAfter: 0.7,
    },

    // ── 1. Vectorization ──────────────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. Why does NumPy vectorization beat a Python for loop?",
      pauseAfter: 0.5,
    },
    {
      id: "q1-time",
      text: "Score a hundred thousand items, sixty-four numbers each, against the user. Timed once, in the browser's Python, a plain loop is roughly a hundred times slower than one matrix product, with the same answers.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-why",
      text: "The loop runs interpreted bytecode for every multiply. The product is one call into precompiled C, over a contiguous, typed buffer, with SIMD: one instruction on several numbers at once.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-row",
      text: "The follow-up: what about calling NumPy once per row?",
      pauseAfter: 0.6,
    },
    {
      // Re-voiced on its own (2026-11-26 review): the bar it lands on reads
      // ×38 (VECTOR.ratio.perRow), which "roughly thirty" undersold.
      id: "q1-row-ratio",
      text: "Still roughly forty times slower, because the interpreter still runs once per row.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-row-rule",
      text: "Put the whole step in one array operation, and keep loops for steps that depend on the step before.",
      pauseAfter: 0.8,
    },

    // ── 2. Cosine similarity ──────────────────────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. How do you compute cosine similarity in NumPy? The dot product, divided by both lengths, so it measures the angle and ignores magnitude. For a catalog, scale every row to length one once, and one matrix product gives every similarity.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-zero",
      text: "The guard on the denominator is the one people forget. Say a new item, with no history yet, has an embedding of all zeros. Its similarity is zero over zero: not a number. NumPy sorts that after every real number, so a descending top three puts the empty item first, for every single user.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-guard",
      text: "Add a tiny constant to the denominator, and it scores zero instead.",
      pauseAfter: 0.8,
    },

    // ── 3. Top-k ──────────────────────────────────────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Question three. How do you find the top-k scores efficiently? Sorting everything is n log n, and most of that work is wasted. argpartition moves the k largest to one end in linear time, unordered, and then you sort only those k.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-time",
      text: "On a million scores, timed the same way, that's more than ten times faster than a full sort. In plain Python, or over a stream, keep a heap of size k instead. That's n log k, with memory for only k items.",
      pauseAfter: 0.8,
    },

    // ── 4. Broadcasting ───────────────────────────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. What is broadcasting, and why is it useful? NumPy stretches the smaller array along its size-one dimensions, without copying. Subtract the column means, a row of two, from a three-by-two matrix, and that row is reused for every row.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-trap",
      text: "The trap is that it never complains. Predictions in a column, a thousand by one, minus labels in a flat array of a thousand, broadcast to a thousand by a thousand. The mean squared error comes out two point three instead of point two four, and nothing raises an error. Check the shapes before you reduce.",
      pauseAfter: 0.8,
    },

    // ── 5. Pairwise distances ─────────────────────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. How do you compute pairwise Euclidean distances between rows? Broadcasting every row against every other gives an n by n by d array. For ten thousand rows of a hundred and twenty-eight numbers in float sixty-four, that's about a hundred gigabytes.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-identity",
      text: "Expand the square instead: two squared norms, minus twice the dot product. That's one matrix product, and an n by n result of eight hundred megabytes.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-neg",
      text: "The catch is rounding. On a thousand random rows, the squared distance from a row to itself, which should be zero, came out negative for four in ten. The square root turned them into not a number. So clip at zero, before the root.",
      pauseAfter: 0.8,
    },

    // ── 6. float32 and float64 ────────────────────────────────────────────
    {
      id: "q6",
      scene: true,
      text: "Question six. Why do float thirty-two versus float sixty-four matter for ML data? Float thirty-two halves memory and bandwidth, and it's what GPUs run on. Ten million embeddings of a hundred and twenty-eight numbers take about five gigabytes in float thirty-two, and ten in float sixty-four.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-cost",
      text: "The price is precision: about seven significant digits. Add point one to a float thirty-two running total ten million times, and it ends at one million eighty-eight thousand, nine percent high. Near a million, each point one is rounded to an eighth.",
      pauseAfter: 0.7,
    },
    {
      id: "q6-fix",
      text: "NumPy's own sum adds in pairs, and misses by only an eighth. So store big arrays in float thirty-two, and keep long running totals in float sixty-four.",
      pauseAfter: 0.8,
    },

    // ── 7. Stable softmax ─────────────────────────────────────────────────
    {
      id: "q7",
      scene: true,
      text: "Question seven. Why subtract the max before exponentiating in softmax? Float sixty-four tops out near e to the seven hundred and nine. Scores of a thousand, a thousand and one, and a thousand and two overflow to infinity, and infinity over infinity is not a number, three times.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-fix",
      text: "Softmax doesn't change when every score shifts by the same amount. Subtract the largest, and the biggest exponent is zero: nine, twenty-four and sixty-seven percent.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-log",
      text: "One step further: the loss takes a log. Give the right class a score of a hundred against a thousand, and its probability underflows to zero, whose log is minus infinity. Log-softmax computes minus nine hundred directly, so a loss should take the raw scores.",
      pauseAfter: 0.8,
    },

    // ── 8, 9. Mini-batches, and shuffling together ────────────────────────
    {
      id: "q8",
      scene: true,
      text: "Question eight. How do you implement mini-batching for training? Shuffle the row indices once per epoch, slice them in fixed steps, and index features and labels with the same slice. Ten rows in batches of four give four, four and two. The last batch is short, and that's fine.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-seed",
      text: "But don't reseed on every call. A generator that seeds itself the same way each time deals every epoch in the same order. Pass one random generator through the whole run, and each epoch gets a new order.",
      pauseAfter: 0.7,
    },
    {
      id: "q9",
      scene: true,
      text: "Question nine. How do you shuffle features and labels together correctly? One permutation, applied to both. Shuffle them separately, and every row gets another row's label. On the breast cancer data, logistic regression drops from ninety-six percent to fifty-three percent, worse than always guessing benign, at sixty-three.",
      pauseAfter: 0.8,
    },

    // ── 10. Reservoir sampling ────────────────────────────────────────────
    {
      id: "q10",
      scene: true,
      text: "Question ten. What is reservoir sampling, and when is it useful? It keeps a uniform sample of k items from a stream of unknown length, in one pass, with memory for k. Keep the first k. After that, item number i replaces a random slot with probability k over i.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-why",
      text: "The follow-up is why that's uniform. Item i gets in with chance k over i. Then each later item, j, knocks it out with chance one over j. Multiply it through, and every item ends at k over n.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-sim",
      text: "In a simulation of twenty thousand streams of a thousand log lines, each tenth of the stream supplied ten percent of the sample.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-alt",
      text: "The shortcuts fail. The first k lines all come from the start of the day, and keeping each line with probability one percent gives anywhere from five to fifteen, not ten.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Five quick ones.",
      pauseAfter: 0.5,
    },
    {
      id: "r-hash",
      text: "Reach for a hash map for counting, grouping and have-I-seen-this, in constant time on average. Counting labels gives the majority class, the baseline any model has to beat: here, cat, half the time.",
      pauseAfter: 0.6,
    },
    {
      id: "r-dedup",
      text: "To deduplicate a list and keep its order, check a set, and append to a list, or use dict from keys, in one line. Both are linear. Sorting first is n log n, and it loses the order.",
      pauseAfter: 0.6,
    },
    {
      id: "r-argmax",
      text: "To decode classes from a probability matrix, n rows by k classes, take argmax along axis one: one class per row. Along axis zero you get k answers instead, so check the shape.",
      pauseAfter: 0.6,
    },
    {
      id: "r-metrics",
      text: "Accuracy, precision and recall from scratch are boolean masks, summed, with no loop. Handle the empty case: a model that predicts no positives has a precision of zero over zero. NumPy returns not a number; scikit-learn reports zero, with a warning.",
      pauseAfter: 0.6,
    },
    {
      id: "r-knn",
      text: "And k-nearest neighbors. The n distances cost n times d. Then a full sort costs n log n, or a heap of size k, n log k. Either way, computing the distances costs more than choosing among them, so repeated queries need an index: a KD-tree, a ball tree, or an approximate one like HNSW.",
      // Time to read which index suits which data, under the badges.
      pauseAfter: 1.5,
    },
    {
      id: "next",
      text: "Code gives you a number. Statistics says how far to trust it. Next: statistics and probability.",
    },
  ],
};
