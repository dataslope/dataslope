# BackendEngineer-8-Algorithms (706.6 s, 11:47)

## Verdict
- A strong, honest video. Every deep dive argues with counts on screen (pairs at a million, 595,679 `__eq__` calls, 86 resizes, 524,288 against 20, 1.5 million against 18 million comparisons), the numbers match `results.json` and the page, and no implementation is walked through. The series' "decisions, never syntax" brief is met.
- The worst defect is in the quick round: two pointers ends on "Returns (1, 3)" under a row of cells holding the values 1 to 6. A viewer reads it as the values 1 and 3, which sum to 4, not 6. Three other figures fail to show the thing the narration names: the hash buckets never show a shared bucket, the backtracking tree never drops a branch, and quicksort's twenty-times zoom makes the 21-level tree look almost half as deep as the 999-level one.
- Pacing is comfortable in the deep dives (mostly 2.2 to 2.9 words/s, with 1.6 s before each cut). The rapid rounds hurt because each answer panel clears at the next beat. A line the narrator never reads, often the last one, gets 1 to 3 s: the five DP states, the trie's memory cost, the binary-search fix, the cycle and topo results.
- The answers are correct and usually hold up. Several stop one step short of the follow-up: the Master Theorem gives only the tie case, a BST is never defined, the hash map's worst case gets no "when does this happen and what do runtimes do about it", and BFS against DFS on memory shows only the case where DFS wins.

## Findings

### 1. [P1] confusion: Two pointers returns "(1, 3)" next to cells whose values are 1 to 6
- When: 623-632 s, beat `r-pointers` (frame element-631.jpeg)
- What: The row shows the values 1 2 3 4 6, the green pair is 2 and 4, and the result line reads "Returns (1, 3): O(n), not O(n²)". The cells carry no index labels, so "(1, 3)" reads as the values 1 and 3, which sum to 4, not the target 6.
- Why it matters: The figure seems to contradict itself at the moment it gives the answer.
- Cause: `video/src/videos/be-algorithms/RapidTwoScene.tsx:419` prints `PAGE.twoPointers[0]`, the page's index pair. The cells (about :398) show values only.
- Fix: Print an index under each cell, as the Two Sum row in `HashScene.tsx` does, and write "Returns indices (1, 3): the 2 and the 4". Or drop the tuple and write "2 + 4 = 6, one pass: O(n), not O(n²)".

### 2. [P2] confusion: "A shared bucket is more likely than not" over a grid where no bucket is shared
- When: 90-97 s, beat `hash-collide`, still on screen to 117 s (frames element-096.jpeg, element-116.jpeg)
- What: Thirty-eight keys land in 38 distinct buckets. The 38th is an 11 px square with a pale fill, hard to find on the light grid. The caption says "38 keys: chance two share a bucket 50.9%, more likely than not". A viewer who looks for the collision finds none. The narration also never says why it happens so early (each new key can collide with every key already placed), at 3.20 words/s, the densest beat in the scene.
- Why it matters: The page's own point ("collisions are not rare, they are the normal state") is the one thing the figure does not show.
- Cause: `video/src/videos/be-algorithms/HashScene.tsx:22-38` draws `landings` as a seeded scatter of distinct buckets (`if (!out.includes(b))`). The 38th is only recoloured (:178-182).
- Fix: Let the 38th key land on an already-filled bucket, and draw that bucket as two stacked keys with an ink outline and the label "first shared bucket". Add half a clause to `hash-collide`, such as "because each new key can hit any of the ones already in", and a `pauseAfter` of 0.8.

