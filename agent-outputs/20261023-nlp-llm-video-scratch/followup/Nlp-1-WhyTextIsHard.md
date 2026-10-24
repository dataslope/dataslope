# Nlp-1-WhyTextIsHard: follow-up pass

Both items are done. I re-voiced 238 characters, and every check passes on the final code. I did not touch `measure.py`, `measurements.json` or `data.ts`, needed no new number, and committed nothing.

## Items

**1. Review #8: name the first half "Preprocessing", as the lesson does. Done.**
- **Figure:** Fig. 10's heading over the conveyor now reads "Preprocessing". The figure title reads "The two halves of a pipeline: preprocessing, then analysis".
- **Text above it:** the kicker reads "Preprocessing, then analysis" and the headline "Preprocess first, then analyze."
- **Narration:** two beats were re-voiced, each on its own:
  - `cleaning`: "Those are the preprocessing steps, and every project picks from the same toolbox."
  - `analysis`: "…It depends on your goal, and so should the preprocessing, because most of its steps are optional." This beat had to change too, because it said "so should the cleaning". It is voiced whole: its take had already been changed in the fix pass, so it could not be cut free with `--recut`.
- **Step 3:** "Cleaning" now names only that step, matching the lesson's table, the "3. cleaned" row its code prints, and the `cleaned` beat. The pill keeps "drop punctuation".

**2. Review #12, the ambiguity half: draw each row's rule with that row's gist. Done.**
- **Rules:** each of the three rules now draws as its kind begins (`lexical`, `structural`, `referential`), together with that row's gist. The pencil sound moved with them.
- **Opening motion:** the opening sentence ("Language is full of it, and we resolve it so easily that we rarely notice.") moves on its own words:
  - "ambiguity" in the headline is highlighted when "full of it" is said;
  - Fig. 4's label inks on "resolve";
  - the headline's turn arrives on "rarely notice".
- **Motion check:** that stretch does not appear among `check:motion`'s stills; the longest still anywhere is 2.5 s.

## Voice
- **238 characters re-voiced** (cap 300): `cleaning` (81) and `analysis` (157). Each was voiced on its own, with no `--force` and no new take.

## Length
- **5:52.8** (352.8 s), up 1.1 s from 5:51.7, from the longer word "preprocessing".

## Checks (final code, through my entry and the queue)
| Check | Result |
| --- | --- |
| typecheck, eslint (my folder) | clean |
| `check:cues` | clean for my folder |
| `npm test` | 59 of 59 pass |
| `check:frames` | pass. Largest stretch 0.91; worst arrowhead bend 1.2° |
| `check:sync` | pass, worst +0.04 s (`real`). The re-voiced `cleaning` and `analysis` land at −0.01 s |
| `check:motion` | pass. Nothing still for 3 s; longest still 2.5 s; 12 stretches of 2 s or more |
| `check:mix` (informational) | effects 20.6 LU under the narration (−45.4 against −24.8 LUFS); effects peak −21.1 dBFS. Speech sits a median 23.6 dB above the effects, 5th percentile 10.0 dB. The closest moment is 4:50.8, at 10.3 dB |

I took stills of both changes and looked at each:
- **Ambiguity:** the highlighted headline word with the label inked, then the first rule drawn with its gist.
- **Fig. 10:** the final state, and the moment "preprocessing" is spoken.
