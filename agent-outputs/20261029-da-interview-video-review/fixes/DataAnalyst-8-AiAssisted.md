# DataAnalyst-8-AiAssisted: fixes

Report: `agent-outputs/20261029-da-interview-video-review/DataAnalyst-8-AiAssisted.md` (2 P1, 9 P2, 8 P3). Folder `video/src/videos/da-ai-assisted`. Nothing outside the folder, its narration and `out/DataAnalyst-8-AiAssisted*` was edited; `../da-sql/parts` untouched.

## Findings

| # | Sev | Finding | Status | What changed |
| --- | --- | --- | --- | --- |
| 1 | P1 | "missed more than half the month" | fixed | `mistakes-totals` split at its last sentence (recut, free); new beat `mistakes-missed`: "The assistant missed more than half of January's revenue, all of it from the last day, and nothing in the query looks wrong." Note now reads "the assistant misses 51.8% of January's revenue"; on "all of it from the last day" the `order_ts` cells of orders 7 and 8 (the two rows the bug drops, found from `kept`) get a yellow mark. |
| 2 | P1 | "Those fail loudly" groups fan-out with the loud ones | fixed | `mistakes-rest` re-voiced: "Then fan-out, and the business rules it couldn't know, like test accounts and internal traffic. Those run without an error too. Invented columns and wrong-dialect functions fail loudly, so they're the harmless kind." "The silent ones are the danger." split off as `mistakes-silent` (recut). The right-hand list now holds all five, numbered: date boundaries, averaging ratios, fan-out (silent), business rules it couldn't know (silent), a red bracket over those four with "the silent ones are the danger" under it, then 5 "invented columns, wrong-dialect functions" with grey "they fail loudly: the harmless kind". |
| 3 | P2 | page's query runs out of its panel | fixed | `check.mjs` breaks each FILTER's WHERE after `order_ts` (whitespace only; BETWEEN gets its own line rather than splitting its AND, which would read as a boolean AND in a video about that filter). Longest line 43 characters; `LIST_SIZE` 20; the listing ends ~1650 inside its 1760 panel. Marks find their lines by text (`lineOf`): BETWEEN on lines 2-3, half-open on 6-7. Totals table moved under the taller listing. |
| 4 | P2 | text under 19px | fixed | Query 20px; prompt 21px in a 980px panel (highlight width computed from its lines); BI label 20px, "a question in plain words". Also the weekly-summary label 19 → 20. No text under 19px left in the folder. |
| 5 | P2 | "Hand - label" | moot (central) | Confirmed in a still at 392.5 s: reads "Hand-label". |
| 6 | P2 | Q2 checks named without examples | fixed | `check-filters` re-voiced ("…against the business definition: does revenue drop refunds and test accounts? And look for null traps, like NOT IN against a column with nulls."); `check-trust` split, its first sentence re-voiced with "like the finance report", the range sentence recut as `check-range`. Notes beside steps 3, 4, 5: "does revenue drop refunds and test accounts?", "`NOT IN` against a column with nulls: **0 rows**" (0 from a new `check.mjs` figure `nulls`), "like the finance report". The fan-out figure moved up and its "something is fanning out" note above the red box, to free step 3's row. |
| 7 | P2 | averaging ratios unexplained, no unit | fixed | `mistakes-ratios` split; `mistakes-average` re-voiced with "because a ten-session day counts as much as a thousand-session one" and "two point five percent". Aliases now `avg_of_rates_pct` / `overall_rate_pct` (SQL broken before `AS` to fit). Red note "a 10-session day counts as much as a 1,000-session one" (numbers from the `daily` table), cued to "counts as much"; it sits under the averaged query rather than beside the 26, because the right side now carries finding 2's list. |
| 8 | P2 | half-open given without why | fixed | New beat `mistakes-precision`: "Use the half-open range: it's right at any timestamp precision. Ending at one second to midnight would still lose that last second." Note under the orders table: "half-open is right at any precision: an end at 23:59:59 still drops 23:59:59.5", from a new `check.mjs` step `boundary.lastSecond` (an order at 23:59:59.5: `BETWEEN … '2026-01-31 23:59:59'` false, half-open true). |
| 9 | P2 | Q4 "test it" without how | fixed | `hallucinate-example` split; new `hallucinate-guess`: "The because is a guess until you check it: did the drop start with the launch, and is it in the segments the competitor reached?" `hallucinate-rule` split; new `hallucinate-draft`: "Let the model draft words around numbers you computed, and never let it compute them itself. Cut any cause you haven't tested." Red note "…is a guess: check the timing and the segments, or cut it"; rule line adds ", never the numbers". |
| 10 | P2 | Q8 drops the semantic model | fixed | `r-bi` re-voiced: "…on top of defined metrics, clean and documented tables, and a semantic model that says how they join. Pointed at messy raw tables, it's confidently wrong at scale." Job sentence split as `r-bi-job` (recut). Third layer "a semantic model: how tables join" (layers widened to 520 so it stays one line) and a red note "on messy raw tables: confidently wrong, at scale". |
| 11 | P2 | Q6 right practice marked with red crosses | fixed | Middle column headed "didn't use it for" (what is said, rather than the suggested "kept for yourself") in the same blue as the other two headers; its items marked with a grey dash, not a cross. Red is left only on "hid it, then couldn't explain a line". "how you checked it" now holds "reconciled the total" and "traced three rows by hand", said in a new split-off beat `takehome-checked`: "And say how you checked it, like reconciling the total and tracing three rows by hand." |
| 12 | P3 | blank page between the worked mistakes, none named | fixed | Running label at `y(TOP) - h(92)`: "the ones people make…" gives way on "The first is the date boundary" to "1 · date boundaries", which hands over to "2 · averaging ratios" once it has gone; the `daily` name and header arrive at `ratiosAt + 4`. Still at 169.9 s: no blank page, no overlap. |
| 13 | P3 | half-open filter typed before it is introduced | fixed | `lineAt`: the assistant's FILTER and the FROM/WHERE type in on "Remember the opening query"; the second FILTER's four lines wait for "A half-open range". The totals table's `half_open_total` column also opens then. |
| 14 | P3 | strike rises, starts on the green edge | fixed | With the central angle change it stays flat; locally the struck phrase is set 0.14em off the highlight and `top="0.63em"`, so it starts clear of the green and runs through the x-height. |
| 15 | P3 | production notes on screen | fixed | "the video's own example" deleted; "Weekly summary, drafted by a model"; "a prompt". |
| 16 | P3 | hook's query never picked up | fixed | New beat `mistakes-recall`: "Remember the opening query." (27 characters), with the assistant's BETWEEN query typing in on it. |
| 17 | P3 | arrow sends the question into "defined metrics" | fixed | Arrow deleted; "what it has to stand on to answer correctly" above the stack, cued to `metricsAt - 2`. |
| 18 | P3 | Q9 repeatability and uncertainty | partly | `r-llm` re-voiced with "rerun a sample to confirm the labels repeat"; step 3 "Same settings every batch; a rerun gives the same labels" (second half on "rerun a sample"). Not added: reporting which categories it confuses and carrying that uncertainty into the findings; the beat is already 18 s. |
| 19 | P3 | series ends on a footer | fixed | New beat `close-two`: "Whoever wrote the query, the interview asks the same two things: what one row means, and how you know the number is right." Set above the hairline in two lines at `body(34)`, the two things highlighted as said; the list's last tick and the chime move to it. |

