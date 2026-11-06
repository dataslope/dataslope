# DataEngineer-11-PipelinesForAi (8:57, 536.6 s)

## Verdict
- Solid and accurate. Every number said or shown matches the page and `results.json`: the page's block (embed `doc1#1` and `doc3#0`, delete `doc2#0`), the five-word space (the second model's kitten lands nearest truck, 0.71), 69% and 96% of the exact top ten at 1% and 16% of the vectors compared, 182 of 200 post-filtered searches empty (91%), RRF 0.0320 against 0.0318, idf 0.69 and 2.08, 4 billion tokens, 4,000 minutes, 2.8 days, and the 110-question bank. The full frames I checked show no overlaps, no clipping and no text under 19px. The smallest text is the 19px italic provenance captions.
- The weakest part is when the figures arrive, not how fast the voice goes. In four questions (2, 5, 7, 9), the screen shows only the question card and one line of text for 8 to 12 s after the question has been read. Q5's central claim, "each model has its own space", is spoken over a blank page. Q6's drawing also contradicts its own chart. All ten true neighbours sit inside the probed cluster, so the picture implies one probe finds everything, while the chart beside it says 69%.
- The voice pacing is comfortable. The deep dives run at 1.9 to 2.9 words/s, and every gap is 0.55 s or more. Only `pg-lean` (3.39) and `hybrid-cheap` (3.13) run fast, and both are short.
- As interview answers they follow the page closely and are correct, but four stop one step before the obvious follow-up:
  - Q6 never names IVF or says why you would choose it over HNSW.
  - Q7 tells the viewer to name "what evidence would change your mind" but gives no example.
  - Q8 never explains why pre-filtering defeats the index, or how filtering during the search is different.
  - Q11 gives the time in days but leaves the cost as a formula with no order of magnitude.
