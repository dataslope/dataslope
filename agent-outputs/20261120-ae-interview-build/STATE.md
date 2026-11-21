# Analytics Engineer interview videos: build record (2026-11-20)

All ten videos of [the plan](../20261120-1200-analytics-engineer-interview-video-plan.md)
are built, voiced with Drew on `eleven_v4_turbo`, and pass their checks:
typecheck, lint, `npm test`, `check:cues`, and for each video `check:sync`,
`check:mix`, `check:frames` (`CHECK_SCALE=1`) and `check:motion` on its final
code. Five writers wrote the scripts and facts in pairs to
[BRIEF-SCRIPTS.md](BRIEF-SCRIPTS.md); the coordinator read every script and
fixed what it found; one builder per video then built, voiced and checked it
to [BRIEF-BUILD.md](BRIEF-BUILD.md). An independent review of every video,
with its fixes, followed (see
[the review](../20261120-ae-interview-video-review/)).

## The videos, as built (before the review's fixes)

| Part | Composition | Length | Beats | Narration (characters) |
| --- | --- | --- | --- | --- |
| 0 | AnalyticsEngineer-0-Interview | 2:46 | 21 | 2,194 |
| 1 | AnalyticsEngineer-1-FactsAndGrain | 11:15 | 50 | 9,398 |
| 2 | AnalyticsEngineer-2-ChangingDimensions | 8:03 | 39 | 6,622 |
| 3 | AnalyticsEngineer-3-Dbt | 10:59 | 48 | 9,014 |
| 4 | AnalyticsEngineer-4-Incremental | 8:01 | 42 | 6,627 |
| 5 | AnalyticsEngineer-5-AdvancedSql | 10:51 | 64 | 8,868 |
| 6 | AnalyticsEngineer-6-Warehousing | 9:34 | 51 | 7,969 |
| 7 | AnalyticsEngineer-7-Testing | 9:40 | 50 | 8,059 |
| 8 | AnalyticsEngineer-8-Metrics | 10:33 | 51 | 8,683 |
| 9 | AnalyticsEngineer-9-AiSemanticLayer | 8:20 | 46 | 7,183 |
| | **Total** | **1:30:02** | **462** | **74,617** |

After the independent review's fixes the series runs **1:32:08** (487 beats,
75,898 characters): 2:46, 11:45, 8:04, 11:10, 8:18, 10:58, 9:53, 9:53,
10:45 and 8:35. Every video was under the 9,500-character cap as built;
Part 1 is 194 over it after its answer fixes. Every quick-round question is
read aloud ("Question n." and the question), a choice made for this series:
the earlier series showed the number only, and their reviews kept finding
quick-round text that left the screen before it could be read.

## Art

GPT Image 2.6 (`gpt-image-2.6-flare`), quality `low`, transparent background,
in the watercolor style every video file carries. The ten heroes were drawn
first, by the coordinator, so every builder started with its own and the
overview and the closing could show all ten: a platypus (the overview, half
one thing and half another, as the role is), a sparrow at grain, a hermit
crab between shells, a weaver bird at its nest, a snail, a giraffe at a
window, a camel with cargo, a woodpecker at a trunk, a pelican with its
catch, a dolphin. Builders added spots only where the layout had room (about
20 in all; several prompts were left ungenerated for want of space). The
YouTube thumbnail has its own square platypus beside three blocks of rising
height, since the overview's wide hero read small in the corner. About $0.70
of images in all.

## Voice

About 75,000 characters across the ten scripts, plus re-voices for the
interview-prep review merged from main (#746) and for new beats. The account
reported 33,913 credits used after the first takes (about 0.46 credits a
character on `eleven_v4_turbo`, twice the 0.22 measured on earlier series),
well inside its 162,141; 37,301 after every re-voice, the review's 1,994
characters included. The lexicon gained YAML ("yammel"); a test take
confirmed that dbt, LookML, OLTP, MetricFlow, Jinja and HyperLogLog need
nothing.

## The pages, fixed from what the videos found

Writers and builders ran every page's SQL and checked its claims. Fixed in
`content/interview/analytics-engineer/`, then reconciled with the
interview-prep review that landed on main the same afternoon (#746), which
rewrote the same pages:

- **metrics-and-semantic-layer:** the fan-trap block's comment and prose
  said 150 becomes 350; on the twelve orders the block holds, it returns
  4,555.25 against a true 1,949.25 (150 and 350 are orders 1 and 2 alone).
- **dimensional-modeling:** the factless-fact query asked for distinct
  products and counted product-days (`COUNT(DISTINCT)` now); third normal
  form defined by its dependencies rather than as "no redundancy";
  `row_number()` integer keys renumber on a rebuild and re-point facts
  already loaded; a Type 2 fact needs the version's surrogate key or a
  date-window join.
- **dbt:** `dbt_project.yml` spelled as the file is; `generate_surrogate_key`
  (renamed in dbt_utils 1.0); a snapshot closes the old version as it
  inserts the new.
- **data-warehousing:** `MERGE` is what dbt's merge strategy runs, and the
  strategy depends on the adapter (#746's wording kept).
- **ai-and-the-semantic-layer:** dbt model access restricts `ref()`, not
  queries; the assistant's warehouse role is what keeps it to the marts
  (#746's wording kept).

## After the interview-prep review (#746)

Merged from main mid-build. It added two questions (148 in all: "What is
dbt v2?" in Part 3, "Where else can a semantic layer live?" in Part 8),
moved the YAML to dbt's stricter layout, and reworded sentences the videos
quoted. Every `check.mjs` was rerun on the new pages (no measured value
changed), and each video's builder re-anchored its checks and re-voiced only
the sentences that changed: Part 0's count (147 and 148) and its "now",
Part 2's YAML snapshot and hard deletes, Part 3's new question, Part 4's
microbatch, Part 5's `DISTINCT ON` (Postgres and DuckDB, not the cloud
warehouses), Part 8's current MetricFlow spec and new question, Part 9's
warehouse grant.

## Registration

`src/Root.tsx` (`Interview-Analytics-Engineer`), `src/series.ts` (the ten
parts, whose openers are generated from it), `src/thumbnails/tracks.ts`
(`Thumb-AnalyticsEngineer`). Tools for this machine (4 cores, two render
slots, private entries) are in [tools/](tools/).
