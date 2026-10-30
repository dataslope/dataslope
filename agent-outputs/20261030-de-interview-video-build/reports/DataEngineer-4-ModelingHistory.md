# DataEngineer-4-ModelingHistory (de-modeling-history): report

**Length** 8:34.5 (514.5 s, `npm run cues`), 44 beats, 1,273 words. **Voiced** by Drew on eleven_v4_turbo in 5 takes, 7,146 characters (plan ~6,500, inside ±20%); no re-voices. Timing edits after voicing were pauses only (rapid beats `pauseAfter` 0.6 to 1.0), free.

**Answered, by the page's headings** (data-modeling.mdx), deep dives numbered aloud:
1. How do you preserve history when a dimension attribute changes (SCD)? (with data-warehousing.mdx's "How do slowly changing dimensions preserve history? (recap)"; the card drops "(SCD)", the answer expands it)
2. How does SCD Type 2 work in practice?
3. What is SCD Type 0?
4. What are slowly-changing dimension types 4 and 6?
5. How do you handle late-arriving dimension members?
6. What is a snapshot vs insert-only fact table strategy? (read "versus")
7. What is a bridge table and when do you need one?
8. How do you model a many-to-many relationship between facts and dimensions?
9. What is a data vault, and when would you choose it over a star schema?
Quick round (10-15 on screen): degenerate dimension; junk dimension; role-playing dimension; mini-dimension; factless fact table; surrogate key sequence vs UUID. None of the 15 skipped; the other 15 modeling questions are Part 3's.

**Answers one step past:** Type 1 kept for typos; Type 2's ranges checked for no overlap and no gap (0 bad seams of 9) and the key stored on the fact at load; Type 0 as insert-once (ON CONFLICT DO NOTHING) and SCD types chosen per column; Type 6's cost (every move rewrites current_city on old rows); late member: the inner join silently drops the order (700.00 of 1,110.00), placeholder filled in place, shared -1 row needs re-keying; snapshot rebuildable from the log, not the reverse; bridge weight, and unweighted totals never summed; vault + stars on top; UUID v7.

**Facts** (check.mjs → results.json → data.ts): DuckDB v1.4.3 (DuckDB-Wasm 1.32.0) on the page's own dim_customer and 24 orders for the SCD scenes (customer 42, Boston → Austin 2024-03-15; page's close+insert rebuilds the page's 24 rows; 24 of 24 orders match one version); video's own small labelled tables elsewhere. UUID index sizes in Postgres 18.3 (PGlite), on screen as such: 100,000-row PK index 2.26 MB sequence, 4.42 MB random UUID (1.96x, "almost twice"), 3.18 MB uuidv7. Random UUIDs are md5(row)::uuid so the run repeats (noted in the header). data.ts throws if the narrated relations stop holding.

**Reused:** BridgeScene copies DbDesign-5's junction diagram (db-relationship-patterns/JunctionScene.tsx: three entities, two one-to-manys into the middle), re-cued; tables, marks, strikes, KeyArrow, Drift/Headline/Kicker re-exported from da-sql/da-advanced-sql parts (ds-sql's pattern); Spot and lineOf as in ds-sql; ERDs from erd.tsx. No DA/DS page asks these questions, so no results.json imported.

**Checks (final code):** tsc and eslint clean for the folder; `check:cues` no findings for the folder; `npm test` 70/70. check:motion: FRAMES_MOTION. check:sync: worst +0.03 s (type2-insert); plan and scd reported "no pause before them, unchecked". check:mix: effects 30.8 LU under the narration (-50.5 vs -19.7 LUFS), peak -34.1 dBFS, speech a median 29.6 dB over effects (5th pct 15.1). check:frames: FRAMES_RESULT. Stills of every scene on the voiced timing looked at (two passes on estimate, one on voice, one after the last fixes).

**Page issues (not edited):**
- "How does SCD Type 2 work in practice?": the page's INSERT names no `customer_key`, so in DuckDB the new Austin version gets customer_key NULL (run in check.mjs, figure `pageInsert`), though the page's own text says each version gets a new surrogate key; it also uses CURRENT_DATE, so its result depends on the day. The video runs the same two statements with the page table's dates and key 1087.
- Type 4 is defined as "a mini-dimension or history table"; the video uses the history-table reading and covers mini-dimensions as their own item.

**Kit notes:** da-sql's `Listing` tokenizer has no UPDATE, SET, INSERT, INTO, CREATE, ALTER, ON CONFLICT, DO NOTHING and colours `true`/`false` as names; copied locally with those added (parts.tsx). The shared kit could take them. Render queue: flock is not first-come; a 2-hour job was killed waiting, rerun.

**Left undone:** nothing known.