## Voice

- **1,973 characters re-voiced** (`narrate --only`, each beat on its own), of which **429 for P3s** (`mistakes-recall` 27, `r-llm` 280, `close-two` 122). Beats: `check-filters` 160, `check-trust` 128, `mistakes-recall` 27, `mistakes-missed` 124, `mistakes-precision` 131, `mistakes-average` 195, `mistakes-rest` 215, `hallucinate-guess` 128, `hallucinate-draft` 126, `takehome-checked` 86, `r-bi` 251, `r-llm` 280, `close-two` 122.
- Cut free from the kept takes with `--recut`: `check-range`, `mistakes-totals`, `mistakes-ratios`, `mistakes-silent`, `hallucinate-example`, `hallucinate-rule`, `takehome-answer`, `r-bi-job`.
- Against `0fd2f7b6`, only those 21 beats' audio and alignment entries differ; the other 22 beats are byte-identical (mp3 and alignment entry). Takes untouched.

## Length and checks

- **New length: 394.6 s** (was 325.7), 43 beats, 956 words, 145 wpm (`npm run cues -- da-ai-assisted`).
- Typecheck (folder lines): clean. ESLint `src/videos/da-ai-assisted`: clean.
- `npm run check:cues`: passes. `npm test`: 69 pass, 0 fail.
- CHECKS_PLACEHOLDER

## Facts

- `check.mjs` re-run with the private DuckDB-Wasm copy (DuckDB v1.4.3; question bank 110). **Every existing value in `results.json` came back identical.** Changed only where a finding asked: the `boundary.page` SQL text (whitespace, finding 3) and the `ratios.averaged` / `ratios.pooled` SQL and column names (`avg_of_rates_pct`, `overall_rate_pct`, finding 7). Added: `boundary.lastSecond` (finding 8: false, true) and figure `nulls` (finding 6: `NOT IN` against a column holding a NULL keeps 0 rows; 2 once the NULL is filtered out).
- The page (`ai-assisted-analysis.mdx`) agrees with every answer as now given; nothing to correct there.

## Stills checked

94, 112.5, 113.5, 123, 127.8, 138, 145, 148, 150, 158, 167.5, 169.6, 169.9, 188.5, 198, 206.5, 241.5, 258, 317, 333, 355.5, 374.5, 392.5 s.

## Noticed, and a shared change recommended

- **`TableName` (`da-sql/parts.tsx`) does not fade on `out`.** It passes `opacity: 1 - d` in Ink's `style`, which overrides the opacity Ink computes from `out`, so the name stays fully inked for the 10 frames of the exit and then vanishes (seen at 169.6 s). Worked around here by wrapping the `orders` name in a fading div. Shared fix: in `TableName`, apply the dim on a wrapper (or multiply it into Ink's own opacity) instead of overriding `opacity` in `style`.
