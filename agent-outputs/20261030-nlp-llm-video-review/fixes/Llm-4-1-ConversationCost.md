# Llm-4-1-ConversationCost: fixes

Folder `video/src/videos/llm-conversation-cost/`, narrated by Drew. All 13 findings are fixed (1 P1, 5 P2, 7 P3). Nothing was committed. The coordinator's work-in-progress snapshot (863f979f) already holds the `measure.py` and `measurements.json` changes; the rest is uncommitted in the tree.

## Findings

| # | Pri | Status | What changed |
| --- | --- | --- | --- |
| 1 | P1 | fixed | `measure.py` now computes the cached pair with the lesson's `conversation_cost(..., cached=True)`: `fresh.eachCached` 0.02989, `eightCached` 0.23912, `oneCached` 0.25634, `savedCached` 0.0672. It asserts that the gap is under 10%. `fresh` was split at its sentence break. "And when a chat runs long, start a fresh one." is re-cut from the take for free. Then come `nocache`, "Without a cache, eight five-turn chats cost forty-two cents. One forty-turn chat, a dollar nineteen.", and `withcache`, "With the cache, it's twenty-four cents against twenty-six. So the bigger reason to start fresh is accuracy: a model recalls the middle of a long chat less well." Fig. 8's bills are now a 2x2 table: a "no cache" column ($1.1900, $0.4200) and a teal "with the cache" column ($0.2563, $0.2391). On "With the cache" both staircases flatten exactly as Fig. 6 did and leave dashed ghosts. The accuracy reason comes with three visuals: the eight restarts swell on "start fresh", a note reads "the bigger reason left: accuracy", and a bracket marked "the middle, recalled less well" sits under turns 11 to 30, which dim on "less well". The reason follows token-counts-in-practice ("a cost decision as well as an accuracy one") and context-windows ("lost in the middle"). |
| 2 | P2 | fixed | The narration now says "Prompt caching goes after the repeat" and "whatever you sent last turn, system prompt included". The dashed purple triangle is gone, and with it the 10px near-miss with the bracket. "repeat" and "sent last turn" each wash only the sent-before part of every bar, from the baseline (new `flashSent` on the kit's `Stairs`). The bracket note gains "system prompt included" on those words. |
| 3 | P2 | fixed | New beat `prefix`: "The cache matches a request from its first token, up to the first thing that changed." Fig. 7 builds on "request" and fills down the request as the words name each part: "first token" fills the system prompt, "up to" fills the earlier turns, and "changed" fills the new part. `stable` keeps its voiced words and now follows the rule it applies. |
| 4 | P2 | fixed | Split into `cache` ("Prompt caching goes after the repeat. Here are the same forty turns, in cents.", 2.4 w/s) and `twentieth` (2.8 w/s, down from 3.23). The cents axis inks in on "in cents". The bars turn teal on "read back" and shrink on "twentieth", and the legend swaps on "read back". All the cues that were in `cache` moved to `twentieth`. |
| 5 | P2 | fixed | `double` was split. "Take twenty turns, and double them." is voiced; "The rectangle just gets twice as long." is re-cut for free as `twice`. The 20-turn bracket comes in on "twenty turns" and holds until `longAt - 4`. The 40-turn bracket arrives on "twice as long". The 20-turn setup is now up about 3.8 s, up from 0.7 s. |
| 6 | P2 | fixed | Fig. 7's new part is solid `NEW` with white text, the same as the "new this turn" swatch. Fig. 2's "your next message" now fills solid `NEW` with white text; the rest stays `SENT`. |
| 7 | P3 | fixed | Label "40 turns, the whole bill with replies". The red strike is gone: grey $1.1900, then a kit `Arrow` (built by `arrowHead`), then teal $0.2563. |
| 8 | P3 | fixed | The first-message slice, its leader and the "your first message, 150" label are cued on "your", and `first.pauseAfter` is 1.0. The label is up about 2.2 s, up from 1.3 s. |
| 9 | P3 | fixed | Fig. 4's ratio arrows were dropped, so each ratio appears once, on Fig. 5. `ratios` was split after "three point two." (`pauseAfter` 0.6); `eighty` is re-cut for free. |
| 10 | P3 | fixed | New beat `ends`: "A bill that was all rectangle and replies would just double. All triangle, it would quadruple." The two end labels are cued on it, and a dot swells at x2 (grey) on "double" and at x4 (purple) on "quadruple". The x2 end is relabelled "all rectangle and replies", matching Fig. 4's legend. `toward` is unchanged. |
| 11 | P3 | fixed | `kit.tsx`: the flash height is `shown - SYSTEM*k*triTint`, so "again and again" washes only the triangle. The still at 63.4 s shows the rectangle untouched. |
| 12 | P3 | fixed | "without the cache" moved below the dashed edge, to `geo.x(33)+10`, `lastTop+140`. The suggested `x(30)`, `+110` put the dashed line through the text when checked on a still. Fig. 7's "first" sits right of its top box (boxes are now 300 wide), away from the ghost's last step. "plus the replies," / "at the output price" is broken by hand onto two lines. "only the new slice pays in full" fits on one line. |
| 13 | P3 | fixed | "...is read back, on Sonnet, at a twentieth of the price." |

`check:motion` failed in the middle of the work: the new beats left four still stretches of 3 s or more. Adding the movement described above fixed all four (the x2/x4 dots, the teal on "read back", Fig. 7's stepwise fill, and the Fig. 8 accuracy visuals).

## Voice

- **685 characters re-voiced** (budget 1,200), each beat on its own with `--only`, Drew on `eleven_v4_turbo`, with no new take:
  - `double` 35
  - `ends` 94
  - `cache` 78
  - `twentieth` 133
  - `prefix` 85
  - `nocache` 100
  - `withcache` 160
- **Re-cut free** from take-1 with `--recut`: `twice`, `ratios`, `eighty`, `fresh`.
- **Byte-identical to fa6071d5:** every other beat's mp3 and its `alignment.json` entry (hook, why, memory, first, second, climb, forty, area, split, triangle, four, bills, toward, flat, stable, end), and `takes/`.

## Length and checks

- **Length:** 176.6 s, 27 beats (`npm run cues`). It was 139.6 s (2:20) and is now 2:57.
- **Checks:**
  - Typecheck and eslint: nothing in my folder.
  - `check:cues`: pass.
  - `npm test`: 69/69.
  - `check:motion`: pass, nothing still for 3 s.
  - `check:sync`: pass, worst +0.03 s.
  - `check:mix`: pass, effects 28.1 LU under the voice.
  - `check:frames`: pass (3 arrows, 2 illustrations).
- **Stills:** looked at every changed place, at 16.8, 22.6, 51.5, 63.4, 66.8, 68.8, 90, 97.7, 99.7, 99.9, 111, 113.2, 114.9, 116.9, 118.9, 120.9, 121.6, 125, 133.6, 136.9, 138.3, 139.9, 144.6, 156.7, 160.9, 162.9, 168.2 and 172.5 s.

## measurements.json

Every existing value came back identical; the unchanged script reproduced the committed file byte for byte. The only change is four new keys under `fresh`: `eachCached`, `eightCached`, `oneCached` and `savedCached`. No value shared with `llm-cost` changed, and that folder was not touched.

## Recommended lesson change

`content/courses/how-llms-work/estimating-cost.mdx`, after "The first turn has nothing to reuse, and every turn after it has more." (line 126). The sentence at lines 118-120 ("a 40-turn conversation can cost more than eight separate 5-turn ones") is true of the uncached column only. Add:

> Caching also closes most of the gap with the eight short conversations: cached, eight 5-turn ones cost about $0.24 and one 40-turn one about $0.26. With a cache on, splitting a long conversation saves little money; the reason left to start fresh is accuracy (*Context Windows*, "lost in the middle").

## Shared changes

None needed.

## Noticed, not fixed

This was not among the findings. In Fig. 3's close-up (about 0:18 to 0:23), the "system prompt, 2,000 tokens" label sits on the faint 1k gridline (`StairsScene.tsx`, the label at `zoomed.ty(SYSTEM / 2)`). Moving that label and its leader to `SYSTEM * 0.4` would clear it.
