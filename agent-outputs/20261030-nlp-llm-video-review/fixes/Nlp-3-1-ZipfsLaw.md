# Nlp-3-1-ZipfsLaw: fix report

All 12 findings fixed (5 P2, 7 P3). Nothing is committed. Every file I changed is under `video/src/videos/nlp-zipfs-law/`, `video/public/narration/nlp-zipfs-law/` or `video/public/images/nlp-zipfs-law/`.

## Findings

| # | Pri | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | The narration now names the anchor. `predict` is split into "So the law makes a prediction." plus a new beat `anchor`: "Start from the top word: the second should turn up half as often, and the tenth, a tenth as often." `rough` is split too: "And the tenth, she, comes in at more than four times its prediction." stays as recorded, and a new beat `crowd` adds "The top words crowd together, so the law is rough at the very top." On screen, Fig. 3 is now titled "The novel's top ten, against one over the rank from the top word" and the legend reads `predicted from “to”`. Row 1's 5,239 is highlighted on "top word". On "crowd together" the top three rows come back to full strength and the near-tie ring swells. I kept "its prediction" instead of "that" because the kept take already says it and the anchor is now named one beat earlier. |
| 2 | P2 | fixed | Fig. 2 now has a faint decade grid (10% ink, fading in with the log ticks; no rank-1 line, which would double the y axis). The triangle's run covers exactly one column (10 to 100) and its drop covers one row's height. The leg labels now read "one step down: a tenth the count" and "one step along: 10× the rank". `slope` now says "That's a slope of minus one: one step down for every step along.", and each phrase is highlighted as it is spoken. No gridline crosses a label. Where one cannot be avoided, the label gets a paper halo, as the "Zipf's law" tag already had: the run's label sits on the 100 gridline, and the fit tag sits over the rank-100 line. The two "Zipf's law" lines moved into the 1,000-to-100 row, clear of both gridlines. The "slope −1" suffix is mounted only once it shows, so its halo no longer cuts the 10,000 gridline beforehand. |
| 3 | P2 | fixed | `warn` is split, and the new `logaxis` beat says "On a log rank axis, the top hundred words fill half the width, as if they were half the vocabulary." A grey note "as if they were half the vocabulary" appears beside the log band. `plain` is unchanged, since it already says "of the vocabulary". `top100` now says "Count the text they fill instead, and those hundred words are sixty percent of the book." On screen: "the same 100 ranks: 1.4% of the vocabulary". Fig. 5 is retitled "Plain shares of the text, and of the vocabulary". The suggested "of the text" alone would be wrong for its second bar, which is 39% of the vocabulary. |
| 4 | P2 | fixed | `idf` now says "And it's why IDF, inverse document frequency, gives a word more weight the fewer documents it turns up in." It runs 7.6 s and the 2.6 s tail is kept. The tag is two lines in the narration's order, "IDF: more weight / the fewer documents", with each phrase highlighted as it is said. |
| 5 | P2 | fixed | `law` pauseAfter is now 1.2. `slope` is split (pauseAfter 1.0) and the new `fit` beat says "Fit a line to the top thousand words, and its slope comes out at minus one point one four." `predict` is split after "prediction." (pauseAfter 0.8). `thousandAt` and `pointAt` are re-cued to `fit`. New rates: slope 2.4 w/s, fit 2.9, predict 3.2, anchor 2.9, against `slope` 3.0 and `predict` 3.5 before. |
| 6 | P3 | fixed | Both legs are now one path, A down to D and then along to C, starting on "ten times further". The triangle grows out of the line and no leg floats free. The drop thickens briefly on "a tenth" and on "one step down", and the run on "every step along". The old highlights on "10×" and "a tenth" fade out on "slope of minus one", and the step highlights fade on "top thousand", so at most two highlights show at once. |
| 7 | P3 | fixed | The narration now says "minus one point one four", which matches the tag's −1.14 and the unit video nlp-history. It says "top thousand words" instead of "first thousand". |
| 8 | P3 | fixed | Fig. 4's bands are now blue: a light blue wash with a blue edge on the log axis, solid blue on the plain axis. Red is left for the near tie, the 4.5× multiples and the struck stopwords. I redrew the sieve: a yellow rim holds three blue pebbles and red grit falls through. I also redrew the balance, though the finding didn't ask for it: its red gem (the word IDF weighs most) sat right under the sieve and clashed with the red-means-dropped rule the same way. It now has a blue gem outweighing a heap of red pebbles on a yellow post. I checked both over white and the frames check passes them (largest stretch 0.50). The kit's color-role comment is updated. Cost about $0.01 (Batch API). |
| 9 | P3 | fixed | Row 2's word "the" is highlighted on "second word". The bracket is gone. Instead, red ticks mark she's bar at 1× to 4× the prediction, labelled "1×" to "4×" at 20px; the 1× tick falls exactly at the end of the dashed bar. They land one every 8 frames from "more than four times", and "4.5× the prediction" appears on "its prediction". |
| 10 | P3 | fixed | Fig. 1's bracket label now reads "more than half the different words: 53%". Figs. 1, 3 and 6 now say "The novel's …" and Fig. 5 is retitled (see 3). `FigLabel` takes a string and lives in the shared kit, so I used "the novel's" instead of italicizing *Emma*. |
| 11 | P3 | fixed | Chips are now 126px wide (`CHIP_W` 126, `COL` 132): the grid ends at x 1410, left of the divider at 1426, and "woodhouse" has room. In Fig. 1, "rank" and "rank, log scale" are two right-aligned labels that crossfade at the log switch, so "rank" ends at the axis end. |
| 12 | P3 | fixed | While Fig. 4 has the page to itself, its strips are 64px tall and the plain strip sits at y(600). On "Count the text" they shrink to 40px and lift to exactly the old end positions, so Fig. 5's layout is unchanged. About 30% of the frame below Fig. 4 is still empty while it is alone, down from 40%. |

