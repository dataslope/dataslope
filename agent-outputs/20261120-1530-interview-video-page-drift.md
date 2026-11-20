# Interview videos that no longer match their pages

Written 2026-11-20, after the interview prep review in
[dataslope/dataslope#746](https://github.com/dataslope/dataslope/pull/746)
corrected and reworded pages that 43 videos narrate from. Nothing under
`video/` was changed by that pull request. This report says which videos now
disagree with a page, line by line, and what each one needs.

## Summary

| Result | Videos | Count |
| --- | --- | --- |
| `check.mjs` fails: the page was reworded and the check pins the old wording | `be-interview`, `be-ai-round`, `be-code-review` | 3 |
| `check.mjs` passes, but a narrated line is now wrong or out of date | `de-streaming`, `de-orchestration`, `de-python` | 3 |
| `check.mjs` passes, narration still true but narrower than the page | `be-concurrency`, `da-ai-assisted` | 2 |
| Still match | the other 35 | 35 |

No video narrates a number that a page correction changed. The three failing
checks all come from one page, `backend-engineer/ai-assisted-coding.mdx`,
which was rewritten to be evergreen; every fact those videos narrate is still
on that page, most of it now in the footnotes.

Only one line is factually wrong today: `de-streaming` says a keyless Kafka
message goes round-robin.

## How this was checked

1. Ran every `video/src/videos/{be,da,ds,de}-*/check.mjs` (43 scripts) against
   the edited pages. `da-spreadsheets` needs
   `HYPERFORMULA_DIR` pointing at `hyperformula@3.5.0`; with it set, it passes.
2. A check only fails on the phrases it pins, and two of the failing ones stop
   at their first gate. So the narration in every `script.ts` was also searched
   for each claim the review corrected on a page (the list is in the pull
   request description), and the hits were read against the new page text.
3. The `results.json` files the checks rewrote were restored afterwards.

## 1. Checks that fail

All three read `content/interview/backend-engineer/ai-assisted-coding.mdx`.

### `be-interview` (11 pinned phrases)

| Pinned phrase (old page) | Narration (beat) | The page now | Narration still true? |
| --- | --- | --- | --- |
| "Since 2025 the coding interview has split in two" | `ai`: "Since 2025, it has split in two." | "The coding interview comes in two kinds." | Yes, but it is the dated framing the page dropped |
| "One of the two onsite coding rounds became a 60-minute AI-enabled round: a multi-file project in CoderPad with a built-in assistant" | `ai-allowed-who`: "an hour extending a multi-file project with the assistant built in" | Same fact, in footnote `[^meta]` | Yes |
| "\"code comprehension\" round where candidates read, debug, and optimize existing code" | `ai-allowed-who`: "unfamiliar code to read, debug and speed up" | Table row "Code comprehension: You read, debug, and optimize existing code with an approved assistant." | Yes |
| "Using unapproved generative AI during an interview can disqualify a candidate" | `ai-banned`: "Using one without permission can disqualify you" | Table row "AI-off", and footnote `[^amazon]` | Yes |
| "No AI in take-homes or live interviews unless the interviewer says otherwise" | `ai-banned` | Footnote `[^anthropic]` | Yes |
| "At least one round is back in person" | `ai-banned`: "some rounds are back in person" | Table row "In person", and footnote `[^google-in-person]` | Yes |
| "because an assistant can complete them and the reviewer\ncannot see how" | take-home line | Same sentence, wrapped differently | Yes |
| "Karat's 2026 survey of 400 engineering leaders, 71% said AI makes technical skills harder to assess, and 62% of organizations still prohibited AI in technical interviews" | `ai-survey`, `ai-survey-data`: "Seventy-one percent ... Sixty-two percent of organizations still banned it" | Body says "seven in ten" and "most of their organizations"; the figures are in footnote `[^karat]` | Yes |
| "sells interviewing services, so read the figures as one vendor's survey" | `ai-survey` | Same sentence in `[^karat]`, wrapped differently | Yes |
| "take-home projects and automated code tests have lost" | take-home line | "Take-home projects and automated code tests have lost" (capital T, new line break) | Yes |
| "\"why this\napproach?\" and \"what breaks under load?\"" | hook | Same quotes, wrapped differently | Yes |

This check compares raw text, line breaks included, so three of the eleven
fail on wrapping alone.

### `be-ai-round` (4 pinned phrases, then one more behind the first gate)

| Check key | Narration (beat) | The page now | Narration still true? |
| --- | --- | --- | --- |
| `rubric` | `grade-canva`: "Google's twenty twenty-six pilot rubric named the same three skills" | "The rubric reported for Google's code comprehension round names the same three skills" | Yes |
| `rubricYear` ("pilot in the second half of 2026") | `grade-canva` | The date moved to footnote `[^google-pilot]`, which now also records the October 2026 widening | Yes |
| `owasp` ("It is first on OWASP's 2025 Top 10") | `inj`: "It's first on the twenty twenty-five top ten risks for LLM applications" | "OWASP ranked it first in each of the first three editions"; the footnote cites the 2026 edition | Yes, though a 2026 edition now exists |
| `metrSince` | `daily-caveat`: "METR has since said that result reflects early twenty twenty-five tools, and its later data points toward a speedup." | "The slowdown did not outlast the tools it was measured on; the authors later marked the result out of date." | Yes |
| not pinned by `check.mjs`; `DailyScene.tsx` cues on it | `daily-vague`: "like I use Claude Code a lot" | "I use an assistant a lot" | Yes, it is an example |

`daily-metr` (the 19% and 20% figures) is unaffected: the page still states
both, and the footnote still reads "July 2025: 16 developers, 246 tasks".

The `daily-vague` wording was chosen on 2026-11-11 (Claude Code in place of
Copilot). The page lost the product name in the evergreen pass. If the named
product is wanted back on the page, it is a one-line revert.

### `be-code-review` (4 pinned phrases)

| Check key | Narration (beat) | The page now | Narration still true? |
| --- | --- | --- | --- |
| `surveyName` | `bugs-survey`: "In Stack Overflow's twenty twenty-five developer survey" | Body: "When Stack Overflow asked developers ..."; the year is in footnote `[^so-survey]` | Yes |
| `survey66` | `bugs-survey`: "sixty-six percent of respondents named AI solutions that are almost right, but not quite, as their top frustration" | Body keeps the quote without the figure; 66% is in the footnote | Yes |
| `survey45` | `bugs-survey`: "Forty-five percent said debugging AI-generated code takes longer than expected." | Footnote: "45% said debugging AI-generated code is more time-consuming", which is the survey's own label | Yes; the page's wording is now closer to the source than the narration's |
| `assistantAllowed` ("allows an approved assistant") | comprehension round line | Table row "with an approved assistant" | Yes |

## 2. Checks pass, but a narrated line is now wrong or out of date

| Video | Beat | Narration | The corrected page | Verdict |
| --- | --- | --- | --- | --- |
| `de-streaming` | `topic-key` | "A message with no key goes round-robin." | `streaming.mdx`: a keyless message goes to a sticky partition until a batch fills; round-robin was the default only before Kafka 2.4 | **Wrong.** Re-voice this beat |
| `de-orchestration` | `bf-year` | "In Airflow, catchup with a sensible start date schedules them" | `orchestration-and-reliability.mdx` and `pipelines.mdx`: in Airflow 3 a backfill is started from the UI or `airflow backfill create` and run by the scheduler; `catchup` is off by default and only creates missed runs | **Out of date** since Airflow 3. Re-voice this beat |
| `de-python` | `batch-builtin` | "Since Python three twelve, itertools batched does exactly this." | `python.mdx`: it does the same job but yields tuples, where the helper on screen yields lists | Imprecise. Re-voice if the beat is being touched anyway |

`de-orchestration`'s `sla-enforce` beat ("a deadline callback that alerts when
a task misses its target") still holds: the page now names Airflow's Deadline
Alerts, which replaced the SLA callbacks removed in Airflow 3.0, and the
narration never said "SLA callback".

## 3. Checks pass, narration true but narrower than the page

| Video | Beats | What the page now adds |
| --- | --- | --- |
| `be-concurrency` | `gil`, `gil-cost`, `gil-proc` | The GIL answers now say they describe the default build, and that the free-threaded build (officially supported since Python 3.14) runs CPU-bound threads in parallel. The narration describes the default build only, which is still what most candidates run. |
| `da-ai-assisted` | `hook` | Narration: "Most analysts now draft queries with an AI assistant". Page: "Analysts draft queries, formulas, and chart code with an AI assistant". The dated "now" is the only difference. |

## 4. Found on the way, not caused by this pull request

Thirteen `results.json` files record the engine they were measured on as
`PostgreSQL 18.3` (most as `PGlite 0.5.8`). The repository has run
`PostgreSQL 18.6 (PGlite 0.5.16)` since the runtime upgrade, so rerunning any
of those checks rewrites the stamp. The measured rows did not change. If a
video prints the engine version on screen, that label is one patch release
behind. Two more (`de-python`, `ds-python-pandas`) store timings and peak
memory that differ a little on every run.

## What it would take to bring them back in line

**Option A: re-anchor the three checks, no new audio.** Every fact the three
backend videos narrate is still on the page, so the checks can point at the
new wording (the table rows and footnotes above). That is an edit to
`be-interview/check.mjs` (11 phrases), `be-ai-round/check.mjs` (4 keys) and
`be-code-review/check.mjs` (4 keys). Making `be-interview`'s comparison ignore
line breaks, as the other two already do, would stop it failing on rewraps.
This leaves the videos saying "Since 2025" and "the twenty twenty-five top
ten" while the page no longer does.

**Option B: re-voice the beats that carry a date.** Nine beats across four
videos:

- `be-interview`: `ai`, `ai-survey`, `ai-survey-data`
- `be-ai-round`: `grade-canva`, `inj`, `daily-vague`, `daily-caveat`
- `be-code-review`: `bugs-survey`
- `da-ai-assisted`: `hook`

**Either way, re-voice the factual ones.** `de-streaming` `topic-key` and
`de-orchestration` `bf-year`, plus `de-python` `batch-builtin` if wanted. These
are independent of the evergreen question: the pages were corrected because
the old statements were wrong or superseded.

## Videos that still match (35)

`be-algorithms`, `be-api-design`, `be-databases`, `be-object-design`,
`be-scaling`, `be-system-design`, `da-ab-testing`, `da-advanced-sql`,
`da-interview`, `da-pandas`, `da-spreadsheets`, `da-sql`,
`da-statistics-communication`, `da-visualization`, `de-dimensional-modeling`,
`de-distributed`, `de-interview`, `de-modeling-history`, `de-pipelines`,
`de-pipelines-for-ai`, `de-sql-patterns`, `de-sql-performance`,
`de-warehousing`, `ds-deep-learning`, `ds-experiment-design`,
`ds-experiments-in-practice`, `ds-interview`, `ds-llm-evaluation`,
`ds-ml-evaluation`, `ds-ml-models`, `ds-probability`, `ds-product-sense`,
`ds-python-pandas`, `ds-sql`, `ds-statistics`.

Several of these were ahead of their pages. `da-pandas` and `ds-python-pandas`
already narrated pandas 3's `ChainedAssignmentError`, `da-ab-testing` and
`ds-experiments-in-practice` already treated primacy as the reverse of
novelty, `be-databases` already mentioned PostgreSQL 18's skip scan, and
`de-modeling-history` already covered version 7 UUIDs. The page fixes brought
the pages up to what those videos say.
