# Nlp-5-History follow-up pass

The one item, the part of review #11 left open, is done. The change is visual only: nothing was re-voiced, and the length is unchanged at 319.9 s (5:20). I committed nothing; your checkpoint commit 8266f1d already contains both changed files.

## Item: the Shannon scene's sparse right side (review #11, Shannon part)

**Done.** The scene opens on the `shannon` beat ("In 1948, Claude Shannon founded information theory."). Until now the right two-thirds of the frame stayed empty until the Fig. 4 label at "Tucked inside", about 4.5 s, and the first sample word came about 6 s in. A second page of the paper now fills that space from the first frame of the beat: its contents card. It sits beside the existing first-page card, at x 640 to 1460, the same height.

- **On the beat's first word:** the card arrives. The header reads "Contents | Part I: Discrete Noiseless Systems". Part I's first seven section titles ink in one after another, taking about 1.2 s.
- **On "information theory":** "Entropy" in "6. Choice, Uncertainty and Entropy" is marked. This shows what founding the field meant. The mark comes 12 frames after the paper-title mark on the left page, so the two don't flash together.
- **On "Tucked inside his paper":** "3. The Series of Approximations to English" is highlighted and set bold, and the other lines dim. This is the section that holds Shannon's sample, so the card hands straight over to the next idea.
- **Just before "guess the next word":** the card slides out. Fig. 4's label now arrives at `guessAt - 6`, instead of on "Tucked inside", which the card now covers. The sample's first word still lands on "guess".

**Source.** The section titles are copied from the paper as printed: "A Mathematical Theory of Communication", BSTJ 1948, Part I, sections 1-7, checked in the PDF I saved earlier. The script header now notes this. No new numbers were needed. `measure.py`, `measurements.json` and `data.ts` are untouched, and the titles live in `ShannonScene.tsx` as a local constant.

**Stills checked:** 64.3, 65.4, 67.6, 69.3, 70.2 and 70.8 s.
- The card builds, then entropy is marked, then section 3 is lit.
- It fades out cleanly, with Fig. 4 and "THE" arriving into the cleared space.
- Nothing overlaps, and the type is 19-26px.

## Re-voicing

- None (0 characters).
- The length is unchanged at 319.9 s (5:20).

## Checks

| Check | Result |
| --- | --- |
| tsc (locked full run, grep for my folder) | clean |
| eslint `src/videos/nlp-history` | clean |
| check:cues | clean for nlp-history |
| npm test | 59 of 59 pass |
| check:frames | pass. 4 images, largest stretch 0.95; 11 arrows, 0.0° of bend |
| check:motion | pass. Nothing holds still for 3 s |
| check:sync | pass. Worst +0.06 s (`turing-out`, 2:19.2) |
| check:mix | pass. Effects 21.0 LU under the narration, speech a median 25.3 dB above them; the closest moment is 9.5 dB at 4:22.5 |

## Files changed

- `video/src/videos/nlp-history/ShannonScene.tsx`: a new `ContentsPage` component and its placement; Fig. 4's label moved to `guessAt - 6`.
- `video/src/videos/nlp-history/script.ts`: a comment in the header only. No narration text changed.