## Voice

- **611 characters re-voiced** (budget 1,200), Hope on `eleven_v4_turbo`, each beat voiced on its own with `--only`:
  - `slope` 64, `fit` 90, `anchor` 98, `crowd` 66, `logaxis` 99, `top100` 88, `idf` 106.
- `predict`, `rough` and `warn` were split at sentence breaks and cut free from take-1 with `--recut`.
- The other 16 beat MP3s are byte-identical to the committed files, and `takes/` is untouched.

## Length and checks

**New length: 145.9 s (2:26)**, up from 126.6 s. 23 beats, 349 words, 144 wpm overall.

| Check | Result |
| --- | --- |
| `tsc` (this folder) | No errors. |
| `eslint src/videos/nlp-zipfs-law` | Clean. |
| `check:cues` | Nothing in this folder. One run flagged `llm-attention-score/RecapScene.tsx:77`, another fixer's video; it was gone on the later run. |
| `npm test` | 69/69 on the final run. An earlier run failed 1, the same llm-attention-score cue. |
| `check:motion` | Pass: nothing holds still for 3 s; longest still 2.8 s. The first run on the new audio failed two 3.3 s stills: the end of `fit` (58.5–61.8 s) and the tail of `rough` (83.8–87.0 s). I fixed them by cueing the −1.14 to "its slope" and its highlight to "point one four", spacing the ticks out, and moving the 4.5× label to "its prediction". |
| `check:sync` | Pass: worst +0.07 s (`fit`), all 23 beats within ±0.12 s. |
| `check:mix` | Pass: effects 22.4 LU under the narration, speech a median 24.5 dB above them. The closest spot is 4.5 dB at 2:04.2: an existing pop on "stopwords exist" in `WhyScene` that I didn't touch; it only moved with the timeline. |
| `check:frames` | Pass: 3 images, largest stretch 0.50, no tabular hyphen, every cue names its occurrence. |

All checks went through `out/entries/Nlp-3-1-ZipfsLaw.tsx` and the render queue.

I looked at stills of every changed place: `video/out/Nlp-3-1-ZipfsLaw-{27.5,33,43,47,51.5,59.8,60,64.5,66.5,71,76,84.8,88,90.5,101.5,107.2,113.5,120.8,143}.jpeg`. The 60 s still predates the highlight fade-out in finding 6, and 59.8 is the current version of that frame.

## measurements.json

I re-ran `measure.py` with the scratch environment. **Every value came back identical**; the only change is `env.python`, from 3.13.16 to 3.13.17, kept as it came out. No new numbers were needed: the 1× to 4× ticks come from `EMMA.predict[9]`'s `law` and `count` inside the scene.

## Lesson and shared changes

- **Lesson:** none needed. "The quiet law: Zipf" gives the ideal form anchored on the first word ("the second most frequent word turns up about half as often as the first"), which is exactly the anchor the video now names. The Spärck Jones section already says "rarer across a collection" for IDF.
- **Shared kit:** none needed. One optional change: letting `FigLabel`'s `title` (`src/editorial/ui.tsx`) take a `React.ReactNode` would allow italic titles such as *Emma*. I used "the novel's" instead.
