import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "ML system design" (16:9), Part 7 of the Machine Learning
 * Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "7, ML system design"), after content/interview/machine-learning-engineer/
 * ml-system-design.mdx, with the three mlops.mdx questions the plan answers
 * here together. Seventeen questions: eleven worked through, numbered aloud
 * and read in the page's words, then six quick ones (12 to 17, numbered on
 * screen only). The other fourteen ml-system-design questions (monitoring,
 * drift, PSI, rollouts, registries, CI/CD, reproducibility) are Part 8's.
 *
 *   1. "Batch vs online (real-time) inference?" (ml-system-design), with
 *      mlops' "Batch vs online inference, and how do you choose?", read in
 *      mlops' words ("q1").
 *   2. "What is training–serving skew?" (asked on both pages) ("q2").
 *   3. "What is a feature store and why use one?", with mlops' "What is a
 *      feature store, and what problem does it solve?"; 4. "What is a
 *      feature store's offline vs online store?" ("q3").
 *   5. "What is throughput vs latency in model serving?"; 6. "How does
 *      request batching improve GPU throughput?" ("q5").
 *   7. "What is model quantization?" ("q7").
 *   8. "What is label collection and how do feedback loops work?" ("q8").
 *   9. "Sketch a fraud detection ML system." ("q9").
 *   10. "Sketch a recommendation / ranking system." (read "recommendation or
 *       ranking"); 11. "How do you handle the cold-start problem in a
 *       recommendation system?" ("q10").
 *   Quick ("rapid-in"): 12. "What is the difference between online and
 *   offline feature computation?" ("r-features"); 13. "What is data
 *   validation and why does it matter before training?" ("r-validate");
 *   14. "When should you use GPU vs CPU for model serving?" ("r-gpu");
 *   15. "What is knowledge distillation?" ("r-distill"); 16. "How do you
 *   reduce model serving latency?" ("r-latency"); 17. "How do you scale a
 *   model serving endpoint under variable load?" ("r-scale").
 *
 * The page asks them in another order. Here they follow a prediction out
 * and its label back: how predictions reach users, the features they need
 * and the bug that bites there, the store that prevents it, what serving
 * costs and how to cut it, where labels come from, then two whole systems
 * built from those parts. The quick round tidies up the rest of serving.
 *
 * Opening and bridge. It opens on the plan's bridge from Part 6 (a model in
 * a notebook is not a product) in its own words, never "in the last video",
 * so it plays on its own. It closes on the plan's bridge into Part 8: once
 * the model is live, the world it learned from keeps changing.
 *
 * Overlap. No Data Scientist or Backend video asks these questions. Part 9
 * (mle-serving-llms) answers the LLM page's quantization and continuous
 * batching for token generation; this video's quantization is a small
 * classifier's weights and its batching is whole requests on one GPU, so the
 * two do not share an example. Part 8 answers PSI, drift and rollouts; the
 * fraud model here is not reused there.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap or the error, green the
 * right answer, yellow what the narration points at, blue data. The giraffe
 * stands at the right of the opening and the close. The system grows as a
 * small map in a corner of each deep dive (features, model, prediction,
 * label, back to training), the part the question is about lit yellow, so
 * the eleven read as one design.
 *   hook: the notebook spot with a small "model" file label under it, on
 *     "just a file"; then the map drawn around it, "Features at request
 *     time", "Answer within budget", "Labels back", each inking in on its
 *     words. The giraffe at the right.
 *   plan: seventeen numbered chips, eleven blue, six grey, lit on "eleven"
 *     and "six".
 *   q1: question card. Two timelines, one above the other. "Batch": a
 *     nightly job (a moon tick at 02:00) fills a table of user rows with
 *     predictions; a request at 18:00 reads its row, "16 h old" beside it
 *     in yellow on "stale". "Online": each request arrow goes into a
 *     "Model service" box and comes straight back.
 *   q1-online: on the online row, the shopping-cart spot beside the
 *     request feeds the model, lit on "what's in the cart"; under the box
 *     three small labels, "latency budget", "scaling", "uptime", on "you
 *     own".
 *   q1-choose: no grid that puts batch in a "slow" corner: a stored answer
 *     is the fastest thing to serve. On the batch row, the 18:00 request's
 *     read of its row labelled "lookup: fast" in blue on "lookup", and "16 h
 *     old" from q1 lit again on "yesterday's"; on the online row, "compute
 *     inside the budget" under the model service. Then a search box with a
 *     blinking cursor beside batch's row and "can't precompute" in red on
 *     "nobody has typed yet"; then a third row, "Hybrid: features in batch,
 *     scoring online", in green.
 *   q2-in: the map lights "Features".
 *   q2: question card. One feature definition ("transactions in the past
 *     hour") forking into two arrows, "training pipeline" and "serving
 *     path", lit on "one way" and "another way"; under them "code · data ·
 *     timing" as three badges, each lit as said.
 *   q2-sim: a card's timeline with four ticks in the past hour and the
 *     current transaction at "now". The warehouse side counts five ticks,
 *     the current one included (yellow ring on it, "counts itself"); the
 *     serving side counts four, "before it's written"; "off by one" in red.
 *     A "simulation: 100,000 transactions, 2% fraud" note.
 *   q2-result: two bars of fraud caught out of 616 held-out frauds:
 *     "offline" 60% in blue, "served" 42% in red (results.json skew). Then
 *     the two count histograms side by side, training (no bar at 0) and
 *     serving (60% of rows at 0, that bar red), on "never zero" and "six
 *     times in ten".
 *   q2-silent: the "served" bar keeps its red; a log with "no errors" and
 *     the offline report still reading 60% (the trap is that it's silent);
 *     then the fork's two arrows merge into one "shared feature path" box,
 *     green, and a small "logged serving features vs training features"
 *     comparison arrow under it.
 *   q3: question card. q3-what: the shared path from q2 becomes a "Feature
 *     store" box; two teams' models drawing the same feature from it on
 *     "reuse"; the train and serve arrows from the same box on "one
 *     transformation".
 *   q3-stores: the box splits into two below it, "Offline store" (a long
 *     table of dated rows, "full history", blue) and "Online store" (one
 *     row per key, "latest value · milliseconds"), the pipeline's arrow
 *     writing into both; "warehouse or lake" and "key-value, like Redis"
 *     under them.
 *   q3-time: a training row stamped "March 12" pulls a feature value: the
 *     wrong lookup reaches today's value (red, "the future"); the right one
 *     reaches the last value before March 12 (green), "point-in-time".
 *   q5-in: the map lights "Model".
 *   q5: question card. Two definitions side by side with a hairline:
 *     "Latency: one request's time, judged at p95 and p99", a skewed latency
 *     histogram with its tail shaded yellow on "the tail"; "Throughput:
 *     requests per second, across the system".
 *   q5-gpu: the site's batching chart (charts/batch-size-throughput.mjs,
 *     placed on the mlops page) redrawn from results.json batching.chart:
 *     throughput and latency per pass, each as a multiple of batch 1,
 *     against batch size 1 to 128 on a log axis;
 *     the knee at 32 marked, "7.8× throughput" in blue and "4.1× latency"
 *     beside it on "thirty-two"; the flattening and the climb lit on "Past
 *     that". A "cost model: 2.8 ms a pass + 0.31 ms a request" note, lit on
 *     "a fixed cost per pass".
 *   q5-sim: one GPU box with a queue of dots in front, a "simulation: 1,000
 *     requests/s, random arrivals" note. Left, "one at a time": the queue
 *     grows off the frame, "capacity 320/s" and "+680 waiting every second"
 *     in red. Right, "batches of up to 32": the queue stays short, dots
 *     leaving in clumps, "p99 10 ms" in green (results.json
 *     batching.heavy).
 *   q5-wait: the same right panel at "100 requests/s": the median, "3 ms",
 *     becomes "8 ms with a 5 ms wait" in yellow; "cap the wait" in green.
 *     Then the GPU box copies itself into three replicas on "add replicas",
 *     each with its own short queue.
 *   q7: question card. One weight as a long bar of 32 cells (a float),
 *     shrinking to 8 cells and then 4, lit on "eight-bit integers" and
 *     "four bits".
 *   q7-run: a handwritten-digit grid (eight held-out digits drawn from
 *     their 8x8 pixels) beside a size bar "68 KB" and "97.8% of 540" in
 *     blue; "8 bits: 17 KB" with "0 answers changed" in green.
 *   q7-cliff: the table grows two rows: "4 bits: 8.5 KB, 97.8%" and "2
 *     bits: 4.3 KB, 28.9%" with the last in red; the sizes drawn as bars
 *     shrinking and the accuracies as a line that holds and drops (the
 *     3-bit row, 95.7%, drawn as a point but not said).
 *   q7-qat: the 4-bit row's "2 answers changed: 1 fixed, 1 broken" lit
 *     yellow beside its unchanged 97.8%; "post-training" and
 *     "quantization-aware" as two badges, the first lit on "simple".
 *   q8-in: the map lights "Labels back".
 *   q8: question card. The loop: prediction → outcome (a click, a
 *     purchase, a fraud confirmed, three small labels) → logged beside the
 *     prediction → training, the arrow closing on "closes the loop".
 *   q8-risks: three marks on the loop, each lit as said: a clock on the
 *     outcome arrow ("days later"); a blocked transaction whose outcome
 *     arrow is cut, red, "never seen"; an arrow from "the model's actions"
 *     back into the inputs.
 *   q8-explore: a thin slice of traffic split off before the model,
 *     "random holdout", its outcomes reaching training unbent, green; a
 *     "decision" field added to the log beside the outcome.
 *   q9: question card. The fraud system as a flow, each box inking in as
 *     named: features (amount, merchant category, time since last,
 *     device and location, velocity 1 h / 24 h, the last lit yellow, the
 *     credit-card spot beside it).
 *   q9-serve: "Gradient boosting" and "or a neural net over the history"
 *     as two badges; the model box at "authorization", "< 100 ms" in
 *     yellow; the velocity counts arriving from the online store (q3's box,
 *     small); on "threshold", a short line under the model box, "Threshold:
 *     a missed fraud vs a good customer declined", in ink (a trade-off, so
 *     neither red nor green).
 *   q9-labels: a timeline: transactions on the left, their chargebacks
 *     arriving weeks to the right; a "train on" bracket that stops where
 *     labels are complete, green; the recent stretch past it, where a fraud
 *     has no chargeback yet, marked "looks honest" in red.
 *   q9-watch: two monitors under the flow, "precision and recall (as
 *     labels arrive)" and "drift in velocity features (before they do)".
 *   q10: question card; the funnel spot on "funnel". q10-retrieve: the
 *     funnel drawn as outlined stages, "millions of items" at the top,
 *     "retrieval: nearest-neighbor search over embeddings" at the first
 *     narrowing, "a few hundred candidates" under it.
 *   q10-rank: two more narrowings, "ranking: P(click or purchase), rich
 *     cross features" and "re-ranking: diversity, freshness, promotions",
 *     the "final list" at the tip; "A B tests on revenue, engagement"
 *     beside the ranking stage.
 *   q10-why: two bars on one axis, "10,000,000 items" and "500
 *     candidates", the first running off the frame; "20,000×" in yellow
 *     between them (results.json funnel). A note: "the video's round
 *     numbers for the page's millions and hundreds".
 *   q10-cold: a user-by-item grid of past interactions with one empty row,
 *     "new user", lit yellow, and one empty column, "new item"; the
 *     fallbacks fill it as named: "item metadata", "sign-up preferences",
 *     "popular"; "hybrid: learned weights" in green.
 *   q10-loop: the new item's empty column stays empty while the others
 *     fill (shown → clicked → shown again), the loop arrow from q8 drawn
 *     small; then a few cells of the new column light on "exposure on
 *     purpose", green.
 *   rapid-in: the quick round's six numbered rows (RapidFire), 12 to 17.
 *   r-features: two columns with a hairline, "Offline: batch jobs over
 *     history, as fresh as the last run" and "Online: at request time,
 *     looked up or built from the request (session recency)"; "same
 *     definition" across both in yellow.
 *   r-validate: a batch of rows passing four checks, "schema", "ranges",
 *     "distributions", "completeness"; a column of nulls and a column whose
 *     values jump by a factor (a unit change) caught by them in red; "stop
 *     the pipeline" in green.
 *   r-gpu: a GPU box under a wide batch ("large, parallel: neural nets,
 *     transformers, images, video") and a CPU box under one request to a
 *     tree ensemble, "launch overhead dominates" in yellow on the GPU side
 *     of that row.
 *   r-distill: a big "teacher" box and a small "student" box; between them
 *     the q7 network's probabilities for one held-out nine, drawn from its
 *     pixels: bars at "9: 0.65" and "3: 0.35", the rest near zero
 *     (results.json soft); beside it the hard label "9: 1" alone.
 *   r-latency: the levers as a list, each inking in as named: "compress
 *     (quantize, distill)", "batch under load", "cache repeated inputs", "faster
 *     runtime or hardware", "co-locate with callers", "simpler model on the
 *     hot path"; "measure first" above them in yellow.
 *   r-scale: replicas joining a row behind a queue over a load curve with a
 *     spike; a new replica greyed out while it warms up, the queue holding
 *     the spike, "waits, not dropped" in green.
 *   close: the map whole: features in, predictions out, labels back, lit in
 *     turn. The giraffe returns.
 *   next: <NextLine> "Next: shipping and monitoring models" on "Next".
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs computes every number into results.json, which data.ts
 * reads; it fails if the pages stop saying what the narration quotes, or if
 * the narration's numbers stop matching:
 *   - q1: batch's schedule, cost and staleness, "unable to use request-time
 *     features", online's latency, scaling and availability, choosing by
 *     freshness and latency, the hybrid: both pages. That a stored answer is
 *     a lookup, so batch is the fast option at request time and suits a
 *     model too heavy to run inside the budget, is what "precomputes
 *     predictions ... and stores them" means for latency; the page lists
 *     latency as a criterion without saying which way it points, and an
 *     earlier draft of this figure put batch in a "slow" corner. "Can't
 *     precompute a reply to a search nobody has typed yet": the page's
 *     concept check ("Feasible only for tiny input spaces; large/contextual
 *     inputs need online inference").
 *   - q2: the definition and "offline metrics look fine; production
 *     underperforms": both pages; one shared path: the pages' fix.
 *     Comparing logged serving features with training ones is the standard
 *     way to catch it (the pages' monitoring answers log inputs). The
 *     simulation (scikit-learn 1.8.0 in Pyodide, seed 1): 100,000
 *     transactions, 2% fraud; the past-hour count is Poisson(4) for fraud
 *     and Poisson(0.5) otherwise; a HistGradientBoostingClassifier trained
 *     on 70,000 with the count plus one; on the 30,000 held out (616 fraud)
 *     it flags 59.9% of fraud with the training count and 42.0% with the
 *     serving count, at the default threshold. The training count's minimum
 *     is 1; 59.8% of held-out serving counts are 0.
 *   - q3: the definition, reuse and one transformation, the two stores,
 *     Redis as the page's example: the page. Point-in-time lookups are the
 *     standard follow-up to "full historical feature values used to create
 *     training datasets": a past row joined to today's value trains on data
 *     that did not exist then (the leakage Part 1 covers).
 *   - q5: the definitions, percentiles, "larger batches improve throughput
 *     but increase per-request latency", "a single inference request leaves
 *     most GPU cores idle", "waiting up to a few milliseconds", replicas
 *     add throughput "without hurting per-replica latency": the page. The
 *     cost model is the one behind the batching chart on mlops.mdx
 *     (charts/batch-size-throughput.mjs, "a simple cost model" aloud, since
 *     this video plays on ml-system-design.mdx): a batch of
 *     b takes (b + 9) / 3200 s; batch 32 gives 7.8 times batch 1's
 *     throughput for 4.1 times its latency per pass, checked against the
 *     chart's caption. The simulation (seeded, 60 s of random arrivals,
 *     latency over the last 50 s): at 1,000 a second, one at a time has a
 *     capacity of 320 a second, so the backlog grows by 680 a second (41,049
 *     still waiting when the stream stops); up to 32 at once, taking what
 *     has queued, p50 6.5 ms and p99 10.3 ms, mean batch 4.1. At 100 a
 *     second, the median is 3.1 ms with no wait and 8.1 ms with a 5 ms wait.
 *     (results.json also holds four replicas each taking 250 a second one
 *     at a time, p99 32 ms, for a builder who wants it; it is not said.)
 *   - q7: 32-bit float to 8-bit int or 4-bit, size, bandwidth, speed,
 *     minimal accuracy loss, post-training against quantization-aware: the
 *     page. The run (scikit-learn's 1,797 digits, 30% held out, seed 0): an
 *     MLP with 128 and 64 hidden units, 17,024 weights (68,096 bytes as
 *     32-bit floats), 97.8% on 540 held-out digits; weights rounded per
 *     layer: 8 bits 97.8% with no answer changed, 4 bits 97.8% with 2
 *     changed (1 fixed, 1 broken), 3 bits 95.7% (shown, not said), 2 bits
 *     28.9%. Biases stay 32-bit (202 of them, not counted in the sizes).
 *   - q8: outcome labels, delayed labels, survivorship bias, feedback-induced shift,
 *     logging and held-out exploration: the page. "Outcomes the model let
 *     happen" is the page's "requests the model acted on", worded so the
 *     blocked transaction does not read as an action whose outcome is seen. "A transaction it blocked
 *     never shows whether it was fraud" is the page's survivorship bias
 *     applied to fraud, where the label is a chargeback (q9).
 *   - q9: features, models, sub-100 ms at authorization, chargebacks,
 *     monitoring: the page. Velocity counts from the online store follows
 *     from q3. The threshold set by the cost of each error is the standard
 *     follow-up to a fraud sketch, from Part 1's precision and recall, not
 *     this page; no costs or threshold are given. Training only on transactions whose labels have matured
 *     follows from "confirmed fraud from chargebacks (delayed)": a fraud
 *     whose chargeback has not arrived is labeled honest.
 *   - q10: retrieval, ranking, re-ranking, the feature store, A B tests, and
 *     "the expensive model only scores a few hundred items, not millions":
 *     the page. 10,000,000 and 500 are the video's round numbers for those;
 *     20,000 is their ratio. Cold start and its fallbacks: the page. That a
 *     never-shown item never earns clicks is q8's survivorship bias applied
 *     to items; giving new items exposure is q8's "held-out exploration".
 *   - quick: the page's answers. "r-latency": "batching under load" is the
 *     page's "batching requests at the server to amortize overhead", worded
 *     for q5, which shows a batch raising each pass's latency and cutting
 *     the queue's. "r-distill": the q7 network's
 *     probabilities for the held-out nine it is least sure of among the
 *     nines it gets right: 0.646 nine, 0.353 three (results.json soft); the
 *     median top probability over all 540 is 0.9998, so most targets look
 *     hard, which is why the figure shows this one.
 *
 * Written for Drew's ear: ML, GPU, CPU and A B in plain caps (no sentence
 * opens "A" before one); "training-serving" with a plain hyphen in the
 * narration (the page's en dash stays on the question card); Redis said
 * as a word, glossed as a key-value database; percentiles said in full
 * ("the ninety-fifth or ninety-ninth percentile") rather than p95; numbers
 * as they are said; no product the page names is treated as running here.
 */
export const script: NarrationScript = {
  id: "mle-system-design",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A model that wins in a notebook is still just a file. To be a product, it needs features at request time, an answer inside a latency budget, and labels coming back to say whether it was right.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Designing that system is this round. Seventeen questions: eleven worked through, then six quickly.",
      pauseAfter: 0.7,
    },

    // ── 1. Batch or online ────────────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. Batch versus online inference, and how do you choose? Batch scores everything on a schedule and stores the answers, like every user's recommendations, overnight. It's cheap and simple, but stale, and it can't use anything known only at request time.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-online",
      text: "Online scores each request as it arrives, behind a low-latency service. It's fresh and can use context, like what's in the cart right now, but you own the latency budget, the scaling and the uptime.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-choose",
      text: "So choose by freshness and latency. A stored answer is only a lookup, so batch suits a heavy model on a tight budget, if yesterday's answer will do and every input is known in advance: you can't precompute a reply to a search nobody has typed yet. Many systems mix the two, with features cached in batch and light scoring online.",
      pauseAfter: 0.8,
    },
    { id: "q2-in", text: "Serving online brings this round's favorite bug." },

    // ── 2. Training-serving skew ──────────────────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. What is training-serving skew? A feature computed one way when the training set is built, and another way when the model serves: different code, different data, or different timing.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-sim",
      text: "Simulate a fraud model whose most telling feature is the card's transactions in the past hour. Training builds it from the warehouse, where the current transaction is already logged, so the count includes it. The serving path counts before it's written. Off by one.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-result",
      text: "Offline, the model catches sixty percent of held-out fraud. Served the same transactions with the serving count, it catches forty-two. In training, the count was never zero; in serving, it's zero six times in ten.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-silent",
      text: "Nothing errors, and offline evaluation can't see it, because it used the training definition. So build every feature through one shared path, and compare logged serving features with the training ones.",
      pauseAfter: 0.8,
    },

    // ── 3, 4. Feature stores ──────────────────────────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Questions three and four. What is a feature store, and why use one? And what are its offline and online stores?",
      pauseAfter: 0.6,
    },
    {
      id: "q3-what",
      text: "It's one place to define, store and serve features, for training and serving alike. Teams reuse vetted features instead of rewriting them, and one transformation backs both paths, which is the cure for question two.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-stores",
      text: "Each value is written to two stores. The offline store, a warehouse or a lake of files, keeps the full history, to build training sets. The online store, a key-value database like Redis, keeps only the latest value, served in milliseconds.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-time",
      text: "The follow-up is time. A training row from March needs each feature as it stood in March. Join today's value instead, and the model trains on the future. So training sets are built with point-in-time lookups: the last value before each row's timestamp.",
      pauseAfter: 0.8,
    },
    { id: "q5-in", text: "Next, the model has to answer quickly, for many people at once." },

    // ── 5, 6. Throughput, latency and batching ────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Questions five and six. What is throughput versus latency in model serving, and how does request batching improve GPU throughput? Latency is one request's time, judged at the tail: the ninety-fifth or ninety-ninth percentile. Throughput is requests per second, across the system.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-gpu",
      text: "One request leaves most of a GPU idle, and every pass has a fixed cost. In a simple cost model, a fixed cost per pass plus a little per request, a batch of thirty-two gets about eight times the throughput of one at a time, for four times the latency per pass. Past that, throughput flattens and latency keeps climbing.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-sim",
      text: "Simulate one GPU on that model, at a thousand requests a second. One at a time, it finishes three hundred and twenty a second, so the line grows by six hundred and eighty every second. Taking whatever has queued, up to thirty-two at once, it keeps up: ninety-nine percent finish within about ten milliseconds.",
      pauseAfter: 0.8,
    },
    {
      id: "q5-wait",
      text: "Serving frameworks also wait a few milliseconds to fill a batch. At a hundred requests a second, a five-millisecond wait lifts the median from three milliseconds to eight. At low load, waiting is pure latency, so cap it. And once one GPU's batches are full, add replicas: more throughput, and no replica gets slower.",
      pauseAfter: 0.8,
    },

    // ── 7. Quantization ───────────────────────────────────────────────────
    {
      id: "q7",
      scene: true,
      text: "Question seven. What is model quantization? Storing the weights in fewer bits: eight-bit integers instead of 32-bit floats, or even four bits. The model gets smaller, moves less data through memory, and usually runs faster.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-run",
      text: "Take a small neural network that reads handwritten digits. Its seventeen thousand weights take sixty-eight kilobytes as 32-bit floats, and it gets ninety-seven point eight percent of five hundred forty held-out digits right. Round every weight to eight bits, a quarter of the size, and not one answer changes.",
      pauseAfter: 0.7,
    },
    {
      id: "q7-cliff",
      text: "At four bits, an eighth of the size, accuracy still holds. At two, it collapses to twenty-nine percent.",
      pauseAfter: 0.8,
    },
    {
      id: "q7-qat",
      text: "Rounding a finished model is post-training quantization: simple, and often enough. For aggressive compression, quantization-aware training rounds during training, so the weights learn to tolerate it. Either way, compare answers, not just the average: at four bits, two answers changed, one fixed and one broken, and accuracy didn't move.",
      pauseAfter: 0.8,
    },
    { id: "q8-in", text: "Speed is half the job. The system also has to learn whether the model was right." },

    // ── 8. Labels and feedback loops ──────────────────────────────────────
    {
      id: "q8",
      scene: true,
      text: "Question eight. What is label collection, and how do feedback loops work? After launch, the label is the outcome the prediction led to: a click, a purchase, a confirmed fraud. Logging it beside the prediction closes the loop.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-risks",
      text: "Three things bend that loop. Labels arrive late: a purchase days after the click. You only see outcomes the model let happen: a transaction it blocked never shows whether it was fraud. And its actions change the data it sees next.",
      pauseAfter: 0.7,
    },
    {
      id: "q8-explore",
      text: "So log what the model decided, not just the outcome, and keep a small random slice where it doesn't decide. Those outcomes are the only ones the model didn't choose.",
      pauseAfter: 0.8,
    },

    // ── 9. Fraud detection ────────────────────────────────────────────────
    {
      id: "q9",
      scene: true,
      text: "Question nine. Sketch a fraud detection ML system. Features first: the amount, the merchant category, time since the last transaction, device and location, and velocity, the card's transactions in the last hour and the last day.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-serve",
      text: "The model is gradient boosting, which suits tabular data like this, or a neural network over the card's history. It runs online, at authorization, in under a hundred milliseconds, so the velocity counts come from the online store. Its threshold is set by cost: a missed fraud against a good customer declined.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-labels",
      text: "Labels are chargebacks, confirmed fraud, and they arrive late. So train only on transactions old enough for their chargebacks to have landed, or fresh fraud is learned as honest.",
      pauseAfter: 0.7,
    },
    {
      id: "q9-watch",
      text: "Then monitor precision and recall as the labels arrive, and drift in the velocity features before they do.",
      pauseAfter: 0.8,
    },

    // ── 10, 11. Recommendations and cold start ────────────────────────────
    {
      id: "q10",
      scene: true,
      text: "Questions ten and eleven. Sketch a recommendation or ranking system. And how do you handle the cold-start problem? The standard design is a funnel.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-retrieve",
      text: "Retrieval, a light model searching embeddings for nearest neighbors, narrows millions of items to a few hundred candidates.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-rank",
      text: "Ranking, a heavier model with rich cross features, scores each candidate's chance of a click or a purchase. Re-ranking applies business rules: diversity, freshness, promotions. Versions of the ranker are compared in A B tests on revenue or engagement.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-why",
      text: "Two stages, because the heavy model's cost grows with every item it scores. Ten million items is twenty thousand times the work of five hundred, so it only ever sees the five hundred.",
      pauseAfter: 0.7,
    },
    {
      id: "q10-cold",
      text: "Cold start is a new user or item with no history, so collaborative filtering has nothing to embed. Fall back to content, like item metadata or preferences asked for at sign-up, or to what's popular. A hybrid blends both signals with learned weights.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-loop",
      text: "And a new item that's never shown never earns the clicks that would get it shown: question eight's loop again. So give new items some exposure on purpose.",
      pauseAfter: 0.9,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Six more, quickly.", pauseAfter: 0.5 },
    {
      id: "r-features",
      text: "Offline features are computed in batch jobs over history, and are as fresh as the last run. Online features are computed at request time, looked up in the online store or built from the request itself, like how recent the session is. Keeping the two definitions identical is the hard part.",
      pauseAfter: 0.6,
    },
    {
      id: "r-validate",
      text: "Data validation checks each new batch for schema, ranges, distributions and completeness before training. Without it, a new null column or a sensor that changes units trains a model on corrupt data, and it quietly underperforms.",
      pauseAfter: 0.6,
    },
    {
      id: "r-gpu",
      text: "GPUs win on large, parallel work: batched neural networks, transformers, images and video. For a light model, like a tree ensemble scoring one request, a CPU is faster, because the GPU's launch overhead would dominate.",
      pauseAfter: 0.6,
    },
    {
      id: "r-distill",
      text: "Knowledge distillation trains a small student to match a large teacher's probabilities, not just the labels. Shown one held-out nine, our digit network says sixty-five percent nine, thirty-five percent three. That tells a student nines can look like threes; the hard label says only nine.",
      pauseAfter: 0.6,
    },
    {
      id: "r-latency",
      text: "To cut serving latency, find where the time goes, then pull these levers: a compressed model, batching under load, a cache for repeated inputs, a faster runtime or hardware, the model placed beside its callers, and a simpler model on the paths that can't wait.",
      pauseAfter: 0.6,
    },
    {
      id: "r-scale",
      text: "And under variable load, autoscale replicas on utilization or queue depth. New replicas take time to warm up, so a request queue in front lets a spike wait instead of being dropped.",
      pauseAfter: 0.9,
    },
    {
      id: "close",
      scene: true,
      text: "Features in, predictions out, labels back: that's the system around the model.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "Once it's live, the world it learned from keeps changing. Next: shipping and monitoring models.",
    },
  ],
};
