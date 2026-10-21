# Course video fixes: Statistics and Database Design

**Follows:** [the review](20261021-0551-course-video-review.md) of the 18 course unit videos (378 findings: 24 P1, 156 P2, 198 P3).
**Result:** 362 fixed, 16 partly fixed, none skipped (359, 18 and 1 at the end of the fix pass; the three decisions in [After the fix pass](#after-the-fix-pass) closed the rest). Every video passes `check:frames`, `check:motion` and `check:sync`, and the package passes `typecheck`, `lint`, `npm test` (57/57) and `check:cues`.
**Voice:** only new or reworded sentences were voiced, at the user's request: 52 beats, about 5,340 characters in all, each sent on its own. No take was recorded again (`takes/` is unchanged). An audit of every course video's `alignment.json` against the pre-fix commit finds no beat whose audio changed while its text stayed the same. Five beat splits were cut from the existing takes with `narrate --recut` and sent nothing. After the pass, with the user's go-ahead, 13 more beats whose words did not change were re-voiced slowly (about 1,230 characters; see [After the fix pass](#after-the-fix-pass)).

## Shared changes

Made once, in the kit, before the per-video work:

- **A pause floor.** `minPause` on a script is a floor under every beat's `pauseAfter`. Every course script sets `COURSE_MIN_PAUSE` (0.55 s, `video/src/editorial/course.ts`); `course.test.ts` checks it. This is the review's first series-wide problem: 50 to 77% of beat gaps were 0.45 s or less. Beats that define a term or land a result then took longer pauses of their own, video by video.
- **Hyphens.** `note()` sets lining figures only. Inter's tabular figures had set every hyphen a digit wide ("p - value"). Counters and number columns take `TABULAR` instead.
- **Unit 5 figure numbers.** `useFigNumber()` (`video/src/videos/sampling/merged.ts`) carries each part's count on in the merged video, which now numbers Fig. 1 to 27 once.
- **ERD.** `<Entity>` takes `keyAt`, so a key badge can wait for the word that names it; DbDesign-8 uses it. Header anchors now meet the header's true middle.
- **Already in PR #711:** a white page for every video, and full-height last rows in ERD boxes.

## Per video

| Video | Findings | Result | Voiced | Length |
| --- | --- | --- | --- | --- |
| Stats-1 ThinkingStatistically | 24 | 24 fixed | 174 chars, 2 beats | 5:34 → 5:45 |
| Stats-2 DescribingData | 25 | 25 fixed | 743 chars, 6 beats | 7:20 → 7:59 |
| Stats-3 Probability | 20 | 20 fixed | 97 chars, 1 beat (one split re-cut) | 7:33 → 7:52 |
| Stats-4 Distributions | 25 | 23 fixed, 2 partly | 317 chars, 2 beats | 7:32 → 7:47 |
| Stats-5 Sampling (both halves) | 34 | 32 fixed, 2 partly | 220 chars, 3 beats (one split re-cut) | 10:51 → 11:19 |
| Stats-6 Estimation | 20 | 20 fixed | 329 chars, 3 beats (two splits re-cut); 9 more re-voiced slowly | 6:00 → 6:36 |
| Stats-7 TestingHypotheses | 44 | 41 fixed, 3 partly | 70 chars, 2 beats | 10:01 → 10:24 |
| Stats-8 InterpretingResults | 18 | 17 fixed, 1 partly | 775 chars, 7 beats | 6:32 → 7:10 |
| Stats-9 StatisticsInPractice | 17 | 17 fixed | 777 chars, 9 beats; 4 more re-voiced slowly | 4:51 → 5:30 |
| DbDesign-1 WhyDesign | 20 | 19 fixed, 1 partly | 134 chars, 1 beat | 2:56 → 3:14 |
| DbDesign-2 Entities | 11 | 11 fixed | 657 chars, 4 beats | 2:54 → 3:23 |
| DbDesign-3 Relationships | 12 | 12 fixed | 263 chars, 2 beats | 3:08 → 3:22 |
| DbDesign-4 Keys | 16 | 15 fixed, 1 partly | none | 3:40 → 3:46 |
| DbDesign-5 RelationshipPatterns | 16 | 15 fixed, 1 partly | none (one split re-cut) | 4:05 → 4:11 |
| DbDesign-6 Constraints | 19 | 16 fixed, 3 partly | 298 chars, 4 beats | 4:07 → 4:21 |
| DbDesign-7 Normalization | 20 | 19 fixed, 1 partly | 101 chars, 1 beat | 4:33 → 4:43 |
| DbDesign-8 DesigningSchemas | 20 | 19 fixed, 1 partly | 176 chars, 2 beats | 4:33 → 4:49 |
| DbDesign-9 RelationalHistory | 17 | 17 fixed | 207 chars, 3 beats | 3:38 → 3:52 |

The 18 videos run 106.0 minutes, up from 99.8: pauses after definitions and results, and the beats added to explain what the review found unexplained.

## The 24 P1s

All are fixed. The ones whose fix is worth knowing:

- **DbDesign-1:** Fig. 4 is now "Another shop", and Fig. 5's note says what this shop's data holds ("Grace bought a backpack"), from `check.mjs`.
- **DbDesign-7:** the lesson itself searches for 555-2200, so the data could not change; `search` was re-voiced to say "twenty-two hundred".
- **Stats-8:** the checkout lift now has its own interval (+0.3 to +2.1 points, p = 0.013), computed in `measure.py` the way ab-testing.mdx does; the d = 0.36 from another experiment is gone. The Berkeley departments are labelled made up, on screen and aloud.
- **Stats-3:** the "five heads in a row" coins land on a real run of five heads (flips 21 to 25), which `measure.py` now exports.
- **Stats-7:** the ANOVA figure's within bars are ±SD/√40, so "between" visibly dwarfs them, and a new beat gives F's baseline ("hovers near one").
- **Stats-2:** a separate "another center" line swings while the sample mean stays put and labelled, with 404.6 as the fixed reference.

## What was not done, and why

Each report in [`20261021-course-video-review/`](20261021-course-video-review/) is the list of findings; the reasons below are the agents', checked by the coordinator.

**Layout limits.**
- DbDesign-1: the program chips can't sit under the building's four doors.
- DbDesign-6: chips and errors stay at 20 and 22 px (24 px collides with neighbouring tables).
- DbDesign-7: the summary's five-line build query doesn't fit; its label now says "summed per day".
- DbDesign-8: the opening's right half stays empty, because the step list builds there.
- Stats-7: no ±1 SD whiskers on the broken queue axis, which a whisker would cross.

**Kept on purpose.**
- Stats-4 keeps the lesson's constructor captions (`binom(200, 0.03)`).
- DbDesign-5 keeps the FK badge from the start, as the lesson's ERD does.
- DbDesign-6 keeps different order_items columns in two scenes, because each comes from its own lesson SQL.
- Stats-8 shows "d = 0.009" before naming Cohen's d, with its definition on the line beneath.
- Stats-5 does not give Gallup's 1936 sample size: the lesson has none and the sources disagree (50,000 against 125,000).

## After the fix pass

The fix pass left three decisions with the user. All three are settled.

1. **Figure numbering: every video numbers its figures.** Database Design Units 2, 4, 5 and 6 had none, so each now labels its figures "Fig. N" with a title, numbered in order of first appearance. Each label arrives with its figure and leaves or dims with it. Where a video already had a plain caption, the caption became the title. Room was made by moving a figure 18 to 74 px down where a label needed its own line. No narration changed.
   - DbDesign-2 Entities: 12 figures.
   - DbDesign-4 Keys: 12 figures.
   - DbDesign-5 RelationshipPatterns: 20 figures. Each part's closing preview of the next shape is one of Fig. 2's four panels returning, so it is labelled "Fig. 2" again.
   - DbDesign-6 Constraints: 14 figures.

   A returning figure keeps its number, as DbDesign-7's Fig. 1 already did. Both courses now follow one rule, and DbDesign-3's finding 12 is fixed with it.
2. **New material beyond the lessons: kept.** The user accepted all four additions (the DbDesign-3 `devices` rows, DbDesign-9's POSTQUEL query and types panel, Stats-4's negative-binomial outline, DbDesign-1's notation key).
3. **The two fast stretches: re-voiced slowly.** The words are unchanged. The beats were re-voiced with ElevenLabs' `[slowly]` audio tag, because `eleven_v4_turbo` ignores the `speed` setting. That is 13 beats, each voiced on its own, about 1,230 characters; no take was recorded again.
   - **Stats-6:** the rate interval to the formula hand-off (nine beats) went from 2.9-3.2 words a second to 2.5-2.8.
   - **Stats-9:** `sin` is split at its sentence break into `sin` and `tilt`, and `sin`, `tilt`, `luck` and `lie` are slowed the same way.
   - **Sync:** a beat voiced on its own used to start its alignment at the tag, not at the first sound. `narrate` now places such a beat's first word from the audio, and `narrate --onsets` re-places existing beats with no API call. `check:sync` passes both videos (worst +0.11 s and +0.07 s).
   - **Motion:** the slower `sin` beat left Stats-9's wall scene still for 3.0 s, so the wall now thickens on "between them". `check:motion` passes both videos (longest still 2.3 s and 2.8 s).

**Optional kit follow-ups, not done:**
- DbDesign-1's notation key (`FigKey`, `EndGlyph`) could move to `editorial/erd.tsx`, so DbDesign-2 and -3 could show the same key.
- `NextLine` could take a no-prefix option, which Unit 5's merged `Bridge` re-implements.
- DbDesign-2 widened `FigLabel` locally (its `Fig` in `kit.tsx`) so a title can hold `<Mono>` code. The shared `FigLabel` could take that.

## Sound effects

Agents added and moved effects beside the animations they belong to, each cued from the same frame as its animation. `check:mix` (informational; about 15 LU under the narration reads as subtle) measured every video after the fixes:

- **Statistics:** effects 19.3 to 21.4 LU under the narration; speech a median 22 to 25 dB above them where both sound. (Stats-6 and Stats-9 were measured again after their slow re-voice: 19.3 and 19.6 LU under.)
- **Database Design:** 21.7 to 24.8 LU under; speech a median 25 to 28 dB above.

No video's effects are louder than the series' subtle bar. The quietest margin, the 5th percentile of speech over effects, is 6.0 dB, in the merged Unit 5 video.