### 3. [P2] confusion: The backtracking figure never drops a branch
- When: 541-551 s, beat `r-backtrack` (frame element-550.jpeg)
- What: The narration says backtracking "drops a branch the moment it can't succeed", and the line "A branch that can't succeed is dropped at once" appears. The tree beside it is the full permutation tree of 1, 2, 3: every branch is drawn, and all six leaves are green.
- Why it matters: The defining idea, pruning, is asserted over a figure of exhaustive enumeration, which is the opposite.
- Cause: `video/src/videos/be-algorithms/RapidOneScene.tsx:577-605` draws `level1`, `level2` and `perms` with no rejected child.
- Fix: Draw the children that reuse a digit (1 under 1, 2 under 2, ...) as stubs in red with a cross, cued to "drops a branch". Or pick a constrained example (no two adjacent digits consecutive) where whole subtrees are cut, and leave only the surviving leaves green.

### 4. [P2] confusion: Quicksort's zoomed band makes 21 levels look like half of 999
- When: 416-433 s, beats `quick-random` and `quick-next` (frame element-432.jpeg)
- What: On the left, the worst case is a red triangle about 370 px deep. On the right, the random-pivot tree at the same scale is a green fringe about 8 px tall, and the eye skips it. Under it, a dashed callout "the band, 20 times taller" draws the same tree about 160 px deep, nearly half the red triangle. The narration never mentions the magnification. A viewer comparing the two panels sees "deep against fairly deep", not 999 against 21.
- Why it matters: The scene's point is the contrast in depth, and the most prominent picture understates it about twentyfold.
- Cause: `video/src/videos/be-algorithms/QuickScene.tsx:20` (`ZOOM = 20`) and :159-182, the inset.
- Fix: Keep the to-scale band as the primary mark, with a bracket and "21 levels" beside it at the same scale as the left's "999 levels". Shrink the inset to a small detail labelled "zoomed 20x to show the splits", or drop it.

### 5. [P2] pacing: The quick rounds' unread lines vanish within 1 to 3 seconds
- When: `r-classic` 520-529 s (element-527.jpeg); `r-trie` 610-612 s (element-610.jpeg); `r-binary` 619-623 s (element-622.jpeg); `r-cycle` 665-666 s (element-665.jpeg); `r-topo` 671-673 s
- What: Each answer panel fades at the next item's start (gap 0.55 s), so a line that appears near the end of its beat gets almost no screen time:
  - Five lines of "state: ..." (about 25 words) appear together at "define the state", about 527 s, and are gone by 529.
  - "More memory: a node per character" appears at about 610.5 s and is gone by 612.
  - "the page writes `lo + (hi - lo) // 2`" is visible for about 2 s.
  - "C → A reaches a node on the path: a cycle. The page prints True" is visible for about 1.5 s.
  - "Build steps, task dependencies: the page prints [...]" is visible for about 1.5 s.

  None of these lines is narrated. At 2 words/s, each needs 3 to 12 s.
- Why it matters: The DP states are the substance of "each teaches a way to define the state", and the binary-search fix is the answer to "common mistakes". Both flash past.
- Cause: `video/src/editorial/interview.tsx:189` fades a body at `next - 2`. In `video/src/videos/be-algorithms/RapidOneScene.tsx:446` the states are cued to `stateAt + i * 4`. `RapidTwoScene.tsx:309, 359, 565-568, 619` are the other lines.
- Fix: Cue each DP state to its own problem's name (`p.at + 8`, not `stateAt`) so each one builds while the list is read, and give `r-classic` a `pauseAfter` of 1.5. For the other four, either read them (the fix line can be "the safe midpoint is lo plus half the gap") or set `pauseAfter` on `r-trie`, `r-binary`, `r-cycle` and `r-topo` to 1.5 to 2.0 s.

### 6. [P2] spacing: The two heap-build bars are crowded together
- When: 324-335 s, beat `heap-build` (frame element-334.jpeg)
- What: The "1,499,986" bar's value sits about 12 px above the label "Pushed one at a time". The second label reads as a caption for the first bar, not a header for the red one.
- Why it matters: The two counts this beat is built on read as one block, under the house rule of about 25 px between rows.
- Cause: `video/src/videos/be-algorithms/PqScene.tsx:229` and `:243` put the bars at `y(752)` and `y(814)`, 62 units apart. Each `HBar` (`parts.tsx:369-371`) is a label, 12 px of margin and a 22 px bar, about 64 tall.
- Fix: Move the second bar to `y(836)` (and nudge the header at :225 up by 10 if the bottom margin needs it), or use `barH={18}` with `y(828)`.

