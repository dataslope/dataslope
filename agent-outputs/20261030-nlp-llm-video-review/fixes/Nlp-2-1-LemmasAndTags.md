# Nlp-2-1-LemmasAndTags: fixes (`video/src/videos/nlp-lemmas-and-tags`, Hope)

I fixed all 9 findings (0 P1, 2 P2, 7 P3), P2s first. Every check passes. I recut three beats from the kept take for free, voiced seven beats on their own (604 characters), and recorded no new take.

## Findings

| # | Pri | Status | What changed |
|---|-----|--------|--------------|
| 1 | P2 | fixed | Fig. 4 now has a **"lemma, no tag"** row drawn from `S.naive`, just above the tagged row (now "lemma, with tag"). It inks on "Without tags", and were, running, had and eaten are marked as each is said. The marks hold until "unchanged". `lemmas` was split: "Now lemmatize with those." was recut from the take. The new beat `contrast` says "Without tags, were, running, had and eaten come back unchanged. With them, were becomes be, running run, had have, and eaten eat." "Runners becomes runner" is no longer named as a win. A new `RESCUED` in `data.ts` derives the four rescued words from naive versus aware and throws unless they are the four the narration names. The Porter row's note now reads "only cuts endings, and lowercases", which explains its "the". The rows are 82 apart (they were 86), so all six fit. |
| 2 | P2 | fixed | `tags` was re-voiced: "NNS, a plural noun, for runners; VBD, a past-tense verb, for were; VBG, a verb's ing form, for running." A 22px gloss appears under each tag as it is said ("plural noun", "past", "ing form") and goes on "first letter". The VBD gloss is "past" because "past tense" sat 16 px from "plural noun" and the two read as one phrase. `letter` was split: its first sentence was recut, and a new beat `map` says "J, as in JJ, is an adjective, …". `check` now says "…against WordNet, the dictionary behind the lemmatizer." The same words ink under Fig. 3's "In WordNet?" head as they are said. DT, CC, PRP, VBN and RB stay unglossed because the narration never names them. |
| 3 | P3 | fixed | "a noun" is cued to the phrase's own "running" (`raceRunningAt`). It now lands with the phrase, after the "one word at a time" label has gone. `RIGHT_X` moved from 1090 to 1140, so Fig. 2 starts 76 px clear of "already a dictionary form", and the phrase ends at x 1701. |
| 4 | P3 | fixed | I removed the blue tone from Fig. 4. Blue now has only one meaning in the video: a WordNet entry (Fig. 1's running, Fig. 3's "In WordNet?"). The two lemma rows use yellow marks as words are said. The close sweeps over the four rescued lemmas (be, run, have, eat). `FOUND` is gone from `data.ts` because nothing else used it. |
| 5 | P3 | fixed | New beat `tie` after `check`/`survive`: "Good and well tie at four letters, so the first one listed wins." good and well are marked in the "In WordNet?" column as each is named. On "first one listed", the listed good is marked, then the result good. `TIE` in `data.ts` derives the tie from `trace("better","a").kept` and throws unless exactly two forms tie at four letters and the first of them is the result. |
| 6 | P3 | fixed | `placed()` is `Math.max(cols[i].x, centred(text, i))` and is used in all three lemma and stem rows. "they" to "have" is now 14 px, the same as every other pair, and "have" to "eat" is also 14 px. |
| 7 | P3 | fixed | The legend draws each WordNet code as the same 28px chip the row uses ("J → [a] adjective"). `LEGEND_STEP` went from 58 to 64 so the chips have room. The row is now labelled "WordNet pos". |
| 8 | P3 | fixed | On `close`'s "part of speech", `lemmatize("running", pos="v")  →  run` inks under Fig. 4 in Fig. 1's code face. `"v"` is highlighted, and the result chip sits in running's column, under the rows' run. The word, pos and lemma come from `SENTENCE` at `tokenAt("running")`. The line is 40 px below the Porter row and ends at y 988 on screen. |
| 9 | P3 | fixed | `alone` was split into "It sees one word at a time, never the sentence." (`pauseAfter` 0.7) and `job`, "So it can't tell what job that word is doing." Both were voiced on their own. They now run at 2.4 and 2.9 words a second (the old beat was 3.54), with a 0.7 s gap between them. The cues on "one word" and "sentence" stay in `alone`. |

