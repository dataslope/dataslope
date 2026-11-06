# Re-dubbing initialisms in the narration: plan

**Status (later on 2026-11-05):** built, and ready to voice once the
ElevenLabs spend is approved. The Data Engineer review and its fixes landed
first, as asked, so no beat is voiced twice.

- **Built.** The lexicon is `video/src/narration/lexicon.ts` (SQL, DAG,
  OLAP, SKU, CUPED and SUTVA, as below). `scripts/narrate.mjs` sends each
  beat's spoken form, lays the timing back onto the written text, and
  records `spoken` in `alignment.json`. `lexicon.test.ts` checks the
  substitution and the mapping back. It also checks, from the committed
  timing, that every initialism voiced through the lexicon runs faster than
  letter speed.
- **Checked without the API.** `--recut` on two untouched videos rewrote
  nothing.
- **Decisions taken.** "AI" and "LLM" both lose their expansions (eight
  beats), and SWE-bench stays as letters. The edits to the eight beats are
  saved as `agent-outputs/20261105-redub-expansions.patch` rather than
  committed: a beat whose text has changed plays without audio until it is
  voiced.
- **The run.** With the patch applied, `narrate --dry-run` over every
  voiced video plans 52 beats in 19 videos, 9,303 characters, each voiced on
  its own with no whole take recorded. At the fix pass's measured rate
  (about 0.22 credits a character), that is about 2,100 credits.
- **Waiting on approval.** The first voicing call was stopped by this
  session's permission check, which treats spending ElevenLabs credits as a
  purchase. To run it:

  ```bash
  git apply agent-outputs/20261105-redub-expansions.patch
  cd video
  for v in da-ab-testing da-advanced-sql da-ai-assisted da-interview da-pandas da-spreadsheets da-sql da-statistics-communication db-relational-history db-why-design de-dimensional-modeling de-orchestration de-warehousing ds-experiment-design ds-experiments-in-practice ds-interview ds-llm-evaluation ds-python-pandas ds-sql; do npm run narrate -- $v; done
  ```

  Then run `npm run check:sync -- <video>` on each, and `npm test`.

**Original status:** proposal, nothing re-voiced yet. Asked for 2026-11-05: initialisms
said the way people say them (DAG as "dag", SQL as "sequel"), acronyms
everyone knows never expanded ("AI, artificial intelligence"), and only the
sentences that need it re-recorded, never a whole video.

## What is wrong, measured

No listening needed to find these. Every voiced beat's `alignment.json` holds
ElevenLabs' character times, so how long each initialism took is on disk for
all 71 voiced videos (3,170 beats). Letters read one at a time take about
0.2 s each; a word takes about half that.

| Written | Beats | Median spoken | Per capital | So it is read as |
| --- | --- | --- | --- | --- |
| SQL | 33 (32 voiced) | 0.64 s | 0.21 s | "S-Q-L" |
| DAG | 5 | 0.72 s | 0.24 s | "D-A-G" |
| OLAP | 4 | 0.96 s | 0.24 s | "O-L-A-P" |
| SKU | 2 | 0.96 s | 0.32 s | "S-K-U" |
| CUPED | 1 | 1.36 s | 0.27 s | "C-U-P-E-D" |
| SUTVA | 1 | 1.36 s | 0.27 s | "S-U-T-V-A" |
| RAG, SHAP, ACID, ANOVA, JSON, ReLU, GELU, NASA | | 0.24 to 0.48 s | 0.06 to 0.13 s | words already, correctly |

The Data Engineer scripts already write "sequel", and there it takes 0.40 s
(median of 20), against 0.64 s for "SQL" everywhere else. So the fix works,
and it can be checked the same way after re-voicing (see Verification).

