# DataEngineer-0-Interview (2:13)

## Verdict
- A clean, legible overview in three scenes (the prompt over a four-layer stack, the AI changes as a RAG row over three cards, the series as a bar chart of its eleven videos), each built word by word with the narration. Nothing overlaps or clips. The smallest type is the 19px "Part N" label, and every finished scene holds 1.8 to 3 s before its cut.
- Every number checks out. 157 is the sum of `PARTS`, and each of the eleven counts matches its own video's script header (22, 10, 15, 15, 18, 11, 17, 15, 9, 14, 11). 8 of 11 videos have a `RapidScene` ("most end on a quick round"). I recounted the pages: concept checks on all 9 topic pages, challenges on 3 (sql, python, data-warehousing), and 110 `<MultipleChoice>` blocks in the bank. The probes and the four AI changes follow `index.mdx` nearly word for word.
- The two problems that matter both involve something the video sets up and leaves unclear. The headline prompt "Design a pipeline for X." is raised as the hook and never returned to, and no video in the series answers it in general. The "two videos each" highlight on SQL and modeling merges into one block over Parts 1-4.
- Pacing is comfortable: 1.75 to 2.9 words/s except `expect` (3.31) and `series-how` (3.16), with gaps of 0.55 s or more. There are two slack stretches: the AI scene opens on a nearly empty page for about 9.5 s, and the close holds a still chart for about 7.5 s.
- As an orientation it is faithful to the page, but it lists about 30 unglossed terms and never says which part answers which. It also turns pgvector into plain "Postgres" and draws "keep it fresh incrementally" as a full loop.

## Findings