### 7. [P2] answer: The Master Theorem gives only the tie case, under a recurrence that is never read
- When: 477-488 s, beat `r-master` (frame element-487.jpeg)
- What: The screen shows `T(n) = 2 T(n/2) + n`. The narration never reads or explains it: "comparing the work of combining with the number of smallest pieces. For merge sort they tie". The general form T(n) = aT(n/b) + f(n), and what happens when either side wins, are absent. The page lists all three cases.
- Why it matters: "What is the Master Theorem?" is usually followed by "what are the cases?", and a viewer who saw only the tie cannot answer.
- Cause: `video/src/videos/be-algorithms/script.ts`, beat `r-master`; `RapidOneScene.tsx:249`.
- Fix: Add a sentence: "If combining dominates, the top level sets the cost; if the pieces dominate, the bottom does; tie, and you pay log n levels of it." Label the recurrence on screen as "a halves, each sorted, plus n to merge". Give `r-master` a `pauseAfter` of 1.0.

### 8. [P2] answer: A BST is never defined
- When: 566-581 s, beat `r-bst` (frame element-580.jpeg)
- What: "A binary search tree, or BST, costs its height per operation" goes straight to heights 1,000 and 21. The ordering rule (left subtree smaller, right subtree larger) is never said or written, though it is the first sentence of the page's answer and the reason in-order traversal (the next item) comes out sorted.
- Why it matters: "What is a BST?" is half the question, and the follow-ups (why in-order is sorted, why sorted input degenerates) rest on that rule.
- Cause: `video/src/videos/be-algorithms/script.ts`, beat `r-bst`; `RapidTwoScene.tsx`, `Bst`.
- Fix: Open `r-bst` with "Every key on the left is smaller and every key on the right larger, so an operation costs the tree's height." Put that rule as a line above the bars.

### 9. [P2] answer: The hash map's worst case stops before "when, and what do runtimes do about it"
- When: 97-117 s, beats `hash-worst` and `hash-set` (frame element-116.jpeg)
- What: The video shows that one shared hash costs 595,679 comparisons and that the worst case is O(n) per operation. It never says when that happens in practice: adversarial keys (hash flooding) or a poor hash function. It also never mentions the defences: randomized string hashing (Python), or a bucket that becomes a balanced tree (Java 8). The other half of "when do you reach for one" is also missing: when not to (you need order or ranges, which question 23 answers with a balanced BST).
- Why it matters: "So when would I actually hit O(n)?" is the standard follow-up, and the viewer has a number but no scenario.
- Cause: `video/src/videos/be-algorithms/script.ts`, beats `hash-worst` and `hash-set`.
- Fix: Append to `hash-set`: "You hit it with a bad hash or keys chosen to collide, which is why Python randomizes string hashes. And if you need the keys in order, a tree beats it." Add one grey line under "A hash set" on screen.

### 10. [P2] answer: BFS against DFS on memory shows only the tree where DFS wins
- When: 255-267 s, beat `bfs-memory` (frame element-280.jpeg)
- What: "Memory decides it too", with a full binary tree: BFS 524,288, DFS 20. The opposite case is never mentioned: a deep, narrow graph (a chain of a million nodes), where DFS holds the whole path and recursive DFS hits Python's 1,000-frame limit. The page states the rule both ways: BFS costs the widest level, DFS the depth.
- Why it matters: A viewer leaves thinking DFS is the memory-cheap choice, and "what if the graph is a long chain?" is the obvious next question.
- Cause: `video/src/videos/be-algorithms/script.ts`, beat `bfs-memory`; `BfsScene.tsx`, tree panel.
- Fix: Add "On a long chain it flips: DFS holds all of it, and recursion overflows." Put one line under "DFS stack: one path, 20 nodes" reading "a chain of a million: DFS holds a million".

