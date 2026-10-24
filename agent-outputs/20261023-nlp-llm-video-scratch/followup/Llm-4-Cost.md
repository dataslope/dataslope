# Llm-4-Cost follow-up ("What a token costs", How LLMs Work Unit 4)

Nothing committed. `measure.py`, `measurements.json` and `data.ts` were left untouched. The only change to `measurements.json` is the coordinator's own (Flash-Lite 8.3x).

## Items

**1. Lever 6's retrieval exception (the open part of review finding 5): done.**
- **New beat `retrieval`**, after `prompt`: "Unless you're pasting a whole document every turn when three paragraphs would do. That's a retrieval problem, and it goes straight to the top."
- **Source:** controlling-cost.mdx, "6. Then optimize the prompt": "if you are pasting a large document on every turn when three paragraphs would do, that is a retrieval problem rather than a prompt-length problem, and it belongs at the top of this list".
- **The picture, cued to its words: Fig. 14, "A whole document, pasted into every prompt", in the right half.**
  - On "whole document", a card's paragraphs ink in.
  - On "every turn", it swells and its label gains ", sent every turn".
  - On "three paragraphs", three paragraphs light up while the rest fall back, and they move along an arrow to a card of their own ("three paragraphs would do").
  - On "retrieval problem", that card is labelled "retrieval: send only these".
  - On "top", row 6 of Fig. 11 gets an up arrow and "retrieval goes to the top".
- **Fig. 14 is drawn, not measured.** The lesson gives the document no size, so it carries no number; the script header says so.
- **Timing around it:**
  - The mini Fig. 9 now holds until "Unless" instead of giving way to the watercolor.
  - Fig. 14 gives way at "passes", and the levers watercolor returns for the close.
  - `prompt`'s pause went from 1.0 to 0.7 s; `retrieval` takes 1.0 s.
- **Sounds:** a pop for the document, a whoosh as the three paragraphs move, a pencil stroke for the tag.

**2. Coordinator's 8.3x check (Fig. 5): checked and fixed.**
- The still showed that the old fixed 60 px outline clipped the wider "8.3x": its "8" poked out on the left.
- The outline is now a pill sized to its text, with its digits still on the column's right edge.
- Re-checked on a new still: "8.3x" sits fully inside the pill, about 38 px clear of "$2.50" and 30 px clear of its bar. "6x" is unchanged in place.

## Voice
- **142 characters re-voiced** (cap 300): one new beat, `retrieval`, voiced on its own.
- No take recorded again, no `--force`.

## Length
338.5 s, 5:39 (was 329.1 s): 52 beats, 763 words, 135 wpm.

## Checks (final code, through my entry and the queue)
| Check | Result |
| --- | --- |
| typecheck, lint (my folder) | clean |
| `check:cues` | clean for llm-cost |
| `npm test` | 59/59 |
| `check:sync` | pass, worst +0.04 s (`effort`, 5:01.4) |
| `check:motion` | pass, longest still 2.5 s. The first run failed 5.0 s over `next`: the close had lost its bobbing watercolor. The art returning at "passes" fixed it |
| `check:frames` | pass: largest illustration stretch 0.86; 9 arrows at 0.0° of bend |
| `check:mix` | effects 25.6 LU under the narration (-45.5 against -19.9 LUFS); effects peak -21.1 dBFS at 0:00.6 (the logo); speech a median 26.7 dB above the effects (5th percentile 11.0 dB) |

The last two edits were small. The 8.3x pill and moving "sent every turn" under the card both landed while the final `check:motion` was bundling. Neither changes when anything moves: the outline fades in on the same cue, and the label fades in on the same word. I re-checked both with fresh stills, but did not run motion again for them.

Stills checked: Fig. 14 at each step, row 6's tag, the close with `<NextLine>`, and the Fig. 5 ratio column.
