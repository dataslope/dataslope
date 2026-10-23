# Nlp-1-WhyTextIsHard: fix pass

Review: 0 P1, 7 P2, 8 P3. All seven P2s are fixed. Of the P3s, six are fixed and two partly (#8, #12; reasons below). Nothing was committed by me.

## Findings

| # | P | Result | What changed, or why not |
| --- | --- | --- | --- |
| 1 | P2 | fixed | The casing row is now the lesson's other example, "a word capitalized only because it starts a sentence": **T**he cat / the cat / *the same word*, with the T in red like the other rows' trouble marks. `casing` is re-voiced: "A capital letter at the start of a sentence doesn't make a new word." "lowercase" is now the right step for it. Apple against apple is gone (lowercasing merges those). The script header says why. |
| 2 | P2 | fixed | Fig. 9: a dropped token flashes red in the row it leaves, then stays as a struck ghost in the row of the step that dropped it. "3. cleaned" now holds the struck comma and "!", and "4. no stops" holds the five struck stopwords; the rows above stay whole. Each count (13, 11, 6) matches its row's live chips. |
| 3 | P2 | fixed | New beat `running`: "Running and barking stay as they are: nobody told the lemmatizer they're verbs." Both chips are highlighted on their words, with "read as nouns" beside row 5. `measure.py` checks the claim (told "verb", the lemmatizer gives run and bark). One clause only, as the brief asks; the deep dive takes it further. |
| 4 | P2 | fixed | Fig. 7's Counts box now counts the same three words (cats 1, are 1, running 1, from `measure.py`). Its gloss is "how often each appears". |
| 5 | P2 | fixed | The tags are now read aloud. `reasons` was rewritten and a new beat `roots` added: "Contractions and punctuation are why we tokenize, and casing is why we lowercase." / "Word forms are why we stem or lemmatize, reducing each to a root. And multi-word units are why we count runs of words, called n-grams." Each tag inks as its word is spoken, so every term gets a gloss. The tags now match the narration (tokenize, lowercase, stem or lemmatize, n-grams). The dim still falls on "split", now after all five tags have been read. Fig. 7 no longer says "n-grams" (see #4). |
| 6 | P2 | fixed | New beat `sixteen` after `nlp`: "NLTK, the Python toolkit this course uses, says sixteen: can't becomes two, Doctor keeps its period, and the dollar sign stands alone." The "16 tokens" count inks on "sixteen", and ca, n't, Dr. and $ are highlighted as their clauses are spoken. Fig. 6 stays: it is the lesson's own split/tokenize block and teaches the comparison, which Fig. 3 does not. |
| 7 | P2 | fixed | `cleaning` is re-voiced: "Those are the cleaning steps, and every project picks from the same toolbox." The caption is now "the same toolbox in every project", which fits "most of its steps are optional". The goal's arrow lands on a bracket over the four dashed steps instead of on "lemmatize". |
| 8 | P3 | partly | Step 3's pill is now "drop punctuation", so in Fig. 10 "cleaning" names only the half, as the lesson's "Preprocessing (cleaning)" does. The half was not renamed "Preprocessing": that would re-voice `analysis` ("so should the cleaning") as well. "3. cleaned" stays as the lesson's code prints it. |
| 9 | P3 | fixed | The swap now lifts 60 px over 24 frames. The caption and "dashed: optional" fade to 0.3 while it runs, and the bracket clears first. "dashed: optional" moved under the pills, right-aligned. |
| 10 | P3 | fixed | "Natural language processing" holds the headline while the definition is spoken, then "NLP turns text into structure." arrives on "turns". In the Split scene, "A real problem" comes in at the start of its beat. |
| 11 | P3 | fixed | `rules` pauseAfter 0.6 → 1.0. Also `layers` 0.6 → 0.8, since the verdict calls the Layers scene rushed. |
| 12 | P3 | partly | Pipeline: the five step labels now ink down the left on "sequence", so the sequence is visible while it is named. Ambiguity: not changed. Drawing each row's rule on that row's gist would leave the opening beat with nothing moving for about 4 s. The first `check:motion` failed exactly that stretch, so the rules stay on the opening sentence. |
| 13 | P3 | fixed | The Tagged chips sit at the same height as the other boxes' chips (`exTop`); the tags still fit inside the box. |
| 14 | P3 | fixed | The read-along highlight on the string fades out when `.split()` starts cutting. |
| 15 | P3 | fixed | NLTK is introduced at first use, in the `sixteen` beat ("the Python toolkit this course uses"). The `tokens` beat was left alone. |

**Following the numbers:** where the lesson's prose and its code disagree (Order B keeps all three "the"s), the video was already following the printed output. The header now says so; the four discrepancies stay in the original report.

## Voice

- **572 characters re-voiced** (budget 900), 6 beats, each voiced on its own, no `--force`, no new take:
  - new beats: `sixteen` (134), `roots` (134), `running` (79);
  - changed beats: `casing` (68), `reasons` (81), `cleaning` (76).
- The script is now 4,219 characters (52 beats), over the original 4,000 cap, by the fix brief's allowance.
- The container restart interrupted nothing in the voicing: all six beats had finished before it (`narrate --dry-run` afterwards: 0 to voice).

## Length and checks

- **Length:** 5:51.7 (351.7 s, 10,551 frames), up from 5:17.5. The three new beats and the longer `reasons` add about 31 s; the pauses add 0.6 s. The reviewer estimated a few seconds. The extra comes mostly from the NLTK introduction folded into `sixteen` (finding #15), which Hope reads slowly (11.4 s), and from reading all five tags aloud (#5).

| Check | Result |
| --- | --- |
| typecheck, eslint (my folder) | clean |
| `check:cues` | clean for my folder |
| `npm test` | 56 of 59. The three failures are all `llm-meaning`'s (cues for its edited "scores" beat, and `cut("real")`). None names this video. |
| `check:frames` | pass. Largest stretch 0.91; worst arrowhead bend 1.2°. Reshaping the goal arrow to land on the bracket first gave 18.5°; I reshaped it before the check |
| `check:sync` | pass, worst +0.04 s (`real`, 3:01.6), 52 beats. The new beats sit at sixteen +0.02, casing +0.01, reasons +0.02, roots +0.01, running +0.00, cleaning +0.01 |
| `check:motion` | MOTION |
| `check:mix` (informational) | MIX |

Stills were re-taken at every changed place (frames 945, 1515, 3420, 4215, 4320, 4590, 5470, 6370, 7485, 8040, 8385, 8670, 9180, 9235) and I looked at each.

## New, noticed and fixed or left

- **Fixed:** the goal arrow's new shape bent 18.5° under its head at first; reshaped to 1.2° before `check:frames` ran.
- **Left:** the ambiguity scene's rules (#12, reason above).
- **Left:** the video is now further over the 4.5-minute target (5:52). Cutting beats would undo review fixes, so I did not.
