import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Algorithms as reasoning" (16:9), Part 8 of the Backend /
 * Software Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md, "8, Algorithms as
 * reasoning"), after content/interview/backend-engineer/algorithms.mdx. It
 * answers all thirty-five of the page's questions, by its headings: eight
 * worked through, numbered aloud and read in the page's words, three more
 * answered inside them (named below), then twenty-four one-line answers in
 * two quick rounds, numbered on screen only (9 to 32; a question answered
 * inside a deep dive takes no number of its own).
 *
 * The argument is the plan's: Big-O is the case for a design, and the
 * structure is the decision. No implementation is walked through and no code
 * is typed; each figure shows what a structure holds and what an operation
 * costs, counted. Colors keep interview.tsx's meanings: red the trap or the
 * wrong result, green the right one, yellow what the narration points at,
 * blue data.
 *
 * The watercolors (illustrations.json): the pangolin on the opening ("hook"
 * and "plan"), then one spot per figure, in the whitespace beside it: the
 * hourglass by question one's modeled 83 minutes, the key ring by question
 * two's map, the stack of plates by question four's column of openers, the
 * three oranges (one on top, a heap's root) by question six's tree, the
 * road map by question seven's graph, and the fanned cards by question
 * eight's bars and the first quick round's sorting rows.
 *
 *   1. "What is Big-O notation, and why do interviewers care?" ("big").
 *      A grid of n by n dots (every pair) beside one row of n dots (one
 *      pass); then a table of n, pairs and one pass at 100, 1,000 (counted,
 *      marked so) and 1,000,000; then the modeled times, 83 minutes against
 *      0.01 s, under a label "model: 100 million checks a second, an
 *      assumption". "big-next" lights the 100 row in yellow: there the brute
 *      force is fine.
 *   2. "When do you reach for a hash map?" ("hash"), with "What is the time
 *      and space complexity of a hash set?" answered in "hash-worst" and
 *      "hash-set". Two Sum on the challenge's [2, 7, 11, 15], target 9: the
 *      map filling as the pass moves, 9 - 7 = 2 found, [0, 1] in green. Then
 *      a thousand buckets filling key by key until two land together, at the
 *      38th (yellow); then two bars of key comparisons (__eq__ calls),
 *      0 for distinct hashes and 595,679 for one shared hash (red).
 *   3. "What is amortized O(1) and when does it apply?" ("amort"). A
 *      staircase of a Python list's allocated slots against items appended,
 *      its 86 steps, with a doubling array's 20 dashed behind it; a running
 *      count of copies per append settling near 8 (doubling's under 2); then
 *      the last step lit in yellow: the one append that can copy 938,736.
 *   4. "When is a stack the right structure?" ("stack"). "([)]" and "{[]}"
 *      checked three ways, counter, queue and stack, each verdict a tick or
 *      a cross (results.json). The stack drawn as a column of openers,
 *      newest on top, the round closer meeting the square opener in red; the
 *      queue's two wrong verdicts in red.
 *   5. "Walk me through BFS vs DFS, when do you choose each?" ("bfs"), with
 *      "What is a deque, and when should you prefer it over a list?" in
 *      "bfs-deque". The page's graph (A to B and C, both to D), the two
 *      visiting orders numbered on the nodes; then a twenty-level binary
 *      tree drawn as a triangle, BFS's frontier a band across its widest
 *      level (524,288), DFS's a single path down it (20); then a queue as a
 *      row of cells, a pop from a list's front shifting every cell behind it
 *      (274,876,858,369 shifts for this tree), a deque's front detaching.
 *   6. "How does a priority queue differ from a regular queue?" ("pq"), with
 *      "What are the time complexities of heap operations?" in "heap-choose"
 *      to "heap-build". A queue and a priority queue handing out the same
 *      five jobs in two orders; a three-row table of push and pop costs
 *      (sorted list, unsorted list, heap), the heap's row in green; the heap
 *      as a tree twenty levels deep, one push climbing nineteen; then two
 *      bars on the same million items arriving least urgent first (largest
 *      first, for a min-heap): heapify 1,499,986 comparisons, one push at a
 *      time 17,951,445.
 *   7. "Explain Dijkstra's algorithm and its complexity." ("dijk"). The
 *      page's graph and weights, distances settling in order to the page's
 *      printed {'A': 0, 'B': 1, 'C': 3, 'D': 4}; the cost, (V + E) log V;
 *      then the video's own graph with one edge of -2, labelled "finalize a
 *      node when it leaves the heap": its B = 2, D = 3 in red beside
 *      Bellman-Ford's B = 1, D = 2 in green, three rounds over four edges.
 *   8. "How does quicksort work, and what is its worst-case?" ("quick"). A
 *      thousand bars already in order, partitioned on the last: a staircase
 *      of splits 999 levels deep, 499,500 comparisons labelled "n squared
 *      over two" on "n squared", and Python's RecursionError for the
 *      recursive form, in red; then the same bars on random pivots, a bushy
 *      tree 21 levels deep, 10,962 comparisons, in green; "quick-next" sets
 *      "in place" against merge sort's buffer.
 *   Quick round one ("rapid-in", 9 to 19): "Explain merge sort and its
 *   complexity."; "When is heapsort preferable?"; "What makes a sort
 *   'stable,' and why does it matter?"; "Explain the difference between
 *   in-place and out-of-place algorithms."; "What is the Master Theorem?";
 *   "Recursion vs iteration?"; "What is divide and conquer, and how does it
 *   differ from DP?"; "Explain memoization vs tabulation in dynamic
 *   programming."; "What are classic DP problems you should know?"; "What is
 *   a greedy algorithm and when is it safe to use?"; "Explain backtracking
 *   and give a use case.".
 *   Quick round two ("rapid2-in", 20 to 32): "Array vs linked list,
 *   trade-offs?"; "What is a BST and what are its operation complexities?";
 *   "What are the three DFS tree traversals?"; "How does a balanced BST
 *   differ from a heap?"; "What is a trie, and what problems is it suited
 *   for?"; "Binary search, prerequisites and common mistakes?"; "Explain the
 *   two-pointer technique and give an example."; "What is the
 *   sliding-window technique?"; "What graph representation should you use,
 *   adjacency list vs matrix?"; "How do you detect a cycle in a directed
 *   graph?"; "What is topological sort, and when is it applicable?"; "What
 *   is Kahn's algorithm and what does it detect?"; "How do bit manipulation
 *   tricks speed up algorithms?".
 *   Each row's answer is drawn beside the list, with the number from
 *   results.json where the line says one (the two trees' heights, the two
 *   call counts, the coins, the Hoppers, the twenty probes, the
 *   hundred-million-against-a-trillion bars, Kahn's one node out of four
 *   when a cycle blocks the rest).
 *
 * Opening: fresh, on code that is fast at a hundred items and the question of
 * what it costs at a million, without naming the video before it (whose
 * bridge is "reading code includes judging what it costs"). The close
 * bridges into Part 9: when an assistant writes the code, working code is
 * not what's graded.
 *
 * Facts. check.mjs runs the page's own snippets unchanged in Pyodide 314.0.7
 * (Python 3.14.2), the runtime of the page's <CodeBlock>s; counts operations
 * on the video's own inputs (seeded, or built from fixed expressions); and
 * does the arithmetic from stated assumptions, into results.json, which
 * data.ts reads. It then fails if a beat stops saying what ran (59 claims)
 * or a deep dive stops reading its heading word for word. Nothing is timed.
 *   - "big-count", "big-million": a double loop over n items checks
 *     n(n - 1)/2 pairs: 4,950 at 100 ("under five thousand"),
 *     499,999,500,000 at a million ("half a trillion"). Counted on a
 *     thousand numbers whose only pair is the last two: 499,500 pairs
 *     against 1,000 hash lookups (on screen). "big-model": the rate is an
 *     assumption, said as one: 4,999.995 s, about 83 minutes; one pass of a
 *     million at the same rate, 0.01 s.
 *   - "hash-twosum": the Two Sum challenge's reference solution prints
 *     [0, 1] for its example. "hash-collide": 1,000 buckets, uniform
 *     hashing: a shared bucket is more likely than not from the 38th key
 *     (50.9%; 54.6% at 40, the page's "even money by the fortieth key").
 *     "hash-worst": a thousand keys of one hash, put into a Python set, call
 *     __eq__ 595,679 times ("nearly six hundred thousand"; more than a
 *     chain's n(n - 1)/2 because open addressing revisits slots); with
 *     distinct hashes, 0. "hash-set": the page's answer (average O(1), O(n)
 *     space, O(n) per operation at worst).
 *   - "amort-*": a million appends to a Python list, its allocated slots
 *     read from sys.getsizeof after each: 86 resizes; if each copied every
 *     item, 8,445,096 copies, 8.4 per append (7.6 at a thousand, 8.6 at two
 *     million: "at any length"); growth 1.126 a step ("about an eighth");
 *     the largest resize falls at 938,736 items ("nine hundred thirty-nine
 *     thousand"). A doubling array: 20 resizes, 1,048,575 copies, under two
 *     per append. The page says the list doubles; it does not (the report
 *     says so), and the narration follows the run.
 *   - "stack-*": a counter, a queue and a stack on "([)]" and "{[]}": the
 *     counter accepts both; the queue accepts "([)]" and rejects "{[]}";
 *     the stack rejects "([)]" and accepts "{[]}". The page's own concept
 *     check names "([)]" and the queue's failure.
 *   - "bfs-graph": the page's bfs prints ['A', 'B', 'C', 'D']; a DFS of the
 *     same graph visits A, B, D, C. "bfs-memory": a complete binary tree of
 *     2^20 - 1 = 1,048,575 nodes ("a million"): the BFS queue peaks at
 *     524,288, an explicit DFS stack at 20. "bfs-deque": that BFS with a
 *     list popped from the front would shift 274,876,858,369 elements, each
 *     pop moving the len - 1 behind it.
 *   - "heap-choose": a sorted list of a million shifts n / 2 = 500,000 on an
 *     average insert, at a uniformly random position (said "on average").
 *     "heap-height": a million items make 20 levels, so a push or pop moves
 *     at most 19; a push of a new minimum made 19 comparisons, a pop 20 (on
 *     screen). "heap-build": a million items arriving largest first, each a
 *     new minimum: heapify 1,499,986 comparisons, a push each 17,951,445;
 *     the sum of every node's height, the most moves heapify can make, is
 *     999,993, under n (on screen).
 *   - "dijk-run": the page's dijkstra prints {'A': 0, 'B': 1, 'C': 3,
 *     'D': 4}. "dijk-neg": the video's own graph (A-B 2, A-C 3, C-B -2,
 *     B-D 1): the version that finalizes a node when it leaves the heap
 *     returns B = 2, D = 3; Bellman-Ford returns B = 1, D = 2, in three
 *     rounds over four edges. The page's own function re-pushes a node whose
 *     distance improves, so it gets B = 1 here by processing B twice; the
 *     narration's "a node is final when it leaves the heap" is the textbook
 *     algorithm the complexity is for, and the screen says which version.
 *   - "quick-sorted": a thousand sorted numbers, last-element pivot: 499,500
 *     comparisons ("half a million"), exactly n(n - 1)/2, the "n squared"
 *     the beat names; 999 levels ("nearly a thousand").
 *     "quick-limit": the page's recursive shape with a last pivot raises
 *     RecursionError at Python's default limit, 1,000. "quick-random": a
 *     seeded random pivot on the same input, 10,962 ("eleven thousand"), 21
 *     levels.
 *   - Quick rounds: a BST of 1,000 keys inserted in order is 1,000 levels
 *     tall, 21 shuffled (seeded); naive Fibonacci of 30 makes 2,692,537
 *     calls ("two point seven million"), memoized 59; greedy change for 6
 *     from {1, 3, 4} takes 4, 1, 1, the fewest is 3, 3; sorted by first name
 *     and then stably by last, the two Hoppers stay Ada, Grace; binary
 *     search over a million takes at most 20 probes; the page's kahns and
 *     topo_sort on a graph with a cycle return fewer nodes than it has; the
 *     page's inorder, single_number, two_sum_sorted, window, merge_sort and
 *     permutations outputs (results.json, "page"). The adjacency figures are
 *     arithmetic from the assumption said aloud: a million users with a
 *     hundred friends each, 10^8 list entries against 10^12 matrix cells.
 *     "r-bst-heap" says a range costs log n plus its length, where the page
 *     says "O(log n) for ... range queries": finding where a range starts is
 *     log n, and reading it out is one step per key in it.
 *
 * Where the page and a run disagree (reported, not followed; nothing in
 * content/ is edited): the list "doubling" above; two_sum_sorted's second
 * call, commented "None", returns (3, 4) (results.json, pageDisagrees); and
 * a Python set grows at three fifths full, not the page's "~2/3", which is
 * a dict's (counts.setLoad: 5 of 8, 19 of 32, 77 of 128 slots).
 *
 * Written for Drew's ear: complexity as people say it ("n squared", "log n",
 * "n log n", "O of one", "V plus E"); BFS, DFS, BST, AVL, IP and ID in plain
 * caps, read as letters (BFS and DFS spelled out as breadth-first and
 * depth-first in question five, BST expanded once); XOR, said as a word, and
 * "deque", said "deck", go to the lexicon (see the report); no sentence opens
 * with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "be-algorithms",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "On a hundred items, almost any code is fast. The interview question is what it costs at a million, and which structure keeps it cheap.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Thirty-five questions, argued with counts, not code: eight with a figure each, three inside those, and twenty-four quickly.",
      pauseAfter: 0.8,
    },

    // ── 1. Big-O ──────────────────────────────────────────────────────────
    {
      id: "big",
      scene: true,
      text: "Question one. What is Big-O notation, and why do interviewers care? It says how time or memory grows with the input size, n, ignoring constants.",
      pauseAfter: 0.6,
    },
    { id: "big-count", text: "A double loop over a hundred items checks under five thousand pairs. Instant.", pauseAfter: 0.6 },
    { id: "big-million", text: "At a million items, it's half a trillion.", pauseAfter: 0.7 },
    {
      id: "big-model",
      text: "Model it at a hundred million checks a second, an assumption: about eighty-three minutes. One pass over the million: a hundredth of a second.",
      pauseAfter: 0.8,
    },
    {
      id: "big-why",
      text: "That's why they care: Big-O predicts whether a solution survives its real input. The usual game is turning a brute-force n squared into n.",
      pauseAfter: 0.6,
    },
    {
      id: "big-next",
      text: "But constants are dropped, so at a hundred items the brute force is often fine, and simpler. Say what it costs, and where it stops being fine.",
      pauseAfter: 0.8,
    },

    // ── 2. Hash map, and the hash set's worst case ────────────────────────
    {
      id: "hash",
      scene: true,
      text: "Question two. When do you reach for a hash map? When you need lookups and inserts by key in constant time on average: counting, grouping, have I seen this?",
      pauseAfter: 0.6,
    },
    {
      id: "hash-twosum",
      text: "It turns Two Sum's double loop into one pass: at each number, ask the map for target minus it, then store the number. Linear time, at the cost of linear memory.",
      pauseAfter: 0.7,
    },
    {
      id: "hash-collide",
      text: "Average is the key word. With a thousand buckets, a shared bucket is more likely than not by the thirty-eighth key.",
      pauseAfter: 0.6,
    },
    {
      id: "hash-worst",
      text: "The follow-up is the worst case. Give a thousand keys the same hash, and filling a Python set takes nearly six hundred thousand key comparisons. With distinct hashes, none.",
      pauseAfter: 0.7,
    },
    {
      id: "hash-set",
      text: "That's a hash set: constant on average, linear space, and linear per operation at worst.",
      pauseAfter: 0.8,
    },

    // ── 3. Amortized O(1) ─────────────────────────────────────────────────
    {
      id: "amort",
      scene: true,
      text: "Question three. What is amortized O of one, and when does it apply? It spreads a rare expensive step's cost over the cheap ones around it.",
      pauseAfter: 0.6,
    },
    {
      id: "amort-run",
      text: "Append a million items to a Python list. It runs out of room eighty-six times, and each move to a bigger block can copy every item so far.",
      pauseAfter: 0.6,
    },
    {
      id: "amort-total",
      text: "Add those copies up: about eight copies per append, at any length. Constant, on average.",
      pauseAfter: 0.7,
    },
    {
      id: "amort-factor",
      text: "A textbook array doubles, for under two copies an append. Python grows by about an eighth, so it copies more often. Any fixed factor keeps it constant, a hash table's rehash too.",
      pauseAfter: 0.6,
    },
    {
      id: "amort-spike",
      text: "But that's an average, not a promise per call: the append that triggers the last resize can copy nine hundred thirty-nine thousand items. On a latency budget, allocate up front.",
      pauseAfter: 0.8,
    },

    // ── 4. Stack ──────────────────────────────────────────────────────────
    {
      id: "stack",
      scene: true,
      text: "Question four. When is a stack the right structure? When the problem is about the most recent thing still open: nesting, undo, backtracking. Last in, first out.",
      pauseAfter: 0.6,
    },
    {
      id: "stack-count",
      text: "A counter can't do it. This string opens and closes one round and one square bracket, so counting accepts it. But the round one closes while the square one inside is open.",
      pauseAfter: 0.6,
    },
    {
      id: "stack-run",
      text: "A stack keeps the openers, newest on top, and each closer must match the top: rejected.",
      pauseAfter: 0.6,
    },
    {
      id: "stack-queue",
      text: "A queue matches the oldest opener instead, so it gets both wrong: it accepts this one, and rejects a correctly nested string.",
      pauseAfter: 0.7,
    },
    { id: "stack-next", text: "Depth-first search is the same idea: the path you're on is the stack.", pauseAfter: 0.8 },

    // ── 5. BFS or DFS, and the deque ──────────────────────────────────────
    {
      id: "bfs",
      scene: true,
      text: "Question five. Walk me through BFS versus DFS: when do you choose each? Breadth-first search takes a queue, level by level. Depth-first takes a stack and follows one path down.",
      pauseAfter: 0.6,
    },
    {
      id: "bfs-graph",
      text: "Node A leads to B and C, and both lead to D. Breadth-first visits A, B, C, D; depth-first, A, B, D, then C.",
      pauseAfter: 0.6,
    },
    {
      id: "bfs-short",
      text: "Choose BFS for shortest paths in an unweighted graph: it reaches each node first by the fewest edges. DFS for cycle detection, topological sort and backtracking.",
      pauseAfter: 0.6,
    },
    {
      id: "bfs-memory",
      text: "Memory decides it too. On a full binary tree of a million nodes, BFS holds the widest level, five hundred twenty-four thousand nodes; DFS holds one path, twenty.",
      pauseAfter: 0.8,
    },
    {
      id: "bfs-deque",
      text: "And make the queue a deque, a double-ended queue. Popping a Python list's front shifts everything behind it: two hundred seventy-five billion moves here. A deque pops either end in constant time.",
      pauseAfter: 0.8,
    },

    // ── 6. Priority queue, and the heap under it ──────────────────────────
    {
      id: "pq",
      scene: true,
      text: "Question six. How does a priority queue differ from a regular queue? A queue serves in arrival order. A priority queue serves the most urgent first, as in a scheduler or Dijkstra's algorithm.",
      pauseAfter: 0.6,
    },
    {
      id: "heap-choose",
      text: "Keep a list sorted, most urgent at the end, and a pop is instant, but at a million items an insert shifts half a million on average. An unsorted list inserts instantly and scans to pop.",
      pauseAfter: 0.6,
    },
    {
      id: "heap-height",
      text: "A heap does both in log n, each parent at least as urgent as its children. A million items make twenty levels, so a push or pop moves at most nineteen; a peek is constant.",
      pauseAfter: 0.7,
    },
    {
      id: "heap-build",
      text: "The follow-up: building a heap is linear, not n log n, since most nodes sit near the bottom. For a million items arriving least urgent first, heapify takes one and a half million comparisons; pushed one at a time, eighteen million.",
      pauseAfter: 0.8,
    },

    // ── 7. Dijkstra ───────────────────────────────────────────────────────
    {
      id: "dijk",
      scene: true,
      text: "Question seven. Explain Dijkstra's algorithm and its complexity. It finds shortest paths from one source when no weight is negative, a min-heap handing out the closest unfinished node next.",
      pauseAfter: 0.6,
    },
    { id: "dijk-run", text: "C costs four directly but three through B. D costs four, through B and C.", pauseAfter: 0.6 },
    {
      id: "dijk-cost",
      text: "With V nodes and E edges, each node is finished once, and each edge can cost a heap push of log V: V plus E, times log V.",
      pauseAfter: 0.7,
    },
    {
      id: "dijk-neg",
      text: "Why no negative weights? A node is final when it leaves the heap. B leaves at two, and only later does the minus-two edge from C reach it at one. B is wrong, and so is D.",
      pauseAfter: 0.7,
    },
    {
      id: "dijk-bf",
      text: "Bellman-Ford instead tries every edge V minus one times: V times E, slower, and right.",
      pauseAfter: 0.8,
    },

    // ── 8. Quicksort ──────────────────────────────────────────────────────
    {
      id: "quick",
      scene: true,
      text: "Question eight. How does quicksort work, and what is its worst case? Pick a pivot, split the rest into smaller and larger, and sort each side. On average, n log n.",
      pauseAfter: 0.6,
    },
    {
      id: "quick-sorted",
      text: "The worst case is n squared, when the pivot is always the smallest or largest. Pivot a thousand sorted numbers on the last, and each split peels off one: half a million comparisons, nearly a thousand levels.",
      pauseAfter: 0.7,
    },
    { id: "quick-limit", text: "Written recursively, that's past Python's default limit.", pauseAfter: 0.6 },
    {
      id: "quick-random",
      text: "Random pivots on the same input: eleven thousand comparisons, twenty-one levels.",
      pauseAfter: 0.7,
    },
    {
      id: "quick-next",
      text: "And sorted input is common, rows by ID or events by time, so randomize. Quicksort's edge over merge sort is sorting in place.",
      pauseAfter: 0.9,
    },

    // ── Quick round one: sorting and recursion (9 to 19) ──────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "The other twenty-four, one line each. Sorting first.",
      pauseAfter: 0.6,
    },
    {
      id: "r-merge",
      text: "Merge sort halves, sorts each half and merges in linear time: n log n always, stable, with linear extra memory. Python's sort builds on it.",
    },
    {
      id: "r-heapsort",
      text: "Heapsort guarantees n log n in constant extra space, but is less cache-friendly than quicksort. It suits tight memory.",
    },
    {
      id: "r-stable",
      text: "A stable sort keeps ties in order. Sort by first name, then stable-sort by last, and the two Hoppers stay in first-name order.",
    },
    {
      id: "r-inplace",
      text: "In place means constant extra memory, or log n of stack: quicksort, with random pivots. Out of place grows with the input: merge sort.",
    },
    {
      id: "r-master",
      text: "The Master Theorem solves divide-and-conquer recurrences by comparing the work of combining with the number of smallest pieces. For merge sort they tie, so n log n.",
      pauseAfter: 0.7,
    },
    {
      id: "r-recursion",
      text: "Recursion fits trees, but every call takes a stack frame, and Python stops at a thousand. A loop with an explicit stack avoids that.",
    },
    {
      id: "r-dc",
      text: "Divide and conquer splits into independent subproblems, like merge sort. Dynamic programming reuses the answers of overlapping ones.",
    },
    {
      id: "r-memo",
      text: "Memoization recurses and caches, top-down. Tabulation fills a table bottom-up. Naive Fibonacci of thirty makes two point seven million calls; memoized, fifty-nine.",
      pauseAfter: 0.7,
    },
    {
      id: "r-classic",
      text: "Know coin change, longest common subsequence, knapsack, edit distance and word break: each teaches a way to define the state.",
    },
    {
      id: "r-greedy",
      text: "Greedy takes the best-looking step, safe only when local choices provably add up. To make six from coins of one, three and four, it takes three coins. Two threes do it.",
      pauseAfter: 0.7,
    },
    {
      id: "r-backtrack",
      text: "Backtracking builds a candidate step by step and drops a branch the moment it can't succeed: N-Queens, Sudoku, permutations.",
      pauseAfter: 0.8,
    },

    // ── Quick round two: structures, search and graphs (20 to 32) ─────────
    { id: "rapid2-in", scene: true, text: "Now structures, search and graphs.", pauseAfter: 0.6 },
    {
      id: "r-array",
      text: "An array indexes in constant time and caches well, but a middle insert shifts the rest. A linked list splices in constant time given the node; finding it is a walk.",
    },
    {
      id: "r-bst",
      text: "A binary search tree, or BST, costs its height per operation. A thousand keys inserted in order stand a thousand levels tall; shuffled, twenty-one. AVL and red-black trees stay at log n.",
      pauseAfter: 0.7,
    },
    {
      id: "r-traverse",
      text: "In-order traversal visits a BST in sorted order. Pre-order, root first, serializes a tree. Post-order, children first, suits deleting it.",
    },
    {
      id: "r-bst-heap",
      text: "A heap only knows its top. A balanced BST keeps the whole order: the next key in log n, a range in log n plus its length.",
    },
    {
      id: "r-trie",
      text: "A trie stores strings a character per level, so a lookup costs the key's length, however many keys: autocomplete, IP routing. It takes more memory.",
    },
    {
      id: "r-binary",
      text: "Binary search needs sorted, indexable data: twenty probes at most for a million. Its bugs: off-by-one bounds, and a midpoint sum overflowing fixed-width integers.",
    },
    {
      id: "r-pointers",
      text: "Two pointers walk in from both ends of a sorted array: too small, move the left; too big, move the right. Linear, not n squared.",
    },
    {
      id: "r-window",
      text: "A sliding window grows and shrinks one range instead of recomputing it: the longest substring without a repeat, in one pass.",
    },
    {
      id: "r-adjacency",
      text: "Adjacency list or matrix? Assume a million users with a hundred friends each: a list holds a hundred million entries, a matrix a trillion cells, nearly all empty. A matrix suits dense graphs and constant-time edge checks.",
      pauseAfter: 0.7,
    },
    {
      id: "r-cycle",
      text: "To find a cycle in a directed graph, run DFS marking nodes unvisited, on the path, or done. An edge back to the path is a cycle.",
    },
    {
      id: "r-topo",
      text: "Topological sort orders a graph with no cycles so every edge points forward, like build steps, in linear time.",
    },
    {
      id: "r-kahn",
      text: "Kahn's algorithm keeps removing nodes with nothing pointing in. If any are left, the graph has a cycle.",
    },
    {
      id: "r-bits",
      text: "And bit tricks are single instructions: XOR every number together, the pairs cancel, and the unpaired one is left, in constant space.",
      pauseAfter: 1.0,
    },

    // ── Close ─────────────────────────────────────────────────────────────
    {
      id: "close",
      text: "None of these answers needed a line of code. The structure and the count were the argument.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "And when an assistant writes the code with you, working code isn't what's graded. Next: the AI-allowed round.",
    },
  ],
};
