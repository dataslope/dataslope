# Llm-5-Benchmarks: fix pass

All 15 findings are dealt with: 14 fixed and 1 partly fixed (a P3). Both P1s and all six P2s are fixed. I made no commits; the coordinator's commits (latest 2d4dbd9) carry the work. The container restart left the files on disk and in 1c08728, with all seven new beats already voiced (`narrate --dry-run`: 0 of 49 beats left to voice). I picked the pass up from there.

## Findings

| # | P | Result | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | **The cost verdict now follows the numbers, not the lesson.**<br>• `measure.py` prices each step up the tiers per error it avoids (`cost.steps`, read by `data.ts` as `STEPS`).<br>• Haiku to Sonnet: 30,000 fewer errors a month for $1,567.50, 5.2¢ each. Sonnet to Opus: 10,000 for $1,650, 16.5¢ each. Opus to Fable: none.<br>• Fig. 15 now marks Sonnet's row too (+3 points, 20x the cost). Sonnet's bars turn blue on "Sonnet's three points".<br>• Two computed lines sit under the table: "Sonnet over Haiku: 30,000 fewer errors a month for $1,567.50, about 5.2¢ each", and Opus's and Fable's steps.<br>• The verdict: "A minute of someone's time costs more than that: the cheap model is the expensive one."<br>• `cost-error` re-voiced ("So price the errors. Sonnet's three points mean thirty thousand fewer a month, at about five cents each."), plus a new beat, `cost-verdict`.<br>• The old green and red tags are gone, and the step annotations are neutral ink.<br>• The script header has a "THE VERDICT FOLLOWS THE NUMBERS, NOT THE LESSON" note citing evaluating-for-your-task.mdx:182-184 and :300. |
| 2 | P1 | fixed | Fig. 12's tick numbers, bars and caption now fade in together, so nothing floats alone (cued as in #7). |
| 3 | P2 | fixed | **The saturation bracket now spans the models, not the gap to the ceiling.**<br>• MMLU's row is redrawn as the 92 to 95 band where every frontier model sits ("every frontier model, 92 to 95"). The bracket "all within 3 points" spans that band.<br>• GPQA Diamond's row is struck and dimmed on "skip the row" too.<br>• Fig. 5 is retitled "Where the top scores sit, 0 to 100". |
| 4 | P2 | fixed | **The ceiling and "noise" are explained, and placed by what they judge.**<br>• `mmlu-gap` re-voiced: "...some of its answer keys are wrong, so about ninety-five is the most anyone can score." The screen says "wrong answer keys cap it near 95".<br>• "Noise." sits centred under the 0.6 bracket. To make room, the ARC-AGI-3 row moved 36 layout units down.<br>• The four pitfall marks moved off "Noise." to the empty left side of the zoom. |
| 5 | P2 | fixed | **Construct mismatch is defined, and Fig. 8 starts on its first beat.**<br>• `mismatch` re-voiced with the lesson's definition: "A benchmark measures performance on the benchmark, and that only carries over if your task looks like it."<br>• The source tag arrives on "construct mismatch". A dashed "your task?" box and arrow arrive on "your task", and are replaced on "invoices".<br>• The headline's second half is now "Does the score carry over?", cued to "carries over", at 64px. |
| 6 | P2 | fixed | **The SWE-bench story no longer contradicts itself.**<br>• `swe-drop` re-voiced: "That's why OpenAI stopped reporting SWE-bench Verified in February..." ("sank" is gone).<br>• `transfer` re-voiced: "Tasks like SWE-bench still predict agentic coding, because they look like the job..."<br>• The tag now reads "repo-patch tasks, like SWE-bench". It is a task shape, not the struck set. |
| 7 | P2 | fixed | **Fig. 12 now waits for the size it is about.**<br>• It is cued to "With fifty examples" (`fiftyAt - 8`). The n = 20 bar lights first, then n = 50 on "ninety-four".<br>• During `twenty` only the counter and "about four in five" are on screen. |
| 8 | P2 | fixed | **"Pick on cost" now has evidence on screen.**<br>• The lesson's own follow-up run, `true_b = 0.78` (already in `measure.py`, same seed), is drawn as a gray second series in Fig. 12 from "look close", with a legend. It runs 37.5% to 59.5%, labelled at n = 100.<br>• The "30" highlight is gone. |
| 9 | P3 | partly | **The stand-ins are labelled; the loop is not drawn.**<br>• Column headers and totals now read "cheap stand-in" and "good stand-in". The caption reads "Ten tickets, two stand-in models (keyword rules, not real LLMs)".<br>• No loop is drawn: the space beside the table holds the two totals and the misses line. |
| 10 | P3 | fixed | **The two harnesses are drawn differently.**<br>• ARC's box carries a short "notes" slip; OpenAI's carries a long "all its reasoning" strip. Both are cued to "hidden reasoning".<br>• "keeps only the notes the model chooses" now sits beside ARC's standard harness (the lesson's wording). |
| 11 | P3 | fixed | **The free-text properties have a subject.**<br>• `props` re-voiced: "Say it writes a summary: does it name the three facts, and stay under the limit?"<br>• Card 2 is subtitled "of a summary", and its second property now reads "stays under the length limit".<br>• Card 1 keeps the ticket queue as its structured output. That is the lesson's "make it checkable": restructure the task into fields. |
| 12 | P3 | fixed | The HLE launch marker now ends 16 layout units below the bar's centre. The label starts right of the marker, with a halo. The gridlines stop above it. |
| 13 | P3 | fixed | The ARC-AGI-3 track now draws on "Arc AGI three" (`arcAt - 8`). |
| 14 | P3 | fixed | "same model / same test / same week" are now one flex row with a 48px gap. |
| 15 | P3 | fixed | "find out yourself" now sits on the baseline of its row. Every headline is 64px (Families was 62, Mismatch 56). |