- Q7 and Q10 present metadata filtering (pgvector's `WHERE`, the per-user access filter) as a plain win. Neither mentions the post-filter caveat that Q8 then shows. A sharp interviewer would connect the two.

## Findings

### 1. [P2] spacing: four questions talk over a near-empty page after the question is read
- When:
  - Q2: 64-72 s, beat `rag` (frames element-066.jpeg, element-069.jpeg).
  - Q5: 209-219 s, beat `switch` (element-216.jpeg).
  - Q7: 305-311 s, beat `pg` (element-309.jpeg).
  - Q9: 389-399 s, beat `hybrid` (element-395.jpeg).
- What: After the card is read, each page holds the card plus one line of text, and the lower two thirds of the frame stay blank. The lines are:
  - Q2: the RAG expansion.
  - Q5: "everything gets re-embedded: each model has its own space".
  - Q7: "pgvector, the Postgres extension".
  - Q9: "embeddings capture meaning, but blur exact tokens".

  Q5's blank stretch carries the answer's core reason ("a new model's query can't be compared with old documents"). Q9's carries the "when do embeddings alone fail" half of its question.
- Why it matters: The series rule is that a figure arrives as its question finishes being read. Here, 6 to 12 s of explanation has nothing to look at.
- Cause: In each scene, the first figure is cued to the following beat:
  - `video/src/videos/de-pipelines-for-ai/RagScene.tsx:79,117-148`: both rows wait for `offAt` (`rag-halves`, "Offline").
  - `SwitchScene.tsx:101-113`: the table waits for `tinyAt` (`switch-demo`).
  - `PgScene.tsx:68,88-133,145-151`: the strip waits for `millionsAt` and the listing for `inPgAt`.
  - `HybridScene.tsx:143-159`: the search box and the lists wait for `searchAt` (`hybrid-code`).
- Fix:
  - Q5: Draw the table header and the five old rows at `spaceAt` ("Each model has its own space"). Keep the second model's row on `pretendAt`, and let `tinyAt` light only the caption.
  - Q9: Bring in the "search the tickets for E-4031" line and the three empty column heads at `blurAt`, so the lists fill in on `hybrid-code`.
  - Q2: Draw both rows of boxes ghosted (`QUIET`) at `findAt` and `answerAt`, then ink them on `rag-halves` as now.
  - Q7: Grow the empty millions-to-billions strip at `extAt`, and keep its two labels on `millionsAt` and `billionsAt`.

### 2. [P2] confusion: Q6's cluster drawing implies one probe finds every neighbour, while the chart says 69%
- When: 276-293 s, beats `ann-index` (end) and `ann-sim` (frames element-273.jpeg, element-300.jpeg)
- What: The ten green rings (the exact top ten) all sit in the query's own cluster. When "a cluster index" arrives, the rings fade, and that same cluster is the one probed. Recomputed from `space.ts`, all ten of `TOP10` are in cluster `PROBED`. So the drawing says a probe of 1 is perfect, while the chart beside it says it finds 69%. Nothing on the page shows a neighbour lost across a cluster border, which is the reason recall drops. Several of the probed cluster's blue points also lie outside its drawn circle (element-300, below and left of the circle).
- Why it matters: The figure and the number it sits beside disagree, and the mechanism behind "trade a little recall" is never drawn.
- Cause: `AnnScene.tsx:17` (`Q = { x: 0.37, y: 0.5 }` sits inside one cluster), `:18` and `:21-23` (`TOP10` and `PROBED`), `:77` (`ringed` fades at `clusterAt`), `:134` (fixed radius `SC.w * 0.11`).
- Fix:
  - Move `Q` onto the border between `PROBED` and its nearest neighbouring cluster, placed so 3 or 4 of `TOP10` fall in the other cluster.
  - Keep the rings through the probe (drop the `clusterAt` fade from `ringed`).
  - At `seventyAt`, turn the rings outside `PROBED` red and label them "missed: across the border".
  - Size each circle to its points' largest distance from the centre plus 8px.

### 3. [P2] answer: Q6 never names IVF or says why you would choose it over HNSW
- When: 263-301 s, beats `ann-index` and `ann-measure` (frames element-273.jpeg, element-300.jpeg)
- What: HNSW gets a name and its costs ("memory-hungry, slow to build"). The other index is only "a cluster index: search only the nearest clusters". Four things the page has are missing:
  - the name IVF;
  - IVF's advantages, less memory and faster builds;
  - product quantization;
  - HNSW's own knob, its search breadth.

  So the only trade-off a viewer can state is HNSW's downside.
- Why it matters: "HNSW or IVF, and when?" is the standard follow-up. IVF is the name an interviewer uses, and so do FAISS and pgvector (`ivfflat`). A viewer who only learned "cluster index" will not recognise it.
- Cause: `video/src/videos/de-pipelines-for-ai/script.ts:225` (`ann-index`), `:234` (`ann-measure`); `AnnScene.tsx:203-208`.
- Fix:
  - Screen: "IVF, a cluster index: less memory, faster builds; search only the nearest clusters".
  - Last sentence of `ann-index`: "A cluster index, known as IVF, needs less memory and builds faster, and searches only the clusters nearest the query."
  - `ann-measure`: "That's the knob: clusters probed here, search breadth in HNSW. Measure recall against exact search on a sample; don't trust the defaults."

### 4. [P2] answer: Q7 asks for the evidence that would change your mind, then gives none
- When: 333-338 s, beat `pg-lean` (frame element-337.jpeg)
- What: The scene ends on "the answer they want: which way you'd lean, and what evidence would change it", marked green, but the video gives neither a lean nor any evidence. It is also the fastest beat in the video: 12 words at 3.39 words/s.
- Why it matters: The interviewer's next words are "so which way, and what evidence?" The viewer has the shape of the answer without its content.
- Cause: `script.ts:253`; `PgScene.tsx:183-198`.
- Fix:
  - `pg-lean`: "Say which way you'd lean: pgvector, until the evidence says otherwise, like the index outgrowing memory, latency missing its target at peak query rate, or filtered searches losing recall."
  - Under the green lines, add three chips cued to those phrases: "index outgrows memory", "latency misses target at peak", "filtered recall drops".
  - The longer line also brings the beat under 3 words/s.

### 5. [P2] explanation: Q8 asserts that pre-filtering defeats the index, and that filtering during the search fixes it, without the mechanism
- When: 366-384 s, beats `filter-pre` and `filter-fix` (frame element-383.jpeg)
- What: The drawing shows pre-filtering finding the tenant's nearest points, ringed green, so it reads as a success. The only caveat is the red "but outside the index" and the grey "the approximate index was built over every point". The fix chip "filter during the search" is never distinguished from pre-filtering.
- Why it matters: "Then why not always pre-filter?" and "what does filtering during the search do differently?" are the obvious follow-ups, and their answers are the point of the question:
  - A small filtered subset is scanned exactly, which is fine.
  - On a large subset, a graph index has to walk through points it must skip, and it loses recall or speed.
  - Filtered search checks the filter at each step of the walk and keeps going until it has k allowed results.
- Cause: `script.ts:273` (`filter-pre`), `:277` (`filter-fix`); `FilterScene.tsx:154-163`, `:205-209`.
- Fix:
  - `filter-pre`: "Pre-filtering restricts first, then searches. That's correct, but the index was built over everything: a small subset gets scanned exactly, and a large one leaves the index walking past points it has to skip."
  - Screen: replace "but outside the index" with "but the index wasn't built for the subset". Below it, add a line at 22px: "small: scan it exactly · large: the walk skips most points".
  - `filter-fix`: "...use an engine that checks the filter at each step of the search until it has ten...".

### 6. [P2] answer: Q11 leaves the cost as a formula with no order of magnitude
- When: 482.7-494 s, beat `backfill-div` (frame element-514.jpeg)
- What: Time gets a worked number (4,000 minutes ≈ 2.8 days). Cost stays "4,000 × the price per million tokens", with "no price is quoted" printed under it. The hook named "the embedding bill" as one of the two things that are new.
- Why it matters: "Roughly what does that cost?" is the immediate follow-up. The useful conclusion is missing: embedding APIs charge cents per million tokens, so the bill is tens to hundreds of dollars, and the rate limit, not the price, sets the plan. As it stands, the viewer cannot say which constraint binds.
- Cause: `script.ts:330`; `BackfillScene.tsx:112-118`, `:134-136`.
- Fix:
  - Append to `backfill-div`: "Embedding prices are cents per million tokens, so the bill is tens to hundreds of dollars; the days are the real constraint."
  - After the cost line, add a note cued to that phrase: "at cents per million tokens: tens to hundreds of dollars".
  - Reword the italic line to "a price range for scale, not a quote".
  - Check current list prices before voicing; this keeps the builder's choice to name no provider.

### 7. [P3] confusion: Q8's drawn space contradicts "the ten nearest" twice
- When: 350-384 s, beats `filter-post` and `filter-pre` (frames element-355.jpeg, element-383.jpeg)
- What:
  - (a) Post-filtering strikes out the query's ten nearest points. But one blue tenant point, below and left of the query, is drawn about 101px from it. That is nearer on screen than the farthest struck point, at about 108px (recomputed from `space.ts`). Nearness is computed in the unit square, but the square is drawn 660 wide by 430 tall.
  - (b) Pre-filtering then rings only three tenant points, though the search asked for ten and eleven tenant points are on screen.
- Why it matters: A careful viewer sees a tenant point inside the "ten nearest" radius, and three results where ten were asked for.
- Cause: `FilterScene.tsx:27` (`SC` w 660, h 430), `:71-72` (separate x and y scales), `:20` (nearest computed in unit coordinates), `:22-25` (`slice(0, 3)`). `AnnScene.tsx:25` uses the same non-uniform scaling (680 x 470).
- Fix: Draw both spaces at one scale (`SC.h = SC.w`, for example 560 x 560), or compute `nearestOf` on screen coordinates. Ring the tenant's ten nearest points rather than three, which also shows that pre-filtering returns a full ten.

### 8. [P3] answer: Q7 and Q10 present metadata filtering without Q8's caveat
- When: 315-322 s, beat `pg-why` (frame element-337.jpeg); 436-450 s, beat `access` (frame element-469.jpeg)
- What: Q7 ticks "access filters in plain SQL" and lights `WHERE d.team = 'support'` in a query ordered by `<=>` with `LIMIT 10`. Q10 says "filter at query time by the user's identity". With an approximate index, pgvector applies that `WHERE` after the index scan. That is exactly the post-filter that Q8 shows coming back empty in 91% of searches when the filter is selective.
- Why it matters: An interviewer who knows pgvector will ask how many rows that query returns with an HNSW index. The video has the answer two questions later but never connects it.
- Cause: `script.ts:246` (`pg-why`), `:306` (`access`); `PgScene.tsx:53,152-155`; `AccessScene.tsx:87-89`.
- Fix:
  - `pg-why`: "...and access filters in plain sequel, though with an approximate index the filter runs after the search: the trap in question eight."
  - Under the listing, at that phrase: "with an HNSW index, WHERE applies after the scan".
  - `access`: "...filter at query time by the user's identity, inside the search, so a selective filter doesn't come back empty".

### 9. [P3] explanation: notation and terms used without a gloss
- When: 75-79 s, beat `rag-halves` (frame element-114.jpeg); 160 s, beat `chunk-measure`, and 263-300 s, beats `ann-index` to `ann-measure` (frames element-170.jpeg, element-300.jpeg); 310-338 s, beat `pg` onward (frame element-337.jpeg)
- What:
  - "Rerank" appears as a box and a word, but nothing says it is a slower, more precise model rescoring the top hits.
  - "Recall" is used at 160 s ("measure retrieval recall") and at 263 s ("trade a little recall") before anything defines it. The chart's y axis has no title. Its only definition is the 19px italic subtitle "share of the exact top ten found".
  - `ORDER BY c.embedding <=> $1` is the line of the pgvector query that actually does the vector search. It is never lit or explained (`<=>` is cosine distance, and `$1` is the query's vector).
- Cause: `RagScene.tsx:22`; `script.ts:132,172,225`; `AnnScene.tsx:219-231`; `PgScene.tsx:15-22,152-155`.
- Fix:
  - `rag-halves`: "...reranked by a slower, more precise model, and the best hits fill the prompt".
  - `ann-index`: "...trade a little recall, the share of the true nearest neighbours they find, for big speedups".
  - Add a 22px y-axis title, "recall", above the 100% tick.
  - At `inPgAt`, add a note to the right of the `ORDER BY` line: "`<=>`: cosine distance to the query's vector `$1`".

### 10. [P3] explanation: Q9 never says why RRF fuses ranks, and the keyword list is implausible
- When: 406-430 s, beats `hybrid-bm25` and `hybrid-rrf` (frame element-434.jpeg)
- What:
  - Reciprocal rank fusion is computed but never motivated. BM25 scores and vector similarities are on different scales, so adding them is meaningless, and ranks are what the two lists share.
  - The made-up keyword list ranks four tickets at 2 to 5 that contain no token of the query "E-4031" ("Pairing a second sensor", "List of error codes"). A BM25 search for that one token would not return them, and #2071 owes its close second place (0.0318) to rank 4 there.
  - The idf line compares "error" with "E-4031", but "error" is not in the query.
- Cause: `script.ts:298`; `HybridScene.tsx:143-151`; `results.json` `hybrid.keyword` (built by `check.mjs`).
- Fix:
  - `hybrid-rrf`: "Then fuse the rankings, not the scores, since the two scales don't compare: reciprocal rank fusion...".
  - Make the query "E-4031 error", and rebuild the keyword list as #3310 first, then the four tickets that say "error". The idf line then explains directly why the rare code outranks the common word in the same query.

### 11. [P3] confusion: Q11's batch strip merges the failed run and the restart into one row
- When: 500-515 s, beats `backfill-fail` and `backfill-hash` (frame element-514.jpeg)
- What: Read left to right, the finished row says: done, done, checkpoint, three grey "already embedded" squares, "the run dies", then three more done. To follow it, the viewer has to work out two things the row does not show:
  - The grey squares were embedded in the first run and skipped on the second.
  - The blue squares after the red line belong to the restart.
- Why it matters: The order of the squares is not the order of events.
- Cause: `BackfillScene.tsx:17-22` (`CRASH`, `UNCHANGED`), `:68-73` (`fill`), `:150-151` (grey on `hashAt`).
- Fix:
  - End the first run's row at the crash line, with batches 19-21 blue.
  - Draw the restart as a second row beneath it, starting at checkpoint 3: batches 19-21 grey ("skipped: hash unchanged"), then 22-24 filling blue.
  - Move "a restart resumes here" to the start of the second row.

### 12. [P3] explanation: Q6's HNSW is a static web, and half the frame is empty for 30 s
- When: 249-280 s, beats `ann` and `ann-index` (frame element-273.jpeg)
- What: At "HNSW, a graph index", each point is joined to its two nearest neighbours in purple, but no search moves through the graph, so "fast and accurate" has nothing to show it. The right half of the frame (x > 900) is blank from 249 s until the simulation chart arrives at 280 s.
- Cause: `AnnScene.tsx:151-164` (static edges); `:211-238` (the chart is cued to `modelAt`).
- Fix:
  - At `fastAt`, animate a greedy walk: start at an entry point far from the query and take 4 or 5 hops along edges, each hop a heavier purple segment, ending at the ringed neighbours.
  - Bring the chart's empty axes in at `beyondAt` ("Beyond that").

### 13. [P3] answer: Q10 covers deleted documents but not changed permissions
- When: 436-470 s, beats `access` and `access-delete` (frame element-469.jpeg)
- What: Permissions are drawn as chunk metadata, set once at ingestion. Nothing says what happens when a document's readers change upstream, the case where stale metadata becomes a leak.
- Why it matters: "Someone loses access to a folder: what happens to its chunks?" is the natural next question after "filter by the user's identity".
- Cause: `script.ts:306`; `AccessScene.tsx:84-136` (the permission cards).
- Fix:
  - Add to `access`: "...and when a permission changes upstream, sync it to the chunks' metadata right away; no re-embedding needed."
  - Add a 22px note under the cards: "permissions change: update metadata, not vectors".

### 14. [P3] accuracy: the hook overstates what the assistant answers from
- When: 4-8 s, beat `hook` (frame element-024.jpeg)
- What: The narration says "an AI assistant, which can only answer from what's in its index", and the screen says "it answers only from what's in here". The model also answers from its pretraining, and it makes things up when retrieval misses. The page says only that the assistant is "only as good as the documents it can find".
- Cause: `script.ts:93`; `HookScene.tsx:111`.
- Fix: Narration: "...which can only answer about your documents from what's in its index". Screen: "about your documents, it answers only from what's in here".

### 15. [P3] confusion: Q5's "distance" column does not say distance from what
- When: 227-248 s, beat `switch-demo` (frame element-247.jpeg)
- What: The fifth column, headed "distance", lists 1.06, 1.13, 0.94, 1.20 and 0.71. Each is the distance from the second model's kitten, but that row is only drawn below the table.
- Cause: `SwitchScene.tsx:104-107`.
- Fix: Head the column "from its kitten", keeping the same cue.

### 16. [P3] other: the script header states the idf numbers wrong
- When: none on screen (code only)
- What: The header comment says `"error" in 5, ln(8/5) = 0.47`. `results.json` has df 4 and idf 0.69, which matches the screen (element-434.jpeg) and HybridScene's own docstring. Anyone re-voicing from the header would say the wrong number.
- Cause: `script.ts:61`.
- Fix: Change it to `"error" in 4, ln(8/4) = 0.69`.
