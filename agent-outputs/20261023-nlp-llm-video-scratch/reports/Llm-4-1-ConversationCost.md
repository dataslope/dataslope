# Llm-4-1-ConversationCost: "Why a chat's bill grows faster than the chat"

Deep dive for How Large Language Models Work, Unit 4. It embeds at estimating-cost.mdx, "A conversation, with the resend", and also suits token-counts-in-practice.mdx, "Estimating a conversation". Folder `video/src/videos/llm-conversation-cost/`. Narrated by Drew. It has no series intro and no NextLine: it opens on the puzzle and ends on the takeaway. Nothing is committed.

## Length and voice
- **2:19.6** (`npm run cues`): 20 beats, 326 words, 140 wpm. Longer than "about 2 minutes" because Drew reads more slowly than the estimate (126 s).
- **1,792 characters** voiced, under the 1,900 cap, in **1 take** on `eleven_v4_turbo`. Nothing was re-voiced and `--force` was never used.

## Checks (all through `out/entries/Llm-4-1-ConversationCost.tsx` and the render queue)
| Check | Result |
| --- | --- |
| tsc (folder) | clean |
| eslint (folder) | clean |
| check:cues | clean |
| npm test | 59/59 pass |
| check:sync | pass. Worst beat is `area` at +0.03 s; every beat is within ±0.03 s. |
| check:frames | pass. 2 illustrations, largest stretch 0.63. 4 arrows, 0.0° of bend. |
| check:motion | pass, after one fix round. Longest still is 2.8 s (`four`). `out/Llm-4-1-ConversationCost-preview.mp4` is kept. |
| check:mix | informational. Narration -19.9 LUFS, effects -47.8 LUFS, so the effects sit **27.9 LU under**. Effects peak at -25.1 dBFS (0:25.5). Speech is a median 29.1 dB over the effects. The closest moment is 7.9 dB, a 50 ms reading at 1:29.8 (the third dot's pop). |

The first motion run found 4 still stretches of 3 s or more:
- the `forty` hold;
- `split` into `triangle`;
- `triangle` into `double`;
- `ratios` into `toward`.

Each now has something moving, tied to its own words:
- after turn 40 is read, a ripple runs up the new slices;
- a shine runs along the rectangle on "the same every turn";
- the bars flash in sequence on "again and again";
- the three ratio dots swell left to right on "The longer the chat".

None of these changed the audio, so the mix numbers still hold. check:frames passed before these motion-only edits; they add no arrows or images.

## Scenes
1. **Hook** (`hook`, `why`), Fig. 1: two chats on Sonnet.
   - 20 and 40 turns as rows of one block per turn, beside their bills ($0.3750, $1.1900). The turns are ×2, the bill ×3.2.
   - On "double", a dashed ghost shows where a doubled bill would stop, with a red "?" over the part past it.
   - Receipt watercolor.
2. **Stairs**, one continuous scene from `memory` to `four`, so the chart never cross-fades with itself.
   - **Fig. 2:** the chat as the app sends it (system prompt, messages, replies). A bracket reads "all of it, sent again every turn" and points to the goldfish, "the model: no memory between turns". The bubbles fill top to bottom on "from the top".
   - **Fig. 3, up close:** turn 1 (system prompt 2,000 plus first message 150). Turn 2: turn 1's bar slides over, which is the resend, and the 550-token new slice drops on top.
   - **Fig. 3, pull-back:** the camera pulls back to all 40 turns. Each bar arrives once the zoom has room for it, and the gridlines adapt from 1k to 10k. Turn 40 is labelled 23,600.
   - **The area:** the bars close into an area, "the bill", with a note "plus the replies, at the output price". The area is cut at the system prompt's line into a grey rectangle and a purple triangle ("the chat itself, resent").
   - **Doubling:** a veil shows 20 turns first. The rectangle's copy slides beside it (×2). Three copies of the 20-turn triangle tile the 40-turn one, numbered 1 to 4 (×4).
3. **Bills** (`bills` to `toward`):
   - **Fig. 4:** the 10, 20 and 40-turn bills, each split into "rectangle and replies" and "triangle", with ×2.8 and ×3.2 arrows between the rows.
   - **Fig. 5:** a scale from ×2 ("all rectangle") to ×4 ("all triangle"), with dots at 2.8, 3.2 and 3.5 (10→20, 20→40, 40→80 turns) and an arrow creeping toward 4.
4. **Cache** (`cache` to `stable`):
   - **Fig. 6:** each turn's input cost, in cents. The purple triangle outline appears on "goes after the triangle". "Sent last turn" is bracketed on bar 40.
   - On "twentieth", everything sent before turns teal and shrinks to a twentieth of its height, and the old staircase stays behind as a dashed edge ("without the cache"). The 40-turn bill goes from $1.1900 (struck) to $0.2563, 78% less.
   - **Fig. 7:** one request, in order. The system prompt and earlier turns are teal, the reply and message blue, with "first" and "so the cache can match it".
5. **Fresh** (`fresh`, `end`):
   - **Fig. 8:** forty turns as one staircase against eight 5-turn staircases at one scale ($1.1900 against $0.4200).
   - The takeaway line: "A chat grows by one slice a turn. *Its bill grows by the whole chat.*"

Illustrations (watercolor, 2 of my own):
- `llm-conversation-cost-goldfish`, 1131x1016
- `llm-conversation-cost-receipt`, 1280x1016

The Batch API job `batch_6adb348df1448190aa7bf042cce32892` was still at 0/2 after 3 h 40 min, across the container restart and the usage pause. I cancelled it and generated both images with `sync`, then ran `--import`. Both looked right first time, so neither was redrawn.

## Facts
- `measure.py` runs estimating-cost's blocks 0 and 1 and checks them against the site's recorded output: keys f6a0ac7f and c8c4153c, both match.
- Every bill is a call to the lesson's own `conversation_cost`, with its defaults read off the function: system 2,000, user 150, reply 400, on Sonnet. This is the same conversation and the same function as the unit video (llm-cost), so every shared number is identical:
  - 2,150 tokens on turn 1 and 23,600 on turn 40;
  - $0.1325, $0.3750 and $1.1900;
  - ×2.8 and ×3.2;
  - $0.2563 cached, 78% less.
- measure.py also asserts the page's own printed table at 10, 20 and 40 turns.
- **The split into rectangle plus replies and triangle** is computed turn by turn and asserted to add back exactly to `conversation_cost`:
  - the straight-line part doubles at every doubling;
  - the triangle part grows ×4.10, ×4.05 and ×4.02;
  - the triangle is 40%, 57% and 73% of the bill at 10, 20 and 40 turns.
- **80 turns** ($4.14, ×3.48, said as "three and a half") is the lesson's function run past the lesson's table. The script header says so.
- **The four triangle copies** are drawn as exact halves of the continuous triangle. The stepped staircase follows that slope to within one step, and the header says so.
- **Sonnet's cache rate** ($0.10 against $2.00, "a twentieth") is checked against both PRICES and pricing-structure's prose.
- **"Put whatever never changes first"** is controlling-cost's "Put stable content first, volatile content last."
- **Eight 5-turn chats at $0.4200** is the lesson's own comparison: "a 40-turn conversation can cost more than eight separate 5-turn ones covering the same ground".
- Nothing on screen is typed by hand. The only geometry constants are layout positions.

## Lesson discrepancies (not fixed; both already reported by the unit builders)
- `content/courses/how-llms-work/token-counts-in-practice.mdx:190`: the text says "roughly five times the conversation's length", but the block prints 6.2x (key e9200518). This video does not use that block's 100-token conversation.
- `content/courses/how-llms-work/estimating-cost.mdx:267`: the concept check mentions a turn-1 cache-write premium that `conversation_cost` does not model. The video follows the code and never mentions a write premium.

## Kit suggestions (built locally in `kit.tsx`)
- **A zoomable bar-chart geometry** (`useGeo(z)`): px-per-unit and slot width interpolate geometrically, so a pull-back reads as a camera. It comes with an inverse, so each bar can be timed to arrive once it fits.
- **`Axes` with adaptive gridlines:** each gridline shows at whichever of the 1k, 2k, 5k and 10k steps has room at the current scale, so the labels never vanish mid-zoom.
- **`Stairs`:** stacked "sent before / new this turn" bars with transitions:
  - merging the bars into an area;
  - region tints split at a line;
  - a cache shrink to a rate;
  - per-bar glow and flash.
  
  All three LLM-course cost videos draw this chart.
- **`Key`**, one legend entry inked on a cue. Two keys crossfade in one slot through an `inline-grid` cell, so the legend never leaves a gap.
- **`$S/Llm-4-1-ConversationCost/stills.mjs`**, adapted from Llm-4-Cost's: it bundles once and renders many stills. It is still worth having as `npm run stills`.

## Left undone
Nothing. The video runs 2:20 rather than 2:00; it is under the character cap, and every check passes.
