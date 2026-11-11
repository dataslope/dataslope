# BackendEngineer-8-Algorithms: fixes

Review: [`../BackendEngineer-8-Algorithms.md`](../BackendEngineer-8-Algorithms.md),
19 findings (1 P1, 9 P2, 9 P3). All 19 are fixed. Everything changed is in
`video/src/videos/be-algorithms/`, `video/public/narration/be-algorithms/` and
`video/takes/be-algorithms/` (the takes are untouched; only beats were cut or
voiced).

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | Two pointers "Returns (1, 3)" over values 1 to 6 | fixed | Each cell carries its index above it (0 to 4, with an "index" label), and the result reads "Returns indices (1, 3): 2 + 4 = 6", then "One pass: O(n), not O(n²)" on its own line. The values are read off the page's printed tuple and the input, and the scene throws if they ever stop summing to the target. `RapidTwoScene.tsx`, `Pointers`. |
| 2 | P2 | No shared bucket in the 38-key grid | fixed | The 38th key now lands in a bucket already taken (the rightmost of the 37, beside its label), drawn as two stacked yellow keys with an ink outline, an ink ring and a leader to "first shared bucket". New beat `hash-why` ("Each new key can collide with every key already in.", pauseAfter 0.8) gives the reason, shown as a grey note under the label. `HashScene.tsx`. |
| 3 | P2 | Backtracking tree never drops a branch | fixed | Took the report's second option: a constrained example, orderings of 1, 2, 3 with no digit in its own place, run in `check.mjs` (`backtrackTried`, `backtrackFound`). Ten candidates are drawn in the order tried; the three dead ends (1 first; 2 second; 3 third) turn red with a cross and a dashed red edge, in order, on "drops a branch", and nothing is ever drawn under them. Only 231 and 312 end green. The line reads "dropped at once: nothing under it is tried". `RapidOneScene.tsx`, `Backtrack`. |
| 4 | P2 | Quicksort's 20x inset reads as half of 999 | fixed | The to-scale band is now the labelled mark: "21 levels, to scale" and "10,962 comparisons" sit right under it, as the left's 999 sits by its staircase. The inset is a small detail, zoomed 10x (76 px against the staircase's 370), with no connectors, labelled "detail, zoomed 10× to show the splits", and it inks in after the to-scale label. `QuickScene.tsx`. |
| 5 | P2 | Rapid-round lines vanish in 1 to 3 s | fixed | The five DP states now ink in with their own problem's name (`p.at + 8`), so they build while the list is read; `r-classic` pauseAfter 1.5. `r-trie`, `r-cycle`, `r-topo` pauseAfter 1.5, `r-binary` 2.0 (its fix line is also shorter now, see 15). Timing only. |
| 6 | P2 | The two heap-build bars crowd | fixed | Header to `y(708)`, first bar `y(746)`, second `y(832)`: 36 px between the first bar and the second label (was about 12). `PqScene.tsx`. |
| 7 | P2 | Master Theorem gives only the tie case | fixed | New beat `master-cases`: "If combining dominates, the top level sets the cost; if the pieces dominate, the bottom does." (pauseAfter 1.0). On screen the recurrence is glossed ("two halves, each sorted, plus n to merge them") and the two other cases follow the tie line, each cued to its words. The rows were tightened (58 to 50 a level) to make room. `RapidOneScene.tsx`, `Master`. |
| 8 | P2 | A BST is never defined | fixed | `r-bst` split at its first sentence; the first is re-voiced as "A binary search tree, or BST, keeps smaller keys to the left of each node and larger ones to the right, so an operation costs its height." The rest became `bst-heights`, cut from the take for free. The screen leads with "A BST: at every node, smaller keys left, larger keys right", then "An operation costs the tree's height". `RapidTwoScene.tsx`, `Bst`. |
| 9 | P2 | Hash map worst case stops before "when, and what then" | fixed | New beat `hash-when`: "That worst case comes from a weak hash, or keys picked to collide, which is why Python randomizes string hashes. Need the keys in order? Use a balanced tree." On screen, "(a weak hash, or keys picked to collide)" follows the worst-case row, and one grey line under the rows says the rest. `check.mjs` records `sys.flags.hash_randomization` (1) and a claim ties the words to it. |
| 10 | P2 | BFS vs DFS memory shows only DFS winning | fixed | New beat `bfs-chain`: "On a long chain it flips: BFS holds one node, DFS the whole chain, and recursion overflows." `check.mjs` runs a chain of a million: BFS queue peak 1, DFS path 1,000,000, recursive DFS raises RecursionError (`counts.chain`, three claims). On screen, under the DFS line: "A chain of 1,000,000: BFS 1, DFS 1,000,000". The triangle was shortened (base `y(640)` to `y(604)`) to make room. |
| 11 | P3 | Yellow markers too pale | fixed | Hook: an ink ring (r 14) over the yellow one, and "the hundred" moved out of the square to lead the line above it ("the hundred in 1,000,000 items, a thousand a side", highlighted), with a leader down to the ring. Heap: a 2 px ink path over the yellow climb. Amortized: a 2 px ink outline round the lit step. |
| 12 | P3 | Dijkstra strikes the edge weight 4 | fixed | The A to C weight stays 4, unstruck. C's badge now shows a grey struck "4" followed by "3" from "but three through B". `DijkScene.tsx`. |
| 13 | P3 | The three in-deep-dive questions never shown | fixed | A red "Also asked: …" line in the page's words over each: the hash set's block (at `hash-worst`), the list and deque rows (at `bfs-deque`), and the heap triangle (at "A heap does both"). BFS's lower block moved to fit it (BFS and DFS lines up 24, rows down 2). |
| 14 | P3 | Quicksort and greedy stop a step short | fixed | New beats `quick-trade` ("But it isn't stable, and libraries cap its worst case by switching to heapsort.") and `greedy-safe` ("Scheduling by earliest finish time is the classic safe case."), with a line each on screen ("But it isn't stable; introsort falls back to heapsort"; "Safe: scheduling by earliest finish time"). The page lists activity selection as a safe greedy; the stability and introsort clauses are standard facts the page does not state. |
| 15 | P3 | Binary-search midpoint mixes `/` and `//` | fixed | "In C or Java, `(lo + hi) / 2` can overflow an `int`" and "the safe midpoint: `lo + (hi - lo) / 2`", one notation. |
| 16 | P3 | Unread numbers that differ from what is said | fixed | Big-O: "counted as it ran" is now "counted; the rest worked out". Amortized: "1.05 copies per append" is now "under 2 copies per append", which is what Drew says (and what `check.mjs` asserts); the 8,445,096 total moved off the axis into the right column, on the resizes line ("each can copy every item so far: 8,445,096 in all"). |
| 17 | P3 | BFS opens on an empty page; deque contrast unlabelled | fixed | Both graphs ink in on "Breadth-first search takes a queue" and "Depth-first takes a stack", node by node, so the definitions have a picture; the visiting orders are read onto them in `bfs-graph` as before. The queue cells carry letters A to H, and a red arrow under each list cell shows it moving one place; at the end the list reads B to H flush left, the deque B to H with its first slot empty. |
| 18 | P3 | Unglossed symbols | fixed | "Worst case: key comparisons (`__eq__`) filling a set of 1,000 keys"; the heap line is now "heapify makes at most 999,993 swaps, under n" (the sum of heights is exactly that bound); Bits opens its right column with "XOR, exclusive or: 1 where the bits differ", then "So each pair cancels"; Kahn reads "Remove nodes with nothing pointing in (in-degree 0)" and "Removed: [0]; every node left has an edge pointing in". |
| 19 | P3 | `dijk-neg` is the densest explanatory beat | fixed | Split after "A node is final when it leaves the heap." into `dijk-neg` (pauseAfter 0.8) and `dijk-late` (pauseAfter 0.9), both cut from the kept take for free. |

## Voice

668 characters re-voiced, all `eleven_v4_turbo`, each beat on its own:

| Beat | Chars | For |
| --- | --- | --- |
| `hash-why` | 51 | 2 (P2) |
| `hash-when` | 157 | 9 (P2) |
| `bfs-chain` | 91 | 10 (P2) |
| `master-cases` | 93 | 7 (P2) |
| `r-bst` | 137 | 8 (P2) |
| `quick-trade` | 79 | 14 (P3) |
| `greedy-safe` | 60 | 14 (P3) |

P3 total 139 of the 300 allowed. Cut from the kept takes for free: `dijk-neg`,
`dijk-late` (take 4), `bst-heights` (take 6). `git diff --stat` on the
narration folder after voicing showed only `alignment.json`, `dijk-neg.mp3`,
`r-bst.mp3` changed and the eight new files added; every other beat is
byte-identical.

## Facts

`check.mjs` (from the repository root, 21 s) now makes 64 claims, all passing
(59 before; renamed `r-bst` to `bst-heights` and three `dijk-neg` claims to
`dijk-late`; added `hash-when`, three `bfs-chain` and one `r-backtrack`).
Every existing value in `results.json` came back identical; the only changes
are four additions: `counts.chain`, `counts.hashRandomized`,
`counts.rapid.backtrackTried`, `counts.rapid.backtrackFound`. `data.ts`
exports `CHAIN`; the backtracking run is read through `RAPID`.

## Length and checks

New length: **761.7 s (12:42)**, from 706.6 s, 78 beats.

CHECKS

## Noticed, not changed

- The Master Theorem's "smallest pieces" row and the cycle legend's dots use
  the very pale yellow and tints the review did not list; left alone.
- `listCopiesAt` and `doublingCopiesAt` in `data.ts` are no longer used by a
  scene; kept, as they are small pure helpers.
- The page's permutations output (`PAGE.permutations`) is still computed by
  `check.mjs` but no longer drawn.
