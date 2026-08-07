/**
 * Where each chart goes, and the sentence that introduces it.
 *
 * Keyed by lesson path under content/, then a list of `{slug, after, lead}`:
 * `after` is a regex matched against heading lines only, and the chart lands at
 * the end of that heading's section. `lead` is the prose that bridges into the
 * figure — a chart dropped in with no introduction reads as decoration.
 *
 * A slug appearing under more than one lesson is deliberate: the same figure
 * answers the same question in several courses, and re-drawing it per course
 * would mean maintaining several versions of one argument.
 */
export const PLACEMENTS = {
  // ── Statistics ────────────────────────────────────────────────────────────
  "courses/statistics-for-data-science-python/ab-testing.mdx": [
    {
      slug: "ab-test-peeking",
      after: "Pitfalls that quietly invalidate a test",
      lead: "Peeking is the one on that list that feels harmless, so it is worth\nseeing. Below, one experiment where nothing is happening is tested after\nevery new observation instead of once at the end.",
    },
  ],
  "courses/statistics-for-data-science-python/confidence-intervals.mdx": [
    {
      slug: "sample-size-margin-of-error",
      after: "What controls the width",
      lead: "The square root in that formula is the part worth internalising: halving\nthe margin of error costs four times the sample, and the curve flattens\nlong before most people expect it to.",
    },
  ],
  "courses/statistics-for-data-science-python/continuous-distributions.mdx": [
    {
      slug: "exponential-memoryless",
      after: "Exponential: waiting time until the next event",
      lead: "Memorylessness is the property that makes the exponential strange, and it\nis easier to see than to state: having already waited does not improve\nyour position.",
    },
  ],
  "courses/statistics-for-data-science-python/conditional-probability.mdx": [
    {
      slug: "beta-posterior-update",
      after: "Bayes' rule as updating a base rate",
      lead: "Updating does not have to stop at one step. When the thing you are\nestimating is a proportion, the same rule applied over and over has a\nshape: the belief starts wide and tightens as evidence accumulates.",
    },
  ],
  "courses/statistics-for-data-science-python/working-with-distributions.mdx": [
    {
      slug: "survival-curve",
      after: "Four questions, four methods",
      lead: "One more question comes up often enough to name: *how many are still\ngoing after time t?* That is the survival function, which is just\n`1 - cdf` given a name of its own.",
    },
  ],
  "courses/statistics-for-data-science-python/p-values.mdx": [
    {
      slug: "bonferroni-vs-fdr",
      after: "The danger of looking many times: p-hacking",
      lead: "There are two standard corrections, and they are not interchangeable.\nBonferroni controls the chance of *any* false positive; Benjamini-Hochberg\ncontrols the *share* of your discoveries that are false, which is usually\nthe question you actually have.",
    },
  ],

  // ── Machine learning ──────────────────────────────────────────────────────
  "courses/machine-learning-scikit-learn/classification-metrics.mdx": [
    {
      slug: "calibration-curve",
      after: "The threshold is the dial",
      lead: "Moving the threshold assumes the scores mean something. A model can rank\nperfectly and still be badly calibrated, which matters the moment anyone\ntreats `predict_proba` as a probability.",
    },
  ],
  "courses/machine-learning-scikit-learn/decision-trees.mdx": [
    {
      slug: "decision-tree-depth",
      after: "The one knob that matters",
      lead: "Both curves below come from the same tree fitted at increasing depths. The\ngap between them is the overfitting, and it opens up well before the\ntraining score stops improving.",
    },
  ],
  "courses/machine-learning-scikit-learn/ensembles-and-random-forests.mdx": [
    {
      slug: "ensemble-variance",
      after: "The intuition: the wisdom of crowds",
      lead: "Averaging cuts variance, but only to the extent the members disagree.\nThat is the whole reason for bootstrap samples and random feature\nsubsets: correlated trees average to almost nothing.",
    },
  ],
  "courses/machine-learning-scikit-learn/k-means-clustering.mdx": [
    {
      slug: "kmeans-elbow",
      after: "Inertia, and the hard question of choosing",
      lead: "Plotting inertia against `k` is the usual first move. It is worth seeing\nwhat the plot looks like when there really are clusters, and what it looks\nlike when there are not.",
    },
  ],
  "courses/machine-learning-scikit-learn/evaluating-clusters.mdx": [
    {
      slug: "kmeans-elbow",
      after: "Using the silhouette score to choose",
      lead: "The elbow plot is the other half of this question, and the two are worth\nreading side by side: the silhouette often has an opinion where the elbow\ndoes not.",
    },
  ],

  // ── LLMs ──────────────────────────────────────────────────────────────────
  "courses/how-llms-work/context-windows.mdx": [
    {
      slug: "context-window-budget",
      after: "Filling the window is not free",
      lead: "It is also a budget that several things draw on at once. As the\nconversation grows, the fixed costs stay fixed and the room left for the\nanswer is whatever remains.",
    },
  ],
  "courses/how-llms-work/sampling.mdx": [
    {
      slug: "topk-topp-cutoff",
      after: "Top-p \\(nucleus\\) sampling",
      lead: "Top-k and top-p answer the same question with different rules, and they\ndisagree exactly where it matters: when the model is confident, and when\nit is not.",
    },
  ],
  "courses/how-llms-work/tokens.mdx": [
    {
      slug: "utf8-bytes-per-script",
      after: "The rough conversion rate",
      lead: "The rate is not the same for every language, and the reason starts one\nlevel below tokens: the same sentence costs a different number of *bytes*\ndepending on the script it is written in.",
    },
  ],
  "courses/how-llms-work/embeddings.mdx": [
    {
      slug: "tfidf-vs-embedding",
      after: "Why a vector helps",
      lead: "The older way of turning text into vectors counts words. That is enough\nfor a lot of tasks and hopeless for others, and the difference shows up as\nsoon as two sentences mean the same thing in different words.",
    },
  ],
  "courses/how-llms-work/controlling-cost.mdx": [
    {
      slug: "quantization-size-quality",
      after: "Route to the cheapest model that passes",
      lead: "Serving a smaller version of the *same* model is the other half of that\nlever. Quantization trades bits per weight for memory, and the quality\ncost is not linear in the saving.",
    },
  ],

  // ── NLP ───────────────────────────────────────────────────────────────────
  "courses/natural-language-processing-python/tf-idf.mdx": [
    {
      slug: "tfidf-vs-embedding",
      after: "Step 3: putting them together",
      lead: "It is worth being clear about what this cannot do. TF-IDF compares\nvocabularies, so two sentences that say the same thing in different words\nscore near zero however obvious the paraphrase is.",
    },
  ],

  // ── Time series ───────────────────────────────────────────────────────────
  "courses/time-series-analysis-python/decomposition-trend-seasonality.mdx": [
    {
      slug: "seasonal-strength",
      after: "Additive or multiplicative\\? Read the seasonal swings",
      lead: "\"Is there seasonality here\" is usually better asked as \"how much of the\nvariation is seasonal\", which is a number you can compute from the\ndecomposition rather than a judgement call about the picture.",
    },
  ],

  // ── Data structures and algorithms ────────────────────────────────────────
  "courses/mastering-dsa-cpp/arrays.mdx": [
    {
      slug: "amortized-vector-growth",
      after: "Resizing, capacity, and amortized push",
      lead: "\"Amortized O(1)\" is a claim about a total, not about any single push.\nDoubling makes the expensive pushes rare enough that the average stays\nflat; growing by a constant does not.",
    },
  ],
  "courses/mastering-dsa-cpp/graph-traversal.mdx": [
    {
      slug: "bfs-vs-dfs-frontier",
      after: "Depth-first search",
      lead: "The two differ in one line of code and in the shape of what they hold in\nmemory. On a wide graph the queue balloons; on a deep one the stack does.",
    },
  ],
  "courses/mastering-dsa-cpp/binary-search-trees.mdx": [
    {
      slug: "tree-height-balanced",
      after: "Complexity and balance",
      lead: "The gap between O(log n) and O(n) here is entirely the gap between a\nbalanced tree and a degenerate one, and sorted input is the everyday way\nof landing in the second case.",
    },
  ],
  "courses/java-collections-and-generics-deep-dive/performance-tradeoffs.mdx": [
    {
      slug: "amortized-vector-growth",
      after: "ArrayList capacity and resizing",
      lead: "The growth factor is what makes the amortized cost constant. Below, the\nsame sequence of appends under doubling and under adding a fixed number of\nslots each time.",
    },
    {
      slug: "cache-stride-cost",
      after: "Big-O is not the whole story: cache locality",
      lead: "The size of that effect surprises people. Walking the same array with a\nlarger stride does the same number of operations and takes several times\nas long, because the cache line stops paying for itself.",
    },
  ],

  // ── Databases ─────────────────────────────────────────────────────────────
  "courses/database-design-postgresql/design-and-scale.mdx": [
    {
      slug: "index-vs-scan-rows",
      after: "Keys and relationships guide future lookups",
      lead: "The reason an index is worth its write cost is a curve, not a constant:\nthe scan grows with the table and the index lookup barely does.",
    },
  ],
  "courses/database-design-postgresql/why-normalization.mdx": [
    {
      slug: "normalization-storage",
      after: "The cure: give each fact one home",
      lead: "Storage is the least interesting benefit, but it is the easiest to see:\nrepeating a fact on every row costs more the more rows there are.",
    },
  ],
  "courses/intro-sql-postgres/understanding-joins.mdx": [
    {
      slug: "join-fanout-rows",
      after: "A join is a matching process",
      lead: "Matching is also how joins surprise people. If a key repeats on both\nsides, the result has more rows than either input, and any `SUM` over it\nis quietly wrong.",
    },
  ],
  "courses/intro-sql-postgres/working-with-null.mdx": [
    {
      slug: "sql-null-logic",
      after: "The surprising part: NULL is \"contagious\"",
      lead: "Three-valued logic is the rule behind all of it. Once `UNKNOWN` is a\nvalue that `AND`, `OR` and `NOT` have to handle, the truth tables stop\nlooking like the ones you know.",
    },
  ],
  "courses/sqlite-for-beginners/working-with-null.mdx": [
    {
      slug: "sql-null-logic",
      after: "Comparisons with NULL are unknown",
      lead: "`UNKNOWN` is a third truth value, not a missing second one, and the\noperators have to say what they do with it.",
    },
  ],
  "courses/data-wrangling-python-polars/columnar-memory-and-arrow.mdx": [
    {
      slug: "columnar-vs-row-io",
      after: "What this predicts",
      lead: "The prediction is about bytes read, and it is easy to make concrete:\nselecting three columns out of thirty reads a tenth of the file in a\ncolumn store and all of it in a row store.",
    },
  ],
  "courses/sql-analytics-duckdb/olap-vs-oltp.mdx": [
    {
      slug: "columnar-vs-row-io",
      after: "Why the \\*physical\\* shape differs",
      lead: "Put a number on it and the argument stops being architectural taste. The\nanalyst's query touches a few columns of a wide table; the row store has\nto read every one of them to get there.",
    },
  ],
  "courses/sql-analytics-duckdb/building-business-metrics.mdx": [
    {
      slug: "cohort-retention",
      after: "Keeping metrics honest",
      lead: "The clearest example of a metric that hides its own composition is\nretention. One aggregate curve can be flat while every cohort inside it is\ndeclining, simply because newer cohorts keep being added.",
    },
  ],

  // ── JavaScript and the web ────────────────────────────────────────────────
  "courses/beginners-javascript/how-javascript-runs.mdx": [
    {
      slug: "event-loop-phases",
      after: "The event loop, tasks, and microtasks",
      lead: "Laid out on a clock, the rules stop needing to be memorised. A task runs\nto completion, the microtask queue drains entirely, and only then may the\nbrowser paint.",
    },
  ],
  "courses/beginners-javascript/asynchronous-thinking.mdx": [
    {
      slug: "frame-budget-long-tasks",
      after: "Concurrency without parallelism",
      lead: "One thread has a consequence you can measure: anything that takes longer\nthan a frame does not slow the page down a little, it drops frames\noutright.",
    },
  ],
  "courses/beginners-javascript/values-and-types.mdx": [
    {
      slug: "js-equality-grid",
      after: "Comparing values: `==` vs `===`",
      lead: "The full behaviour of `==` is a table rather than a rule, which is the\nreal argument for reaching for `===` by default.",
    },
  ],
  "courses/react-from-the-ground-up/handling-events.mdx": [
    {
      slug: "debounce-vs-throttle",
      after: "The event object",
      lead: "Some events fire far more often than you want to respond to them. Two\nstandard fixes exist and they behave differently in a way the names do not\nmake obvious.",
    },
  ],
  "courses/modern-css-layout/the-cascade-and-specificity.mdx": [
    {
      slug: "css-specificity-ladder",
      after: "Specificity, counted",
      lead: "The counting is easier to trust once you see that the columns do not\ncarry: no number of class selectors ever outranks a single id.",
    },
  ],
  "courses/modern-css-layout/transitions-and-animations.mdx": [
    {
      slug: "frame-budget-long-tasks",
      after: "`transform`: move without disturbing layout",
      lead: "The reason `transform` is the recommended property is the frame budget.\nAt 60fps there are about 16 milliseconds per frame for everything,\nlayout included, and animating a layout-triggering property spends them\nall.",
    },
  ],
  "courses/intro-web-development/how-the-web-works.mdx": [
    {
      slug: "core-web-vitals",
      after: "The round trip",
      lead: "How long that round trip takes is something browsers now measure in\nspecific, named ways, because \"the page feels slow\" turned out to mean\nthree different problems.",
    },
    {
      slug: "bundle-parse-cost",
      after: "The three languages, one page",
      lead: "The JavaScript is the expensive one of the three. It is not just\ndownloaded, it is parsed and compiled before it runs, and on a phone that\nsecond cost is larger than the first.",
    },
  ],
  "courses/intro-web-development/html-images-media.mdx": [
    {
      slug: "image-format-bytes",
      after: "The image element",
      lead: "Which format you pick is usually the single biggest lever on page weight,\nand the gaps between them are larger than most people assume.",
    },
  ],

  // ── Systems ───────────────────────────────────────────────────────────────
  "courses/systems-programming-c/arrays-and-pointers.mdx": [
    {
      slug: "cache-stride-cost",
      after: "A C array is contiguous memory",
      lead: "Contiguity is not a detail of the layout, it is the performance. Reading\nthe same number of elements with a bigger gap between them costs several\ntimes as much, because each cache line delivers less of what you asked\nfor.",
    },
  ],
  "courses/c-programming-for-beginners/data-types.mdx": [
    {
      slug: "integer-overflow-wrap",
      after: "Signed and unsigned",
      lead: "The fixed width has a consequence worth seeing before it bites you:\nadding one to the largest value does not produce a larger value.",
    },
  ],
  "courses/from-zero-to-cpp/dynamic-memory.mdx": [
    {
      slug: "heap-vs-stack-cost",
      after: "Stack vs. heap, one more time",
      lead: "The two are not just different places, they have very different prices. A\nstack allocation moves a pointer; a heap allocation goes and looks for\nsomewhere to put the thing.",
    },
  ],
  "courses/java-programming-for-beginners/jvm-conceptually.mdx": [
    {
      slug: "gc-pause-heap",
      after: "Garbage collection, intuitively",
      lead: "Collection is not free, and what it costs depends on how full the heap\nis. The pauses stay small over a wide range and then stop being small\nquite suddenly.",
    },
  ],

  // ── Analysis workflow ─────────────────────────────────────────────────────
  "courses/data-analysis-python-pandas/project-organization.mdx": [
    {
      slug: "git-branch-topology",
      after: "Git, the missing tool",
      lead: "Branches are the part of git most worth understanding early, and they are\neasier to see than to describe: a branch is a line of commits, and a merge\nis where two of them come back together.",
    },
  ],
  "courses/python-basics/strings.mdx": [
    {
      slug: "utf8-bytes-per-script",
      after: "Bytes vs strings",
      lead: "How many bytes a character costs depends on the character. UTF-8 spends\none byte on ASCII and up to four on everything else, which is why\n`len(s)` and `len(s.encode())` disagree.",
    },
  ],

  // ── Interview prep: backend ───────────────────────────────────────────────
  "interview/backend-engineer/system-design.mdx": [
    {
      slug: "cap-theorem-grid",
      after: "Explain the CAP theorem",
      lead: "The theorem is easiest to hold onto as the three pairs you could pick and\nthe one that is not actually available to you.",
    },
    {
      slug: "latency-percentiles",
      after: "What back-of-the-envelope numbers should you estimate",
      lead: "One more habit worth having: quote latency as a percentile, never as a\nmean. The distribution is skewed enough that the average describes almost\nnobody's experience.",
    },
    {
      slug: "circuit-breaker-states",
      after: "What is a single point of failure",
      lead: "Removing the single point of failure is only half of it. The other half\nis making sure a failing dependency is not kept failing by the traffic\nstill being sent to it.",
    },
  ],
  "interview/backend-engineer/api-design.mdx": [
    {
      slug: "api-pagination-cost",
      after: "How do you paginate a large collection",
      lead: "The reason to prefer keyset pagination is a curve. `OFFSET` makes the\ndatabase walk and discard the rows it skips, so page 500 costs five\nhundred times page one.",
    },
    {
      slug: "token-bucket-burst",
      after: "How do you rate-limit an API",
      lead: "The token bucket is the default for a reason: it enforces an average rate\nwhile still letting a client spend a saved-up burst, which is what real\ntraffic looks like.",
    },
  ],
  "interview/backend-engineer/databases.mdx": [
    {
      slug: "hash-vs-tree-index",
      after: "What is a database index and how does it speed up queries",
      lead: "Which *kind* of index matters as much as having one. A hash index answers\nequality in constant time and cannot answer a range at all.",
    },
    {
      slug: "isolation-levels",
      after: "What anomalies do isolation levels prevent",
      lead: "The levels are usually memorised as a list; they are easier to keep\nstraight as a grid of which anomaly each one still permits.",
    },
    {
      slug: "connection-pool-saturation",
      after: "What is a deadlock, and how do you avoid it",
      lead: "A related failure mode that looks like a deadlock from the outside is a\nsaturated connection pool: nothing is stuck, but every request is queued\nbehind a fixed number of connections.",
    },
    {
      slug: "join-fanout-rows",
      after: "Why can a join inflate a SUM",
      lead: "The inflation is multiplicative, which is why it can go unnoticed on a\nsmall sample and be wildly wrong in production.",
    },
  ],

  // ── Interview prep: data engineering ──────────────────────────────────────
  "interview/data-engineer/orchestration-and-reliability.mdx": [
    {
      slug: "idempotency-retry-storm",
      after: "Why is idempotency the foundation of reliable pipelines",
      lead: "The failure it prevents compounds. Without idempotent writes, a retry\nafter a partial success does not repair the run, it duplicates part of\nit.",
    },
    {
      slug: "circuit-breaker-states",
      after: "What is a circuit breaker in a pipeline",
      lead: "The point of opening the circuit is not to fail faster, it is to stop\nsending load to something that cannot recover while it is under load.",
    },
    {
      slug: "docker-layer-cache",
      after: "What is a backfill, and how do you design for it",
      lead: "Backfills are also where image build time starts to matter, and layer\nordering is the whole game: a dependency install placed after a source\ncopy is re-run on every commit.",
    },
  ],
  "interview/data-engineer/data-warehousing.mdx": [
    {
      slug: "compression-ratio-speed",
      after: "Why is compression more effective in columnar formats",
      lead: "Which codec, though, is its own trade-off. There is no winner, only a\nfrontier, and where you want to sit on it depends on how fast the link\nreading the data is.",
    },
  ],

  // ── Interview prep: machine learning ──────────────────────────────────────
  "interview/machine-learning-engineer/nlp-and-llms.mdx": [
    {
      slug: "tfidf-vs-embedding",
      after: "What is the difference between static and contextual embeddings",
      lead: "It helps to see what the pre-embedding baseline could and could not do,\nsince that is the gap embeddings were introduced to close.",
    },
    {
      slug: "topk-topp-cutoff",
      after: "How do you control an LLM's output randomness",
      lead: "Top-k and top-p are the two truncation rules, and they diverge exactly\nwhere the model's confidence does.",
    },
  ],
  "interview/machine-learning-engineer/mlops.mdx": [
    {
      slug: "quantization-size-quality",
      after: "How do you package a model for deployment",
      lead: "Packaging is also where serving cost is decided, and quantization is the\nbiggest single lever on it: fewer bits per weight, against a quality cost\nthat is not linear in the saving.",
    },
    {
      slug: "batch-size-throughput",
      after: "Batch vs online inference, and how do you choose",
      lead: "Batch size pulls in two directions at once, which is what makes the\nchoice a real one: throughput rises with it, and so does the latency any\nindividual request sees.",
    },
  ],
};
