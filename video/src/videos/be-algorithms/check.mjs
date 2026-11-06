// Runs, counts and computes every number the be-algorithms video says or
// shows, and writes them to results.json, which data.ts reads. The page's own
// snippets (content/interview/backend-engineer/algorithms.mdx) run as the
// page prints them, in Pyodide 314.0.7 (Python 3.14), the runtime its
// <CodeBlock>s run in the reader's browser. From the repo root, where the
// pyodide package is installed:
//
//   node video/src/videos/be-algorithms/check.mjs
//
// Three kinds of number, kept apart because the narration says them apart:
//   - outputs: what one of the page's snippets prints, run here unchanged
//     (PAGE below), so a result on screen is the page's;
//   - counts: an operation counted while it runs (comparisons, __eq__ calls,
//     list resizes, peak queue length), on the video's own inputs, built
//     from fixed expressions or a seeded generator, so every run returns the
//     same numbers;
//   - arithmetic: a formula evaluated from stated assumptions (pairs in a
//     double loop, a modeled rate of a hundred million steps a second, a
//     graph of a million users with a hundred friends each). The narration
//     says each assumption aloud.
// No time is measured anywhere: milliseconds in WebAssembly are not a
// server's, and the video argues in counts.
//
// Then it reads script.ts and exits non-zero if a number the voice says in
// words no longer matches what ran.
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide();

/** The page's snippets, verbatim, by the heading they sit under. Each runs
 *  in a fresh namespace and its printed lines are recorded. */