## Voice

- **604 characters re-voiced**, each beat on its own:
  - `alone` (47)
  - `job` (45)
  - `check` (98)
  - `tie` (64)
  - `tags` (145)
  - `map` (79)
  - `contrast` (126)
- **Recut from take-1, free:**
  - `survive`, the second sentence of the old `check`
  - `letter`, its first sentence
  - `lemmas`, its first sentence
- **Unchanged:** no new take, and `takes/` is untouched. The other 14 beat MP3s (hook, more, noun, race, lookup-in, list, listed, rules, wa, nothing, tag-in, tagger, porter, close) are byte-identical to the committed files (checked by md5).
- **Not done:** `--force`.

## Length and checks

- **Length (`npm run cues`):** 24 beats, 376 words, **170.6 s (2:51)**, 132 wpm. It was 147.1 s (2:27).
- **`tsc` (my folder):** clean.
- **`eslint src/videos/nlp-lemmas-and-tags`:** clean.
- **`npm run check:cues`:** passes, with no failures anywhere.
- **`npm test`:** 69 pass, 0 fail. An earlier run had one failure, in llm-attention-score, which another fixer has since cleared.
- **`check:motion`:** passes, nothing still for 3 s.
  - The first run failed on one 4.0 s still over `check`/`survive`, after "WordNet,". The "the dictionary behind the lemmatizer" gloss in finding 2 fixed it.
  - The longest still now is 2.5 s, in `wa`.
- **`check:sync`:** passes. Every beat is within ±0.12 s; the worst is +0.07 s (`porter`). The seven beats voiced on their own are within 0.02 s.
- **`check:mix`:**
  - Passes: narration −24.6 LUFS, effects 24.9 LU under it.
  - Closest point: 1:41.1, where speech is 5.8 dB above the effects. That is the per-word taps in `tagger`, which I did not change.
- **`check:frames`:** passes (2 images, 8 arrows, no tabular hyphen, every cue names its occurrence).
- **Stills, each looked at:**
  - Hook at 26.2, 27.6 and 31.9 s.
  - Lookup at 68.5 and 76.6 s.
  - Sentence at 121.3, 136, 145, 151.5, 160.3, 165.5 and 168.5/170 s: the glosses, legend chips, no-tag marks, with-tag pops, Porter note, code line and final frame.

## measurements.json

All existing values came back identical; no finding needed a new number. `measure.py` reproduces the file byte for byte. HEAD already records Python 3.13.17 (the coordinator's snapshot), so the file has no diff. The naive line was already measured (`sentence.naive`). The tie and the rescued set are derived in `data.ts` from values already measured, and both throw if the data stop matching the narration.

## Lesson change recommended (optional)

`content/courses/natural-language-processing-python/pos-tagging.mdx:308-309` is correct but names only two of the four words the tags rescue. It also leaves room for the misreading in finding 1 (that the tag is what turned runners into runner). Suggested text:

> Compare the two lines. Without POS, "were", "running", "had" and "eaten" survive unchanged. With POS, they become "be", "run", "have" and "eat" ("runners" → "runner" happens in both, since a plural noun needs no tag).

## Shared changes

None needed. Everything is local to `video/src/videos/nlp-lemmas-and-tags/`, the narration folder, and `out/Nlp-2-1-LemmasAndTags*`.

## Files

- `video/src/videos/nlp-lemmas-and-tags/script.ts`
- `video/src/videos/nlp-lemmas-and-tags/data.ts`
- `video/src/videos/nlp-lemmas-and-tags/SentenceScene.tsx`
- `video/src/videos/nlp-lemmas-and-tags/LookupScene.tsx`
- `video/src/videos/nlp-lemmas-and-tags/HookScene.tsx`
- `video/src/videos/nlp-lemmas-and-tags/Video.tsx`
- `video/public/narration/nlp-lemmas-and-tags/`:
  - `alignment.json`
  - changed: `alone.mp3`, `check.mp3`, `lemmas.mp3`, `letter.mp3`, `tags.mp3`
  - new: `job.mp3`, `survive.mp3`, `tie.mp3`, `map.mp3`, `contrast.mp3`

The coordinator's WIP snapshot `ea9cd2ff` already contains all of this, and the working tree matches it.
