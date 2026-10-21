# Course video fixes: Statistics and Database Design

**Follows:** [the review](20261021-0551-course-video-review.md) of the 18 course unit videos (378 findings: 24 P1, 156 P2, 198 P3).
**Result:** 359 fixed, 18 partly fixed, 1 skipped. Every video passes `check:frames`, `check:motion` and `check:sync`, and the package passes `typecheck`, `lint`, `npm test` (57/57) and `check:cues`.
**Voice:** only new or reworded sentences were voiced, at the user's request: 52 beats, about 5,340 characters in all, each sent on its own. No take was recorded again (`takes/` is unchanged). An audit of every course video's `alignment.json` against the pre-fix commit finds no beat whose audio changed while its text stayed the same. Five beat splits were cut from the existing takes with `narrate --recut` and sent nothing.

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
| Stats-6 Estimation | 20 | 19 fixed, 1 partly | 329 chars, 3 beats (two splits re-cut) | 6:00 → 6:27 |
| Stats-7 TestingHypotheses | 44 | 41 fixed, 3 partly | 70 chars, 2 beats | 10:01 → 10:24 |
| Stats-8 InterpretingResults | 18 | 17 fixed, 1 partly | 775 chars, 7 beats | 6:32 → 7:10 |
| Stats-9 StatisticsInPractice | 17 | 16 fixed, 1 partly | 777 chars, 9 beats | 4:51 → 5:26 |
| DbDesign-1 WhyDesign | 20 | 19 fixed, 1 partly | 134 chars, 1 beat | 2:56 → 3:14 |
| DbDesign-2 Entities | 11 | 11 fixed | 657 chars, 4 beats | 2:54 → 3:23 |
| DbDesign-3 Relationships | 12 | 11 fixed, 1 skipped | 263 chars, 2 beats | 3:08 → 3:22 |
| DbDesign-4 Keys | 16 | 15 fixed, 1 partly | none | 3:40 → 3:46 |
| DbDesign-5 RelationshipPatterns | 16 | 15 fixed, 1 partly | none (one split re-cut) | 4:05 → 4:11 |
| DbDesign-6 Constraints | 19 | 16 fixed, 3 partly | 298 chars, 4 beats | 4:07 → 4:21 |
| DbDesign-7 Normalization | 20 | 19 fixed, 1 partly | 101 chars, 1 beat | 4:33 → 4:43 |
| DbDesign-8 DesigningSchemas | 20 | 19 fixed, 1 partly | 176 chars, 2 beats | 4:33 → 4:49 |
| DbDesign-9 RelationalHistory | 17 | 17 fixed | 207 chars, 3 beats | 3:38 → 3:52 |

The 18 videos run 105.8 minutes, up from 99.8: pauses after definitions and results, and the beats added to explain what the review found unexplained.

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

**Left for a voicing decision.** Each of these needs a beat re-voiced whose words don't change, which the user ruled out:
- Stats-6: the 53 s from the rate interval to the formula hand-off still runs at about 3 words a second (longer pauses and two new beats were added).
- Stats-9: the 13.4 s `sin` beat stays one beat; the missing reasoning is a new beat after it.

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

**Skipped.** DbDesign-3's figure numbering (finding 12) is a series-wide call, not a per-video fix. See decision 1 below.

## Decisions for the user

1. **Figure numbering in Database Design.** Units 1, 3, 7, 8 and 9 number their figures; Units 2, 4, 5 and 6 don't. In the fix pass DbDesign-6 dropped its two lone numbers, DbDesign-4 dropped its lone "Fig. 1", and DbDesign-8 numbered all of its own. Pick one rule for the course. (The Statistics course numbers every figure.)
2. **New material beyond the lessons.** It was all run or sourced, but it is new. Confirm or cut:
   - DbDesign-3: two `devices` rows (the lesson has no devices data), run through PGlite.
   - DbDesign-9: a POSTQUEL query and a "your own types" panel, from Stonebraker and Rowe's memo M85/95 (already in the script's sources).
   - Stats-4: a dashed negative-binomial outline for "real counts swing wider", labelled as the video's illustration.
   - DbDesign-1: a notation key on Fig. 3 and Fig. 4.
3. **Kit follow-ups (optional).**
   - DbDesign-1's notation key (`FigKey`, `EndGlyph`) could move to `editorial/erd.tsx`, so DbDesign-2 and -3 could show the same key.
   - `NextLine` could take a no-prefix option, which Unit 5's merged `Bridge` re-implements.
4. **The two fast stretches** above, if re-voicing unchanged beats becomes acceptable.

## Sound effects

Agents added and moved effects beside the animations they belong to, each cued from the same frame as its animation. `check:mix` (informational; about 15 LU under the narration reads as subtle) measured every video after the fixes:

- **Statistics:** effects 19.2 to 21.4 LU under the narration; speech a median 22 to 25 dB above them where both sound.
- **Database Design:** 21.7 to 24.8 LU under; speech a median 25 to 28 dB above.

No video's effects are louder than the series' subtle bar. The quietest margin, the 5th percentile of speech over effects, is 6.0 dB, in the merged Unit 5 video.
