# DataScientist-5-DeepLearning: P3 fixes

Report: `agent-outputs/20261029-ds-interview-video-review/DataScientist-5-DeepLearning.md`
(14 P3s, #6-#19). The P2 pass fixed none of them. Folder
`video/src/videos/ds-deep-learning/`. Nothing committed.

| # | Finding | Status | What changed |
| --- | --- | --- | --- |
| 6 | Batch norm never says it normalizes each unit across the batch; normalized row ends empty | fixed | `bn` split; the middle sentence re-voiced as `bn-each`: "For each unit, across the mini-batch, it shifts and scales the unit's inputs to mean zero and variance one." Row 1 reads "one unit's input, across a mini-batch of 8 examples" (the second half cued to "across the mini-batch"); "spread 1.75" is now "standard deviation 1.75" (two lines, clear of the reasons list); ghost dots stay on the normalized line as the dots move on. |
| 7 | The same two outcomes in opposite colors | fixed | Question 14 swapped: spread 1 (blows up) orange, spread 0.01 (shrinks) red, as in Q5's exploding and vanishing. Q2's "zero the negatives" is ink, and the zeroed −2 is tinted yellow (pointed at), not red. |
| 8 | Three animations loop during the transformer | fixed | The CNN filter makes one pass (25 positions) and stops on the last; the RNN keeps reading while it is described, then from "A transformer" finishes the pass it is on and holds on its last token. The transformer's own arc glow stays: it is the panel being described. |
| 9 | Overfitting minimum squeezed into the first 4% of the axis; unexplained spikes | fixed | Q7 is on a log epoch axis, 20 to 4,000 (ticks 20, 100, 1,000, 4,000; "training epochs (log scale)"): the low at 160 sits 39% across, with "stop here" in the open. Labels and the "lowest" note re-placed clear of both curves. A 20 px note under the training curve: "spikes: Adam's steps overshooting". The Adam rate was not lowered: that re-runs the network and moves the narrated numbers (epoch 160, "more than twice that low", 0.11 against 0.24). The Q9 chart stays linear (its point is the end values) with no spike note of its own; it is labelled as Q7's network. |
| 10 | Centred labels centred on their figure's left edge | fixed | "scores", "sum: 100%" and "weights: how much each token takes from each" now take their figure's centre; so does "each query against each key", which had the same bug. |
| 11 | Text under 19 px | fixed | Q9 chart ticks at the default 20; Q14 chart ticks at 20, its y labels drawn locally as "10" at 21 px with a real 15 px superscript `<tspan>` (the shared `Axes` takes only a string); the attention blend's "(the)" etc. at 20. |
| 12 | Self-attention leaves out where q, k, v come from, and what d is | fixed | `attn` split; `attn-qkv` re-voiced: "Three learned matrices turn each token's vector into a query, a key and a value." `attn-score` re-voiced: "Score every query against every key with a dot product. Divide by the square root of d, the number of entries in each, so the softmax doesn't put all its weight on one key. Then softmax each row into weights." On screen: "Q, K, V: each token's vector × three learned matrices", "d = 4, the entries in each q and k; √d keeps the softmax from putting all its weight on one key", and the score caption gains ", by dot product". |
| 13 | Q3 describes shapes without why; dying ReLU unnamed; no GELU; legend leaves early | fixed | `act` split three ways; `act-sig` re-voiced ("...goes flat at both ends, where its slope, and so the gradient, is nearly zero."); `act-relu` split and `act-dying` re-voiced ("A unit whose inputs stay negative stops learning, the dying ReLU problem. Leaky ReLU fixes it with a small slope there, and GELU with a smooth curve.", the page's wording). Sublabels: "flat ends: slope, and so gradient, near 0", "the same shape, centered: the next layer gets inputs around 0" (the centring reason is screen-only), "or GELU: a smooth curve through 0"; the shaded note gains "the dying ReLU problem" on a second line. The legend and softmax no longer leave on "one more idea": they hold to the cut. |
| 14 | Page-check beat dense and a detour | partly | Screen: the formula reads `σ′(z) = σ(z)(1 − σ(z))`, as said; the forward chain is re-spaced so every arrow is 60 px (they were 20 px stubs). Timing: `backprop-page` holds 2.2 s before the cut (was 0.7, which the 1.6 s scene gap swallowed), so the table gets 0.6 s more. Not re-voiced: the voice went to the answer findings (#6, #12, #13, #18, #19), and "the page's code" is the series' convention (ML models, Experiment design, Product sense all narrate "the page's ..."). Cutting the beat to "a quarter at most" would also say that twice in a row, since Q5 opens on it. |
| 15 | Stray green line in the list of fixes | fixed | The "the step size: the machine learning round" note is deleted; the spoken bridge carries the turn. |
| 16 | Bridges end on a blank page | fixed | `OptScene`, `DropScene` and `BnScene` no longer clear on the bridge's last word; each holds to its cut. A fourth case the report missed, `VanishScene` clearing on "about the path" (review frames 229-231 were blank), is fixed the same way. |
| 17 | 313 iterations without the round-up; a fragment; an oversized batch box | fixed | `check.mjs` now also writes `epoch.exact` (312.5) and `epoch.lastBatch` (16). The line reads "10,000 examples ÷ 32 a batch = 312.5, so **313** iterations an epoch", and "the last batch holds 16" sits under the bar's right end. The fragment is now "batch: the examples behind one update; iteration: the update". The batch marker is one batch's true width (a green sliver), and the bar draws 312 boundaries, so the last batch is the partial one. |
| 18 | Q2 shows the collapse but not what non-linearity buys | fixed | `linear-fix` split; `linear-depth` re-voiced: "Now depth adds something: the network can draw curved boundaries, and with enough units, approximate almost any function." On screen under "now depth adds something": "curved boundaries, almost any function", each half on its words. |
| 19 | The plan overclaims | fixed | `plan` split; `plan` re-voiced: "Of the fifteen questions in this video, twelve get worked through, with every number computed by hand in NumPy." On screen: "**12** worked through, every number computed by hand in NumPy". |

Already done centrally (`05b0cad8`) and not touched here: none of this video's
findings were in that set.

## Facts

`check.mjs` re-run in Pyodide 314.0.7
(`NODE_PATH=$S/DataScientist-1-Statistics/pyo/node_modules`). `results.json` is
identical to the committed file apart from the two new fields `epoch.exact`
(312.5) and `epoch.lastBatch` (16); `data.ts` types them. GELU is named, not
plotted, so it needed no numbers.

## Voice

**902 characters re-voiced** (`narrate --dry-run`), seven beats, each on its own:
`plan` (111), `linear-depth` (121), `act-sig` (126), `act-dying` (149),
`bn-each` (107), `attn-qkv` (80), `attn-score` (208).

Six beats were split at sentence breaks first, at no cost: `plan` → `plan` +
`plan-quick`; `linear-fix` → `linear-fix` + `linear-depth`; `act` → `act` +
`act-sig` + `act-tanh`; `act-relu` → `act-relu` + `act-dying`; `bn` → `bn` +
`bn-each` + `bn-mean`; `attn` → `attn` + `attn-qkv` + `attn-score`.

How the kept pieces were cut. `narrate --recut` refuses this video (takes 3, 4
and 5 predate solo re-voices of `opt`, `opt-rest`, `decay`, `arch`,
`arch-rnn`). The split was first made with `split.mjs` (each beat's own file,
re-encoded once; alignment and length came back identical on a test re-cut of
`plan`). Then, per the coordinator, the eight kept pieces (`plan-quick`,
`linear-fix`, `act`, `act-tanh`, `act-relu`, `bn`, `bn-mean`, `attn`) were
re-cut from the takes instead, with `$S/DataScientist-5-DeepLearning/tools/recut-takes.mjs`:
narrate's own `--recut` on a scratch root holding all six takes and a script of
each take's own text split into its beats plus this pass's splits. It
reproduced all 29 untouched beats byte for byte (file and alignment), and the
eight pieces' alignments match the split versions (two, `act-tanh` and
`bn-mean`, place their first word 10-20 ms later). So every kept piece is a
single encode from its take. Takes untouched.

GELU is said in 0.48 s, as a word rather than four letters.

## Length and checks

- New length: **658.0 s** (10:58), 51 beats, from 629.0 s (+29 s: the longer
  re-voiced answers, the pauses at the nine new sentence-break splits, and
  0.6 s more hold after `backprop-page`).
- Typecheck (folder) and lint: clean.
- `npm run check:cues`: passes. `npm test`: 59 pass, 0 fail.
- `check:motion`: passes, nothing still for 3 s (10 stretches of 2.0 to 2.5 s). The first two runs failed on one stretch, 3.0 s at 3:24.5, the opening of Q5 while the question is read (it had passed at under 3 s in the P2 pass and tipped over here); fixed by building that opening a step at a time: the empty axes on "exploding gradients", "each layer:" on "That backward sweep" and its product on "a long product", the sigmoid line on "The sigmoid's slope" (stills 206.2 and 209.6 s looked at).
- `check:sync`: passes, 51 beats, worst +0.03 s (`decay`, untouched); the new and split beats all within it.
- `check:mix`: exit 0. Narration -19.8 LUFS, effects 29.7 LU under it; where both sound, speech a median 31.2 dB above. Closest 7.0 dB at 3:00.6, the `el-pop` on "Their product" in `backprop-chain`, an untouched effect the P2 pass also listed (8.9 dB, 50 ms windows).
- `check:frames`: not run (no arrow, illustration or ERD changed; the
  backprop arrows were only moved and lengthened, same `ElbowArrow`).
- Stills looked at (31 + 3 + 2 + 2): 25.5 (plan), 77, 88.3 (Q2), 105.5, 113, 136,
  147.5, 151.8 (Q3), 175, 199, 201.5 (Q4), 257.9, 258.8, 259.4 (Q5 hold), 320,
  322.5 (Q6 hold), 345.8, 356.3 (Q7), 433, 437.5 (Q9 hold), 451.5, 463.5,
  479.5, 485.5 (Q10), 500, 528 (Q11), 545.5, 556.8, 569.5 (Q12), 598.5, 625.5,
  643.5 (Q13-15); re-checks at 136, 258.8, 451.5, 205.5, 208.3, 206.2 and
  209.6. Two defects found in them and fixed: "dying ReLU" first ran
  past the shaded half into the ReLU line (now its own line inside it), and
  the BN row label's "mini-batch" took a digit-wide hyphen from `Tagline`'s
  `TABULAR` (now a normal-numeric span).

## Noticed

- The coordinator's work-in-progress snapshots (`5d1993ef`, `e9181649`)
  already hold all of this pass's changes; I made no commit.
- Q7's "lowest" note shows 0.102 (`bestVal` is 0.1025, and both JS and Python
  round it down), while `script.ts`'s fact list says 0.103. Nothing says the
  number aloud; left.
- The Q9 chart is still a linear 0-4,000 axis, so its own minimum sits
  against the y-axis. Its narration is about the end values (0.11 against
  0.24), which read fine; left.

## Shared-kit suggestions

- `Axes` (`da-statistics-communication/parts.tsx`): let `yFormat`/`xFormat`
  return a `ReactNode`, so a tick can carry a `<tspan>` superscript; Q14
  draws its own ticks only for that.
- Any part that spreads `TABULAR` over a whole label (this folder's own
  `Tagline` does) will keep producing digit-wide hyphens in words; I worked
  around the one case here with a normal-numeric span. Applying tabular
  figures to number spans only, kit-wide, would end the class.
- `narrate`: a `--recut` that cuts any take that still matches its span of the
  script, rather than refusing when one take is stale (what
  `recut-takes.mjs` does by hand).
