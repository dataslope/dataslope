# DataAnalyst-0-Interview: fixes

Folder `video/src/videos/da-interview/`. Review report:
`agent-outputs/20261029-da-interview-video-review/DataAnalyst-0-Interview.md`
(0 P1, 2 P2, 13 P3). Nothing committed. The coordinator's WIP snapshot
`bca21bb0` caught this work part-way through. Compare against `5a0f9785` for
the whole change.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | Re-voiced `practice`: "And every page has concept checks of its own, four of them add runnable challenges, and a bank of a hundred and ten multiple-choice questions covers the whole track." The screen now has two lines. Line 1: "Every page: concept checks · 4 of 8 pages: runnable challenges", cued to "every page", "concept checks" and "runnable challenges". Line 2, at `practiceY + h(44)` and cued to "a bank": "A bank of **110 multiple-choice questions**, across the track". NextLine moves to `practiceY + h(114)`. The 4, 8 and 110 come from a new `check.mjs`, which counts the component tags on `content/interview/data-analyst/` into `results.json`, and `data.ts` reads them (`CHALLENGE_PAGES`, `TOPIC_PAGES`, `BANK`). The challenge pages are sql, pandas, advanced-sql and ab-testing-and-metrics. All 8 topic pages have concept checks. |
| 2 | P2 answer | fixed | `ai` is now four beats, each with `pauseAfter: 0.5`. **`ai`**: "AI, artificial intelligence, has changed some of it. Checking now matters more than writing, because a plausible query is cheap to produce. Expect to be handed one an assistant wrote, and asked: is it right?" **`ai-use`**: "...responsibly: what you'd paste into one, how you disclose using it, and how you keep hallucinated insights out of a report." **`ai-bi`**: "...but they only answer correctly on top of clean, well-defined metrics, and providing those is becoming the analyst's job." **`ai-off`**: "...AI-off, so fluency still matters. Ask the recruiter about each round." Rows 1 to 3 now read "Checking a query an assistant wrote, more than writing one", "Responsible use: what you paste in, disclosure, no hallucinated insights" and "BI tools that answer in plain language, correctly only on clean metrics". The longest ends near x = 1,290. Row 4 is unchanged, so the switch still clears it. |
| 3 | P3 | fixed | `series` now ends "...in all, each answered once, in the video of the page it belongs to." Under "156 questions in all" there is a 22px `INK_SOFT` line with the same words, cued to "each answered once". The total moves up to `y(GRID_Y) - h(98)` to make room, and the new line sits at the total's old height. Both dim with the other cards on the bridge. |
| 4 | P3 | fixed | Narration: "Across the three parts, interviewers probe four things." Headline turn: "across the three parts." |
| 5 | P3 | fixed | The probe circles and numerals are `BLUE_INK`. The switch knob is solid `INK_SOFT` at both ends, with no color mix. The recruiter line is `INK` inside `<Mark at={askAt + 4}>`. |
| 6 | P3 | fixed | `<Mark at={checkAt + 6} out={rows[1].at}>`. Row 2 is cued to "You'll be asked", the first words of `ai-use`. Stills: marked at 64 s, lifted at 72 s, and only the recruiter line marked at 98 s. |
| 7 | P3 | moot (done centrally) | Checked in a still at 50 s: `GROUP BY` now has a single sans-width space. |
| 8 | P3 | fixed | Narration: "SQL fluency: joins, GROUP BY, WHERE against HAVING, CASE, and window functions. Framing: picking the right grain, meaning what one row stands for, handling nulls, and not counting anything twice after a join." On screen: "joins, `GROUP BY`, `WHERE` vs `HAVING`, `CASE`, window functions" and "the right grain (what one row is), nulls handled, nothing counted twice after a join". The latter ends near x = 1,690. |
| 9 | P3 | fixed | The loop cards read "1 of 3", "2 of 3" and "3 of 3". "Part N" now means only the videos. |
| 10 | P3 | fixed | Two divs: "a pivot table, a lookup," and "a median, a p&#8209;value". |
| 11 | P3 | fixed | The count is its own div at a fixed `top: 126` in the card, where a two-line title leaves it. Every count in the grid now shares one baseline. I used this instead of the suggested `bottom: h(36)`, so row 2's counts stay exactly where they were and only row 1's single-line cards move. |
| 12 | P3 | fixed | `lead="AI has changed"`, `turn="some of it."`, with the turn cued to "some of it". The spelling-out stays in the narration only. |
| 13 | P3 | fixed | `next`: "Almost every interview has a SQL screen, so the series starts there. Next: SQL." Card 1 lights on "the series starts there", and NextLine is still cued to "Next". |
| 14 | P3 | fixed | Part 8's owl, `<Hero video="da-ai-assisted" id="da-ai-assisted-owl" at={from + 10} left={1400} top={y(300)} width={400} height={400} />`. That is 40px right of the suggestion, so it clears row 2 (ends x ≈ 1,290) by more than 100px. |
| 15 | P3 | fixed | The series headline inks in at `from + 2`, with `turnAt={pageAt}`. A still at 100.4 s shows the lead up 0.5 s into the beat. |