### 11. [P3] confusion: Yellow markers too pale to find on the light page
- When: 7-19 s, `hook` (element-018.jpeg); 307-319 s, `heap-height` (element-334.jpeg); 158-171 s, `amort-spike` (element-170.jpeg)
- What:
  - In the hook, the hundred inside the million is a 4 px square ringed in pale yellow, and the label "← the hundred" sits inside the blue square, its arrow pointing left at nothing.
  - The heap's "one push climbing nineteen" is a beige line on the light blue triangle.
  - Amortized's "last step lit in yellow" is a pale band on a blue step.

  All three are the element the narration points at.
- Why it matters: The thing being pointed at is the hardest thing on screen to see.
- Cause: `HookScene.tsx:96` (`stroke={HIGHLIGHT}`) and :105, the label; `PqScene.tsx:190`; `AmortScene.tsx:144`.
- Fix: Give each marker an ink outline, as the heap's root node already has: an ink ring of `r` 14 in the hook, with the label moved outside the square at upper left and a leader line to the corner; an ink 2 px path over the yellow in the heap; an ink 2 px outline around the amortized band.

### 12. [P3] confusion: Dijkstra strikes the edge weight 4, not C's distance
- When: 348-355 s, beat `dijk-run` (frame element-376.jpeg)
- What: At "but three through B", the A-to-C edge's weight label "4" is struck in red. The edge still costs 4. What changed is C's tentative distance, whose badge silently goes from 4 to 3.
- Why it matters: It strikes a true fact (the brief's "correct statements struck through") and leaves the real update unmarked.
- Cause: `video/src/videos/be-algorithms/DijkScene.tsx:133` wraps the weight in `<Strike>`. :144 swaps the badge.
- Fix: Leave the weight alone. Render C's badge as a struck "4" followed by "3" at `throughBAt`.

### 13. [P3] explanation: The three questions answered inside the deep dives are never shown, and the numbers stop at 32 against "35"
- When: 9-18 s, `plan`; inside questions 2, 5 and 6 (98, 268, 294 s)
- What: The plan says "three inside those". The hash set's complexity, the deque, and heap operation costs are answered in passing, but their questions are never put on screen, so the 32 numbered items never visibly add up to 35.
- Why it matters: A viewer looking for "deque vs list" cannot tell that it was answered.
- Cause: `HashScene.tsx`, `BfsScene.tsx`, `PqScene.tsx` (no sub-question kicker).
- Fix: At `hash-worst`, `bfs-deque` and `heap-choose`, ink a small kicker in the question colour above the sub-figure, such as "Also asked: What is a deque, and when should you prefer it over a list?".

### 14. [P3] answer: Quicksort and greedy each stop one step short
- When: 422-433 s, `quick-next`; 529-541 s, `r-greedy`
- What: Quicksort's comparison with merge sort gives only "in place". It omits that quicksort is not stable (merge sort is, which is why Python's sort builds on it) and how libraries guarantee n log n (introsort falls back to heapsort). Greedy says "safe only when local choices provably add up" but gives no case where it is safe (interval scheduling by earliest finish, canonical coin systems) and no proof method (exchange argument).
- Why it matters: "Why not always quicksort?" and "when is greedy safe, then?" are the natural follow-ups.
- Cause: `script.ts`, beats `quick-next` and `r-greedy`.
- Fix: For `quick-next`, use "...sorting in place; it gives up stability, and libraries cap the worst case by switching to heapsort." For `r-greedy`, add "Scheduling by earliest finish time is the safe classic."

