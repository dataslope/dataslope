# Llm-1-Tokens: fix pass

The fix pass is finished. All 17 findings are fixed; none is partly fixed or left. 309 characters were re-voiced, and every check passes on the final code. Nothing is committed by me (the coordinator's snapshot is 2d4dbd9).

## Findings

| # | P | Result | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | Fig. 5: the unsplit "strawberry" is now spaced at the size it is drawn, so its letters no longer collide (`JOIN_SIZE` in StrawScene). |
| 2 | P2 | fixed | New beat `rest`: "Next come N and E, then W, then newest as one piece, and last, low picks up an E." Each of merges 7 to 10 lands on its own words, with a 0.9 s pause after. |
| 3 | P2 | fixed | Fig. 13 now shows the lesson's real JSON and CSV texts, token by token (89 and 33). On "every key" only the 12 key-name tokens in the JSON and the 4 in the CSV header turn red. New note: "JSON: the 3 keys on all 3 records / CSV: once, in a header". |
| 4 | P2 | fixed | The 43,500 counter stays hidden until "forty-three thousand five hundred" and counts up over those words. The bars are spread so the last one lands on "seven thousand". Each bar is now stacked in three parts (system prompt, earlier turns sent again, the new message), with a legend. Scene length unchanged. |
| 5 | P2 | fixed | Fig. 11: each row now has a line under the romanized word ("5 letters × 1 byte", "5 characters × 3 bytes", "6 characters × 3 bytes", "4 characters × 3 bytes"), shown as the narration states the rule. |
| 6 | P2 | fixed | `space` is split at its comma into `space` and `space-id`, with a 0.6 s breath between. This was cut from the kept take, so it cost nothing to voice. The ·strawberry chip now appears on "space", with a red label "· is the space" under it. |
| 7 | P2 | fixed | The ring now draws alone, centred, during `loop`. On "The" it moves left and the staircase builds on the right, one row per word of `again`. `loop` pauseAfter raised to 0.8. The ring is Fig. 2 (left) and the staircase Fig. 3 (right). The plan, yarn and notes moved to the left column. |
| 8 | P3 | fixed | `</w>` is now drawn at 20 px or more everywhere. |
| 9 | P3 | fixed | Fig. 9 retitled "Neighbouring pairs: the top five of 14" (the 14 comes from measure.py). Merge 1 gets the note "o w tied: first counted wins" on "L and O first". measure.py asserts the tie. |
| 10 | P3 | fixed | Fig. 4 is now Fig. 1's four candidates (·man, ·first, ·dog, ·cat) plus " Token" and "ization" from Fig. 7. Strawberry's ids now appear only in Fig. 5, on their spoken words. |
| 11 | P3 | fixed | In FormatScene each figure slides left as the next arrives, so they read 12 \| 13, then 13 \| 14, then 14 \| 15. The price check is its own Fig. 15 in the right column, with larger type. |
| 12 | P3 | fixed | The yarn's leader lines now start at the ball's lower rim. The second bends down under the trailing strand instead of crossing it. |
| 13 | P3 | fixed | Fig. 4 is titled "Six entries of GPT-4o's o200k_base". Fig. 1's note reads "o200k_base, GPT-4o's tokenizer, has 200,000 tokens in all". |
| 14 | P3 | fixed | The chart now leaves on "each" instead of dimming. The bridge figure (now Fig. 17) takes the left of the page: art 250 px tall, ids at 48 px, `NextLine` under it. |
| 15 | P3 | fixed | `newer` is split from `opening` (the latter cut from the take) and re-voiced as "Newer tokenizers often pack more text into each token." A note follows 5.3: "more than four, so fewer tokens than the rule predicts". |
| 16 | P3 | fixed | FormatScene now opens on "Different text, different rates." and swaps to "Same content, different counts." on "records". |
| 17 | P3 | fixed | The hook is re-voiced with a gloss: "...a sequence of tokens, chunks of text, often whole words, and gives back...". Fig. 1 keeps its single "the", because the lesson's probability table is for that one-word input. |

## Voice
- **Re-voiced:** 309 characters (cap 900), each beat on its own:
  - `hook`: 174
  - `newer`: 54
  - `rest` (new): 81
- **Free:** `space`/`space-id` and `newer`/`opening` were split with `--recut` from the kept take, after checking that the take's text was unchanged. No new take, no `--force`.

## Length and checks
- **Length:** 338.2 s (5:38), up from 5:23. 42 beats, 769 words, 136 wpm.
- **Typecheck:** no errors in `src/videos/llm-tokens/`. The package exits 2 because of other folders' errors.
- **Lint and check:cues:** clean.
- **npm test:** 58 of 59. The one failure is the arrowhead rule in `llm-attention-score/BlendScene.tsx`, another folder (a deep dive).
- **check:frames:** pass. Largest stretch 0.68, arrows at most 5.2° of bend.
- **check:sync:** pass. 42 beats, worst +0.03 s (`again`). The re-voiced beats are within +0.01 s.
- **check:motion:** pass. Longest still 2.8 s (price into chat).
- **check:mix:** effects 25.5 LU under the narration; speech a median 28.0 dB above the effects (5th percentile 13.9). The closest moment is a merge pop at 2:54.4, 8.8 dB.
- **Stills:** I looked at every changed place, rendered or taken from the motion preview.

## Script header
The header now says where the lesson's prose and its own numbers disagree, and that the video follows the numbers:
- The conversation is 6.2 times its length, not "roughly five".
- JSON against CSV is measured at 2.7 times and estimated by the lesson's block at 4.3, not "roughly doubles". The video states no ratio.

## New, noticed and fixed
- Adding the price check as Fig. 15 shifted the chat scene's figures to 16 and 17. They are renumbered, so all 17 figures run in order of first appearance.
- measure.py and data.ts gained the pair total, the JSON and CSV token pieces with their key names marked, and the new Fig. 4 rows. All are asserted against the lesson blocks as before.
