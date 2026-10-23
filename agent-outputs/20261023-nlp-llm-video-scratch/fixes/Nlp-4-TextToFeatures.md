# Nlp-4-TextToFeatures: fix pass

Review: 0 P1, 6 P2, 10 P3. I fixed all 6 P2s and 9 of the 10 P3s, and partly fixed the other P3 (#8).

| # | P | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | New beat `rule-twice` ("Used twice in this document, cat would score twice as much."). Beside cat's 1/6 × 1.10 = 0.18 there is now a dashed ghost: "if twice", 2/6 × 1.10 = 0.37, computed in measure.py. "the"'s worked example and the tie note clear out first, and a note now reads "No stopword list: rarity alone silenced *the*." |
| 2 | P2 | fixed | New beat `sklearn-why` ("It also counts raw words, and scales each row to length one."). "It even stays on top" is now its own beat, `sklearn-top`, with a 1.4 s pause after it. Fig. 13 is retitled "One corpus, two tf-idf recipes". At "It also", a footnote names both defaults, marked as each is spoken. The chart now has a heading ("Doc 1's tf-idf scores through `TfidfVectorizer()`") and arrives with its result at "On these three documents". "the" turns red at "stays on top". The fade now starts at "makes a call", so the red bar stays at full contrast for about 6 s. |
| 3 | P2 | fixed | The line now says "Sentiment keeps its negations." (new beat `tasks-sent`), re-cued to the "no, keep negation" cell. |
| 4 | P2 | fixed | New beat `reset-ex` traces "Not really, it was good?". Under each token, a lamp shows the flag: lit after "not" and "really". The comma is marked at "comma clears", and the lamps from the comma on appear hollow at "the flag first". The row then scores +1, positive. A note gives "with no reset: −1, negative" (resetCheck). `reset` now has a 1.0 s pause after it. |
| 5 | P2 | fixed | The "No meaning" panel now has computed rows. C "great film" and D "excellent film" run over the columns excellent / film / great (0 1 1, 1 1 0). The shared film column glows at "meaning", and a note says "The two reviews share only *film*." |
| 6 | P2 | fixed | New beat `idf-log` ("The log keeps a very rare word from swamping the rest."). It comes with the lesson's callout example on screen: "so a word in 1 of 10,000 documents weighs 9.2, not 10,000". The ln gloss is now just "the natural log". |
| 7 | P3 | fixed | Headlines now cross-fade instead of leaving empty slots: Counts ("Three new documents" → "By raw count, 'the' leads every row."), Menu (out at menuAt − 10) and Lexicon (out at seesAt − 10). Idf shows "TF-IDF = term frequency × inverse document frequency" while TF-IDF is named. |
| 8 | P3 | partly | I removed the arrows between the four optional steps, so they read as dashed options after "tokenize". I did not light up the cards each pipeline takes in Fig. 3. |
| 9 | P3 | fixed | Fig. 1 is retitled "One document, as words and as counts over a shared vocabulary". Fig. 8 labels its header row "the lesson's vocabulary". |
| 10 | P3 | fixed | Authorship: new beat `author-why` ("How often someone writes words like the, of and that is a fingerprint.") plus a matching note under the table row. Binary: "...as in short texts." (`binary` re-voiced, and the spam line split into `binary-spam`). |
| 11 | P3 | fixed | Raw counts that haven't turned into tf-idf yet are dimmed from catScoreAt − 4 (DocTable `wait`), so cat's 0.18 no longer sits among undimmed counts. |
| 12 | P3 | fixed | `counts` now reads the documents as written: "the cat sat on the mat, the dog ran in the park, the comet streaked across the sky". "By raw count, the word the leads every row, with two." is split into `counts-lead`. |
| 13 | P3 | fixed | BagScene now reads left to right: Fig. 6 slides to X0, and Fig. 7 (documents, vocabulary, matrix) builds at x 820. |
| 14 | P3 | fixed | Fig. 12 is retitled "The same table, as TF-IDF". |
| 15 | P3 | fixed | The context row now scores "the thriller was unpredictable" with *unpredictable* added to the negative list (computed in measure.py): −1 in the sum column, "negative" struck, with the note "a good thriller". A note under the chips says "with *unpredictable* added to the negative list, as brakes would want". The missing-words row's note now reads "in the lesson's lists, *unpredictable* is in neither". |
| 16 | P3 | fixed | Fig. 3's "dropped" label now sits at X0 with the other row labels. |

## Re-voicing

540 characters across 8 beats, each voiced alone (no `--force`, no new take): `tasks-sent`, `author-why`, `binary`, `counts`, `idf-log`, `rule-twice`, `sklearn-why`, `reset-ex`. Four beats were split at sentence breaks and recut from the kept takes at no cost (`tasks`, `binary-spam`, `counts-lead`, `sklearn-top`). `narrate --dry-run` now reports 0 of 58 beats to voice. The only timing-only change is `reset`'s pause, 0.7 → 1.0 s.

## Length

446.5 s (7:26), 58 beats, 997 words, 134 wpm. The reviewed cut was 410.4 s (6:50).

## Checks (final code)

- Typecheck (folder): clean. ESLint (folder): clean.
- `check:cues`: no findings for this video.
- `npm test`: 59 pass, 0 fail.
- `check:sync`: pass. 58 beats, worst +0.04 s (`idf-log`), every beat within ±0.12 s. There have been no narration changes since this run.
- `check:frames`: pass. 4 images, largest stretch 0.69; 6 arrows, 0.0° of bend.
- `check:motion`: pass, nothing holds still for 3 s (longest 2.8 s, `blind`). The first run after the fixes failed on 5 stills, fixed as listed under "Anything new".
- `check:mix` (informational): narration −24.6 LUFS (peak −6.8 dBFS), effects −45.9 LUFS (21.3 LU under). Where both sound, speech is a median 24.2 dB above the effects (5th percentile 10.0 dB). The closest moment is 5:17.0, 9.4 dB for 50 ms, where the gauge's pop now lands on "Counts".

Stills: 47 stills were taken across every changed place: Menu, TwoPipelines, Tasks, Bag (including the slide), Binary, Blind, Counts, Idf, Morph (tie, rule, rule-twice), Default, Lexicon, Flag (reset, reset-ex) and Limits. I looked at each one. Two problems turned up and are fixed, and five stills were re-taken to confirm:
- Fig. 18: the context row's note collided with the −1 under "unpredictable". The rows are now respaced (context 456, missing 594) and the note moved below the badge.
- The reset row: lamps under tokens with and without a sign sat at different heights, a few pixels off the "flag" label. The lamp cell now has a fixed height and the label is re-aligned.

## Anything new

- Lesson discrepancy, noted in script.ts and not repeated in the video: rule-based-sentiment.mdx:413 and :478 say the reset stops "not great, but terrible" from flipping "terrible". Under the lesson's own code it scores −2 with or without the reset, so the video uses its own sentence, "Not really, it was good". The script header now records this, along with the other new computed facts (cat twice = 0.366, the log callout's 9.21, the great/excellent rows, the context trace).
- `check:motion` caught five stills of 3 s or more: the menu opening, `binary`, the scikit-learn aside, the turn into `decide-in`, and the reset example. Each now has something to move: the toolbox appears at "a choice". A note now reads "for short texts, presence is enough: less swayed by length", from the lesson, at "short texts". The tf-idf chart arrives at "On these three documents", after the footnote marks. The gauge appears at "Counts and weights". In the reset row, the comma is marked and the post-reset lamps appear at "the flag first". The stills for each were re-taken and checked.
- In IdfScene, the new `idf-log` cue variable clashed with cat's `logAt`. ESLint passed it and tsc caught it; it is renamed `logNoteAt`.