## Re-voiced
**833 characters**, 7 beats, each voiced on its own (the limit is 900). No take was recorded again and `--force` was never used.

| Beat | Note |
| --- | --- |
| `mmlu-gap` | re-worded |
| `swe-drop` | re-worded |
| `mismatch` | re-worded |
| `transfer` | re-worded |
| `props` | re-worded |
| `cost-error` | re-worded |
| `cost-verdict` | new beat |

## Length and checks

**New length: 5:58** (357.5 s, 49 beats), up from 5:38. The longer beats account for it.

| Check | Result |
| --- | --- |
| typecheck and lint, my folder | clean |
| `check:cues` | clean for my folder (the package-wide failures are nlp-counting-words') |
| `npm test` | nothing names llm-benchmarks. Two failures, both nlp-counting-words, mid-edit by its builder. |
| `check:sync` | pass, worst **+0.06 s** (`sat-tell`); every re-voiced beat within ±0.02 s |
| `check:motion` | pass. The longest still is **2.5 s**, and nothing holds for 3 s. The first run after the fixes found one 3.0 s still at the Mismatch opening; I fixed it with a marker on the source tag on "performance" and a swell on "SWE-bench", and the re-run passed. |
| `check:frames` | pass. 4 illustrations, largest stretch **0.92**; 15 arrows, **0.0°** bend under every head |
| `check:mix` (informational) | effects **25.6 LU under** the narration (-45.4 against -19.8 LUFS). Their peak is -21.1 dBFS at 0:00.6, which is the logo. Where both sound, speech is a median 26.9 dB above the effects (5th percentile 10.5 dB). |

## Also changed
- The script header had Figs. 11, 12 and 13 mislabelled (they are 13, 14 and 15). Corrected, and the header now records each fix's source. It also says where the lesson's prose and its numbers disagree (the cost verdict, and "almost always" at 20 examples), and that the video follows the numbers.
- **Color.** Fig. 15's step annotations were in the trap red, and the cheap model was drawn in the "backed" blue. Now all tiers are gray, Sonnet turns blue at its step, and Haiku is marked red only on "the expensive one".
- `Tag` in `parts.tsx` takes an optional `pulseAt`, a swell when the tag is named again. Fig. 8's source tag uses it on "SWE-bench".
- I looked at stills at every changed place: Families end, the `noise` beat, Scale end, Saturation end, Contamination end, Reporting end, the Mismatch opening and the `transfer` beat, the Examples scene at `own`, `twenty` and its end, Harness end, Scoring end, and Cost at `cost-error` and at its end.

## Left
- The deep-dive candidates ("how many examples", "what an error costs", the harness) are beyond this pass, as the fix brief asks.