const PAGE = {
  heap: `import heapq
h = [5, 3, 8, 1]
heapq.heapify(h)       # O(n) in-place
heapq.heappush(h, 2)   # O(log n)
print(heapq.heappop(h))  # 1, O(log n)`,
  bfs: `from collections import deque

def bfs(graph, start):
    visited, q = {start}, deque([start])
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nb in graph[node]:
            if nb not in visited:
                visited.add(nb)
                q.append(nb)
    return order

graph = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
print(bfs(graph, "A"))  # ['A', 'B', 'C', 'D']`,
  cycle: `def has_cycle(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {n: WHITE for n in graph}

    def dfs(node):
        color[node] = GRAY
        for nb in graph[node]:
            if color[nb] == GRAY:   # back edge → cycle
                return True
            if color[nb] == WHITE and dfs(nb):
                return True
        color[node] = BLACK
        return False

    return any(dfs(n) for n in graph if color[n] == WHITE)

acyclic = {"A": ["B"], "B": ["C"], "C": []}
cyclic  = {"A": ["B"], "B": ["C"], "C": ["A"]}
print(has_cycle(acyclic))  # False
print(has_cycle(cyclic))   # True`,
  topo: `from collections import deque

def topo_sort(graph):            # graph: {node: [neighbors]}
    in_degree = {n: 0 for n in graph}
    for neighbors in graph.values():
        for nb in neighbors:
            in_degree[nb] += 1

    queue = deque(n for n, d in in_degree.items() if d == 0)
    order = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for nb in graph[node]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                queue.append(nb)
    return order  # len < V → cycle exists

# Task dependencies: A→C, B→C, C→D
graph = {"A": ["C"], "B": ["C"], "C": ["D"], "D": []}
print(topo_sort(graph))  # e.g. ['A', 'B', 'C', 'D']`,
  dijkstra: `import heapq

def dijkstra(graph, src):
    # graph: {node: [(neighbor, weight), ...]}
    dist = {src: 0}
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float("inf")):
            continue
        for v, w in graph.get(u, []):
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist

graph = {
    "A": [("B", 1), ("C", 4)],
    "B": [("C", 2), ("D", 5)],
    "C": [("D", 1)],
    "D": [],
}
print(dijkstra(graph, "A"))  # {'A': 0, 'B': 1, 'C': 3, 'D': 4}`,
  inorder: `class BSTNode:
    def __init__(self, val):
        self.val, self.left, self.right = val, None, None

def bst_insert(root, val):
    if root is None:
        return BSTNode(val)
    if val < root.val:
        root.left = bst_insert(root.left, val)
    else:
        root.right = bst_insert(root.right, val)
    return root

def inorder(node):
    if node:
        inorder(node.left)
        print(node.val)
        inorder(node.right)

root = None
for v in [5, 3, 7, 1, 4]:
    root = bst_insert(root, v)

inorder(root)  # prints 1 3 4 5 7 in sorted order`,
  binarySearch: `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1

arr = [1, 3, 5, 7, 9, 11]
print(binary_search(arr, 7))   # 3
print(binary_search(arr, 6))   # -1`,
  twoPointers: `def two_sum_sorted(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        s = nums[lo] + nums[hi]
        if s == target:
            return (lo, hi)
        elif s < target:
            lo += 1
        else:
            hi -= 1
    return None

print(two_sum_sorted([1, 2, 3, 4, 6], 6))   # (1, 3)
print(two_sum_sorted([1, 2, 3, 4, 6], 10))  # None`,
  window: `def length_of_longest_substring(s):
    seen = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1   # shrink window past the duplicate
        seen[ch] = right
        best = max(best, right - left + 1)
    return best

print(length_of_longest_substring("abcabcbb"))  # 3 ("abc")
print(length_of_longest_substring("bbbbb"))     # 1 ("b")
print(length_of_longest_substring("pwwkew"))    # 3 ("wke")`,
  mergeSort: `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    result, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]); i += 1
        else:
            result.append(right[j]); j += 1
    return result + left[i:] + right[j:]

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))  # [3, 9, 10, 27, 38, 43, 82]`,
  memo: `# Memoization, Fibonacci
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

# Tabulation, Fibonacci
def fib_tab(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a

print(fib(10))      # 55
print(fib_tab(10))  # 55`,
  permutations: `def permutations(nums):
    res = []
    def bt(path, remaining):
        if not remaining:
            res.append(path[:])
            return
        for i, n in enumerate(remaining):
            path.append(n)
            bt(path, remaining[:i] + remaining[i+1:])
            path.pop()
    bt([], nums)
    return res

print(permutations([1, 2, 3]))
# [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]`,
  bits: `# Find single non-duplicate element
def single_number(nums):
    result = 0
    for n in nums:
        result ^= n
    return result

print(single_number([4, 1, 2, 1, 2]))  # 4
print(single_number([2, 2, 1]))         # 1`,
  kahn: `from collections import deque

def kahns(num_nodes, edges):
    in_deg = [0] * num_nodes
    adj = [[] for _ in range(num_nodes)]
    for u, v in edges:
        adj[u].append(v)
        in_deg[v] += 1
    q = deque(i for i in range(num_nodes) if in_deg[i] == 0)
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v in adj[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                q.append(v)
    return order  # len < num_nodes → cycle detected

# 4 nodes: 0→2, 1→2, 2→3
edges = [(0, 2), (1, 2), (2, 3)]
order = kahns(4, edges)
print(order)                          # e.g. [0, 1, 2, 3]
print("cycle?" , len(order) < 4)     # False`,
  // The Two Sum challenge's reference solution.
  twoSum: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []

print(two_sum([2, 7, 11, 15], 9))`,
};

py.globals.set("_page", py.toPy(PAGE));
const pageOut = JSON.parse(
  py.runPython(`
import contextlib, io, json
_printed = {}
for _k, _src in _page.items():
    _buf = io.StringIO()
    with contextlib.redirect_stdout(_buf):
        exec(_src, {"__name__": "__main__"})
    _printed[_k] = _buf.getvalue().splitlines()
json.dumps(_printed)
`),
);

/** What the page's comments say each print shows, where a comment names a
 *  value. A snippet whose run disagrees is recorded in results.json
 *  (pageDisagrees) and reported, never followed: two_sum_sorted's second
 *  call, target 10, is commented "None" on the page and returns (3, 4),
 *  since 4 + 6 = 10. The narration uses neither line. */
const PAGE_SAYS = {
  heap: ["1"],
  bfs: ["['A', 'B', 'C', 'D']"],
  cycle: ["False", "True"],
  dijkstra: ["{'A': 0, 'B': 1, 'C': 3, 'D': 4}"],
  inorder: ["1", "3", "4", "5", "7"],
  binarySearch: ["3", "-1"],
  twoPointers: ["(1, 3)", "None"],
  window: ["3", "1", "3"],
  mergeSort: ["[3, 9, 10, 27, 38, 43, 82]"],
  memo: ["55", "55"],
  bits: ["4", "1"],
};
const pageDisagrees = Object.entries(PAGE_SAYS).flatMap(([k, says]) =>
  says.flatMap((v, i) => (pageOut[k][i] === v ? [] : [{ snippet: k, print: i + 1, pageSays: v, printed: pageOut[k][i] }])),
);

// ── Counts, on the video's own inputs ───────────────────────────────────────
const counts = JSON.parse(
  py.runPython(`
import heapq, json, math, random, struct, sys
from collections import deque
R = {}

# 1. Big-O. A thousand numbers whose only pair summing to the target is the
#    last two (every other value is a multiple of four, the target is 2 more
#    than one), so the double loop checks every pair before it finds it.
n = 1000
rng = random.Random(8)
vals = [4 * k for k in range(n - 2)]
rng.shuffle(vals)
nums = vals + [1, 4 * 5000 + 1]
target = 1 + 4 * 5000 + 1
pairs = 0
found = None
for i in range(n):
    for j in range(i + 1, n):
        pairs += 1
        if nums[i] + nums[j] == target:
            found = (i, j)
            break
    if found:
        break
lookups = 0
seen = {}
hit = None
for i, x in enumerate(nums):
    lookups += 1
    if target - x in seen:
        hit = (seen[target - x], i)
        break
    seen[x] = i
R["bigO"] = {"n": n, "pairsChecked": pairs, "found": list(found), "hashLookups": lookups, "hashFound": list(hit)}

# 2. A hash set's worst case. Keys whose __eq__ counts its calls: a thousand
#    with distinct hashes, then a thousand that all hash to 7.
class Key:
    calls = 0
    def __init__(self, v, h):
        self.v, self.h = v, h
    def __hash__(self):
        return self.h
    def __eq__(self, other):
        Key.calls += 1
        return self.v == other.v
def eq_calls(keys, probe):
    Key.calls = 0
    s = set()
    for k in keys:
        s.add(k)
    inserting = Key.calls
    Key.calls = 0
    _ = probe in s
    return inserting, Key.calls
spread = eq_calls([Key(i, i) for i in range(1000)], Key(-1, -1))
same = eq_calls([Key(i, 7) for i in range(1000)], Key(-1, 7))
R["hashWorst"] = {"keys": 1000, "spreadInsertEq": spread[0], "spreadMissEq": spread[1], "sameInsertEq": same[0], "sameMissEq": same[1]}
# The hash set's resize point, for the page's "resizes when the load factor
# exceeds ~2/3": how full a set's table is (items over slots) when it grows,
# read off sys.getsizeof. A set entry is a key pointer and a hash, two words;
# its first eight slots are inline, so they add nothing to the size. A dict
# is shown beside it as the items at which it grows. Not said aloud;
# recorded for the report.
W = struct.calcsize("P")
s = set(); s_base = sys.getsizeof(s); last = s_base; s_grow = []
for i in range(200_000):
    s.add(i)
    z = sys.getsizeof(s)
    if z != last:
        slots = 8 if last == s_base else (last - s_base) // (2 * W)
        s_grow.append([len(s), slots, len(s) / slots])
        last = z
d = {}; last = sys.getsizeof(d); d_grow = []
for i in range(200_000):
    d[i] = 1
    z = sys.getsizeof(d)
    if z != last:
        d_grow.append(len(d)); last = z
R["setLoad"] = {"setGrows": s_grow[:6], "dictGrowsAtItem": d_grow[:8]}

# 3. Amortized O(1). A Python list's allocated slots, read off sys.getsizeof
#    after every append, for a million appends; and the doubling array the
#    page describes, as arithmetic.
P = struct.calcsize("P")
l = []
base = sys.getsizeof(l)
last = 0
resizes = []
running = 0
per_append = {}
for i in range(2_000_000):
    l.append(i)
    c = (sys.getsizeof(l) - base) // P
    if c != last:
        if len(l) <= 1_000_000:
            resizes.append([len(l) - 1, c])
        running += len(l) - 1
        last = c
    if len(l) in (1_000, 10_000, 100_000, 1_000_000, 2_000_000):
        per_append[str(len(l))] = running / len(l)
moved = sum(r[0] for r in resizes)
largest = max(resizes, key=lambda r: r[0])
growth = [r[1] / resizes[i - 1][1] for i, r in enumerate(resizes) if i > 0 and resizes[i - 1][1] >= 1000]
dbl_caps = []
cap = 1
while cap < 1_000_000:
    dbl_caps.append(cap)
    cap *= 2
R["amortized"] = {
    "appends": 1_000_000,
    "resizes": len(resizes),
    "copiesIfEveryResizeCopies": moved,
    "copiesPerAppend": moved / 1_000_000,
    # The same ratio at other lengths ("at any length"), on into 2,000,000.
    "copiesPerAppendAt": per_append,
    "largestResize": largest[0],
    "finalCapacity": resizes[-1][1],
    "meanGrowthAbove1000": sum(growth) / len(growth),
    "doublingResizes": len(dbl_caps),
    "doublingCopies": sum(dbl_caps),
    "doublingLargest": dbl_caps[-1],
    # Every resize, [items before it, slots after], for the staircase the
    # video draws (scenes plot these; nothing is read off them by eye).
    "steps": resizes,
}

# 4. Stack. Three checkers for brackets: per-type counts, a queue (matches
#    the oldest opener) and a stack (matches the newest).
PAIRS = {")": "(", "]": "[", "}": "{"}
def by_count(s):
    return all(s.count(o) == s.count(c) for c, o in PAIRS.items())
def by_queue(s):
    q = deque()
    for ch in s:
        if ch in "([{":
            q.append(ch)
        elif not q or q.popleft() != PAIRS[ch]:
            return False
    return not q
def by_stack(s):
    st = []
    for ch in s:
        if ch in "([{":
            st.append(ch)
        elif not st or st.pop() != PAIRS[ch]:
            return False
    return not st
R["brackets"] = [{"s": s, "count": by_count(s), "queue": by_queue(s), "stack": by_stack(s)} for s in ["([)]", "{[]}", "()[]{}", "(]"]]

# 5. BFS and DFS on a complete binary tree of 2^20 - 1 nodes (children of i
#    are 2i+1 and 2i+2): the most nodes each holds at once. And what a plain
#    list as the queue would shift: a pop from its front moves every element
#    behind it, len - 1 of them.
N = 2 ** 20 - 1
q = deque([0]); peak_q = 1; shifted = 0
while q:
    shifted += len(q) - 1
    u = q.popleft()
    for v in (2 * u + 1, 2 * u + 2):
        if v < N:
            q.append(v)
    peak_q = max(peak_q, len(q))
st = [0]; peak_s = 1
while st:
    u = st.pop()
    for v in (2 * u + 2, 2 * u + 1):
        if v < N:
            st.append(v)
    peak_s = max(peak_s, len(st))
def dfs_order(graph, start):
    out, stack, seen = [], [start], set()
    while stack:
        u = stack.pop()
        if u in seen:
            continue
        seen.add(u); out.append(u)
        for v in reversed(graph[u]):
            if v not in seen:
                stack.append(v)
    return out
g = {"A": ["B", "C"], "B": ["D"], "C": ["D"], "D": []}
R["traversal"] = {"nodes": N, "levels": 20, "widestLevel": 2 ** 19, "bfsPeak": peak_q, "dfsPeak": peak_s, "listShifts": shifted, "dfsOrder": dfs_order(g, "A")}

# 6. Heap. A million items: levels in the tree, and the most a push or pop
#    can move (its height). Building it: the most moves heapify can make is
#    the sum of every node's height, against a push per item.
n = 1_000_000
height = n.bit_length() - 1
def heights_sum(n):
    total = 0
    for i in range(n):
        h = 0
        j = i
        while 2 * j + 1 < n:
            j = 2 * j + 1
            h += 1
        total += h
    return total
# Counted on a heap of the same size: a push of a new smallest item, which
# travels from a leaf to the root.
class C:
    __slots__ = ("v",)
    n = 0
    def __init__(self, v): self.v = v
    def __lt__(self, o):
        C.n += 1
        return self.v < o.v
rng = random.Random(6)
data = [C(rng.random()) for _ in range(n)]
heapq.heapify(data)
C.n = 0
heapq.heappush(data, C(-1.0))
push_new_min = C.n
C.n = 0
heapq.heappop(data)
pop_cmp = C.n
# heapify against one push at a time, on items arriving largest first (each
# push a new minimum: the worst case for a min-heap), counting comparisons.
desc = [C(float(n - i)) for i in range(n)]
C.n = 0
heapq.heapify(list(desc))
heapify_cmp = C.n
C.n = 0
h = []
for c in desc:
    heapq.heappush(h, c)
pushes_cmp = C.n
R["heap"] = {
    "n": n,
    "levels": height + 1,
    "maxMoves": height,
    "heightsSum": heights_sum(n),
    "pushNewMinCompares": push_new_min,
    "popCompares": pop_cmp,
    "heapifyCompares": heapify_cmp,
    "pushesCompares": pushes_cmp,
    "sortedInsertMeanShift": n // 2,
}

# 7. Dijkstra with a negative edge. The version that finalizes ("settles") a
#    node the first time it leaves the heap, against Bellman-Ford, which
#    relaxes every edge V - 1 times. And the page's own function on the same
#    graph, with how many times it processes each node.
NEG = {"A": [("B", 2), ("C", 3)], "B": [("D", 1)], "C": [("B", -2)], "D": []}
def settled(graph, src):
    dist = {u: math.inf for u in graph}; dist[src] = 0
    done = set(); h = [(0, src)]; order = []
    while h:
        d, u = heapq.heappop(h)
        if u in done:
            continue
        done.add(u); order.append(u)
        for v, w in graph[u]:
            if v not in done and d + w < dist[v]:
                dist[v] = d + w
                heapq.heappush(h, (dist[v], v))
    return dist, order
def bellman_ford(graph, src):
    dist = {u: math.inf for u in graph}; dist[src] = 0
    edges = [(u, v, w) for u in graph for v, w in graph[u]]
    rounds = 0
    for _ in range(len(graph) - 1):
        rounds += 1
        for u, v, w in edges:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist, rounds, len(edges)
def page_dijkstra_counted(graph, src):
    dist = {src: 0}; heap = [(0, src)]; processed = {}
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float("inf")):
            continue
        processed[u] = processed.get(u, 0) + 1
        for v, w in graph.get(u, []):
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist, processed
PAGE_G = {"A": [("B", 1), ("C", 4)], "B": [("C", 2), ("D", 5)], "C": [("D", 1)], "D": []}
sd, so = settled(NEG, "A")
bd, br, be = bellman_ford(NEG, "A")
pd_, pp = page_dijkstra_counted(NEG, "A")
_, pp_page = page_dijkstra_counted(PAGE_G, "A")
R["dijkstra"] = {
    "neg": {u: [[v, w] for v, w in e] for u, e in NEG.items()},
    "settled": sd, "settledOrder": so,
    "bellmanFord": bd, "bfRounds": br, "bfEdges": be,
    "pageOnNeg": pd_, "pageProcessedOnNeg": pp, "pageProcessedOnPage": pp_page,
}