### 15. [P3] other: The binary-search midpoint line mixes `/` and `//`
- When: 619-623 s, beat `r-binary` (frame element-622.jpeg)
- What: The bug is written `(lo + hi) / 2` and the fix `lo + (hi - lo) // 2`. In Python, which the fix is written in, integers do not overflow and `/` is float division.
- Why it matters: A careful viewer sees a Python fix for a bug Python cannot have.
- Cause: `video/src/videos/be-algorithms/RapidTwoScene.tsx:355-359`.
- Fix: Write both in one notation, `(lo + hi) / 2` and `lo + (hi - lo) / 2`, labelled "in C or Java".

### 16. [P3] confusion: Unread numbers that differ from what is said
- When: 30-68 s, `big-*` (element-067.jpeg); 145-171 s, `amort-factor` (element-170.jpeg)
- What:
  - Big-O's table has a 1,000 row tagged "counted as it ran" that the narration never mentions.
  - Amortized shows "Doubling: 20 resizes, 1.05 copies per append" while Drew says "under two copies an append".
  - "copies if every resize copied all: 8,445,096" sits under the chart's 0 tick where an axis title would be.
- Why it matters: The three are minor but each makes a viewer reconcile two numbers mid-sentence.
- Cause: `BigScene.tsx:184`; `AmortScene.tsx:177-182` and :203.
- Fix: Say "about one copy an append" (or show "under 2"); move the 8,445,096 line to the right column under "Copies per append"; drop "counted as it ran" or say "the thousand row was counted, the million worked out".

### 17. [P3] confusion: BFS opens on a nearly empty page, and the deque contrast is unlabelled
- When: 218-231 s, `bfs` (element-225.jpeg); 268-281 s, `bfs-deque` (element-274.jpeg, element-280.jpeg)
- What: For 13 s, while breadth-first and depth-first are defined, the page holds only the question and one line. The graph arrives at 231 s. Later, the list and deque rows are empty cells. The list's "shift" is a 76 px slide, and the end state (list flush left, deque missing its first cell) needs the animation to make sense.
- Why it matters: The definitions get no picture, and the deque's whole argument is a motion that is easy to miss.
- Cause: `BfsScene.tsx`, graph cue (`bfs-graph`); :183-226, empty `value=""` cells.
- Fix: Ink the two graphs from "Breadth-first search takes a queue" rather than from `bfs-graph`. Put letters in the queue cells (B, C, D, ...) and a small "← each one moves" arrow under the list row.

### 18. [P3] explanation: Some symbols are left unglossed
- When: 98 s (`__eq__`), 332 s ("heights sum to 999,993, under n"), 680 s (XOR, `x ^ x = 0`), 675 s ("in-degree 0")
- What: Each is on screen but never said. Drew says "key comparisons", "most nodes sit near the bottom" and "nothing pointing in". XOR is said as a word but never expanded to "exclusive or, bit by bit".
- Why it matters: Each is a small stumble for a viewer without the vocabulary.
- Cause: `HashScene.tsx:205`; `PqScene.tsx` heights line; `RapidTwoScene.tsx`, `Bits` and `Kahn`.
- Fix: Use the narrated words on screen: "key comparisons (`__eq__` calls)", "XOR (exclusive or): 1 where the bits differ", "nothing pointing in (in-degree 0)", and drop or explain the heights sum.

### 19. [P3] pacing: The negative-weight argument is the fastest explanatory beat
- When: 366.2-377.9 s, beat `dijk-neg`, 3.16 words/s, gap 0.70 s
- What: The video's subtlest argument is the densest beat in the scene: final when it leaves the heap, B leaves at 2, the -2 edge arrives later, B and D are both wrong.
- Why it matters: This is where a viewer needs a beat to follow the figure.
- Cause: `video/src/videos/be-algorithms/script.ts`, beat `dijk-neg`.
- Fix: Split after "A node is final when it leaves the heap." into its own beat with `pauseAfter: 0.8`, and raise the final `pauseAfter` to 0.9.
