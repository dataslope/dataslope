# Llm-5-Benchmarks: follow-up pass

The one open item, review finding #9 (P3, "The harness is just a loop", but no loop drawn), is **done**. There was room, so the table did not need to shrink. No narration changed, and `measure.py`, `measurements.json` and `data.ts` are untouched. I made no commits.

## The item

**#9: draw the loop. Done.** The only file changed is `video/src/videos/llm-benchmarks/HarnessScene.tsx`.

- **Where it fits.** The space right of the headline "The harness is just a loop." was empty: the headline ends near x 760, and the table and its totals start below the Fig. 13 caption. A four-line listing fits there (x 1280 to 1800, top at the kicker's height) without moving the table, the totals or the caption.
- **What it shows.** The lesson's `evaluate()`, cut to its four working lines, on the editorial listing paper:
  ```
  for text, expected in tickets:
      got = cheap(text)
      hits += got == expected   # 3
  accuracy = hits / len(tickets)
  ```
- **How it moves.**
  - The listing inks in on "a loop".
  - The loop runs twice, once per stand-in, a row per mark, timed to the existing ✓/✗ cues.
  - A small blue pointer steps down the table's left edge to the row being scored. It is built with `arrowHead()`, filled.
  - The two body lines are highlighted while a pass runs, with a pulse at each mark.
  - The function name changes from `model` to `cheap`, then to `good` for the second pass.
  - A `# n` hit count beside line 3 counts the ticks as they land: 3 for the cheap stand-in, then 10 for the good one.
  - The last line, `accuracy = hits / len(tickets)`, lights as each score is read out ("Thirty percent", "all ten").
- **Checked in stills** at each of these moments: mid cheap pass (`# 2`, pointer on row 7), mid good pass (`# 8`, pointer on row 9), the misses, and the scene's end. Nothing overlaps. The listing sits about 32 px above the Fig. 13 caption and inside the right margin.

## Re-voiced
**0 characters.** `narrate --dry-run`: 0 of 49 beats to voice.

## Length and checks

**Length: 5:58** (357.5 s), unchanged.

| Check | Result |
| --- | --- |
| typecheck and lint, my folder | clean |
| `check:cues` | clean |
| `npm test` | 59 pass, 0 fail |
| `check:frames` | pass. 4 illustrations, largest stretch 0.92. Arrows checked: 22, up from 15; the extra ones are the stepping pointer, logged once per row. All at 0.0° bend. |
| `check:motion` | pass, longest still 2.5 s. The harness scene has no still stretch of 2 s or more. |
| `check:sync` | pass, worst +0.06 s (`sat-tell`) |
| `check:mix` (informational) | effects 25.6 LU under the narration (-45.4 against -19.8 LUFS); speech a median 26.9 dB above the effects |

## Numbers for the coordinator
None. The loop shows only counts that are already on screen from `data.ts`: the per-ticket results, 3 of 10 and 10 of 10.