# 8. Quicksort on a thousand numbers already in order: pivot on the last
#    element (Lomuto), then on a random one (seeded), and on shuffled input.
#    Each counts element-to-pivot comparisons and the deepest level of
#    partitions, run with an explicit stack so depth never meets Python's
#    recursion limit.
def quicksort_count(a, pick, record=None):
    a = list(a); cmp = 0; deepest = 0
    st = [(0, len(a) - 1, 1)]
    while st:
        lo, hi, depth = st.pop()
        if lo >= hi:
            continue
        deepest = max(deepest, depth)
        if record is not None:
            record.append([depth, lo, hi])
        p = pick(lo, hi)
        a[p], a[hi] = a[hi], a[p]
        pivot = a[hi]; i = lo
        for j in range(lo, hi):
            cmp += 1
            if a[j] < pivot:
                a[i], a[j] = a[j], a[i]; i += 1
        a[i], a[hi] = a[hi], a[i]
        st.append((lo, i - 1, depth + 1)); st.append((i + 1, hi, depth + 1))
    assert a == sorted(a)
    return cmp, deepest
n = 1000
srt = list(range(n))
rng = random.Random(1000)
last_sorted = quicksort_count(srt, lambda lo, hi: hi)
rand_parts = []
rand_sorted = quicksort_count(srt, lambda lo, hi: rng.randint(lo, hi), rand_parts)
shuf = list(range(n)); random.Random(7).shuffle(shuf)
last_shuf = quicksort_count(shuf, lambda lo, hi: hi)
# The page's own recursive quicksort shape with a "pick last" pivot, on the
# same sorted thousand: how deep Python lets it go.
def qs_last(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[-1]
    lo = [x for x in arr if x < pivot]
    mid = [x for x in arr if x == pivot]
    hi = [x for x in arr if x > pivot]
    return qs_last(lo) + mid + qs_last(hi)
try:
    qs_last(srt); recursion = "ok"
except RecursionError as e:
    recursion = f"RecursionError: {e}"
R["quicksort"] = {
    "n": n,
    "lastPivotSorted": {"compares": last_sorted[0], "depth": last_sorted[1]},
    "randomPivotSorted": {"compares": rand_sorted[0], "depth": rand_sorted[1]},
    # Every partition the random-pivot run made, [depth, lo, hi], for the
    # tree the video draws: each row is one level of the recursion.
    "randomPartitions": sorted(rand_parts),
    "lastPivotShuffled": {"compares": last_shuf[0], "depth": last_shuf[1]},
    "pairs": n * (n - 1) // 2,
    "recursiveLastPivot": recursion,
    "recursionLimit": sys.getrecursionlimit(),
}

# Rapid round. A BST built from a thousand keys in order, then shuffled
# (seeded): its height. Naive and memoized Fibonacci of 30: calls made.
# Greedy change with coins {1, 3, 4} for 6, against the fewest coins. A
# stable sort by two keys. Binary search over a million: the most probes.
def bst_height(keys):
    root = None; left = {}; right = {}; tallest = 0
    for k in keys:
        if root is None:
            root = k; tallest = 1; continue
        u = root; depth = 1
        while True:
            depth += 1
            side = left if k < u else right
            if u in side:
                u = side[u]
            else:
                side[u] = k; break
        tallest = max(tallest, depth)
    return tallest
keys = list(range(1000))
shuffled = keys[:]; random.Random(42).shuffle(shuffled)
calls = 0
def fib_naive(n):
    global calls
    calls += 1
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)
fib30 = fib_naive(30); naive_calls = calls
mcalls = 0
memo = {}
def fib_memo(n):
    global mcalls
    mcalls += 1
    if n in memo:
        return memo[n]
    memo[n] = n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)
    return memo[n]
