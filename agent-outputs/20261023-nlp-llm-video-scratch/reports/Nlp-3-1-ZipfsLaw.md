# Nlp-3-1-ZipfsLaw: "Zipf's law, read off a log-log plot" (deep dive)

Folder `video/src/videos/nlp-zipfs-law/`, voiced by Hope. Nothing committed or pushed.

## Length, voice

- **126.6 s** (2:07) by `npm run cues`, 149 wpm overall, 19 beats.
- **1,653 characters** voiced (cap 1,900), in **1 take** (`takes/nlp-zipfs-law/take-1.mp3`), on `eleven_v4_turbo`, no `--force`, no re-voicing.

## Checks (all through `VIDEO_ENTRY=out/entries/Nlp-3-1-ZipfsLaw.tsx` and the render queue)

- Typecheck and lint for the folder: clean. `check:cues`: clean. `npm test`: 59 pass, 0 fail.
- `check:frames`: pass. 3 images, largest stretch 0.48; no arrows; every cue names its occurrence.
- `check:sync`: pass. Worst beat is `straight` at +0.03 s (0:35.0). Every beat is within ±0.03 s.
- `check:motion`: pass on the re-run. Nothing holds still for 3 s; the longest still is 2.8 s (0:52.3, `slope`). The first run failed on one 3.0 s still at 1:30.5, which is now fixed. The preview is kept as `out/Nlp-3-1-ZipfsLaw-preview.mp4`.
- `check:mix` (informational): effects -46.9 LUFS against narration -24.5 LUFS, so **22.4 LU under**. Effects peak -27.1 dBFS at 0:09.4. Where both sound, speech is a median 24.4 dB above the effects (5th percentile 12.0 dB).

## Scenes

1. **Plain axes** (`hook` to `tail`), Fig. 1. Emma's top twenty build as bars on plain axes, with "to: 5,239". On "cliff" the window widens to 100 ranks. On "keep going" it zooms out to all 7,079 ranks while the window's last rank counts up to 7,079. A bracket over the floor marks "more than half the words: 53%, used once or twice". The unit's novel watercolor sits top right.
2. **Log axes** (`switch` to `slope`), Fig. 2. The same step curve morphs onto log scales. The tick labels 1, 10, 100, 1,000, 10,000 are highlighted on "ten times the last". The dashed 1/rank line draws on "straightens", labelled "Zipf's law". A slope triangle shows "10× the rank" and "a tenth the count". Ranks 1 to 1,000 are then washed, with "slope −1.14" against the law's −1.
3. **Prediction** (`predict` to `rough`), Fig. 3. A table of ranks 1 to 10 with the prediction (5,239 / rank) as grey dashed bars, then Emma's counts as blue bars on the same scale. The ends of "to" and "the" are ringed as "nearly tied". The tenth row ("she", 2,340 against 524) gets a bracket and "4.5× the prediction". The headline turns to "Rough at the very top."
4. **Shares** (`warn` to `once`), Figs. 4 and 5.
   - Fig. 4 puts the top 100 ranks on a log rank axis (half the width) and on a plain one (1.4%).
   - Fig. 5 then shows the two shares on plain 100% bars: the top 100 words are 60% of the book's 161,600 words, and 2,739 of its 7,079 different words (39%) appear only once.
5. **Why** (`why` to `idf`), Fig. 6. Emma's top 100 words fill in as a 10×10 grid of chips. On "Seventy", the 70 on NLTK's stopword list are struck through, leaving the book's own words (mr, emma, harriet, knightley…). Two spots go in the right column: a sieve for "drop the stopwords" and a balance for "IDF: rarer weighs more".

Illustrations:
- `nlp-zipfs-law-sieve` and `nlp-zipfs-law-balance` are new (`video-icon`, watercolor). The batch sat at 0/2 for 3 h 46 min, so I cancelled it and generated the two images with `sync`. Both were checked by eye and kept on the first draw.
- `nlp-counting-words-novel` is the unit's image, copied into `public/images/nlp-zipfs-law/` under its original name.

## Facts

- Every number on screen comes from `measure.py`, which writes `measurements.json`, which `data.ts` reads.
- `measure.py` runs the lesson's Zipf block (interesting-discussions.mdx) verbatim and checks its stdout against `lib/generated/block-outputs.json`. It reads the same FreqDist further.
- It then **asserts** that everything it shares with the two unit videos is identical: total, distinct words, top ten, the whole ranked list and hapaxes (`nlp-counting-words`), and top100Share, slope, lineC, hapaxShare, secondByLaw and the curve (`nlp-history`).
- New quantities it computes:
  - 3,766 words used once or twice (53.2%);
  - the top 100 as 1.41% of the different words;
  - the predictions 5,239 / rank for ranks 1 to 10;
  - "she" at 4.47 times its prediction;
  - 70 of the top 100 on NLTK's English stopword list, loaded as frequency-distributions.mdx loads it.
- The fitted slope is −1.136 over ranks 1 to 1,000, the same fit, range and rounding as Nlp-5.
- The script header lists each source.
- There is nothing on screen I could not compute.

## Lesson discrepancies (not fixed)

- `content/courses/natural-language-processing-python/interesting-discussions.mdx:178` says "The most frequent word tends to be about twice as common as the second". Lines 232–234 then read the block's output as "The most common word is roughly twice the second". That block's own output, also prepopulated on the page, has "to" at 5,239 and "the" at 5,201, a ratio of 1.007. The video shows the near tie instead (Fig. 3).
- The same paragraph, line 232, says rank × freq "stays in the same ballpark down the list". The printed column climbs from 5,239 to 19,752 over its eight rows, 3.8×. Further down it peaks near 27,000 (ranks 20 to 50) and falls to 15,000 by rank 1,000. "Same ballpark" holds only loosely, and not for the top rows the block prints.
- Context only, not an error: frequency-distributions.mdx:202 says the top word "often accounts for ~7% of all tokens". That is the Brown corpus figure its `zipf-law` chart uses. In Emma the top word is 3.2%. The video does not repeat the 7%.

## Kit suggestions

- `kit.tsx` holds copies of the units' Headline, Mark, Strike, Tag, Bracket, Spot and Svg, which every NLP video re-copies. They belong in `src/editorial/`.
- A morphing linear-to-log axis (positions lerped per point) and a cross-fading tick chooser for a zooming axis (in `CurveScene.tsx`) would suit any video that shows a scale change.
- `Spot` here skips any id not listed in `IMAGES`. That let the scenes render before the art existed, and a shared `Illustration` could do the same.

## Left undone

- None of the checks remains open. The one long still that `check:motion` found (3.0 s at 1:30.5, over `plain`) was fixed with a bracket and a highlight across the plain rank axis on "vocabulary". `check:frames` ran before that one-line fix; the fix adds no image or arrowhead, and `check:cues` passed after it.
- Fig. 4 leaves the bottom third of the frame empty for about 12 s, until Fig. 5 arrives. I judged this acceptable rather than crowding the two rank axes.
