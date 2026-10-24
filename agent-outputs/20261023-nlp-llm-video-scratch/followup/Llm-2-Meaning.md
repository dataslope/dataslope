# Llm-2-Meaning: follow-up pass

One item, review finding #6, which the fix pass left partly done. It is now **done**. Finding #7 is closed, as the coordinator said. Nothing committed.

## Item

| # | Result | What changed |
| --- | --- | --- |
| 6 | done | `embedding` is trimmed and re-voiced on its own with `[slowly]`, the same way `vector` was. Its pause after goes from 0.9 s to 1.0 s. |

Finding #6 in detail:

- **Old text:** "That list is the token's embedding, looked up in a table the model learned in training." 16 words in 4.47 s: 3.6 words a second.
- **New text:** "[slowly] That list is the token's embedding: its row in a table learned in training." 14 words in 5.89 s: **2.4 words a second**. `vector` runs at 2.4 words a second, so the two definitions now share one pace.
- **Breaks:** the colon gives a natural 0.39 s break after "embedding".
- **Breath:** after the beat's last word, the gap to the next scene's first word is 1.6 s. That is 0.4 s of tail in the clip, the 1.0 s pause, then the scene change.
- **Why "its row in a table":** it says what Fig. 2 shows on screen, Berry's highlighted row in the embedding table. It also agrees with the note under the table, "Every row learned in training".
- **No scene edits:**
  - The beat's three cues ("embedding", "table", "learned") are each still said once, so they now land later, on the slower audio.
  - Stills at 33.3, 36.5, 38.3, 39.7 and 41.2 s show the "Berry's embedding" label arriving on "embedding", the table rows on "table", and the note on "learned". Nothing overlaps.
- **No new numbers.** measure.py, measurements.json and data.ts are untouched.

## Voice

- **Re-voiced: 84 characters** (cap 300), one beat (`embedding`), voiced on its own with a plain `npm run narrate -- llm-meaning`.
- No `--force`, no new take, no recut.
- The narrator printed "first word starts -0.21 s from its character time". That is the expected `[slowly]` onset correction (`placeOnset`), and check:sync confirms it.

## Length and checks

- **Length:** 6:48.0 (408.0 s), up 1.5 s from 406.5 s. 62 beats.
- **Typecheck:** clean.
- **Lint (folder):** clean.
- **`check:cues`:** pass. Every word cue in every video now resolves; the failures in other folders noted last time are gone.
- **`npm test`:** 59 pass, 0 fail.
- **`check:sync`:** pass. 62 beats, worst +0.04 s (`docs`). `embedding` is therefore within 0.04 s of its cue.
- **`check:frames`:** pass. 4 illustrations, largest stretch 0.92; 13 arrows, 0.0° of bend.
- **`check:motion`:** pass. Longest still stretch 2.5 s (`query-vec`/`key`, `key`/`value`, `docs`/`query`, `top`/`next`). Nothing still near the slowed beat.
- **`check:mix` (informational):**
  - Effects sit 25.5 LU under the narration; their peak is -21.1 dBFS (the logo).
  - Speech is a median 27.3 dB above the effects (5th percentile 10.2 dB).
  - The closest moment now reads 8.0 dB at 2:48.1, against 12.0 dB at the same tap (then at 2:46.6) last time.
  - This is not a real change. Every beat after `embedding` moved by the same number of frames, together with its effects, so the soundtrack is identical, only 1.5 s later.
  - The check reads 50 ms windows on a fixed grid. Re-reading those moments with the window shifted 10 to 40 ms gives 8.0 to 33.5 dB at 2:48.1, and 7.3 to 29.3 dB at 4:26.8. Scratch script: `$S/Llm-2-Meaning/phase.py`.
- **Stills:** five frames across the beat and into the next scene, all clean. They are in `$S/Llm-2-Meaning/followup/`.

## Note

Commit 8266f1d (the coordinator's checkpoint) already contains this change: script.ts, alignment.json and embedding.mp3.
