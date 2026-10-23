# Nlp-5-History fix pass

Review: `review/reports/Nlp-5-History.md` (1 P1, 5 P2, 9 P3). All 15 findings are addressed. Not committed.

## Findings

| # | P | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | Fixed | I kept the log-log plot for the law and added two linear 100% bars under Fig. 2. "Emma's 161,600 words: the top 100 make 60%" arrives on "sixty percent". "its 7,079 different words: 39% appear once" arrives on "nearly four in ten". The band now reads "top 100 of 7,079 words: 60% of the book". |
| 2 | P2 | Fixed | `law` is the reviewer's line: "...the second word turns up about half as often as the first, the tenth a tenth as often. On these log scales, that's a straight line: Zipf's law." Fig. 2 gains a ghost cell "law: ≈ 2,620" beside 5,201, cued to "half as often" rather than "almost tie", since the new line now states the prediction. It also gains a ghost row for rank 10 (she, 2,340, "law: ≈ 524") on "the tenth". Both axis titles say "log scale" and are marked on "log scales". The guide line draws on "straight line". |
| 3 | P2 | Fixed | Each IDF row has a note: "her weight, about log₂(200 ÷ n) + 1", giving 2.15 and 7.06. Both values are computed in `measure.py`. The script header records that her rule is base 2 plus one, where the course's log(N/df) is not. |
| 4 | P2 | Fixed | The Fig. 12 label and bars now build from "Remember". "great" turns blue on "unrelated columns". The four Fig. 11 dots arrive on "a point in space". |
| 5 | P2 | Fixed | I rewrote the booths prompt ("two small closed wooden booths standing well apart... with a wide empty gap", no tube, no note). I regenerated it through the Batch API: 1 image, batch `batch_6adb30c4e2a48190aa8682c85e7e0ea2`, completed and imported. After the restart I checked the batch was complete, so nothing was paid for twice. TuringScene is re-fitted to the new 1303x879 art: booth box, both doors and both wire ends. |
| 6 | P2 | Fixed | `flaw` has `pauseAfter: 1.1`. Query pills arrive on "search matched words": "a search for (a common word) and (a rare word)", in grey and blue, sitting above the two document rows. A new H1, "Every match counted the same.", holds the flaw before the fix. |
| 7 | P3 | Fixed | On "ninety" the flat "1 point" bars dim to 35% and become the "before". Her weights grow as new bars beside them. |
| 8 | P3 | Fixed | The card reads "Ranking word counts". `age` says "The oldest is over ninety." |
| 9 | P3 | Fixed | Shannon's hook is redrawn at every step, from word i to word i+1, so each "copy the one after it" gets its own hook. |
| 10 | P3 | Fixed | The first row is now `story: "zipf"` (1935), so all three rows date the layer that was kept. A header was added: "still underneath, and the year it came from". |
| 11 | P3 | Fixed (Shannon partly) | Georgetown: the headline is at `from + 2` and Fig. 7 at `wordsAt - 8`. Spärck Jones: the headline is at `from + 2`. Shannon: the first word of the sample and the Fig. 4 label arrive earlier, but the right of the frame is still lighter for the first few seconds. Headline turns now land with their leads in every scene. |
| 12 | P3 | Fixed | ELIZA: the Tag is at `PTOP + PH + 34` and the italic line at `y(856)`. |
| 13 | P3 | Fixed | `alpac` says "no near-term prospect". `analogy` says "the nearest other word is queen", and the on-screen tag reads "nearest other word: queen". The header records king at 0.799 when the inputs are not excluded. |
| 14 | P3 | Fixed | The close's figure is "Fig. 1 How the field got here: all seven stories". |
| 15 | P3 | Fixed | queen `dx={-42}`; the guide line ends at the last rank (7,079); the judge's wire starts at `[JX + 258, JTOP + 160]`; the opening zoom is 0.06. |

## Re-voicing

- 481 characters across 4 beats: `age`, `law`, `alpac`, `analogy`. Each was voiced on its own by a plain `npm run narrate -- nlp-history`: Hope, `eleven_v4_turbo`, no `--force`, no new take.
- The script is now 4,093 characters (cap 4,400).
- The new length is 319.9 s (5:20). It was 311.8 s.

## Checks

| Check | Result |
| --- | --- |
| tsc (locked full run, grep for my folder) | clean |
| eslint `src/videos/nlp-history` | clean |
| check:cues | clean for nlp-history |
| npm test | 59 of 59 pass |
| check:frames | pass. 4 images, largest stretch 0.95; 11 arrows, at most 0.0° of bend |
| check:sync | pass. Worst +0.06 s (`turing-out`, 2:19.2) |
| check:motion | pass. Nothing holds still for 3 s; the longest still is 2.5 s (it was a failing 4.3 s over `law` before the rank-10 row) |
| check:mix | pass. Effects 21.0 LU under the narration, speech a median 25.3 dB above them; the closest moment is 9.5 dB at 4:22.5 (the 6.1 dB at 3:06.1 is gone) |

I re-took stills at every changed moment and looked at each one: Zipf law, emma and tail; IDF query, before and after weights; vector paper card, dots and Fig. 12; booths; close; Georgetown and ELIZA openings. The last set is Zipf at 35-60 s with the rank-10 row and the two bars. Nothing collides: row 10 sits 45px above the first bar label, and the guide line stops short of the "7,079" tag.

## New since the review

- **A word2vec paper card** now carries the w2v beat's names and date, so its opening is no longer empty. It shows arXiv, January 2013, the title, the four authors and "Google". I checked these against the arXiv PDF and recorded them in the script header.
- **The rank-10 ghost row** was added because check:motion failed on a 4.3 s still over `law` (0:35.3-0:39.5) after the re-voice.
- **The ELIZA opening pop** moved 6 frames ahead of the scene's first word. The re-voice had shifted "Joseph" onto it, and the first post-fix mix put the speech only 6.1 dB above the effects at 3:06.1, the closest moment in the video. That reading is gone after the move.
- **Lesson prose vs. numbers:**
  - For Zipf, the video follows the measured counts: in Emma "to" and "the" nearly tie, where the law predicts half. The script header says so.
  - Spärck Jones's weights follow her paper (2 and 7), not the course's log(N/df) (0.80 and 4.20). The on-screen note shows how the two relate.
