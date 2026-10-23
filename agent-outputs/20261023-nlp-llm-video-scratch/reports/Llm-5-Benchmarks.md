# Llm-5-Benchmarks: "Is it good enough?" (How LLMs Work, Unit 5 of 5)

Folder `video/src/videos/llm-benchmarks/`. Voiced by Drew. Not committed.

## Length, characters, takes

- **5:38** (338.1 s, 48 beats, 760 words, 135 wpm) from `npm run cues` on the voiced timeline. The estimate was 5:06.
- **4,379 characters** voiced (cap 4,400), in **3 takes** (1,491 / 1,303 / 1,585 characters; 102.3 s, 89.9 s, 103.5 s). No beat re-voiced, no `--force`.

## Checks

- typecheck (my folder): clean. eslint `src/videos/llm-benchmarks`: clean.
- `check:cues`: clean (whole package).
- `npm test`: 59 pass, 0 fail.
- `check:sync`: pass, every beat within ±0.12 s; worst **+0.06 s** (sat-tell, 1:51.0).
- `check:motion`: MOTION_RESULT
- `check:frames`: FRAMES_RESULT
- `check:mix` (informational): MIX_RESULT

## Scenes (13, Figs. 1 to 15)

1. Intro: `SeriesIntro`, "Is it good enough?" (the plan's title, kept).
2. RouteScene: opens on Unit 4's last lever, "the cheapest model that passes"; Fig. 1 four tiers by input price ($0.10 to $10) with an empty "passes?" box per tier that becomes "the test"; Fig. 2 the lesson's launch table (MMLU, GPQA Diamond, ARC-AGI-3, Model A against B), offered as that test.
3. FamiliesScene: "a fixed set of questions with known answers"; Fig. 3 four cards, each with a working glyph: MMLU (four options, 57 subjects), GPQA Diamond (34% bar for PhDs from other fields), SWE-bench Verified (issue, patch, tests), ARC-AGI (grid rule, then a game piece that walks to its goal).
4. ScaleScene: Fig. 4 the same two models on a 0 to 100 scale; MMLU's 0.6-point gap magnified under its 95 ceiling ("Noise."), ARC-AGI-3's 32.5 points mid-scale ("a real difference"); four numbered marks preview the four pitfalls.
5. SaturationScene (gauge spot): Fig. 5 best scores: MMLU above 92 under a 95 ceiling, GPQA Diamond around 95, Humanity's Last Exam growing from under 10 to about 60 in 20 months; the three-point tell strikes the MMLU row.
6. ContaminationScene (elephant spot): Fig. 6 test questions to published to crawled to training data; the lesson's own table, memorized and capable both reporting "high score"; SWE-bench Verified struck; the defense (private, newer than training).
7. ReportingScene: what a launch post picks; Fig. 7 GPT-6 Astra on ARC-AGI-3, 62.7% in ARC's standard harness ($26,098) against 99.9% in OpenAI's ($18,817), harness drawn as code around a model; same model, same test, same week; only the first compares.
8. MismatchScene (shape-sorter spot): Fig. 8 SWE-bench carries to agentic coding, not to reading invoices; third on every leaderboard can still be best for your task. Fig. 9 the four questions for any row of a launch table.
9. ExamplesScene: Fig. 10 the method in four steps; Fig. 11 the lesson's simulation, 2,000 runs at n = 20 filling two histograms in run order (better one ahead in 1,626, tied 155, behind 219: "about four in five"); Fig. 12 the same run's rate by n (57.5, 70.0, 81.3, 94.2, 99.3%); "Still close after 30? Pick on cost."
10. HarnessScene: Fig. 13 the lesson's ten tickets and two stand-in models; cheap 30%, good 100%; all 7 misses sent to `other`.
11. ScoringScene: Fig. 14 the three ways to score free text in the lesson's order: checkable fields, properties, a model as judge (favors longer answers).
12. CostScene: Fig. 15 four tiers on one task: accuracy 91 to 95% beside a monthly bill of $83 to $8,250; +1 point for 2x, +0 for 2.5x; what an error costs decides.
13. CloseScene (tape measure and card box spot): build it once; the next launch table (Fig. 2 returning) struck; your examples run card by card; "You'll know if it's good enough." No NextLine: the course ends here.

Illustrations (`public/images/llm-benchmarks/`): `llm-benchmarks-gauge` (video-icon), `llm-benchmarks-elephant`, `llm-benchmarks-sorter`, `llm-benchmarks-measure` (video-hero). The Batch API job sat at 0/4 for an hour (submitted 06:14 UTC), so it was cancelled at 07:15 (status `cancelling`, 0 completed) and the four were generated with `sync` (about $0.02), then imported. All four were looked at and kept on the first draw; none redrawn.

## Facts

Every computed number on screen comes from `measure.py`, which re-runs six lesson blocks verbatim and fails unless each prints exactly what the page prints (`lib/generated/block-outputs.json`); all six match. `measurements.json` is its output; `data.ts` reads it. Scores the lessons quote in prose (MMLU's 57 subjects, 92 and 95; GPQA's 34% and 95; HLE under 10 and about 60; Astra's 62.7/99.9 and run costs) are kept in `measurements.json`'s `quoted`, each with its lesson line. Prices are the cost block's (which match pricing-structure.mdx's October 2026 table). The simulation's 2,000 per-run scores at n = 20 are recorded from the same seeded stream without drawing anything extra, so the page's 81.3% is unchanged and asserted.

Things on screen that are drawn, not data: MMLU's four option bars, the ARC grid cells and game board (illustrating what such a task looks like), the JSON field (the first harness ticket's own queue, `billing`), and the 30 example cards in the close (next-steps.mdx's "thirty examples"). The cost scene's accuracies are the lesson's "illustrative" ones, and the narration says "Say".

## Lesson discrepancies (not fixed)

1. `content/courses/how-llms-work/evaluating-for-your-task.mdx:64`: the block prints "Twenty examples already identify a 15-point gap almost always." directly under its own line `n= 20: ranks them correctly 81.3% of the time` (one wrong ranking in five; 18.7% tie or lose). Same claim in the concept check at `:199` ("identified almost every time at twenty examples") and the caption at `:39` ("Twenty to fifty examples separate configurations about as well as hundreds", against 81.3% at 20 and 99.3% at 100). The video says "about four times in five".
2. `content/courses/how-llms-work/what-benchmarks-measure.mdx:110-127, 132-134`: the "How to read a score" block measures the gap as a share of remaining headroom, which grows as the leader nears the ceiling (MMLU 22% against GPQA 15%), the opposite of the prose under it ("A one-point gap near a ceiling is noise"). Its closing print, "The same 0.6 point gap means very different things depending on how much room is left above it" (`:125`), is not borne out by its own output: the two 0.6-point rows come out at 22% and 15%, and the row that differs (ARC-AGI-3) has a 32.5-point gap. The video uses the block's scores and the prose's reading, not the percentages or that line. Related, `:202` says the remaining headroom "is smaller than the measurement error", which nothing on the page quantifies.
3. `content/courses/how-llms-work/evaluating-for-your-task.mdx:171`: cosmetic: `\${monthly:>11,.0f}` puts the dollar sign before the padding, so the printed table reads `91%$         83$     0.000091`. The numbers are right; the video shows them as $83, $1,650, $3,300, $8,250.

## Kit suggestions (built locally in `parts.tsx`)

- `Count` that renders nothing before its cue (the review's "counter shows a false number" rule, built in).
- `Check` / `Cross`: stroke-drawn tick and cross marks that take any color and draw on their cue.
- `Track` + `Dot`: a 0 to 100 score track with ticks, and a dot that pops onto it.
- `Tag`: a small rounded chip with solid or dashed border (also used by other videos as `Chip`).
- `Headline` with the em-based gap (Estimation's fix) could replace each video's copy.

## Left undone

UNDONE
