# DataEngineer-11-PipelinesForAi: fixes

Folder `video/src/videos/de-pipelines-for-ai/`. Review report:
`agent-outputs/20261105-de-interview-video-review/DataEngineer-11-PipelinesForAi.md`
(0 P1, 6 P2, 10 P3). I committed nothing. The coordinator's checkpoints
(`1bd4fe3` and later) caught this work part-way through. Compare against the
pre-fix commit `4bff3bc` for the whole change.

## Findings

Order of work: answers (3, 4, 6, then 8, 13, 14), the other P2s (1, 2, 5),
then the other P3s. All sixteen are fixed.

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | Every one of the four questions now has a figure on the page as soon as its card has been read. **Q2**: both rows of the pipeline are drawn first as dashed `QUIET` outlines with no text, the offline row on "find the passages" and the online row on "then answer from them". Each outline fades out as its real box inks in on `rag-halves`, as before (`RagScene.tsx`, `ghostRows`). **Q5**: the table's header, its rules and the five old rows are drawn on "Each model has its own space" (`spaceAt`), so the stretch that gives the core reason has the old model's space on screen. The second model's row stays on "Pretend a second model", and "a tiny space of five words" now brings in only the caption. **Q7**: the millions-to-billions strip grows empty on "the Postgres extension", and its two labels ink in on "millions of vectors" and "not billions". The listing still comes on "the data's in Postgres", 3 s later. **Q9**: on "blur exact tokens", the search line and all three column heads appear. The heads are in grey (`QUIET`) and each inks in its own color on its own cue; the lists still fill in on `hybrid-code`. The query box is lit yellow while the narration says "Search the tickets for…". |
| 2 | P2 | fixed | The drawn space has been rebuilt so that the picture matches the chart. Changes: `clusters()` in `space.ts` takes an aspect and a separation (FilterScene's call is unchanged and draws the same points); `SPACE = clusters(144, 9, 26, 0.035, 680/470, 0.21)`, so the clusters are round as drawn; and every distance is measured in drawn px. The cluster index's lists are now real: each point belongs to the list of its nearest centre. Each circle is sized to its list's farthest point plus 8px, so no point lies outside its circle, and no two circles overlap. The query sits at (284, 232) px, on the border between two lists. 7 of its true ten are in the probed list and 3 are across the border. The rings stay on through the probe. On "about seventy percent", the 3 rings across the border turn red, with the label "missed: across the border". So the picture shows 7 of 10 at the moment the chart shows 69%. The module asserts that the walk (finding 12) ends at the query's nearest point. Chosen with a seeded search over 600 layouts for: no overlapping circles, exactly 3 misses in one neighbouring list, room for both labels. |
| 3 | P2 answer | fixed | `ann-index` is split three ways at its sentence breaks. "Beyond that…" and the HNSW sentence (`ann-hnsw`) are cut from the take at no cost. **`ann-ivf`** was re-voiced: "A cluster index, called IVF, uses less memory and builds faster, and searches only the clusters nearest the query." `ann-measure` is split the same way. **`ann-knob`** was re-voiced as "That's the knob: clusters probed here, search breadth in HNSW." The rest of `ann-measure` is cut from the take. On screen, three lines under the space: "HNSW, a graph index: fast and accurate, memory-hungry, slow to build"; "IVF, a cluster index: search only the nearest clusters", with "IVF," cued to "called IVF"; and "less memory and faster builds than HNSW; often with product quantization", cued to "uses less memory". The x-axis title gains "(in HNSW, search breadth)", cued to its words. Product quantization is named on screen only. To make room, the "approximate: a little recall for big speedups" line moves up, under the "exact" lines. |
| 4 | P2 answer | fixed | `pg-lean` was re-voiced: "Say which way you'd lean, here pgvector, and what evidence would change your mind: the index outgrowing memory, latency missing its target at peak load, or filtered searches losing recall." It runs at 2.5 words/s, down from 3.39. On screen, the green answer now reads "which way you'd lean: pgvector," then "and what evidence would change it:". Below it are three neutral `INK` chips, each cued to its phrase: "the index outgrows memory", "latency misses its target at peak", "filtered searches lose recall". |
| 5 | P2 | fixed | `filter-pre` is split, and its first sentence is cut from the take. **`filter-pre-why`** was re-voiced: "That's correct, and a small subset can just be scanned exactly. A big one can't, and the index, built over everything, spends its search on points it has to skip." **`filter-fix`** was re-voiced: "…use an engine that checks the filter at each step of the search until it has ten…". On screen, under the space: "pre-filter: this tenant first, a full ten, correct"; at 22px, "a small subset: scan it exactly · too big to scan: use the index"; and in red, "but it wasn't built for the subset: most points it visits are skipped". The red line replaces "but outside the index" and the grey "built over every point". The middle chip now reads "filter during the search: at each step, until 10", its suffix cued to the words. |
| 6 | P2 answer | fixed | New beat `backfill-price`: "Embedding prices are cents per million tokens, so the bill is tens to hundreds of dollars; the days are the real constraint." I checked current list prices (November 2026). The small OpenAI model is $0.02 per million tokens, the large one $0.13, Gemini Embedding 2 $0.20, Voyage up to about $0.18. `check.mjs` now carries a range for scale, 2 to 20 cents, with no provider named, and computes 4,000 × that range: `costLow` 80 and `costHigh` 800. The cost line continues "; at 2 to 20 cents, **$80 to $800**", cued to the beat. "≈ 2.8 days" is marked yellow on "the days are the real constraint". The italic line now reads "the page's numbers; the rate and the price range are for scale, not a provider's quote". |
| 7 | P3 | fixed | (a) FilterScene measures nearness in drawn px (`PTS`, 660 × 430). The ten struck out are the ten the eye sees nearest: all within 81px, against 101px for the nearest point of the tenant. The module asserts that none of the drawn ten is the tenant's. (b) Pre-filtering rings the tenant's ten nearest (10 of its 11 points), staggered, rather than three. AnnScene measures in drawn px too (finding 2). |
| 8 | P3 answer | fixed | New beat `pg-caveat` after `pg-why`: "With an approximate index, though, that filter runs after the search: the trap in question eight." On screen, under the four ticks, in red: "with an approximate index, `WHERE` runs after the search (question 8)". The listing's `WHERE` line goes from yellow to red on "that filter runs after the search". Q10: its header line now reads "filtered at query time, inside the search, for (Dana, support)". That part is screen only. |
| 9 | P3 | fixed | Screen only. **Rerank**: under the Rerank box, cued to "reranked", "a slower, more precise model rescores the top hits" (21px; it dims with the online row). **Recall at 161 s**: beside the green "measure retrieval recall on labeled questions", "recall: the share of the right passages it finds" (22px). **Q6 chart**: a 22px axis title, "**recall**: the share of the true top ten found", above the 100% tick. The italic subtitle is shortened to "a seeded simulation, not a vector database". **`<=>`**: beside the `ORDER BY` line, cued shortly after the listing, "← `<=>` is cosine distance to `$1`, the query's vector". |
| 10 | P3 | fixed | The search is now "E-4031 error". Both words are in the query, so the idf line compares two words of it. The keyword list is no longer made up. `check.mjs` runs BM25 (k1 = 1.2, b = 0.75, Lucene's idf) over the eight tickets, ties broken by ticket number as Lucene breaks them by doc id. It gets #3310 (1.693), then the four tickets that say "error": #0412, #1457, #2071 (0.718 each) and #0934 (0.655). It asserts that every ticket listed holds a query word. RRF still puts #3310 first, at 0.0320 against #2071's 0.0318, the same two values as before. The third row is now #0934 at 0.0313 (it was #1182 at 0.0164). Screen only: "**ranks, not scores**: a BM25 score / and a similarity aren't on one scale" in the fused column, on "fuse the rankings". The caption reads "tickets and the vector ranking made up; BM25 run on them". |
| 11 | P3 | fixed | The run is two rows. Row 1, the first run, stops at the crash line after batch 21: batches 19 to 21 are blue. Row 2, the restart, starts under checkpoint 3. On "a restart resumes", its outlines draw and batches 22 to 24 fill blue. Batches 19 to 21 sit dashed and empty until the content-hash beat, which turns them grey. "a restart resumes here →" and "not from batch one" sit right-aligned at the start of row 2. The grey legend line ("already embedded, hash unchanged: never embedded twice") is unchanged. |
| 12 | P3 | fixed | On "fast and accurate", a greedy walk is animated through the graph. It starts at the point farthest from the query and takes 4 hops, about 160, 158, 126 and 50px long. Each hop is a 5px `purple-600` segment drawn 7 frames after the last, ending at the query's nearest (green-ringed) point (`greedyWalk()` in `space.ts`). The walk fades with the graph at "A cluster index". The chart's gridlines, % labels and baseline come in on "Beyond that", and its "recall" title on "trade a little recall". The x labels and "clusters probed" come with "only the clusters nearest the query", and the data still arrives on the simulation's beat. The right half is no longer blank from 249 s to 280 s. |
| 13 | P3 answer | fixed | New beat `access-sync`: "When a permission changes upstream, update the chunks' metadata at once; nothing needs re-embedding." Under the cards, a 22px line cued to it: "a permission changes upstream: update the `readers`, not the vectors". |
| 14 | P3 | fixed | `hook` is split at "dashboard."; its first sentence is cut from the take. **`hook-feed`** was re-voiced: "They feed an AI assistant, which knows your documents only from what's in its index." On screen: "it knows your documents only from what's in here". |
| 15 | P3 | fixed | The column is headed "from its kitten", on the same cue (`searchAt`). It ends at x ≈ 775, inside the table's rules (x ≈ 788). |
| 16 | P3 | fixed | `script.ts` header: `"error" in 4, ln(8/4) = 0.69`. It also describes the BM25 keyword side and the price range now. |

No finding was judged wrong. The page has no error to report. Its Q6 names
IVF, "less memory and faster builds", product quantization and "HNSW's search
breadth, IVF's number of probes", all of which the video now carries. Its Q11
gives no price, so the price range is the video's own, labelled for scale.

## Voice

**1,090 characters re-voiced** (the `narrate --dry-run` count), each beat on
its own, in nine beats:

- **P2 and answer findings, 809:** `ann-ivf` 114, `ann-knob` 62, `pg-lean` 188,
  `filter-pre-why` 162, `filter-fix` 159, `backfill-price` 124.
- **P3s, 281:** `hook-feed` 84, `pg-caveat` 97, `access-sync` 100.

Four splits were cut from the kept takes with `--recut`, at no cost: `hook`,
`ann-index` (with `ann-hnsw`), `ann-measure` and `filter-pre`. After the recut,
`git diff --stat` showed only those beats' MP3s and `alignment.json` changed.
Every other beat's MP3 is byte-identical to `4bff3bc`, and the takes are
untouched. No `--force`, no new take.

Not voiced, and left on screen only: the recall gloss (#9), RRF's "ranks, not
scores" (#10) and Q10's "inside the search" (#8). Voicing them would have put
the P3s over their 400.

## Length and checks

- `npm run cues -- de-pipelines-for-ai`: 59 beats, 1,302 words, **591.4 s
  (9:51)**, up from 536.6 s (8:57). The 55 s come from the nine voiced beats:
  three new ones (`pg-caveat`, `access-sync`, `backfill-price`), longer
  `pg-lean`, `filter-pre-why` and `filter-fix`, and the four splits' extra
  pauses. The new beats run at 2.2 to 2.75 words/s; `pg-lean` is now 2.5.
- Typecheck (`tsc --noEmit`, filtered to the folder) and `eslint
  src/videos/de-pipelines-for-ai`: clean.
- `npm run check:cues`: pass. `npm test`: 75 pass, 0 fail.
- `check:motion`: pass, 0 stretches still for 2 s or more.
- `check:sync`: pass, all 59 beats within ±0.12 s. The worst is `filter-fix`
  at +0.05 s.
- `check:mix`: pass. Effects are 29.8 LU under the narration. Where both
  sound, speech is a median 28.9 dB above the effects (5th percentile
  13.8 dB).
- `check:frames`: pass. 16 arrows within 10° under their heads, no hyphen in
  tabular figures, every cue names its occurrence, and the illustration is
  not drawn larger than its pixels.
- Stills, in two rounds, at every place changed: 9.6 (hook), 71.4, 84 and
  115.5 (Q2 outlines, rerank gloss), 171.5 (recall gloss), 216.5, 230.5 and
  248.8 (Q5), 262, 268.5, 275/276, 285.5, 297 and 311.5 (Q6), 321, 340.5 and
  365.5 (Q7), 384, 409.5 and 421.5 (Q8), 435, 445 and 469 (Q9), 488, 495.5
  and 514.5 (Q10), 548.5 and 569 (Q11). Each was looked at. The second round
  moved the "query" label beside its mark rather than above it, where it read
  as labelling the rings. It also moved Q7's answer block 18px down, clear of
  the `<=>` gloss, and Q11's idempotency note 8px down, clear of
  "checkpoints". Nothing is under 19px, and no rule crosses a label's text.

## Values

`check.mjs` was re-run as its header says, from the repository root, and wrote
`results.json`. Every existing value came back identical, except the two that
finding 10 is about:

- `hybrid.keyword` is now BM25's list, not a made-up one.
- `hybrid.fused` follows from it. #3310 0.0320 and #2071 0.0318 are unchanged;
  the rest of the list is new.

Added: `hybrid.query`, `hybrid.bm25`, and `backfill.priceLow/priceHigh/costLow/costHigh`.
Unchanged: the fresh block, Q5's space and distances, the simulation (69% /
96%, 1% / 16%, 182 of 200 = 91%), the idf values (0.69, 2.08), the backfill
arithmetic (4,000; 4,000 minutes; 2.78 days), the chunk rate (1,800
characters) and the 110-question bank.

## Noticed

- RRF's third place is a tie: #0934 and #1457 both score 1/63 + 1/65 = 0.0313,
  and only #0934 is shown. The narration's claim holds either way: the code's
  ticket is first, by 0.0002. A keyword engine that broke BM25's three-way tie
  among the "error" tickets differently could put #2071 second in the keyword
  list, and then #2071 would win the fusion (1/62 + 1/62 = 0.0323). That is a
  real property of RRF, not a bug in the video, but the example depends on the
  tie-break, which is stated in `check.mjs`.
- The "missed: across the border" label (PAPER background) sits over the top
  of a neighbouring cluster's dashed circle. The circle's line stops at the
  label's edges and never crosses its text. I kept this layout for its other
  properties (no circle overlaps, exactly 3 misses in one list, a 4-hop walk)
  rather than look for one with a clear spot beside the misses.
- No shared change needed.
