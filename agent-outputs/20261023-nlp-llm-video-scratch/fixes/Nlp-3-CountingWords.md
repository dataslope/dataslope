# Nlp-3-CountingWords: fix pass

Every P1 and P2 is addressed (one P2 only partly), along with all 11 P3s. 862 characters were re-voiced, within the 900 limit. All checks pass on the final code. Nothing was committed.

## Findings

| # | P | Result | What changed, or why not |
| --- | --- | --- | --- |
| 1 | P1 | fixed | Fig. 5 is redrawn as all 7,079 ranks on a **linear** rank axis, 1,150 px wide (`TailScene.tsx`). The top ten now take the first 1.5 px and are named in a callout at the spike ("the top ten: 22% of all the words" plus the ten words). The tail runs the full width. Its last 38.7% (the 2,739 words used once) gets a red band and its count. I chose linear over the suggested log axis. A log axis would give those 2,739 words (39% of the vocabulary) only 5.5% of the width, which is the inversion Nlp-5 got a P1 for. Linear draws both proportions as they are and doesn't teach the law. The narration keeps a single sentence on Zipf's law. |
| 2 | P2 | fixed | Fig. 15 now plots, for each n, the share of the n-grams you read that appear again somewhere in the book (98 / 70 / 27 / 6.6 / 1.5%, as 1 − once ÷ grams, added to `measure.py`). It is retitled "How often an n-gram you read in Emma appears again". Squares under each bar count the words of order kept, so both sides of the trade-off are on screen. "One sighting can't tell a pattern from an accident" gives the reason. Following the numbers rather than the lesson, the sweet spot is "bigrams, and trigrams with plenty of text"; the script header explains why. Re-voiced: `sparse`, `shares`, `sparsity`, `sweet`. |
| 3 | P2 | fixed | `bigram` is re-voiced: "…A lone not turns up in praise too, like not bad. The pair is what a sentiment model can learn is negative." On screen, the lone "not" lifts on "lone", a "not bad" chip arrives with "praise has a lone not too", and the word "feature" is gone. |
| 4 | P2 | fixed | Each of the five tiles arrives on its own word. The window opens, and the first bigram appears, only after "jumps". |
| 5 | P2 | fixed | The trigram window now steps 20 frames apart instead of 10. `formula` is split at its colon into `formula` and `rule` (re-cut from the kept take, no cost), with 0.8 s between. The overlap marks lift when the trigram pass starts. |
| 6 | P2 | partly | `giants` now has a 1.0 s pause after it (was 0.8). One curve drawn left to right replaces the 20-bar build, and the 2,739 count now sits in Fig. 5 where "the other end" points. Not split: the take has no pause at "count, and", so a re-cut can't cut there, and re-voicing the beat would have gone past 900 characters. |
| 7 | P2 | fixed | Repeated words in Figs. 1 and 2 now take a neutral grey wash (`REPEAT_WASH`). The "the" row is marked yellow, and "so the text repeats itself" is set in ink. Red now means only what the narration points at, including the hapaxes. |
| 8 | P3 | fixed | The three empty openings: Fig. 4's squares sprinkle in from "a hundred and sixty-one thousand". PennScene opens on the two "fish" tags (from `data.ts`) where Fig. 9 will build, until "tall". SparseScene inks the five category names and dashed outlines of the bars on "n-gram". |
| 9 | P3 | fixed | `penn` is split off by re-cut and re-voiced as "Those labels come from the Penn Treebank, the hand-tagged text it learned from." The headline is now "The Penn Treebank: *hand-tagged text.*" |
| 10 | P3 | partly | Fig. 3 is retitled "Emma, scored on more and more of it". Its rows still arrive on "grows": they are the growing text that word names, and they carry a motion fix. |
| 11 | P3 | partly | The sorted copies are now drawn after the chips and rows, so a word in flight passes over them, not under. The path is still a straight line. |
| 12 | P3 | fixed | The VBZ gloss is now "verb for he, she, it". `meanings` is re-voiced with "a present-tense verb for he, she or it", and "reads" is highlighted while it is said. |
| 13 | P3 | fixed | `tagfirst` is split off by re-cut (`even` keeps "Even were and had…"). It is re-voiced as "hand each word its tag's first letter", and on "first letter" each chip shrinks to that letter. That is the one sentence this unit gives the lemmatizing deep dive. |
| 14 | P3 | fixed | Fig. 10 is retitled "Sort the words by their tag's first letter". Its rows now stand in the legend's order (N, V, J, R) and fill as each is named. |
| 15 | P3 | fixed | Four-in-a-row is narrated ("one in fifteen"), and its bar rises on those words. |
| 16 | P3 | fixed | Fig. 14 now shows the three lines themselves (from `measure.py` via `sent_tokenize`). Their bigram counts are chips with ×N and no bars, so the figure no longer mixes two bar scales. |
| 17 | P3 | fixed | The Zipf note sits above the empty tail. |
| 18 | P3 | fixed | The tally now takes 2.5 frames per token (about 2.4 s). Rows appear in the order their words are first seen, with no gaps, then glide into `most_common()` order on "Ask". |

## Also fixed
The first render after the fixes had four new still stretches of 3 s or more (`meanings`, `slide`/`formula`, `bigram`, `sparsity`). Each now has a word-cued change:
- "reads" is highlighted on "he".
- The tiles and bigram chips are counted on "Five words" and "four bigrams".
- The lone "not" lifts on "lone".
- The room above each bar washes pale red on "accident".

## Voice
- **862 characters re-voiced**, each beat on its own: `penn`, `meanings`, `tagfirst`, `bigram`, `sparse`, `shares`, `sparsity`, `sweet`. No new take, no `--force`.
- **Free splits re-cut from the kept takes:** `penn`/`tall`, `tagfirst`/`even`, `formula`/`rule`.
- **Not done, for lack of budget:** splitting `giants` (#6).

## Length and checks
- **Length:** 6:55.9 (415.9 s, 57 beats, 129 wpm), up from 6:33.9.

| Check | Result |
| --- | --- |
| typecheck and lint (my folder) | clean |
| `check:cues` | clean |
| `npm test` | 59/59 |
| `check:sync` | pass, worst +0.04 s (`together`) |
| `check:motion` | pass, longest still 2.8 s |
| `check:frames` | pass, 4 illustrations, largest stretch 0.90 |
| `check:mix` (informational) | effects 20.6 LU under the narration (-45.2 against -24.6 LUFS); peak -21.1 dBFS at the logo; speech a median 24.3 dB above the effects, 5th percentile 10.3 dB; closest 8.4 dB at 4:32.7 (the tap as the tags shrink to first letters) |

- **Stills:** I looked at every place I changed, either as full-size stills (Fig. 5 during and after the tail scene, Fig. 15 with and without the sweet spot, Fig. 13, the Penn opening) or as frames from the motion-check preview (the tally re-sort, Fig. 3, the Penn opening, the VBZ highlight and the glides, the first-letter chips, the window, Fig. 14, the Sparse opening).

## Left
- #6: `giants` is not split (above).
- #10: the Fig. 3 rows still arrive on "grows".
- #11: the glide still travels in a straight line.
