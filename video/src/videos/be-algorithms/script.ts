import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Algorithms as reasoning" (16:9), Part 8 of the Backend /
 * Software Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md, "8, Algorithms as
 * reasoning"), after content/interview/backend-engineer/algorithms.mdx. It
 * answers all thirty-five of the page's questions, by its headings: eight
 * worked through, numbered aloud and read in the page's words, three more
 * answered inside them, then twenty-four one-line answers in two quick
 * rounds (numbered on screen only, 12 to 35).
 *
 * The argument is the plan's: Big-O is the case for a design, and the
 * structure is the decision. No implementation is walked through and no
 * code is typed; a figure shows what a structure holds and what an operation
 * costs, counted.
 *
 *   1. "What is Big-O notation, and why do interviewers care?" ("big").
 *      On screen: a grid of n by n dots (every pair) beside one row of n
 *      dots (one pass), then a table of n, pairs and passes at 100, 1,000
 *      (counted, results.json) and 1,000,000, and the modeled times under a
 *      label that says "model: 100 million steps a second, an assumption".
 *      "big-next" lights the 100 row: there the brute force is fine.
 *   2. "When do you reach for a hash map?" ("hash"), with "What is the time
 *      and space complexity of a hash set?" answered in "hash-worst" and
 *      "hash-set". On screen: Two Sum on the challenge's [2, 7, 11, 15],
 *      target 9: a map filling as the pass moves, 9 - 7 = 2 found, [0, 1].
 *      Then a thousand buckets filling, two keys landing together at the
 *      38th; then two bars of __eq__ calls, 0 and 595,679 (the drawn bucket
 *      for the colliding keys is one long chain of probes).
 *   3. "What is amortized O(1) and when does it apply?" ("amort"). On
 *      screen: a staircase of a Python list's allocated slots against items
 *      appended, its 86 steps (results.json), with a doubling array's 20
 *      steps dashed behind it; a running total of copies per append settling
 *      near 8.4 (doubling's near 1); then the last step lit in yellow, 938,736
 *      items moved by one append.
 *   4. "When is a stack the right structure?" ("stack"). On screen:
 *      "([)]" and "{[]}" checked three ways, counter, queue and stack, each
 *      verdict a tick or a cross from results.json; the stack drawn as a
 *      column of openers, newest on top, the round closer meeting the square
 *      opener in red.
 *   5. "Walk me through BFS vs DFS, when do you choose each?" ("bfs"), with
 *      "What is a deque, and when should you prefer it over a list?" in
 *      "bfs-deque". On screen: the page's graph (A to B and C, both to D),
 *      the two visiting orders numbered on the nodes; then a binary tree of
 *      twenty levels drawn as a triangle, BFS's frontier a band across its
 *      widest level (524,288), DFS's one path down it (20); then a queue as
 *      a row of cells, a pop from the front of a list shifting every cell
 *      (274,876,858,369 shifts in all), the deque's front simply detaching.
 *   6. "How does a priority queue differ from a regular queue?" ("pq"), with
 *      "What are the time complexities of heap operations?" in "heap-height"
 *      and "heap-build". On screen: a queue and a priority queue side by side
 *      handing out the same five jobs in two orders; three ways to hold them
 *      (sorted list, unsorted list, heap) as a table of push and pop costs;
 *      the heap as a tree twenty levels deep, one push climbing nineteen
 *      levels; then two bars, heapify's 1,499,986 comparisons and one push
 *      at a time's 17,951,445, on the same million items arriving largest
 *      first.
 *   7. "Explain Dijkstra's algorithm and its complexity." ("dijk"). On
 *      screen: the page's graph with its weights, the distances settling in
 *      order to the page's printed {'A': 0, 'B': 1, 'C': 3, 'D': 4}; the
 *      cost (V + E) log V; then the video's own graph with one edge of -2,
 *      the settling version's B = 2, D = 3 struck in red beside
 *      Bellman-Ford's B = 1, D = 2 in green, its three rounds over four
 *      edges counted.
 *   8. "How does quicksort work, and what is its worst-case?" ("quick"). On
 *      screen: a thousand bars already in order, partitioned on the last
 *      one: a recursion "staircase" 999 levels deep, 499,500 comparisons,
 *      with Python's RecursionError for the recursive form; then the same
 *      bars partitioned on random pivots, a bushy tree 21 levels deep,
 *      10,962 comparisons.
 *   Quick round one ("rapid-in", 12 to 22): merge sort; heapsort; stable
 *   sorts; in-place and out-of-place; the Master Theorem; recursion and
 *   iteration; divide and conquer against DP; memoization against
 *   tabulation; the classic DP problems; greedy; backtracking.
 *   Quick round two ("rapid2-in", 23 to 35): array and linked list; the BST;
 *   the three traversals; balanced BST against heap; the trie; binary
 *   search; two pointers; sliding window; adjacency list or matrix; cycle
 *   detection in a directed graph; topological sort; Kahn's algorithm; bit
 *   manipulation. Each row's answer is drawn beside the list: a number from
 *   results.json where the line says one.
 *
 * Opening: fresh, on the gap between code that works and code that keeps
 * working as the input grows, without naming the video before it. The
 * close bridges into Part 9 (an assistant writes the code with you).
 *
 * Facts. check.mjs runs the page's own snippets unchanged in Pyodide 314.0.7
 * (Python 3.14.2), the runtime of the page's <CodeBlock>s, counts operations
 * on the video's own inputs (seeded or built from fixed expressions), and
 * does the arithmetic from stated assumptions, into results.json, which
 * data.ts reads. Then it fails if the narration's words stop matching.
 *   - "big-count", "big-million": a double loop over n items checks
 *     n(n - 1)/2 pairs: 4,950 at 100, 499,999,500,000 at a million ("half a
 *     trillion"). Counted on a thousand numbers whose only pair is the last
 *     two: 499,500 pairs, against 1,000 hash lookups (on screen).
 *   - "big-model": the rate is an assumption, said as one (a hundred million
 *     comparisons a second): 4,999.995 s, about 83 minutes; one pass of a
 *     million, 0.01 s.
 *   - "hash-twosum": the Two Sum challenge's reference solution on its
 *     example prints [0, 1] (page, "Challenges").
 *   - "hash-collide": with 1,000 buckets and uniform hashing, a shared
 *     bucket is more likely than not from the 38th key (50.9%; 54.6% at
 *     40, the page's "even money by the fortieth key").
 *   - "hash-worst": a thousand keys of one hash put into a Python set call
 *     __eq__ 595,679 times ("nearly six hundred thousand"); with distinct
 *     hashes, 0. More than the n(n - 1)/2 a chain would take, because
 *     open addressing revisits slots. "hash-set": the page's average O(1),
 *     O(n) space, O(n) worst case, and the set's resize past about 2/3 full.
 *   - "amort-run" to "amort-spike": a million appends to a Python list
 *     (allocated slots read from sys.getsizeof after each): 86 resizes; if
 *     each copied every item, 8,445,096 copies, 8.4 per append; growth about
 *     1.126 a step ("about an eighth"); the largest resize happens at
 *     938,736 items. A doubling array: 20 resizes, 1,048,575 copies, "under
 *     two" per append... in fact about one; said as "under two", the
 *     textbook bound. The page says the list doubles: it does not (see the
 *     report); the narration follows the run.
 *   - "stack-*": counter, queue and stack checkers on "([)]" and "{[]}":
 *     the counter accepts both, the queue accepts "([)]" and rejects
 *     "{[]}", the stack rejects "([)]" and accepts "{[]}" (the page's own
 *     concept check names "([)]" and the queue's failure).
 *   - "bfs-graph": the page's bfs prints ['A', 'B', 'C', 'D']; a DFS of the
 *     same graph visits A, B, D, C.
 *   - "bfs-memory": a complete binary tree of 2^20 - 1 = 1,048,575 nodes:
 *     the BFS queue peaks at 524,288 (its widest level), an explicit DFS
 *     stack at 20.
 *   - "bfs-deque": the same BFS with a list popped from the front would
 *     shift 274,876,858,369 elements (each pop moves the len - 1 behind it).
 *   - "heap-choose": a sorted list of a million shifts n / 2 = 500,000 on an
 *     average insert, assuming a uniformly random position (said as "on
 *     average").
 *   - "heap-height": a heap of a million has 20 levels, so a push or pop
 *     moves at most 19 levels; a push of a new minimum into a million made
 *     19 comparisons, a pop 20 (on screen).
 *   - "heap-build": a million items arriving largest first, each a new
 *     minimum: heapify made 1,499,986 comparisons, a push each 17,951,445.
 *     The sum of every node's height, the most moves heapify can make, is
 *     999,993, under n (on screen).
 *   - "dijk-run": the page's dijkstra prints {'A': 0, 'B': 1, 'C': 3,
 *     'D': 4}. "dijk-neg": the video's own graph (A-B 2, A-C 3, C-B -2,
 *     B-D 1): a version that settles a node when it leaves the heap returns
 *     B = 2, D = 3; Bellman-Ford returns B = 1, D = 2, in three rounds over
 *     four edges. The page's own function, which re-pushes a node whose
 *     distance improves, gets B = 1 here by processing B twice, so the
 *     narration says "a node is final the moment it leaves the heap", the
 *     textbook algorithm the complexity is for, and the screen labels it so.
 *   - "quick-sorted": a thousand sorted numbers, last-element pivot: 499,500
 *     comparisons ("about half a million"), 999 levels; "quick-limit": the
 *     page's recursive shape with a last pivot raises RecursionError at
 *     Python's default limit of 1,000; "quick-random": a seeded random pivot
 *     on the same input, 10,962 ("eleven thousand"), 21 levels.
 *   - Rapid: a BST of 1,000 keys inserted in order is 1,000 levels tall,
 *     21 when shuffled (seeded); naive Fibonacci of 30 makes 2,692,537 calls,
 *     memoized 59; greedy change for 6 from {1, 3, 4} takes 4, 1, 1, the
 *     fewest is 3, 3; a stable sort by first name, then last, keeps the two
 *     Hoppers in first-name order; binary search over a million takes at
 *     most 20 probes; the page's single_number, two_sum_sorted, inorder,
 *     window, merge_sort, permutations, has_cycle, topo_sort and kahns
 *     outputs (results.json, "page"). The adjacency figures are arithmetic
 *     from the assumption said aloud: a million users with a hundred
 *     friends each, 10^8 list entries against 10^12 matrix cells.
 *   Nothing here is timed: every number is a count or an assumption.
 *
 * Written for Drew's ear: complexity said as people say it ("order n
 * squared", "log n", "n log n", "O of one", "V plus E"); BFS, DFS, BST, DP
 * and AVL in plain caps, read as letters, each expanded once; XOR said as
 * written (the lexicon gets "ex-or"); "deque" is said "deck" (the lexicon
 * gets it too); no sentence opens with "A" before an initialism; numbers as
 * they are said.
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
      text: "Thirty-five questions, argued with counts, not code: eight with a figure each, three inside those, and twenty-four quickly at the end.",
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
      text: "Model it at a hundred million checks a second, an assumption: about eighty-three minutes. One pass over the million takes a hundredth of a second.",
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
      text: "It turns Two Sum's double loop into one pass: at each number, ask the map for target minus it, then store the number. Linear time, bought with linear memory.",
      pauseAfter: 0.7,
    },
    {
      id: "hash-collide",
      text: "Average is the key word. With a thousand buckets, two keys more likely than not share one by the thirty-eighth key.",
      pauseAfter: 0.6,
    },
    {
      id: "hash-worst",
      text: "The follow-up is the worst case. Give a thousand keys one hash, and filling a Python set takes nearly six hundred thousand key comparisons. With distinct hashes, none.",
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
      text: "A textbook array doubles, for under two copies an append. Python grows by about an eighth, so it copies more often. Any fixed factor keeps it constant, and a hash table's rehash too.",
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
      text: "A leads to B and C, and both lead to D. Breadth-first visits A, B, C, D; depth-first, A, B, D, then C.",
      pauseAfter: 0.6,
    },
    {
      id: "bfs-short",
      text: "Choose BFS for shortest paths in an unweighted graph, since it reaches each node first by the fewest edges. Choose DFS for cycle detection, topological sort and backtracking.",
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
      text: "A sorted list pops instantly, but at a million items an insert shifts half a million on average. An unsorted list inserts instantly and scans to pop.",
      pauseAfter: 0.6,
    },
    {
      id: "heap-height",
      text: "A heap does both in log n, each parent at least as urgent as its children. A million items make twenty levels, so a push or pop climbs at most nineteen; a peek is constant.",
      pauseAfter: 0.7,
    },
    {
      id: "heap-build",
      text: "The follow-up: building a heap is linear, not n log n, since most nodes sit near the bottom. For a million items arriving least urgent first, heapify takes one and a half million comparisons; pushes, eighteen million.",
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
      text: "Each node is finished once, and each edge can cost a heap push of log V: V plus E, times log V.",
      pauseAfter: 0.7,
    },
    {
      id: "dijk-neg",
      text: "Why no negative weights? A node is final when it leaves the heap. B leaves at two, and only later does the minus-two edge from C reach it at one. B is wrong, and so is D.",
      pauseAfter: 0.7,
    },
    {
      id: "dijk-bf",
      text: "Bellman-Ford relaxes every edge V minus one times instead: V times E, slower, and right.",
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
      text: "The worst case is a pivot that's always the smallest or largest. Pivot a thousand sorted numbers on the last, and each split peels off one: half a million comparisons, nearly a thousand levels.",
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

    // ── Quick round one: sorting and recursion (12 to 22) ─────────────────
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
      text: "In place means constant extra memory, or log n of stack: quicksort. Out of place grows with the input: merge sort.",
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

    // ── Quick round two: structures, search and graphs (23 to 35) ─────────
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
      text: "A heap only knows its top. A balanced BST knows the whole order, so it answers ranges in log n.",
    },
    {
      id: "r-trie",
      text: "A trie stores strings a character per level, so a lookup costs the key's length, however many keys: autocomplete, IP routing, at a cost in memory.",
    },
    {
      id: "r-binary",
      text: "Binary search needs sorted, indexable data: twenty probes at most for a million. Its bugs: off-by-one bounds, and a midpoint sum that overflows fixed-width integers.",
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
      text: "Kahn's algorithm keeps removing nodes with nothing pointing in. If fewer than V come out, the rest sit on a cycle.",
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
