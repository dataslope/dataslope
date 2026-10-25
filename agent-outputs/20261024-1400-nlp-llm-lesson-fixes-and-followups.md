# NLP and LLM courses: lesson fixes, output indentation, video follow-ups

**Follows:** [the fixes and deep dives](20261023-1530-nlp-llm-video-fixes.md),
merged in dataslope/dataslope#716. That document listed 31 places where a
lesson's prose disagreed with its own code or with a source, one site bug,
and 11 video findings fixed only in part. This pass, dataslope/dataslope#717
(branch `claude/blissful-goldberg-149yc1`), closes all three.

## The lessons

Every row of the fixes document's two tables is corrected, 16 in How Large
Language Models Work and 15 in Natural Language Processing with Python. The
rule was the one the videos followed: where prose and numbers disagree, the
prose moves to the numbers. Where a code block itself was wrong, the block
changed and its prepopulated output was regenerated.

Three blocks changed shape rather than wording:

- **what-benchmarks-measure:** the "headroom" block printed percentages that
  grew near the ceiling, which argued against its own "noise" point. It is
  now a luck simulation: two equally good models replayed 10,000 times on
  each test's real question count (seed 0). MMLU's 0.60-point gap against
  0.63 from luck alone and GPQA Diamond's 0.60 against 4.04 are "within
  luck"; ARC-AGI-3's 32.50 against 14.00 is not.
- **embeddings:** the position demo summed the positioned vectors, which
  ties the two sentences again (`[1.5 1.8]` twice). It prints one vector per
  word, dog first `[0.9 0.2]` and dog last `[0.9 0.4]`, and a new paragraph
  says why the sum would hide the order.
- **attention-intuition:** scores already divided by the square root of 2
  were printed as "raw scores". The block prints the dot products, then the
  scaled scores, then the weights.

And one challenge card gained a test: rule-based-sentiment's comma reset was
justified by "Not great, but terrible", which scores the same with or without
it. The new case, "Not really, it was good", fails without the reset.
`check:challenges --filter rule-based-sentiment` passes.

## Python output kept its first line's indentation

`toOutputCells` (`app/_components/runtime/pythonDisplayOutputs.ts`) and the
Pyodide worker's streaming flush each `.trim()`med a text segment, which also
removed the leading spaces of the first line. A right-aligned
`f"{name:>6}"` table lost the padding on its first row, in a reader's Run and
in the recorded panels alike. `trimOutputText()` now drops only the blank
lines before the output and the whitespace after it, and the worker backs up
to the start of the first non-blank line. `__tests__/blockOutputs.test.ts`
pins it.

The recorded panels were repaired without rewriting anything else. Every
Python block was re-run with the fix (`--adapter python --force`, 1,711
blocks), and only the entries whose sole change was the restored indentation
were kept: **35 panels** across nine courses, from Statistics' standard
error tables to Python Basics' f-string alignment. The 118 other entries that
came back different (re-rendered figures, Plotly JSON, run-to-run output)
were left as committed, and so were their images.

The run also showed that a narrowed run keeps a changed block's old entry. A
video's `measure.py` that looks an output up by its text, as Llm-5's does,
would then pass against the old block. The five entries the edited LLM blocks
left behind are removed; on `main`, the full run in `block-outputs.yml`
retires such entries on its own.

## The videos

**Follow-ups.** The seven videos with a "partly" finding each finished it,
from [`FOLLOWUP-BRIEF.md`](20261023-nlp-llm-video-scratch/FOLLOWUP-BRIEF.md),
under a 300-character re-voicing cap. Reports are in
[`20261023-nlp-llm-video-scratch/followup/`](20261023-nlp-llm-video-scratch/followup/).

| Video | What changed | Re-voiced | Length |
| --- | --- | --- | --- |
| Llm-2 Meaning | `embedding` slowed to `vector`'s pace, 2.4 words a second | 84 | 6:47 → 6:48 |
| Llm-4 Cost | Lever 6's retrieval exception, drawn as Fig. 14 | 142 | 5:29 → 5:39 |
| Llm-5 Benchmarks | The harness loop drawn beside "The harness is just a loop" | 0 | 5:58 |
| Nlp-1 WhyTextIsHard | "Preprocessing" for the first half; each ambiguity rule drawn with its gist | 238 | 5:52 → 5:53 |
| Nlp-3 CountingWords | `rank` split from `giants`; Fig. 10's tags glide in two straight legs | 70 | 6:56 → 6:57 |
| Nlp-4 TextToFeatures | Fig. 2's menu lit per pipeline, so it ends as two recipes | 0 | 7:27 |
| Nlp-5 History | Shannon's 1948 contents page fills the empty right side | 0 | 5:20 |

534 characters in all. The fourteen videos now run 73:11.

**Re-measured.** Every `measure.py` was re-run against the corrected lessons
and the repaired outputs, and all fourteen pass:

- **Llm-5** runs the new luck simulation and the re-padded cost table, and
  takes MMLU's 95% ceiling from the lesson's prose, since the block no longer
  carries one. Every number on screen is unchanged; the narration's "that
  close to the ceiling, is noise" agrees with the block's verdict.
- **Llm-2-1** asserts the block's new "scaled scores" line, and its "raw
  scores" line against the dot products.
- **Llm-4** picks up Flash-Lite's 8.3x. Its Fig. 5 outline was a fixed 60px
  box that clipped the wider text; it is now sized to the text.
- Each script header that described a lesson error now describes the
  corrected lesson (Llm-1, -2, -2-1, -3, -5; Nlp-1, -3, -3-1, -5).

## Checks

- **Site:** `tsc`, `lint` (0 errors), `npm test` (1,296), `check:prose`,
  `check:mdx`, `check:mdx-tables`, `check:mcq`, `check:mermaid-code`,
  `check:diagrams`.
- **Video package:** `typecheck`, `lint`, `npm test` (59), `check:cues`.
- **Each changed video:** `check:frames`, `check:motion`, `check:sync` and
  `check:mix`, run by its builder on the final code. Llm-4's motion check was
  re-run after its last two edits.

`content/fumadocs-dev/bash-blocks.mdx` also had an unlabelled fence that
`check:mdx` rejects; it is labelled `text`.

## Still open

How the videos are embedded on the site is undecided, as for every course.
