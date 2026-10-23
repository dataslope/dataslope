# Llm-4-Cost: "What a token costs" (How LLMs Work, Unit 4)

Folder `video/src/videos/llm-cost/`. Narrator Drew. Intro title kept as the plan's, "What a token costs". Nothing committed.

## Length, voice
- **Length:** 301.9 s, 5:02 (`npm run cues`: 48 beats, 677 words, 135 wpm).
- **Voiced:** 3,885 characters (cap 4,400), all on `eleven_v4_turbo`, in **3 takes**: 85.2 s, 98.2 s and 74.8 s. One run, no 429s, no re-voicing, no `--force`. No cut warnings.

## Checks (all through my entry and the render queue)
| Check | Result |
| --- | --- |
| typecheck, lint (`src/videos/llm-cost`) | clean |
| `check:cues` | clean for llm-cost (the one failure is nlp-history/ZipfScene.tsx:38) |
| `npm test` | 59/59 pass |
| `check:frames` | pass: 4 illustrations, largest stretch 0.86; 6 arrows, 0.0° of bend |
| `check:sync` | pass: worst beat +0.03 s (estimate-in, 2:17.1) |
| `check:motion` | pass: longest still 2.3 s (12 stretches of 2.0 to 2.3 s, 25.0 s in all). The first voiced run failed 4 stretches (3.0 to 4.3 s); each was fixed with an animation cued to its own words |
| `check:mix` (informational) | effects 25.4 LU under the narration (-45.4 against -20.0 LUFS). Effects' peak is -21.1 dBFS at 0:00.6 (the logo). Where both sound, speech is a median 26.3 dB above the effects (5th percentile 11.7 dB). Closest 50 ms reading: 9.9 dB at 0:05.9 |

Preview: `video/out/Llm-4-Cost-preview.mp4`.

## Scenes (13 figures, numbered in order)
1. **HookScene**: opens on Unit 3's last idea, "Every token a model reads, writes or thinks ends up on a bill". Fig. 1 is one request as three bars (2,000 read, 400 written, 2,000 thought). Thinking is bracketed with the answer as "both written", and each bar gets a "$ ?" chip.
2. **SheetScene**: Fig. 2 is the lesson's five-number table, verbatim, with bars against input. On "falling" every bar shrinks together while the ratios hold.
3. **WhyScene**: Fig. 3. Eleven o200k_base prompt tokens go into the model in one pass. Seven answer tokens come out one pass each, with a counter.
4. **CacheScene**: Fig. 4. The 50,000-token prefix is computed once, then read back from the cache. On Sonnet that is $0.10 against $0.005 a turn. Then controlling-cost's own timestamp lands at the front and turn 3 goes back to full price.
5. **MarketScene**: Fig. 5 is the October 2026 table, verbatim: 5x in 8 of 10 rows, a 100x spread, model choice as the big lever. Fig. 6 is the threshold table, plus the lesson's 300,000-token prompt on GPT-6.1 Sol: $1.20, not $0.60.
6. **RequestScene**: Fig. 7. One support-bot request on four tiers, and per 100,000 requests: $27 to $2,700, 100x.
7. **ResendScene**: Fig. 8. The 40-turn staircase of input sent each turn, with the new message as a thin slice. Bills of $0.1325, $0.3750 and $1.1900, x2.8 then x3.2.
8. **ThinkScene**: Fig. 9. Cost bars at five thinking budgets: 1.0x, 1.6x, 3.5x, 11.0x, 26.0x. The answer's slice stays the same width in every row.
9. **MonthScene**: Fig. 10. Four workloads: code review on Opus looks big ($0.12 a request), document summaries on Sonnet are ($864 a month). Total $1,759.50.
10. **LeversScene**: Fig. 11 is the six levers in the lesson's order, each arriving on its ordinal. Fig. 12 is routing (Opus $4,050 to Haiku $101.25, $3,948.75 a month saved). Fig. 13 is the cached 40-turn chat ($1.19 to $0.26, 78% less). "passes" is marked on levers 1 and 4, then the bridge and `<NextLine>`: "measuring whether a model is good enough".

**Illustrations** (watercolor, first batch, all four right, no redraws): `llm-cost-tags`, `llm-cost-scales`, `llm-cost-stairs`, `llm-cost-levers`. The tags hang in the same place in scenes 1 and 2, so they stay put across the cut.

## Facts
`measure.py` pulls every Python block out of the three lessons and keys it as `lib/blockOutputKey.ts` does. It runs each block and stops unless its output equals the site's `block-outputs.json`; all 7 match. It then computes every number with the blocks' own functions (`cost`, `conversation_cost`, `request_cost`, `monthly`, `month`). The two pricing tables are parsed verbatim from the MDX. Tier names ("Claude Sonnet 5.5") are matched to price keys by name and by both prices. Fig. 3's tokens are tiktoken 0.12.0 o200k_base. `data.ts` reads `measurements.json`.

Nothing on screen is typed by hand. A few drawn elements are schematic and carry no number:
- Fig. 4's "new message" tail, which the lesson gives no size.
- Fig. 2's faint run past the output bar ("sometimes more").
- Fig. 2's "+" on the cache-write bar ("slightly above input"). The lesson gives no figure for it, so none was invented.

The lesson chart `token-cost-stack` uses other numbers (400/180/320). The video keeps to the code block's conversation (2,000/150/400), so its bars and its dollars describe one conversation. The script header says so.

## Lesson discrepancies (not fixed)
1. `content/courses/how-llms-work/estimating-cost.mdx:267`: the concept-check explanation says that at turn 1 "the write costs slightly more than input". The lesson's own `conversation_cost` (lines 87 to 102) charges no cache-write premium: its turn-1 cached cost equals the uncached one ($0.0083, 0% saved, the page's own table). So the explanation describes a cost the code does not model.
2. `content/courses/how-llms-work/pricing-structure.mdx:94`: Gemini 3.5 Flash-Lite's ratio is printed "8x", but $2.50 / $0.30 is 8.33x. This is rounding only; the prose's "5x in eight of the ten rows, never lower" holds. The video shows the lesson's "8x" verbatim.
3. Site, not lesson: `lib/generated/block-outputs.json` stores estimating-cost's block `f6a0ac7f` with its first line's leading spaces trimmed. It reads "fable: $0.027…", while the block prints "  fable:", so on the page that row sits out of line with " opus:", " sonnet:" and "  haiku:". The manifest appears to trim a stdout cell's leading whitespace. `measure.py` compares stripped lines because of this.

## Kit suggestions (built locally in `llm-cost/parts.tsx`)
- `HBar`: a bar that grows from its left on a cue and takes any CSS fill, so thinking can be hatched.
- `Chip`: a token chip in mono that shows a leading space as a middle dot. Every LLM-course video draws tokens.
- `VBracket`, a vertical partner to estimation's `Bracket`. Also `Hairline` (table rules drawn on a cue) and `Dim` (with a duration, for a slow turn at a scene's end).
- One `TAGS` geometry shared by two scenes, so a Spot carries across a cut. A shared `Spot` could take a "settled" flag for this.
- `$S/Llm-4-Cost/stills.mjs`: bundles the private entry once and renders any number of stills (`node stills.mjs 20.5 42.2 …`). It is far cheaper than one `remotion still` per frame on a shared 4-CPU machine, and is worth having as `npm run stills -- <Id> <seconds…>`.

## Left undone
Nothing.
