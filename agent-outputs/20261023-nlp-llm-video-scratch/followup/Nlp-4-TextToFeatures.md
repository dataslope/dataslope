# Nlp-4-TextToFeatures: follow-up pass

## Item: review #8, the part I left: light Fig. 2's menu cards per pipeline (done)

In TwoPipelinesScene, Fig. 2's menu now appears again beside each pipeline as a strip of five cards: tokenize, lowercase, stopwords, stem, n-grams. Each card starts as the menu's dashed option. A step the pipeline takes turns solid, with a brief yellow highlight as it lights, and the steps it skips fade. So the one menu ends the scene as two different recipes. I took both recipes from the lesson's code (choosing-your-pipeline.mdx, "one text, two pipelines"):

- **Topic** (strip at the end of the topic row, from "what's left", once the row has closed up): tokenize, lowercase and stopwords light at the end of "brilliant". Stem and n-grams fade at "That's fine". Caption: "Fig. 2's menu, as this pipeline takes it".
- **Sentiment** (strip at the end of the sentiment row, once its stopwords have been struck and the row has closed up): tokenize, lowercase and stopwords light at once. N-grams lights at "word pairs", and stem fades at "as a unit". Caption: "drops every stopword except *not*, *no*, *nor*, *never* and *but*". That is the lesson's keep set, read from the existing `PIPE.keep`, and it explains why the stopwords card is lit for both pipelines.
- Neither pipeline stems or lemmatizes, which matches the code.

Each strip lights with a soft tap. I edited only `TwoPipelinesScene.tsx`. measure.py, measurements.json and data.ts are untouched, and no new numbers were needed.

Stills at 55.6, 58.8, 60.5, 68.2, 69.3 and 72.0 s: both strips appear, light and fade as described. Nothing overlaps; the strips end at x 1769, inside the right margin. The sentiment strip starts 60 px after the closed-up sentiment row. The cards' text is 20 px.

## Re-voicing

0 characters. `narrate --dry-run` reports 0 of 58 beats to voice.

## Length

446.5 s (7:26): 58 beats, 997 words, 134 wpm. Unchanged.

## Checks (final code)

- **Typecheck and ESLint (folder):** clean.
- **`check:cues`:** no findings for this video.
- **`npm test`:** 59 pass, 0 fail.
- **`check:sync`:** pass. The worst beat is +0.04 s (`idf-log`), and every beat starts within ±0.12 s of its cue.
- **`check:frames`:** pass. 4 images, largest stretch 0.69; arrowheads 0.0° of bend.
- **`check:motion`:** pass. Nothing holds still for 3 s; the longest still is 2.8 s (`blind`).
- **`check:mix` (informational, unchanged):**
  - Narration −24.6 LUFS (peak −6.8 dBFS); effects −45.9 LUFS, 21.3 LU under it.
  - Where both sound, speech is a median 24.2 dB above the effects (5th percentile 10.0 dB).
  - The closest moment is still 5:17.0, 9.4 dB for 50 ms, the gauge's pop on "Counts".