No finding was judged wrong. The page agrees with every fix. index.mdx says
"(where it fits) runnable challenges", "a plausible query is now cheap to
produce", "how you disclose using one", and "only get correct answers on top
of clean, well-defined metrics, which is increasingly the analyst's job to
provide". No page error found.

## Voice

**1,529 characters re-voiced** (the `narrate --dry-run` count), each beat on
its own:

- **P2 and answer findings, 812:** `ai` 207, `ai-use` 162, `ai-bi` 175,
  `ai-off` 103, `practice` 165.
- **P3s, 717:** `probe` 446, `series` 192, `next` 79.

Why more than the changed sentences: the kept take
(`takes/da-interview/take-1`) was recorded before the acronym rule, as "A I"
and "B I", and before `loop`'s "First, a SQL screen". Every beat that says AI
or BI was voiced alone afterwards. So a sentence carrying AI or BI cannot be
re-cut from the take, even when its words are unchanged. That covers `ai`'s
opening sentence (52 characters), and `probe`'s Communication and Tools
sentences (183), which is why `probe` was re-voiced whole rather than split.
The one free cut was `series-how` ("Each video works through…"), split off
`series` and taken from take-1 with `--recut`. `loop.mp3` and its alignment
entry are byte-identical to `5a0f9785`, and the takes are untouched.

## Length and checks

- `npm run cues -- da-interview`: 10 beats, 307 words, **140.0 s (2:20)**, up
  from 1:41. Most of the growth is the AI scene (25 s to 46 s) and the probe
  beat (25 s to 34 s), which now carry the answers.
- Typecheck and eslint for `src/videos/da-interview/`: clean.
- `npm run check:cues`: nothing in da-interview. The failures it lists are in
  da-visualization and da-sql.
- `npm test`: 67 of 69 pass, run twice. Neither failure names da-interview:
  both are cue tests failing on other folders that are mid-edit
  (da-ai-assisted the first time; da-pandas and
  da-statistics-communication the second).
- `check:motion`: pass, 2:20.3 checked, 0 stretches still for 2 s or more.
- `check:sync`: pass. Worst +0.03 s (`series`), every other beat within
  ±0.01 s.
- `check:mix`: pass. Effects 32.1 LU under the narration. Where both sound,
  speech is a median 27.1 dB above the effects (5th percentile 13.4 dB).
- `check:frames`: pass. 8 illustrations, largest stretch 0.78. No hyphen in
  tabular figures, and every cue names its occurrence.
- Stills at every change, each looked at, full size: 14, 50, 64, 72, 98,
  100.4, 114, 128 and 139 s. From the half-size `check:motion` preview:
  52.6 s (AI scene opening), 93.2 s (switch thrown, neutral knob), 117 s and
  119.6 s (the "Each video…" line handing over to "Every page:") and 133.8 s
  (card 1 lit on "the series starts there").

## Facts

- `results.json` is new. `bank` is 110, the same as the hand-typed `BANK` it
  replaces. `topicPages` is 8, `conceptCheckPages` 8, `challengePages` 4.
- `QUESTIONS` is still 156, from the plan's per-part counts, which are
  unchanged.

## Noticed

- **The kept take is stale for any beat that says AI or BI.** It was recorded
  with "A I" and "B I" letter-spaced, the reading the acronym rule exists to
  avoid. So no beat of this video that says AI or BI can ever be cut from it
  for free, and every split of one costs its full text. Nothing to change
  now, but it is why this pass cost more than its changed sentences.
- **"Next: SQL" sits about 55px above the frame's bottom edge**, because the
  practice band is now two lines. It is inside the frame and clear of
  everything else. If it reads as tight, `practiceY` could rise by about 10px
  (`h(30)` instead of `h(40)` below the grid).
- **The AI scene shows row 1 alone for about 10 s** while row 1's sentences
  are read. This is by design: rows arrive with their beats, and the owl and
  Drift keep it moving (check:motion passes).
- **New files:** `check.mjs` and `results.json` in the folder, on the pattern
  of `ds-interview`'s. `data.ts` imports `results.json`.
