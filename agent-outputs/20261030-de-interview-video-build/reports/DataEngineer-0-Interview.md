# DataEngineer-0-Interview (de-interview): builder report

**Length** 2:12.8 (`npm run cues -- de-interview`: 16 beats, 281 words, last word at 130.0 s + 2.6 s tail). **Voiced** 1,834 characters, Drew on `eleven_v4_turbo`, in 2 takes (take-1 `prompt`…`ai-code` 1,297 chars, 87.8 s; take-2 `series`…`next` 537 chars, 34.4 s). No re-voices. Plan figure ~1,600; this is +15%, inside ±20% and the 9,500 cap.

**Shape (its own opening):** three scenes. (1) The page's prompt "Design a pipeline *for X.*" as the headline, the meerkat (330x403 of 833x1017) standing lookout as "Expect it" is said, then the four things interviewers probe as a stack of four layers "from the query down to the files" (Advanced SQL, Data modeling, Pipelines & orchestration, Systems & formats), each filling with chips word by word, the layer being read in yellow, a down arrow labelled query/files. (2) AI: RAG ingestion drawn as a pipeline (parse → chunk → embed → index, a blue loop back "keep it fresh, incrementally, like any other pipeline"), title "Ingestion for RAG" with "retrieval-augmented generation" under it before "RAG" appears, over three cards (vector search trade-offs, governance for AI data, AI-written pipeline code ending on a yellow "ask the recruiter about each one"). (3) The series as a bar chart: eleven columns in track order, each hero riding up on a bar of its question count as "a hundred and fifty-seven questions" is said, SQL I/II and Modeling I/II marked as pairs, then how each video runs, the practice, and the bridge lighting Part 1 with `NextLine` "SQL, window functions and query patterns".

**Questions:** none answered (overview, no question cards), as the plan says. What it states, all from `index.mdx` or counted:
- "a level deeper than analyst screens on SQL", "design a pipeline for X", the four probes with their contents, the four AI changes: the page's own wording. Partitioning, listed under both pipelines and systems on the page, is said once (systems).
- 11 videos, 157 questions each answered once, SQL and data modeling two videos each: `PARTS` in `data.ts` (the only place the counts live). The pages ask 182 (`###` headings, counted); the plan's dedup takes them to 157.
- "most end on a quick round": 8 of 11 have rapid rounds (plan; the built scripts agree: none in SQL II, Warehousing, Pipelines for AI).
- Practice (`check.mjs` → `results.json`): concept checks on all 9 topic pages (23), runnable challenges on 3 pages (SQL 2, Python 2, Data warehousing 1), bank of 110. `check.mjs` also fails if the narration stops saying "eleven", "a hundred and fifty-seven", "three" or "a hundred and ten" for what the counts make, so a coordinator who moves a question in `PARTS` is told to re-voice `series`.
- Bridge: "Nearly every loop has hard sequel, so the series starts there. Next: sequel, window functions and query patterns." Softened from "opens with hard SQL": the page says "Expect hard SQL" but never that loops open with it (the DS review flagged the same kind of claim). The series starts with SQL because the track does.

**Series rules:** SQL written "sequel" in every beat (on screen SQL), AI never expanded, RAG expanded once ("retrieval-augmented generation, or RAG") and on screen only after it is said, `QUALIFY` written "qualify" in narration as da-advanced-sql does, pgvector said as "Postgres" (on screen "Postgres or a dedicated store"), no "A <initialism>" opener.

**Reused:** no scene. Furniture from `da-sql/parts.tsx` (Drift, Headline, Kicker, Mark, Mono, X0), as `ds-interview` takes it; `Spot` copied from `ds-sql/parts.tsx` (with a `phase` so eleven heroes don't bob in unison); the eleven heroes read from their own folders. `Video.tsx` cut pattern and `check.mjs → results.json → data.ts` chain from `ds-interview`.

**Checks (final code, voiced):**
- typecheck (full `tsc --noEmit`: 0 errors), eslint (my folder: clean), `check:cues` ✓, `npm test` 70 pass / 0 fail.
- `check:sync`: all 16 beats within ±0.12 s, worst +0.02 s (`probe-sql`).
- `check:motion`: ✓, 0 still stretches of 2 s or more in 2:12.8 (re-run on the final code; preview kept as `out/DataEngineer-0-Interview-preview.mp4`).
- `check:mix`: effects 30.7 LU under the narration (-50.7 against -20.0 LUFS), peak -31.1 dBFS (the meerkat's pop at 0:03.3), speech a median 28.7 dB above the effects where both sound, closest 13.4 dB (0:05.7, 50 ms).
- `check:frames`: ✓, 12 illustrations, largest stretch 0.79 (the meerkat, 330x403 of 833x1017); 5 arrows, 0.0° of bend under every head; no tabular hyphen; every cue names its occurrence.
- Stills every 2 s on the estimate and again on the voiced timing, looked at; fixed: an 8 px bar sliver before each bar grew (a padded zero-height box), a near-blank series opening (names now ink along the baseline on "follows the track"), a sparse RAG title stretch (now builds "Ingestion for / retrieval-augmented generation / RAG" with the words), the meerkat moved to "Expect it" so the hook's second sentence has an event.

**Notes and anything left:**
- Pacing: `expect` runs 3.3 words/s and `series-how` 3.2, a little over the brief's ~3.0 (short words; 18 and 17 chars/s). Not re-voiced; a `[slowly]` re-voice of either costs ~105 chars if a reviewer wants it.
- Effects are quiet (30.7 LU under), at the levels `ds-interview` uses (taps -31 to -37, pop -31, chime -34).
- Page: nothing wrong found in `index.mdx`. It lists "partitioning" under both pipelines and systems, which the video says once.
- The queue: my first chained sync/mix/frames job hit the 2 h background limit while waiting for the slot before `check:frames`; frames and motion were re-run, each queued on its own with a 2 h limit, and passed.
- Kit: nothing needed. One observation: a padded flex box at height 0 still draws its padding (`boxSizing: border-box` cannot shrink below padding), worth knowing for any bar that grows from zero.
- Frame 0 to 0.6 s is a white page (the kicker inks with the first word, as in `ds-interview`); if the thumbnail should show the headline, cue the kicker at frame 0.
- Files: `video/src/videos/de-interview/` (script.ts, Video.tsx, PromptScene.tsx, AiScene.tsx, SeriesScene.tsx, parts.tsx, data.ts, check.mjs, results.json), `video/public/narration/de-interview/` (16 MP3s + alignment.json), `video/takes/de-interview/` (take-1, take-2). Already in the coordinator's WIP commits; the tree was clean at hand-off.
- If a builder changes a count, edit `PARTS` in `data.ts`; if the total leaves 157, `node video/src/videos/de-interview/check.mjs` fails and `series` must be re-voiced (~150 chars).