### 1. [P2] answer: the opening prompt "Design a pipeline for X." is raised and dropped
- When: 0.6-10.1 s, beats `prompt` and `expect` (frames element-002.jpeg, element-009.jpeg). Never revisited through 132.6 s.
- What: The video opens on the prompt as its headline, and `expect` tells the viewer to expect it. At 10.1 s the headline inks out for "Four things," and neither the narration nor the screen comes back to it. Nothing says what a design answer covers, and nothing points to where the series works one through. The only full design walk-through in the series is Part 11's question 2, "Walk through the ingestion pipeline for a RAG assistant". The AI scene calls RAG ingestion "a system design prompt" but never connects it to the opening.
- Why it matters: the first thing the viewer is told to expect is the one prompt the overview gives them nothing for, and no topic video answers "design a pipeline for X" in general.
- Cause: `video/src/videos/de-interview/script.ts:61-71` (beats `prompt`, `expect`, `probe`); `video/src/videos/de-interview/PromptScene.tsx:109` (the prompt's `Headline` goes out at `fourAt - 10` and nothing restates it).
- Fix: add a beat `probe-design` after `probe-store`, and move `probe-store`'s `pauseAfter: 0.8` onto it: "A design-a-pipeline question draws on all four layers at once. The series builds each layer, and Part eleven walks one design through, end to end." On screen, cue a 2px `INK_SOFT` vertical bracket at x = 1470 to "all four layers", spanning `bandY(0)` to `bandY(3) + h(BAND_H)`. Beside it, at left 1490 and top `bandY(2) + 20` (free space under the meerkat), set "design a pipeline for X" in `body(30, true)`, with "Part 11 walks one through" under it in `label(20, BLUE_INK)`.

### 2. [P2] confusion: the SQL and modeling pair highlights touch and read as one block over Parts 1-4
- When: 100.9-105.7 s, beat `series` ("Sequel and data modeling take two videos each") (frames element-103.jpeg, element-104.jpeg).
- What: The SQL pair's yellow box ends at x ≈ 414 and the modeling pair's box starts there. Pixel row y = 860 is unbroken yellow from x 395 to 430, so the two boxes form one stepped shape across four columns while the narration says "two videos each".
- Why it matters: the figure's whole point is two pairs, and it shows one group of four.
- Cause: `video/src/videos/de-interview/SeriesScene.tsx:104-106`. Each box starts 4px left of its first column and ends 4px past its last, and the column `GAP` (line 13) is 8px, so neighbouring pairs meet exactly.
- Fix: inset the boxes instead of extending them: `left: colX(pr.a) + 4` and `width: colX(pr.b) + COL_W - colX(pr.a) - 8`. That leaves a 16px white gap between the pairs, and the 140px heroes still fit inside the 148px columns.

### 3. [P3] explanation: about 30 terms, no map to the part that answers each, and RAG never said to do anything
- When: 14.4-46.0 s, beats `probe-sql` to `probe-store` (element-046.jpeg), and 51.1-92.0 s, beats `ai-rag` to `ai-code` (element-092.jpeg).
- What: The stack and the cards list QUALIFY, gaps and islands, incremental logic, slowly changing dimensions, idempotency, backfills, lakehouse, chunk, embed, index, approximate search, metadata filters, hybrid keyword search and schema drift, with no gloss. A list is fine in a table of contents, but nothing ties it to the contents: the layers and the AI cards never meet the Parts chart. The page's own pointer, "Pipelines for AI covers these questions in depth", is dropped. RAG is expanded but never said to do anything, so "parse, chunk, embed, index" and "deletions that reach the vectors" are opaque to a viewer who has not built one.
- Why it matters: an overview's job is to tell a viewer where to go, and here the viewer cannot tell which of the eleven videos answers the term they are worried about.
- Cause: `video/src/videos/de-interview/PromptScene.tsx:183` (each layer shows its name only); `video/src/videos/de-interview/script.ts:92` (`ai-rag`) and `:105` (`ai-code` ends without the page's pointer).
- Fix: under each layer name, add its parts in `label(20, BLUE_INK)`, cued with the layer: "Parts 1-2", "Parts 3-4", "Parts 6, 8, 10", "Parts 7, 9". A two-line name plus this label is about 96px of the band's 128. End `ai-code` with "Part eleven works through each of these." In `ai-rag`, gloss RAG once: "…retrieval-augmented generation, or RAG, where a model answers from documents it looks up, is now…". Re-voice `ai-rag` and `ai-code`.

### 4. [P3] spacing: the AI scene opens on a nearly empty page for 9.5 s
- When: 47.6-57.1 s, beats `ai` and `ai-rag` (frame element-055.jpeg). Also 93.6-95.7 s at the start of `series` (element-095.jpeg), and 0-0.6 s, the video's first frame (element-000.jpeg).
- What: Until "parse" at 57.1 s, the AI scene is just its headline plus, from 51.1 s, the three-line label at the left (x 100-480). The right three quarters of the page stay white while RAG is named and called a design prompt. It is also the only scene with no watercolor spot. The series scene shows only a kicker and a baseline for 2 s, and frame 0 is a blank page, so a poster frame shows nothing.
- Why it matters: the narration describes a pipeline that could already be on screen.
- Cause: `video/src/videos/de-interview/AiScene.tsx:134-136` (each step box waits for its own word); `video/src/videos/de-interview/SeriesScene.tsx:84` (the headline waits for "eleven videos"); `video/src/videos/de-interview/PromptScene.tsx:108` (the kicker is cued to `from`, 0.6 s).
- Fix: at `ingestAt` (51.1 s), draw the four step boxes as empty dashed outlines (`HAIRLINE` at 50% opacity, no text), and fill each one with blue and its word on its cue as now. Cue `PromptScene`'s `Kicker` at frame 0.

### 5. [P3] accuracy: "Postgres or a dedicated store" drops pgvector
- When: 66.4-67.7 s, beat `ai-vector`, on screen until 93 s (frames element-069.jpeg, element-092.jpeg).
- What: Narration and card both say "Postgres or a dedicated store". The page says "pgvector versus a dedicated store". Postgres does not do vector search without the pgvector extension, and Part 11 asks "Should you use pgvector or a dedicated vector database?" in those words.
- Why it matters: a candidate who says "just use Postgres" gets the obvious follow-up ("with what?"), and the overview's term will not match Part 11's.
- Cause: `video/src/videos/de-interview/AiScene.tsx:191`; `video/src/videos/de-interview/script.ts:97`.
- Fix: on screen, "Postgres (pgvector) or a dedicated store". In the narration, "Postgres with its vector extension, or a dedicated store". Re-voice `ai-vector`; the cue becomes `"Postgres with its vector extension"`.

### 6. [P3] other: "personal data kept from outside / embedding APIs" reads backwards at its line break
- When: 77.5-93 s, beat `ai-gov` (frame element-092.jpeg).
- What: The card line wraps after "outside", so the first line reads as a complete phrase: personal data kept *from outside sources*. The page's wording is "kept away from external embedding APIs".
- Why it matters: it is the one governance rule a candidate should state crisply, and the screen invites the opposite reading.
- Cause: `video/src/videos/de-interview/AiScene.tsx:198`; `video/src/videos/de-interview/script.ts:101`.
- Fix: use the page's wording on screen and in the narration: "personal data kept away from external embedding APIs". It wraps as "…kept away from external / embedding APIs", which cannot be misread. The cue becomes `"personal data kept away"`.

### 7. [P3] confusion: "keep it fresh, incrementally" is drawn as a full loop from index back into parse
- When: 60.0-62.4 s, beat `ai-rag`, on screen until 93 s (frames element-062.jpeg, element-092.jpeg).
- What: The blue loop runs out of "index" and back up into "parse", which says the index's output gets parsed again. Incremental freshness means re-running the steps on new and changed source documents only, and deleting removed ones (Part 11's question 4). The loop draws a full re-cycle, the opposite of incremental, and "parse" has no source to read from.
- Why it matters: "how do you keep it fresh without re-embedding everything?" is the follow-up an interviewer asks, and the figure suggests the wrong answer.
- Cause: `video/src/videos/de-interview/AiScene.tsx:103-108` and `:174` (the loop path from `stepX(3)` back to `stepX(0)`).
- Fix: replace the loop with a short arrow into "parse" from above: `Flow` from `[stepX(0) + STEP_W / 2, top - 70]` to `[stepX(0) + STEP_W / 2, top - 6]`, cued to `freshAt`. To its right, at y `top - 84`, add "only new and changed documents" (`note(24, INK)`). Keep the caption "keep it fresh, incrementally, like any other pipeline" under the row. There is about 130px free between the headline and the row.

### 8. [P3] explanation: "each answered once", "worth a figure" and "3 pages" are left without context
- When: 99.0-125.8 s, beats `series`, `series-how` and `practice` (frames element-103.jpeg, element-120.jpeg).
- What: "each answered once" goes into the headline with no reason given. It only makes sense if you know that the pages ask 182 questions and some pages repeat others. "The questions worth a figure" is an opaque way to say "the harder questions, drawn out". "3 pages: challenges that run in the browser" never says which three (SQL, Python, Data warehousing).
- Why it matters: each is a claim the viewer cannot check or act on.
- Cause: `video/src/videos/de-interview/script.ts:111`, `:116`, `:121`; `video/src/videos/de-interview/SeriesScene.tsx:90-92`, `:224`, `:240`.
- Fix: in `series`, replace "each answered once" with "where two pages ask the same one, it's answered once", or cut the phrase from both narration and headline. In `series-how`, say "Each video works through the harder questions with a figure, and most end on a quick round of one-line answers." On screen, change line 240 to "SQL, Python and warehousing pages: challenges that run in the browser". It still fits on one line at 28px.

### 9. [P3] pacing: the close holds a still chart for about 7.5 s across "Nearly every loop has hard sequel"
- When: 116.9-124.5 s, the end of `practice` and the first sentence of `next` (frame element-117.jpeg; the tile holds 8 s).
- What: Once the bank line inks in at 116.9 s, nothing new arrives until Part 1 lights on "the series starts there" (124.6 s). The narration's claim about hard SQL has no visual event.
- Why it matters: the bridge's reason passes over a frozen frame.
- Cause: `video/src/videos/de-interview/SeriesScene.tsx:133-134` (`lit` and `dim` are both keyed to `startsAt`).
- Fix: light Parts 1 and 2 (`i <= 1`) with the column highlight at `n.word("next", "hard sequel")` (123.4 s), then narrow to Part 1 and dim Part 2 with the rest on `startsAt`.

### 10. [P3] pacing: `expect` runs at 3.31 words/s while three things arrive
- When: 3.3-9.1 s, beat `expect` (frames element-004.jpeg, element-007.jpeg). `series-how` (104.7-110.7 s, 3.16 words/s) is the other fast beat.
- What: In under 4 s the meerkat pops in (3.3 s), the "Advanced SQL" band inks in yellow (5.6 s) and the italic "a level deeper than an analyst screen" appears (6.8 s). The narration carrying them is the tangled clause "next to sequel that goes a level deeper than an analyst screen".
- Why it matters: it is the video's first claim about the interview, and it is the fastest and hardest-to-parse sentence in it.
- Cause: `video/src/videos/de-interview/script.ts:62-66`; `video/src/videos/de-interview/PromptScene.tsx:40-43` and `:115`.
- Fix: split the beat into `expect`, "Expect it in a data engineer interview." with `pauseAfter: 0.5`, and `expect-sql`, "Next to it, sequel a level deeper than an analyst screen asks." Re-cue `sqlAt` and `deeperAt` to `expect-sql`.
