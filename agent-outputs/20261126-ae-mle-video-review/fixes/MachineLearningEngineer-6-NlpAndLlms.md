# MachineLearningEngineer-6-NlpAndLlms: fixes

Review: `agent-outputs/20261126-ae-mle-video-review/MachineLearningEngineer-6-NlpAndLlms.md` (0 P1, 8 P2, 10 P3).

## Findings

| # | Sev | Finding | Status | What was done |
| --- | --- | --- | --- | --- |
| 1 | P2 | Q8 chart drew attention linear and the rest flat | fixed | Chart now plots one layer's multiply-adds over the whole context (trillions): attention 2n²d as a parabola, the rest 12nd² as a rising line, crossing at 24,576. New `cost.totals` in `check.mjs`; ticks every 4 trillion so no rule crosses a label. |
| 2 | P2 | Q5 heads drawn as slices of the token vector | fixed | Input bar stays whole; a line fans from it to every head; "64 each" labels the q/k/v row. |
| 3 | P2 | Q13 note said word counts stand in for an embedding model | fixed | "Scored by shared words, not by an embedding model". |
| 4 | P2 | Q1 never names byte-pair encoding | fixed | New beat `q1-bpe`; four lines under the o200k_base note, ending "Also: WordPiece, unigram". |
| 5 | P2 | Q18 missed the page's hosted-reasoning-model follow-up | fixed | New beat `r-random-host`; two lines under "Low for extraction…". |
| 6 | P2 | Q7 "forgetful" with no reason | fixed | `q7-a` split at its sentence break (both halves cut free from take-3), new beat `q7-grad` between; line reads "Forgetful over distance: gradients vanish". |
| 7 | P2 | Q4 output cleared after 2 s, page near-empty ~10 s | fixed | Worked example clears on "Simulate" (output up ~3 s); right column draws one number's spread against a dot product of 64 (8×, `rawSd`), back to 1× (`scaledSd`) on "Divided by eight", cleared before the pair grid. |
| 8 | P2 | Q2 word2vec arrows through the heading rule | fixed | Sentence row lowered, arcs flattened: tops 32 px under the rule. |
| 9 | P3 | Skip-gram / CBOW unnamed | fixed | Heading "word2vec: prediction (skip-gram)"; note "CBOW, the other variant: the neighbors predict the word". |
| 10 | P3 | PEFT answered with LoRA alone | fixed | Note "Other parameter-efficient methods: adapters, prefix tuning". |
| 11 | P3 | "rank 8" / "65,536" orphaned after merge | fixed | Both fade with the thin matrices. |
| 12 | P3 | attn-in lines to words outside the sentences | fixed | Lines (and their sound) removed. |
| 13 | P3 | Unlabelled hidden-state dot | fixed | "hidden state" label rides with the dot. |
| 14 | P3 | Q6 residual line along the stack outlines | fixed | Stack hints drawn as top and right edges only. |
| 15 | P3 | Joined bar seams | fixed | One bar once joined. |
| 16 | P3 | Title Case RAG labels | fixed | "Vector search", "Top passages". |
| 17 | P3 | 1.35 shown, "one point four" said | fixed | Shown at one decimal, 1.4 (rounded from `tokensPerWord`). |
| 18 | P3 | Q11 split notes, width key, underline | fixed | One-line notes; key "…not to scale"; underline narrows with the block. |

Counts: 18 fixed, 0 partly, 0 moot, 0 not fixed.

## Re-voiced (355 characters of 800; none for P3s)

| Beat | Before | After | Chars |
| --- | --- | --- | --- |
| `q1-bpe` (new, after `q1-piece`) | (none) | "Those pieces come from byte-pair encoding: start from single bytes, and keep merging the most frequent adjacent pair until the vocabulary is full." | 146 |
| `q7-grad` (new, between the halves of the old `q7-a`) | (none) | "Its gradients shrink with every step back, so distant words barely count." | 73 |
| `r-random-host` (new, after `r-random`) | (none) | "A hosted reasoning model may refuse these settings; there, you steer with the prompt, a reasoning-effort setting and structured outputs." | 136 |
| `q7-a` / `q7-tf` | one beat | split at the sentence break, both cut from take-3 with `--recut` (free; the take has a 0.47 s pause there) | 0 |

`r-random` lost its `pauseAfter: 0.6` (the default 0.55 now applies before `r-random-host`, which takes the 0.6).

## Images

None generated.

## Length

694.9 s (11:35) before, 720.9 s (12:01) after: +10 s at `q1-bpe`, +6.5 s at `q7-grad`, +9 s at `r-random-host`.

## results.json

Every existing value came back identical (checked key by key); one key added, `cost.totals` (49 points, attention 2n²d and the rest 12nd² per layer over n tokens). `check.mjs` now also quotes the page for BPE/WordPiece/unigram, CBOW, vanishing gradients, adapters and prefix tuning, and the hosted-model paragraph, and checks that "only grows linearly" matches `cost.totals`. It passes.

## Checks (final code)

- `tsc --noEmit`: no errors in `src/videos/mle-nlp-llms/` (0 errors in the whole run).
- `eslint src/videos/mle-nlp-llms`: clean.
- `npm run check:cues`: pass.
- `npm test`: 79/79 pass.
- `check:sync`: pass, 70 beats, worst +0.03 s (`q1-bpe`).
- `check:mix`: speech a median 30.3 dB above the effects, closest 11.6 dB at 9:25.6; WAVs deleted.
- `CHECK_SCALE=1 check:frames`: pass (4 illustrations, 42 arrows, spacing, one size per line, cue occurrences).
- `check:motion`: pass; nothing holds still 3 s (seven 2.0-2.8 s holds in the quick round, all under narration); preview deleted.

## Comparisons

`/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/compare/MachineLearningEngineer-6-NlpAndLlms/` (13 PNGs, `compare.json` beside them; after stills in `/tmp/claude-0/-home-user-dataslope/a7697946-07dc-5861-b60b-4725a18149d6/scratchpad/after/MachineLearningEngineer-6-NlpAndLlms/`):

- `01-question-8-s-chart-per-token-became-the-whole-co.png` (finding 1)
- `02-question-5-the-heads-read-the-whole-vector-not-s.png` (2, 15)
- `03-question-13-the-note-no-longer-undercuts-the-dem.png` (3, 16)
- `04-question-1-byte-pair-encoding-named-and-explaine.png` (4, 17)
- `05-question-18-the-hosted-model-follow-up-the-build.png` (5)
- `06-question-7-why-the-rnn-forgets-and-the-state-lab.png` (6, 13)
- `07-question-4-the-worked-example-s-output-held-thro.png` (7, timing)
- `07-question-4-the-8-spread-drawn-while-it-is-descri.png` (7, the spread)
- `08-question-2-arrows-clear-of-the-heading-rule-skip.png` (8, 9)
- `10-question-12-orphan-labels-gone-the-other-peft-me.png` (10, 11)
- `12-question-3-no-lines-to-words-outside-the-sentenc.png` (12)
- `14-question-6-the-residual-line-no-longer-tangles-w.png` (14)
- `18-question-11-one-line-stage-notes-an-honest-width.png` (18)

## Notes

- The page is not wrong anywhere this video quotes it. How BPE builds its vocabulary (merging from single bytes) is standard and not on the page; said as the general mechanism, which o200k_base follows.
- No shared-kit bug found; nothing in `src/editorial/` or `src/components/` needs a change for this video.
