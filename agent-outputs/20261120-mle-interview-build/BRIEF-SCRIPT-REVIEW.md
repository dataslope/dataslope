# Machine Learning Engineer interview videos: script review brief

You are the **independent reader** of some of the eleven Machine Learning
Engineer interview scripts, before any scene is built or any narration is
voiced. You did not write them. Read them the way the owner read the Backend
series' scripts, and the way a frame reviewer would later: as a viewer who
must not learn anything wrong, and as an interviewer who knows the follow-up
question. Then **fix what you find in the scripts yourself**, since nothing
is voiced yet and a word changed now is free. Another reviewer reads the
other scripts in parallel. The coordinator commits; you never do.

`V` = `/home/user/dataslope/video`.

## Read first

1. The plan, `agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md`:
   the parts, which video answers which question, the bridges.
2. `agent-outputs/20261120-mle-interview-build/BRIEF-SCRIPTS.md`: the rules
   the writers worked to. Hold the scripts to them.
3. `V/README.md`, "Narration and timing" (initialisms, scene gaps, bridges)
   and "What goes on screen" (so the figures the headers describe can be
   built honestly under those rules).
4. `agent-outputs/20261111-1900-be-interview-video-review.md`, "Series-wide
   problems": what the last series' frame review found. Most of it starts in
   the script.
5. For each of your videos: `V/src/videos/<folder>/script.ts` (header and
   beats), `check.mjs`, `results.json`, `data.ts`, `illustrations.json`, and
   the source page(s) in `content/interview/machine-learning-engineer/`.
   Four page fixes landed on 2026-11-20 (coding: cosine guard, mini-batch
   generator; ml-system-design: open PSI buckets; statistics: bootstrap
   sentence; deep-learning: backprop cost), and the lexicon in
   `V/src/narration/lexicon.ts` now says LoRA, GloVe, BERT, BLEU, ROUGE, ELU,
   SMOTE, SIMD, argmax, argpartition, MLOps, MLflow and ONNX as words.

## What to look for, in order

1. **Wrong or misleading.** A claim a run contradicts, a number on screen
   that differs from `results.json`, a simplification an interviewer would
   correct, a figure (as the header describes it) that says something other
   than its story: a color against its meaning (red the trap, green the
   answer, yellow pointing, blue data), a correct statement struck through,
   a label that reads as a different quantity.
2. **Stops short.** An answer that ends one step before the follow-up an
   interviewer asks next. Add the step, in a sentence, where it matters
   most; don't pad every answer.
3. **Coverage.** Every question the plan gives the video is answered once,
   by its heading, including those answered "together". Nothing answered
   twice across the series without a reason (the two reviewers split the
   series; flag a duplicate you suspect in the other half in your report).
4. **Joins.** The opening works on its own (no "in the last video"); the
   closing "Next:" line matches the plan's bridge and the next part's title
   in `V/src/series.ts`; short spoken turns between topics.
5. **Voice.** No em dashes, no spaced en dashes, no filler; no sentence
   opening "A" before an initialism; initialisms in plain caps; ROC-AUC and
   similar compounds respelled per the README with the cue phrases quoting
   the respelling; numbers as said; beats one to three sentences; `pauseAfter`
   0.6 to 1.0 s after a definition or a result; `scene: true` on every
   scene's first beat. Characters under 9,500 and within about 15% of the
   plan's budget.
6. **Buildable.** Each beat's on-screen note in the header can be drawn under
   "What goes on screen" (no cards, one size per line, nothing under 19px)
   without crowding: a beat that asks for six labelled things in one corner
   is a crowded page later. Flag and simplify.

## How to fix

- Edit `script.ts` beats and header notes. Keep beat ids stable where the
  beat survives; a new beat gets a new id.
- If a fix changes a number, it comes from a run: edit `check.mjs`, run it
  (`node video/src/videos/<folder>/check.mjs` from the repo root; Pyodide
  takes about a minute), and keep `data.ts` typed to match. Each check also
  asserts the narration's spoken numbers and quotes: keep it passing.
- Keep each video's characters under its cap; if you add, cut elsewhere.
- Don't rewrite for style. A script that is right, clear and buildable stays
  as it is.

## What you may touch

Only `V/src/videos/<your folders>/`. Never `content/`, the shared kit,
`Root.tsx`, `series.ts`, the lexicon, scripts or the README (report anything
needed there). Never `git` anything that writes, `npm install`, renders,
`narrate` without `--dry-run`, or `illustrations`. Type-check through
`out/cpu-slot.sh` from `V`: `out/cpu-slot.sh npx tsc --noEmit 2>&1 | grep src/videos/<folder>/`.

## When done

Return, per video (under 25 lines each): findings by severity (P1 wrong or
misleading, P2 stops short or hurts the video, P3 polish), each with the beat
id and what you changed; characters before and after; check.mjs result;
anything you could not fix and why; anything the coordinator must do
(lexicon, page, shared kit).