fib_memo(30)
def greedy_change(coins, amount):
    used = []
    for c in sorted(coins, reverse=True):
        while amount >= c:
            amount -= c; used.append(c)
    return used
def fewest(coins, amount):
    best = [0] + [math.inf] * amount; pick = [None] * (amount + 1)
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a and best[a - c] + 1 < best[a]:
                best[a] = best[a - c] + 1; pick[a] = c
    out = []
    while amount:
        out.append(pick[amount]); amount -= pick[amount]
    return sorted(out, reverse=True)
people = [("Ada", "Lovelace"), ("Alan", "Turing"), ("Grace", "Hopper"), ("Ada", "Hopper"), ("Alan", "Kay")]
by_first = sorted(people, key=lambda p: p[0])
then_last = sorted(by_first, key=lambda p: p[1])
million = 1_000_000
# Kahn's algorithm on a graph with a cycle (1 -> 2 -> 1), with the page's own
# kahns and topo_sort: both return fewer nodes than the graph has.
ns = {}
exec(_page["kahn"].split("# 4 nodes")[0], ns)
cyc_edges = [(0, 1), (1, 2), (2, 1), (2, 3)]
kahn_cyclic = ns["kahns"](4, cyc_edges)
ns = {}
exec(_page["topo"].split("# Task dependencies")[0], ns)
topo_cyclic = ns["topo_sort"]({"A": ["B"], "B": ["C"], "C": ["B", "D"], "D": []})
R["rapid"] = {
    "kahnCyclicEdges": cyc_edges, "kahnCyclic": kahn_cyclic, "topoCyclic": topo_cyclic,
    "bstSortedHeight": bst_height(keys),
    "bstShuffledHeight": bst_height(shuffled),
    "bstKeys": 1000,
    "fib30": fib30, "fibNaiveCalls": naive_calls, "fibMemoCalls": mcalls,
    "greedy": greedy_change([1, 3, 4], 6), "fewest": fewest([1, 3, 4], 6),
    "stable": {"input": people, "byFirst": by_first, "thenLast": then_last},
    "binaryProbesMillion": math.ceil(math.log2(million + 1)),
    "recursionLimit": sys.getrecursionlimit(),
}
R["runtime"] = f"Pyodide / Python {sys.version.split()[0]}"
json.dumps(R)
`),
);

// ── Arithmetic, from stated assumptions ─────────────────────────────────────

/** P(at least two of k keys share a bucket), b buckets, keys hashed
 *  uniformly: one minus the falling product. */
const collision = (k, b) => {
  let none = 1;
  for (let i = 0; i < k; i++) none *= 1 - i / b;
  return 1 - none;
};
const BUCKETS = 1000;
let evenMoney = 1;
while (collision(evenMoney, BUCKETS) < 0.5) evenMoney++;

/** The modeled rate the narration names as an assumption. */
const RATE = 100_000_000;
const pairs = (n) => (n * (n - 1)) / 2;
const N_BIG = 1_000_000;

/** The adjacency-matrix question's graph, as the narration states it: a
 *  million users, a hundred friends each, every friendship stored from both
 *  ends in the list (so a hundred entries per user). */
const USERS = 1_000_000;
const FRIENDS = 100;

const results = {
  runtime: counts.runtime,
  page: pageOut,
  pageDisagrees,
  counts,
  arithmetic: {
    bigO: {
      small: 100,
      smallPairs: pairs(100),
      big: N_BIG,
      bigPairs: pairs(N_BIG),
      rate: RATE,
      pairsSeconds: pairs(N_BIG) / RATE,
      pairsMinutes: pairs(N_BIG) / RATE / 60,
      passSeconds: N_BIG / RATE,
    },
    collisions: {
      buckets: BUCKETS,
      evenMoneyKeys: evenMoney,
      at40: collision(40, BUCKETS),
      atEvenMoney: collision(evenMoney, BUCKETS),
      loadAtEvenMoney: evenMoney / BUCKETS,
    },
    adjacency: {
      users: USERS,
      friends: FRIENDS,
      matrixCells: USERS * USERS,
      listEntries: USERS * FRIENDS,
    },
  },
};

writeFileSync(new URL("./results.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify({ ...results, page: undefined }, null, 1));

// ── The narration says these in words ───────────────────────────────────────
// Node strips the types from script.ts. A claim is a beat, a phrase it must
// contain, and the condition on what ran that makes the phrase true, so a run
// that moves a number, or a beat that drops its words, fails here until the
// other follows.
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const text = (id) => {
  const beat = script.beats.find((b) => b.id === id);
  if (!beat) throw new Error(`script.ts has no beat "${id}"`);
  return beat.text.toLowerCase();
};
const c = counts;
const a = results.arithmetic;
const near = (x, target, tol) => Math.abs(x - target) <= tol;
const q = c.quicksort;
const perAppend = Object.values(c.amortized.copiesPerAppendAt);
const deepBeats = script.beats.filter((b) => /^Question \w+\./.test(b.text));
const rapidBeats = script.beats.filter((b) => b.id.startsWith("r-"));
const pageQuestions = (readFileSync(new URL("../../../../content/interview/backend-engineer/algorithms.mdx", import.meta.url), "utf8").match(/^### .+$/gm) ?? []).map((h) => h.slice(4));
const claims = [
  // The plan: 35 = 8 read aloud + 3 answered inside them + 24 quick.
  ["plan", "thirty-five questions", pageQuestions.length === 35],
  ["plan", "eight with a figure", deepBeats.length === 8],
  ["plan", "three inside those", pageQuestions.length - deepBeats.length - rapidBeats.length === 3],
  ["plan", "twenty-four quickly", rapidBeats.length === 24],
  ["rapid-in", "the other twenty-four", rapidBeats.length === 24],
  // 1
  ["big-count", "under five thousand", a.bigO.smallPairs < 5000 && a.bigO.smallPairs > 4500],
  ["big-million", "half a trillion", near(a.bigO.bigPairs, 5e11, 1e9)],
  ["big-model", "a hundred million checks a second, an assumption", a.bigO.rate === 1e8],
  ["big-model", "about eighty-three minutes", Math.round(a.bigO.pairsMinutes) === 83],
  ["big-model", "a hundredth of a second", a.bigO.passSeconds === 0.01],
  // 2
  ["hash-twosum", "two sum", pageOut.twoSum[0] === "[0, 1]"],
  ["hash-collide", "a thousand buckets", a.collisions.buckets === 1000],
  ["hash-collide", "thirty-eighth key", a.collisions.evenMoneyKeys === 38],
  ["hash-worst", "a thousand keys", c.hashWorst.keys === 1000],
  ["hash-worst", "nearly six hundred thousand", c.hashWorst.sameInsertEq >= 550000 && c.hashWorst.sameInsertEq < 600000],
  ["hash-worst", "with distinct hashes, none", c.hashWorst.spreadInsertEq === 0],
  // 3
  ["amort-run", "a million items", c.amortized.appends === 1e6],
  ["amort-run", "eighty-six times", c.amortized.resizes === 86],
  ["amort-total", "about eight copies per append, at any length", Math.round(c.amortized.copiesPerAppend) === 8 && perAppend.every((r) => r > 7 && r < 9)],
  ["amort-factor", "under two copies", c.amortized.doublingCopies < 2 * c.amortized.appends],
  ["amort-factor", "about an eighth", near(c.amortized.meanGrowthAbove1000, 1.125, 0.01)],
  ["amort-spike", "nine hundred thirty-nine thousand", Math.round(c.amortized.largestResize / 1000) === 939],
  // 4: the checkers the stack question turns on.
  ["stack-count", "counting accepts it", c.brackets.find((b) => b.s === "([)]").count === true],
  ["stack-run", "rejected", c.brackets.find((b) => b.s === "([)]").stack === false && c.brackets.find((b) => b.s === "{[]}").stack === true],
  ["stack-queue", "it accepts this one, and rejects a correctly nested string", c.brackets.find((b) => b.s === "([)]").queue === true && c.brackets.find((b) => b.s === "{[]}").queue === false],
  // 5
  ["bfs-graph", "breadth-first visits a, b, c, d", pageOut.bfs[0] === "['A', 'B', 'C', 'D']"],
  ["bfs-graph", "depth-first, a, b, d, then c", c.traversal.dfsOrder.join("") === "ABDC"],
  ["bfs-memory", "a million nodes", near(c.traversal.nodes, 1e6, 5e4)],
  ["bfs-memory", "five hundred twenty-four thousand", Math.round(c.traversal.bfsPeak / 1000) === 524],
  ["bfs-memory", "one path, twenty", c.traversal.dfsPeak === 20],
  ["bfs-deque", "two hundred seventy-five billion", Math.round(c.traversal.listShifts / 1e9) === 275],
  // 6
  ["heap-choose", "half a million on average", c.heap.sortedInsertMeanShift === 500000],
  ["heap-height", "twenty levels", c.heap.levels === 20],
  ["heap-height", "at most nineteen", c.heap.maxMoves === 19 && c.heap.pushNewMinCompares <= 19],
  ["heap-build", "one and a half million", Math.round(c.heap.heapifyCompares / 1e5) === 15],
  ["heap-build", "eighteen million", Math.round(c.heap.pushesCompares / 1e6) === 18],
  ["heap-build", "linear", c.heap.heightsSum < c.heap.n],
  // 7
  ["dijk-run", "three through b. d costs four", pageOut.dijkstra[0] === "{'A': 0, 'B': 1, 'C': 3, 'D': 4}"],
  ["dijk-neg", "b leaves at two", c.dijkstra.settled.B === 2 && c.dijkstra.settledOrder[1] === "B"],
  ["dijk-neg", "reach it at one", c.dijkstra.bellmanFord.B === 1],
  ["dijk-neg", "and so is d", c.dijkstra.settled.D !== c.dijkstra.bellmanFord.D],
  // 8
  ["quick-sorted", "n squared", q.lastPivotSorted.compares === q.pairs],
  ["quick-sorted", "a thousand sorted numbers", q.n === 1000],
  ["quick-sorted", "half a million comparisons", Math.round(q.lastPivotSorted.compares / 1e5) === 5],
  ["quick-sorted", "nearly a thousand levels", q.lastPivotSorted.depth >= 950 && q.lastPivotSorted.depth < 1000],
  ["quick-limit", "past python's default limit", q.recursiveLastPivot.startsWith("RecursionError")],
  ["quick-random", "eleven thousand comparisons, twenty-one levels", Math.round(q.randomPivotSorted.compares / 1000) === 11 && q.randomPivotSorted.depth === 21],
  // Quick rounds
  ["r-stable", "the two hoppers stay in first-name order", c.rapid.stable.thenLast.filter((p) => p[1] === "Hopper").map((p) => p[0]).join() === "Ada,Grace"],
  ["r-recursion", "python stops at a thousand", c.rapid.recursionLimit === 1000],
  ["r-memo", "two point seven million calls", Math.round(c.rapid.fibNaiveCalls / 1e5) === 27],
  ["r-memo", "memoized, fifty-nine", c.rapid.fibMemoCalls === 59],
  ["r-greedy", "it takes three coins. two threes do it", c.rapid.greedy.length === 3 && c.rapid.fewest.join() === "3,3"],
  ["r-bst", "a thousand levels tall; shuffled, twenty-one", c.rapid.bstSortedHeight === 1000 && c.rapid.bstShuffledHeight === 21],
  ["r-traverse", "in-order traversal visits a bst in sorted order", pageOut.inorder.join(" ") === "1 3 4 5 7"],
  ["r-binary", "twenty probes", c.rapid.binaryProbesMillion === 20],
  ["r-adjacency", "a hundred million entries", a.adjacency.listEntries === 1e8],
  ["r-adjacency", "a trillion cells", a.adjacency.matrixCells === 1e12],
  ["r-kahn", "if any are left", c.rapid.kahnCyclic.length < 4 && c.rapid.topoCyclic.length < 4],
  ["r-bits", "the unpaired one is left", pageOut.bits[0] === "4"],
];
const failed = claims.filter(([id, phrase, ok]) => !ok || !text(id).includes(phrase));
for (const [id, phrase, ok] of failed)
  console.error(ok ? `script.ts "${id}" no longer says "${phrase}"` : `"${id}" says "${phrase}", which the run no longer supports`);

// Each deep dive reads a page heading aloud, in the page's words (said as
// they are spoken: "O of one" for $O(1)$, "versus" for "vs").
const spoken = (s) =>
  s
    .replace(/\$O\(1\)\$/g, "O of one")
    .replace(/\bvs\b/g, "versus")
    .replace(/worst-case/g, "worst case")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const headings = new Set(pageQuestions.map(spoken));
const unread = deepBeats.filter((b) => !headings.has(spoken(b.text.replace(/^Question \w+\. /, "").split("?")[0] + "?")) && !headings.has(spoken(b.text.replace(/^Question \w+\. /, "").split(".")[0])));
for (const b of unread) console.error(`"${b.id}" does not read a page heading word for word`);
if (failed.length || unread.length) process.exit(1);
console.error(`ok: ${claims.length} claims, ${deepBeats.length} questions read as the page words them`);