Four beats also expand "AI" ("AI, artificial intelligence, has changed some
of it"), and four expand "LLM" ("a large language model, an LLM").

## The pronunciation table (proposed)

**Your call** on the rows marked *decide*.

| Written | Say | Beats | Note |
| --- | --- | --- | --- |
| SQL | sequel | 33 (32 voiced) | also "Spark SQL"; the hyphenated "S-Q-L" in the relational-history video is the history being told and is left alone |
| DAG | dag | 5 | keep the one "a dag, a directed acyclic graph" gloss: DAG is not everyone's word |
| OLAP | oh-lap | 4 | OLTP stays letters, as people say it |
| SKU | skew | 2 | |
| CUPED | cue-ped | 1 | the interview answer that spells it out stays |
| SUTVA | sut-vuh | 1 | |
| MySQL | my sequel | 0 now | the Data Engineer script already says "my sequel" |
| AI | A-I, never expanded | 4 | drop "artificial intelligence" from all four |
| LLM | L-L-M | 4 | *decide*: drop "a large language model" too? For a data audience in 2026, I would |
| SWE-bench | ? | 3 | *decide*: letters (as now) or "swee-bench" |
| Everything else | letters, as now | | API, CSV, CTE, ETL, ELT, CDC, SCD, NLP, GPT, IQR, PCA, SGD, KNN, CNN, LSTM, UUID, UTC, SLA, AUC, MMLU, ... |

Kept on purpose: "Natural language processing, NLP for short" (the NLP
course defining its own subject), the OLAP, OLTP and CUPED expansions inside
interview answers (the expansion is the answer), and "comma-separated values"
in the pandas `read_csv` beat.

## How: one lexicon, applied when the text is sent

**Recommended.** Add `src/narration/lexicon.ts`, a table from the written form
to the spoken one (`SQL: "sequel"`, `DAG: "dag"`, …), matched case-sensitively
on whole tokens. `narrate.mjs` sends the spoken form, then maps ElevenLabs'
alignment back onto the script's own text before saving it. A replaced token's
characters all take the span of the word that replaced it.

This is better than the two alternatives:

- **Respelling in the scripts** (what the Data Engineer series does now, with
  a test that guards that one series) puts "sequel" in the script. Cues that
  name the word must change too (`n.word(id, "SQL")` becomes `"sequel"`),
  captions would show it, and every future script has to remember. A table
  covers all 87 videos and every future one at once.
- **An ElevenLabs pronunciation dictionary** (alias rules) is the same idea
  held as remote state: a dictionary id and version to pin, and two
  behaviours to verify on `eleven_v4_turbo` (whether alias rules apply, and
  whether the returned alignment still spells the text that was sent, which
  `narrate` refuses to do without). Doing it locally has neither problem and
  works on any model.

The part that answers "only what needs it": `alignment.json` records, per
beat, the spoken text it was voiced from (`spoken`; older entries were sent
verbatim, so their `text` is their spoken text). `narrate` already re-voices a
beat whose text changed. With this change it also re-voices a beat whose
**spoken** text changed. Adding `SQL: "sequel"` to the table therefore marks
exactly the 32 voiced SQL beats as needing audio, and nothing else. No list is kept
by hand, and `--dry-run` shows the plan before anything is billed.

Two follow-ons come free:

- The Data Engineer scripts can go back to writing "SQL" and "MySQL". Their
  spoken text does not change, so nothing is re-voiced, and the series test
  becomes a lexicon test that covers every video.
- `takes/` stay usable: a take's text is what was sent, so `locateBeats()` is
  given each beat's spoken text, and `--recut` keeps working.

## What gets re-recorded

The re-recording unit is the **beat**, the script's sentence-or-two unit, not
the video:

| Granularity | Beats | Videos | Characters sent | Share of all narration |
| --- | --- | --- | --- | --- |
| **Each affected beat, whole (recommended)** | 52 | 19 | 9,627 | 2.5% of 381,451 |
| Only the affected sentences, spliced into the beat | 52 | 19 | 4,557 | 1.2% |

Each beat is voiced on its own, with the beats either side sent as
`previous_text` and `next_text`, so its intonation runs on from its
neighbours. That is `narrate`'s existing path for an edited beat; it placed
ThinkingStatistically's six transition beats. The seam falls on the pause
that already separates two beats.

Sentence-level splicing would halve the characters but needs a new `--patch`
mode. It cuts the beat's audio at a sentence pause, voices one sentence and
splices it in, which adds a seam *inside* a beat. 43 of the 52 beats contain a
sentence that doesn't need changing. I would only build this if the credit
cost matters. The account has about 41,700 credits left this period (89,444
of 131,112 used), so either option fits.

Not recommended: splitting beats at the sentence so the untouched sentence is
cut from the take for free. Course videos put at least `COURSE_MIN_PAUSE`
(0.55 s) between any two beats, so the split would stretch a natural sentence
pause. It would also move cues to new beat ids across 19 `Video.tsx` files.

## Runbook

1. **Agree the table** (above), including the *decide* rows.
2. **Lexicon PR, no audio.** `lexicon.ts`, the `narrate.mjs` changes
   (spoken text out, alignment mapped back, `spoken` recorded, the stale
   check, `locateBeats` on spoken text), and tests: every lexicon key is
   matched whole, the alignment map round-trips, and the Data Engineer series
   test becomes a lexicon test. Gate: `npm run narrate -- <video> --dry-run`
   over all 71 voiced videos lists exactly the 52 beats in the appendix.
   Anything more is a bug.
3. **Script edits.** Drop the "artificial intelligence" glosses (and "large
   language model" if agreed). Revert the Data Engineer respellings to "SQL"
   (free, see above). Run `npm run check:cues` to catch a cue on a word that
   was removed.
4. **Voice, one video at a time.** `npm run narrate -- <video>`, then
   `npm run cues -- <video>`. Commit per series, so a bad batch is one revert.
5. **Verify** (below), then update README's "Writing initialisms for the
   voice" and `acronyms.test.ts`.

## Verification

- **Sync:** `npm run check:sync -- <video>` for each re-voiced video. Every
  beat must start within 0.12 s of its cue. A re-voiced beat can run longer
  or shorter; cues re-time themselves, and this proves it.
- **Pronunciation, measured:** a check that reads `alignment.json` and fails
  any lexicon word spoken at letter speed (for example "sequel" over 0.5 s,
  where letters take 0.64 s). This is the measurement above, run as a test,
  so a beat that slipped back to "S-Q-L" can't go unnoticed.
- **Listening:** the measured check finds pronunciation, not tone. Before
  committing a video, listen to each re-voiced beat in context (the Studio,
  or a render with `--props='{"sfx":false}'`). A beat that sounds apart from
  its neighbours is re-voiced alone with `npm run narrate -- <video> --only
  <beat>`, for that beat's characters only.

## Risks

- A beat voiced alone can sound slightly apart from the take around it
  (README, "Adding the voice-over later"). The neighbour context and the
  listening pass are the mitigation; `--only` is the cheap retry.
- `--force` re-records whole takes and is never needed here.
- `sql-null-trap` is not voiced yet. It will pick up the lexicon on its first
  voicing, so it is not in the count.
- `check:motion` can flag a still stretch if a re-voiced beat runs much
  longer. Run it on any video whose beat timings moved by more than a second.

## Appendix: every beat affected

"Voiced" is whether committed audio exists for the beat's current text.

**da-ab-testing** (`da-ab-testing`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `r-sql` | SQL | 261 | yes |

**da-advanced-sql** (`da-advanced-sql`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `hook` | SQL | 210 | yes |
| `qualify-where` | SQL | 59 | yes |

**da-ai-assisted** (`da-ai-assisted`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `hook` | AI expanded | 242 | yes |
| `changed-core` | SQL | 97 | yes |
| `takehome-answer` | SQL | 187 | yes |
| `r-prompt` | SQL | 190 | yes |
| `r-llm` | LLM expanded | 280 | yes |

**da-interview** (`da-interview`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `loop` | SQL | 212 | yes |
| `probe` | SQL | 446 | yes |
| `ai` | AI expanded | 207 | yes |
| `ai-off` | SQL | 103 | yes |
| `series` | SQL | 192 | yes |
| `next` | SQL | 79 | yes |

**da-pandas** (`da-pandas`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `hook` | SQL | 148 | yes |
| `merge-join` | SQL | 103 | yes |

**da-spreadsheets** (`da-spreadsheets`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `crosstab-count` | SQL | 145 | yes |
| `lookup-limits` | SKU | 292 | yes |
| `index-left` | SKU | 119 | yes |
| `tool` | SQL | 77 | yes |
| `tool-when` | SQL | 303 | yes |

**da-sql** (`da-sql`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `hook` | SQL | 133 | yes |

**da-statistics-communication** (`da-statistics-communication`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `next` | SQL | 151 | yes |

**db-relational-history** (`db-relational-history`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `oracle` | SQL | 160 | yes |
| `industry` | SQL | 79 | yes |
| `quirk` | SQL | 48 | yes |
| `yu` | SQL | 105 | yes |

**db-why-design** (`db-why-design`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `sql` | SQL | 64 | yes |
| `means` | SQL | 67 | yes |

**de-dimensional-modeling** (`de-dimensional-modeling`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `oltp` | OLAP | 265 | yes |
| `olap` | OLAP | 192 | yes |

**de-orchestration** (`de-orchestration`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `cron-dag` | DAG | 322 | yes |
| `anti` | DAG | 161 | yes |
| `anti-list` | DAG | 298 | yes |
| `quality` | DAG | 268 | yes |
| `r-deps` | DAG | 210 | yes |

**de-warehousing** (`de-warehousing`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `rows` | OLAP | 68 | yes |
| `rows-olap` | OLAP | 170 | yes |

**ds-experiment-design** (`ds-experiment-design`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `cuped` | CUPED | 297 | yes |

**ds-experiments-in-practice** (`ds-experiments-in-practice`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `network` | SUTVA | 415 | yes |

**ds-interview** (`ds-interview`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `loop` | SQL | 232 | yes |
| `probe-list` | SQL | 340 | yes |
| `ai` | AI expanded | 58 | yes |
| `ai-eval` | LLM expanded | 272 | yes |

**ds-llm-evaluation** (`ds-llm-evaluation`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `changed` | SQL, AI expanded | 160 | yes |
| `changed-layer` | LLM expanded | 312 | yes |

**ds-python-pandas** (`ds-python-pandas`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `merge-key` | SQL | 100 | yes |
| `next` | SQL | 148 | yes |

**ds-sql** (`ds-sql`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `hook-sql` | SQL | 117 | yes |
| `session` | SQL | 108 | yes |
| `pct` | SQL | 210 | yes |
| `next` | LLM expanded | 145 | yes |

**sql-null-trap** (`sql-null-trap`, drew)

| Beat | Says | Chars | Voiced |
| --- | --- | --- | --- |
| `three` | SQL | 53 | no |
