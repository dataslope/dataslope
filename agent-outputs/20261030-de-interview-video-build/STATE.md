# Data Engineer interview videos: build record (2026-10-30/31)

All twelve videos of [the plan](../20261030-1600-data-engineer-interview-video-plan.md)
are built, voiced with Drew on `eleven_v4_turbo`, and pass every check:
typecheck, lint, `npm test` (70/70), `check:cues`, and for each video
`check:sync`, `check:motion`, `check:mix` and `check:frames` on its final
code. One builder agent per video worked to [BRIEF.md](BRIEF.md); their
reports are in [reports/](reports/) (Parts 1, 3 to 7, 10 and 11 were
stopped at a usage pause before writing a final one; their remaining
checks were run afterwards by the coordinator, below).

| Part | Composition | Length | Beats | Narration | Quick round |
| --- | --- | --- | --- | --- | --- |
| 0 | DataEngineer-0-Interview | 2:13 | 16 | 1,819 | (overview) |
| 1 | DataEngineer-1-SqlPatterns | 9:50 | 62 | 7,943 | yes |
| 2 | DataEngineer-2-SqlPerformance | 7:09 | 43 | 5,906 | no |
| 3 | DataEngineer-3-DimensionalModeling | 8:48 | 42 | 7,317 | yes |
| 4 | DataEngineer-4-ModelingHistory | 8:35 | 44 | 7,102 | yes |
| 5 | DataEngineer-5-Python | 10:31 | 73 | 8,311 | yes |
| 6 | DataEngineer-6-Pipelines | 7:45 | 33 | 6,393 | yes |
| 7 | DataEngineer-7-DistributedProcessing | 10:04 | 49 | 8,223 | yes |
| 8 | DataEngineer-8-Streaming | 9:28 | 51 | 7,751 | yes |
| 9 | DataEngineer-9-Warehousing | 7:25 | 37 | 5,982 | no |
| 10 | DataEngineer-10-Orchestration | 8:54 | 35 | 7,255 | yes |
| 11 | DataEngineer-11-PipelinesForAi | 8:57 | 51 | 7,250 | no |
| | **Total** | **1:39:39** | **536** | **81,252** | |

Longer than the plan's ~90 minutes because builders carried each answer
one step past the question, as the brief asked; every video is under the
9,500-character cap. No beat is stale: every one plays its own audio.

## Checks run after the pause

All on the final code, one at a time, through each video's private entry.

| Part | Check | Result |
| --- | --- | --- |
| 1 | sync / mix / motion / frames | worst +0.04 s / 28.9 LU under / 0 still stretches / stretch 0.87, arrows 0.0° |
| 3 | mix (after its effects were raised), sync and motion (after a `pauseAfter` change) | 28.4 LU under / worst +0.03 s / 0 still stretches |
| 4 | frames, motion | stretch 0.87 / 0 still stretches |
| 5 | mix / frames | 29.1 LU / stretch 0.85, arrows 7.1° |
| 6 | mix / motion / frames | 27.0 LU / 0 still stretches / stretch 0.91, arrows 3.1° |
| 7 | mix / frames | 31.2 LU / stretch 0.62, 71 arrows at 0.0° |
| 10 | mix / motion / frames | 29.6 LU / 0 still stretches / stretch 0.73 |
| 11 | mix / frames | 29.8 LU / stretch 0.96 |

Parts 10 and 11 had been looked at only on estimated timing; contact
sheets from their voiced previews (a frame every 10 s) were checked too.

The effects sit 27 to 31 LU under the narration, the level the Data
Analyst and Data Scientist interview videos use, quieter than the
README's course examples (17.5 to 18.9 LU).

## Pages fixed from what the builders found

In the commits "Data Engineer pages: fix the errors the video builders
found" and "Streaming: a watermark subtracts an out-of-orderness bound".

The same stale row count turned up in eleven challenge tests on other
tracks (Analytics Engineer, Backend Engineer, Data Analyst, Data
Scientist), each describing a smaller dataset than the one it grades;
fixed in "Interview challenges: test descriptions that give the wrong
row count".

## Left for later

- **Kit suggestions** from the builders, each built locally instead:
  a `PlanBox` for printed query plans (Part 2, Part 9); DDL and `EXPLAIN`
  keywords in `da-sql`'s `Listing` tokenizer (Part 2); `QMono` at 0.84em
  falls under 19px inside a 20 to 22px label (Part 10); a shared cluster
  vocabulary of machines, partitions and shuffle lines (Part 7); message
  cells and partition lanes (Part 8); DAG nodes and edges (Part 10).
- **Embedding** the videos on the track's pages, still open from the
  earlier interview series.
