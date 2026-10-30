# Finish pass: Visualization finding 14 and AI-assisted finding 18

Both are now **fixed**. Each got one new beat voiced on its own (`--only`), plus a matching line on screen. Nothing outside the two folders and their narration was edited.

## DataAnalyst-6-Visualization, finding 14: the audience line for Question 11

- **Narration:** new beat `dash-audience`, after `dash-creep` and before Question 12. It uses the page's words exactly: "Design for the audience: an executive summary differs from an ops monitoring view." It has `pauseAfter` 0.8 s; `dash-creep` keeps its own 0.8 s.
- **Screen** (`DashScene.tsx`): the right column now has a second green tick under "cut what doesn't earn its place": "design for the audience", cued to "Design for the audience". It sits level with the left column's last note. Under it, at 22px soft ink and in line with the tick's text, is "an executive summary differs from an ops monitoring view", cued to "an executive summary differs". Both fade with the rest of Question 11 at "Question twelve".
- **Re-voiced:** 82 characters (`dash-audience`).
- **New length:** 645.1 s (10:45.1), 70 beats, 145 wpm. It was 638.6 s with 69 beats.

## DataAnalyst-8-AiAssisted, finding 18: confusions and uncertainty in Question 9

- **Narration:** new beat `r-llm-report`, after `r-llm`: "Report which categories it confuses, and carry that uncertainty into the findings." It has `pauseAfter` 0.9 s, which moved off `r-llm`; `r-llm`'s words and audio are unchanged.
- **Screen** (`RapidScene.tsx`): a fifth step, built in two parts the way step 3 is. "5 Report which categories it confuses" comes in on its words, then "; the findings carry that uncertainty" on "carry that uncertainty". The five steps are set closer together (start `c.h(102)`, pitch `c.h(54)`, from 110 and 62). Step 5 therefore ends about 40px above the closing takeaway, which stays where it was. The step's right end is at about 1753px, inside the hairline's width.
- **Re-voiced:** 82 characters (`r-llm-report`).
- **New length:** 400.7 s (6:40.7), 44 beats, 145 wpm. It was 394.6 s with 43 beats.

## Voice

- **164 characters re-voiced in all**, two new beats, each on its own, all within the 400-character limit.
- No recut was needed.
- Compared with `9789a98f` (HEAD before this pass), the only narration changes are the two new mp3s and their two added `alignment.json` entries. Every other beat's entry is identical, no existing mp3 changed, and the takes are untouched.
- The coordinator's snapshots `1471e78d` and `03aa35bd` have already committed the narration files.

## Checks (final code, private entries, through the queue)

| Check | Visualization | AI-assisted |
| --- | --- | --- |
| tsc (folder lines) / eslint folder | clean | clean |
| `check:cues` | pass | pass |
| `npm test` | 69 / 69 | 69 / 69 |
| `check:sync` | pass, 70 beats, worst +0.04 s (`dash-attn`); `dash-audience` +0.02 | pass, 44 beats, worst +0.03 s (`mistakes-recall`); `r-llm-report` −0.00 |
| `check:mix` | pass, effects 26.8 LU under, speech median 27.6 dB above (p5 12.6) | pass, effects 28.5 LU under, speech median 27.4 dB above (p5 10.8) |
| `check:motion` | pass, 10:45.3 checked, 0 stretches still | pass, 6:41.0 checked, 0 stretches still |
| `check:frames` | pass, including no hyphen in tabular figures | pass, including no hyphen in tabular figures |

## Stills (each looked at, cropped to the change)

- **Visualization at 407.5 s:** end of `dash-creep`; nothing new is drawn yet.
- **Visualization at 410 s:** the tick and "design for the audience" are in, and the example line is not yet.
- **Visualization at 414 s:** both lines are in. They are clear of the chart's month labels and level with the left column. The bottom of the lowest line is at about 1010px.
- **AI-assisted at 374.5 s:** the four steps, at the new spacing.
- **AI-assisted at 376.6 s:** step 5's first half is in.
- **AI-assisted at 380.5 s:** step 5 is complete.
- **AI-assisted at 392 s:** the close. All five steps sit above the takeaway, nothing overlaps, and the bank line arrives later, as before.

`results.json` was not touched: no new number.
