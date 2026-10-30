# DataAnalyst-6-Visualization (9:47)

## Verdict
- A strong, chart-heavy video. Every deep dive draws its argument, and nearly every number checks out against `results.json` and the page: 5.2% and 50x on the cropped axis, 3.6% and 2.55x on the axis from 92, 12% after the price rise, 1.1 against 4.3 a month, 61%, 0.12, 25x against 5x. Nothing overlaps badly or clips. The layouts use the full width.
- The worst defects are figures that grade or show the wrong thing. Question 9 puts a green tick on "right axis from zero", the second of two arbitrary axes, which the page says is no more right than the first. Its fitted panel does not show the metric rising with revenue. The dashboard note prints "top left 20%, bottom right 2%: about 8x", which is 10x as printed, and the 8x comes from a model, not a measurement. The overplotting demo's opaque dots already show two clusters, and "solid dots: one blob" appears only after they have faded.
- Pacing is comfortable: 2.1 to 3.2 words/s, 1.6 s bridges between scenes, 0.6 to 0.8 s between questions. The rushed spots are the four-chart payoff of Question 2 (under 3 s before it clears) and the small panels of Question 16 (about 2 s). Two dead stretches: Question 7 shows two lines of text on an empty page for 11 s, and the page goes fully blank for 2 s before the dashboard scene.
- As interview answers they mostly hold up. Several stop one step short of the page: Question 2 drops the "x is ordered, now choose" follow-up the page calls the one interviewers push on, Question 17 never says "use a colorblind-safe palette", and Question 10 lists three tricks with no fix for any.
- Systemic: every axis tick, category label and pie label is set at 15 to 18 px, under the 19px floor.

## Findings

### 1. [P1] accuracy: "top left 20%, bottom right 2%: about 8x" is 10x as printed, and the 8x is a model
- When: 347.4-360.2 s, beat `dash-attn`, on screen to 371 s (frame element-370.jpeg)
- What: The note under the attention grid reads "top left 20%, bottom right 2%: about **8x**", and the narration says "the top left slot gets about eight times the attention of the bottom right". As printed, 20 / 2 is 10. The 8 comes from the unrounded shares (20.3% and 2.39%, ratio 8.5). The shares are not data either. `charts/dashboard-reading-order.mjs:11` says "The shares are a model of the shape, not a measurement": an exponential decay with made-up rates (`Math.exp(-0.62 * r) * Math.exp(-0.3 * c)`). The video calls them "share of attention by slot" and narrates the ratio as fact.
- Why it matters: a viewer who repeats "the top left gets eight times the attention" in an interview is quoting a made-up number, and the screen's own arithmetic does not support it.
- Cause: `video/src/videos/da-visualization/DashScene.tsx:124` (`fmt(first.share * 100, 0)` and `fmt(last.share * 100, 0)` round to 20 and 2 next to `D.ratio` = 8); `video/src/videos/da-visualization/DashScene.tsx:120` ("share of attention by slot"); `video/src/videos/da-visualization/script.ts:239-241` (beat `dash-attn`).
- Fix: print one decimal, `fmt(..., 1)`, giving "top left 20.3%, bottom right 2.4%: about 8x". Retitle the grid note "a reading-order model: share of attention by slot". Re-voice `dash-attn` as "That's where eyes land, and attention fades down the page faster than across it: in a simple reading-order model, the top left slot is worth about eight of the bottom right. Keep scales and colors consistent, and say how fresh the data is." Move the cue `"about eight times"` to `"about eight of"`.

### 2. [P1] answer: Question 9 gives a green tick to one of the two arbitrary axes, and the fitted panel shows no rise
- When: 283.4-308.7 s, beats `dual-show` and `dual-fix` (frame element-308.jpeg)
- What: The left panel, "Right axis fitted to the metric", has a red cross, "seems to rise with revenue". The right panel, "Right axis from zero", has a green tick, "lies flat". The page's chart says the opposite on purpose: "Neither panel is a strawman and neither is wrong" (`charts/dual-axis-illusion.mjs:12`). Picking a zero-based second axis is as arbitrary as fitting it, and the narration says so a few seconds later: "The scales are arbitrary, so the relationship you see is too". The picture also fails the claim it crosses out. In the 580px-wide fitted panel, the orange metric zigzags over the whole height, from 37 to 46, with no visible rise. Meanwhile the "correct" right panel draws a crossover at about x = 1560, where revenue appears to overtake the metric. That is exactly the artifact the page warns about. The real fix, an indexed chart or two panels, is never drawn. It is a line of text, and "index" is never explained.
- Why it matters: the green tick teaches "start the second axis at zero" as the honest dual-axis chart. A candidate who says that in an interview has missed the point of the question.
- Cause: `video/src/videos/da-visualization/DualScene.tsx:136-138` (`Verdict ok` "lies flat"); `video/src/videos/da-visualization/DualScene.tsx:133-135` (the left verdict); `video/src/videos/da-visualization/DualScene.tsx:139-144` (the fix as text only).
- Fix: Make the right verdict red too: "flat, and a crossover the axes invented". At `indexAt`, cross-fade the right panel into the real fix: one y axis, both series divided by their first value times 100, titled "Indexed: both start at 100", with the green tick "one axis, nothing to tune". Re-voice the end of `dual-show` as "Start it at zero, and it lies flat, and revenue seems to overtake it." Re-voice the start of `dual-fix` as "Both are arbitrary, so the relationship you see is too. Index both series to a hundred at the start, so they share one axis, or put them in two aligned panels." For the left panel, change the cross to "its noise looks as big as revenue's climb", which is what it shows.

### 3. [P2] confusion: the overplotting demo's opaque dots already show two clusters, and "one blob" arrives after they are gone
- When: 550.5-561.9 s, beat `r-scatter` (frames element-554.jpeg, element-561.jpeg)
- What: At 551-556 s the 4,333 opaque points form two clearly separate dense clusters, with the bridge between them visible. At "lower the opacity" (about 556.6 s) they fade to 7% opacity. Only at "from a blob" (about 559.6 s) does the red "solid dots: one blob" appear, describing a picture that is no longer on screen and that never looked like one blob. In the faint version the bridge is harder to see than it was in the solid one.
- Why it matters: the claim "from a blob to two clusters and a bridge" is contradicted by the first picture, so the case for transparency does not land.
- Cause: `video/src/videos/da-visualization/RapidScene.tsx:303` (`r={4}` in a 440px panel, too small to saturate); `video/src/videos/da-visualization/RapidScene.tsx:291` (the alpha fade keyed to `lowerAt + 4`); `video/src/videos/da-visualization/RapidScene.tsx:315-320` (verdicts at `blobAt` and `clustersAt`).
- Fix: Draw the opaque version at `r={8}` so it fuses into one mass, as the page's opaque panel does, then shrink to `r={4}` as the opacity falls. Key the fade to `blobAt + 6` instead of `lowerAt + 4`, so the red cross lands on the solid dots and the green tick on the faint ones. Alternatively, keep the opaque version as a small left panel beside the faint one, as `charts/overplotting-alpha.mjs` does.

### 4. [P2] answer: Question 2 stops before the follow-up the page says interviewers push on
- When: 75.5-93.7 s, beats `line-x` and `line-wrong` (frame element-093.jpeg)
- What: The answer is that lines need an ordered x, "Bars work over weeks too", and a line over issue types is wrong. The page continues: "That leaves the case interviewers actually push on: x is ordered, so both marks are honest, now choose. Bars compare a value to its neighbour; a line carries a shape. The longer the series, the more certainly the shape is what the reader came for." The video's top row shows exactly that case, two green ticks over weeks, and never says how to choose between them.
- Why it matters: "both are fine" is the answer that invites "so which would you use?", and the viewer has no answer.
- Cause: `video/src/videos/da-visualization/script.ts:104-107` (beat `line-x` ends on "Bars work over weeks too.").
- Fix: Extend `line-x` with "When both are honest, bars compare each week with its neighbour, and a line shows the shape; the longer the series, the more the line wins." Add a note under the top row at that cue: "both honest: bars compare neighbours, a line shows the shape".

### 5. [P2] answer: Question 17 never says "use a colorblind-safe palette"
- When: 479.2-502.3 s, beats `access` and `access-fix` (frame element-502.jpeg)
- What: The fix given is "Add a second cue, like a direct label, and check the chart in grayscale." The page's answer leads with "Use colorblind-safe palettes", then the secondary cue, then "ensure sufficient contrast", then the grayscale test. Its own chart, `colorblind-safe`, is a red-green default against a safe palette. The video demonstrates red against green and then gives up on color entirely. Swapping red and green for a blue-orange pair, the first thing an interviewer expects to hear, is never said.
- Why it matters: it is the most common answer to this question, and leaving it out makes the answer sound like "never use color".
- Cause: `video/src/videos/da-visualization/script.ts:302-305` (beat `access-fix`).
- Fix: Re-voice `access-fix`: "Use a colorblind-safe pair, like blue and orange instead of red and green, add a second cue like a direct label, keep the contrast high, and check the chart in grayscale. If it still reads, it's robust." Add a note above the third panel at "colorblind-safe": "blue and orange, not red and green".

### 6. [P2] spacing: "a trend through no order" runs into the neighbouring bar chart, and the payoff clears in under 3 s
- When: 91.5-94.4 s, beat `line-wrong` (frame element-093.jpeg)
- What: The red cross for the line over issue types sits at x = 780, right of its chart, and its words run to x = 1080. That is 150 px into the "As bars, over six issue types" panel, which starts at x = 930, and about 60 px above its Login and Billing bars. It reads as much like a verdict on the bars as on the line. The cross arrives at "the one wrong chart" (about 91.5 s), and the whole four-chart figure fades at "Question three" (94.4 s). The punchline of the scene is up for under 3 s, and the gap after the beat is 0.8 s.
- Why it matters: the one wrong chart of four is the answer, and its label is both ambiguous and brief.
- Cause: `video/src/videos/da-visualization/LineScene.tsx:104-106` (`Verdict` at `COLS[0].x1 + 20` with its text inline); `video/src/videos/da-visualization/LineScene.tsx:57` (`out2 = q3At - 4`); `video/src/videos/da-visualization/script.ts:109-112` (`pauseAfter: 0.8`).
- Fix: Keep the bare cross at `COLS[0].x1 + 20`, like the ticks. Put the words under the chart's labels at `x={COLS[0].x0}` and `y={y(ROWS[1].base) + h(70)}`. Raise `line-wrong`'s `pauseAfter` from 0.8 to 1.5.

### 7. [P2] spacing: axis ticks and category labels are 15 to 18 px throughout
- When: every chart in the video, for example element-093.jpeg (issue types at 16px), element-231.jpeg (month initials at 16px, y ticks at 17px) and element-332.jpeg (years at 15px)
- What: Every y-axis number in the video comes from `YTicks`, at 17px. The default category and x-tick labels are 18px, and the hook's pie labels are 17px. Several charts go smaller: issue types, month initials and month names at 16px, and the inverted axis's years at 15px. The 3D, data-ink and part-to-whole labels, the small-panel names and the palette swatch names are 17 to 18px. `Drift` adds at most 2.5%, so none reaches 19px.
- Why it matters: the house floor is 19px, and these are the numbers the answers depend on (92, 94, 96 on the baseline axis; 10 to 10,000 on the log axis).
- Cause: `video/src/videos/da-visualization/parts.tsx:203` (`tickText(17)`); the defaults at `parts.tsx:26`, `parts.tsx:80`, `parts.tsx:136`, `parts.tsx:227` (18) and `parts.tsx:260` (17); the overrides at `LineScene.tsx:103,110`, `AxisScene.tsx:124,138`, `StoryScene.tsx:131,153` (16), `DualScene.tsx:185` (15), `RapidScene.tsx:177,182,185,373,405` and `PaletteScene.tsx:373` (17), and `RapidScene.tsx:113,382`, `PaletteScene.tsx:226,242` and `HistScene.tsx:128` (18).
- Fix: raise `tickText`'s default and the `YTicks` size to 19, the `BarSet`, `LineSet`, `XTicks` and `Pie` defaults to 19, and every override listed to 19. Twelve month initials on a 610px axis and four alternate years both fit at 19.

### 8. [P2] confusion: Question 7 explains its rule over an empty page for 11 s (and Question 3 for 5 s)
- When: 207-219 s, beat `baseline` into `baseline-show` (frame element-215.jpeg); also 96-101.5 s, beat `pie`
- What: At "Question seven" the five team bars clear. For the next 11 s ("No. That rule is for bars. A line shows value by position, not length, so zooming in is fine, and often necessary.") the page holds the question and two lines of text, with the lower 60% blank. The year's axes arrive at "a year of scores" (about 218 s) and its bars at "As bars" (about 220.5 s). Question 3 does the same on a smaller scale: from 96 to 101.5 s only the question and the note "pies: two to four slices of one whole" are up, and the pie arrives at "Here are five shares".
- Why it matters: the scene's central contrast, length against position, is narrated with nothing to point at, right after a figure that showed it.
- Cause: `video/src/videos/da-visualization/AxisScene.tsx:114-138` (the `YTicks` at `yearAt - 4`, the `BarSet` at `asBarsAt - 2`, the `LineSet` at `asLineAt - 2`); `video/src/videos/da-visualization/AxisScene.tsx:55` (`out6 = q7At - 4`); `video/src/videos/da-visualization/LineScene.tsx:114` (the pie at `fiveAt - 4`).
- Fix: Draw the year's left axis and bars at `barsRuleAt`, and its right axis and line at `positionAt`, keeping the verdicts at `tallAt` and `asLineAt + 10`. "Here's a year of scores" then describes charts already on screen. For Question 3, start the pie at `fewAt` and keep the labels and the SUV and truck marks at their current cues.

### 9. [P3] other: the page goes fully blank for 2 s before the dashboard scene
- When: 334.6-337.0 s, beat `dash-in` and the gap after it (frames element-335.jpeg and element-336.jpeg are pure white; element-337.jpeg holds only the kicker)
- What: Only this scene fades its whole page out on the bridge's last words ("end up on"). The other ten cross-fade into the next scene. The bridge's own beat, the misleading drawings dimmed and "the decade: 0% net change" marked at `bridgeAt + 30`, gets about 1 s before the fade starts.
- Why it matters: a white screen mid-video reads as a glitch, and the bridge's mark is lost.
- Cause: `video/src/videos/da-visualization/DualScene.tsx:68-69,99` (`clearAt` and the fading `AbsoluteFill`).
- Fix: Remove the `clearAt` wrapper. The scene's 6-frame cross-fade (`OVERLAP` in `video/src/videos/da-visualization/Video.tsx`) handles the cut as it does everywhere else.

### 10. [P3] confusion: the bin-width figure contradicts two of its own lines
- When: 149.3-172.1 s, beats `bins` and `bins-rule` (frame element-170.jpeg)
- What: The 0.25-wide panel clearly shows both peaks, just jagged, under a red cross reading "spikes, not a shape". "Report the shape that survives all of them" contradicts the 5-wide panel, which the video has just shown losing a peak. The header "the same 1,000 values, three bin widths, one density axis" names an axis that is not drawn and a term the narration never uses. Sturges and Freedman-Diaconis are named with no hint of what either computes, which is the likely follow-up.
- Why it matters: a viewer is told one thing and shown another.
- Cause: `video/src/videos/da-visualization/HistScene.tsx:178` (verdict), `HistScene.tsx:160` (header), `HistScene.tsx:193-198` (notes); `video/src/videos/da-visualization/script.ts:143-150` (beats `bins` and `bins-rule`).
- Fix: Change the verdict to "noise: bumps that aren't real". Narrate "Bins a quarter wide add spikes that are only noise." Change the bins-rule close to "Report the shape that holds across sensible widths." Change the header to "the same 1,000 values, three bin widths". Optionally extend the note: "Sturges: about log2 n bins; Freedman-Diaconis: width from the IQR".

### 11. [P3] confusion: each log-scale panel labels only one of the two series
- When: 246.5-271.4 s, beats `log-linear` and `log-log` (frames element-255.jpeg, element-273.jpeg)
- What: The linear panel labels the blue line "4,000, +6%", placed at its end, where the value is about 8,000, so it reads as a value. The orange line has no label there, during "The other starts at forty". The log panel labels only the orange line ("40, +35%"), and the blue line has none.
- Why it matters: the viewer has to carry the color key from one panel to the other, and the label at 8,000 that says 4,000 is a small misread waiting to happen.
- Cause: `video/src/videos/da-visualization/LogScene.tsx:83-85` (blue label, linear only); `video/src/videos/da-visualization/LogScene.tsx:101-105` (orange label, log only).
- Fix: Label both lines at their ends in both panels as "from 4,000, +6%" and "from 40, +35%". Show each at its series' cue (`oneAt + 20` and `otherAt + 10` on the left, `logAxisAt + 10` and `steeperAt - 2` on the right).

### 12. [P3] confusion: the July bar is drawn in the trap red, and the four steps are set as a staircase
- When: 405-413 s, beat `story-title` (frame element-412.jpeg)
- What: The chart's green title states the finding ("Revenue fell 12% the month after the price rise"), but the bar it points at turns red, with a red "-12%". In this series red means the wrong answer, so the right title points at a red bar. Separately, the numbered steps are indented 14px more on each line (1384, 1399, 1413, 1428 px), so the numbers do not line up and the list looks misaligned rather than ordered.
- Why it matters: it uses color against the series' meanings, and the list looks like a layout slip.
- Cause: `video/src/videos/da-visualization/StoryScene.tsx:133` (`ACCENT` on the July bar) and `StoryScene.tsx:141` (`ACCENT_INK` on "-12%"); `video/src/videos/da-visualization/StoryScene.tsx:98` (`left: STEPS_X + i * 14`).
- Fix: Keep the July bar `BAR` and give it the yellow highlight (`HIGHLIGHT` ring or `Mark` on "-12%" in `INK`). Set `left: STEPS_X`.

### 13. [P3] answer: Question 10 names three tricks and no fix; the green "truth" line is never explained
- When: 309.5-331.7 s, beats `other` and `other-more` (frame element-332.jpeg)
- What: The cherry-picked window, the inverted axis and the zero-filled gap are each named, then the scene ends. The page closes with "The fix is honest encodings and labeled scales." At "never happened" a green line appears over the zeros chart (the series with a gap), unnarrated, about 1.5 s before the bridge dims it.
- Why it matters: "how would you avoid that?" is the obvious follow-up, and the only visual hint of an answer goes by in silence.
- Cause: `video/src/videos/da-visualization/script.ts:225-228` (beat `other-more`); `video/src/videos/da-visualization/DualScene.tsx:195` (the gapped `LineSet` at `collapseAt`).
- Fix: Add to `other-more`: "The fixes: show the whole range, keep the axis upright, and leave a gap where data is missing." Cue the green line to `"leave a gap"`, with a green tick "a gap, not a zero" under it.

### 14. [P3] answer: "biggest and top left" is not drawn, and Questions 11 and 12 drop the page's last line
- When: 337.0-386.1 s, beats `dash` and `report` (frame element-370.jpeg)
- What: "With the most important number biggest and top left" is shown by the "key metric" words growing from 20px to 26px. The tile stays the same size as the other eleven, so the grid shows top left but not biggest. The page's closing points are also missing: "Design for the audience: an executive summary differs from an ops monitoring view" for Question 11, and "Dashboards drive operational decisions; reports drive deeper analysis and stakeholder communication" for Question 12, the line that says when to use which.
- Why it matters: they are small gaps, but they are the parts that turn a definition into a judgement.
- Cause: `video/src/videos/da-visualization/DashScene.tsx:89-111` (only the font grows); `video/src/videos/da-visualization/script.ts:233-252`.
- Fix: At `biggestAt`, widen the lead tile across two columns (`width: 2 * GRID.w + GRID.gap`, shifting row 0's other cells right, or dropping cell (0,3)). Add to `report`: "Dashboards drive day-to-day decisions; reports drive the deeper ones."

### 15. [P3] accuracy: "color last" is color saturation in the source, and it seems to contradict Question 15
- When: 54.9-66.4 s, beat `choose-rank` (frame element-070.jpeg)
- What: The ranking's last row is labeled "Color", and the narration says "and color last, at about three times the error of position". The page's chart, and the Cleveland and McGill work it cites, rank "Color saturation" (`charts/encoding-accuracy.mjs:31`). `check.mjs` renamed it. Unqualified, it seems to contradict Question 15's "Categories get distinct hues": a viewer is told color is the worst encoding and then told to use it.
- Why it matters: "color is the least accurate encoding" is half right, and an interviewer may press on it.
- Cause: `video/src/videos/da-visualization/check.mjs:33` (`key: "Color"`); `video/src/videos/da-visualization/script.ts:90-93` (beat `choose-rank`).
- Fix: Rename the row "Color shade" and narrate "and color shade last, at about three times the error of position." The note becomes "color shade: about 3x the error of position".

### 16. [P3] other: "seventeen of them twice, the wrong way and the right way" overpromises
- When: 16.3-30.5 s, beat `plan` (tiles 25 s, 28 s on sheet-00 and sheet-01)
- What: The plan says seventeen questions are drawn wrong then right, and the screen says "17 drawn twice: wrong, then right". Questions 1, 4, 11, 12 and 15 have no wrong version: a map and a ranking, two correct charts, a grid, two text cards, three palettes.
- Why it matters: a small broken promise in the first 30 s.
- Cause: `video/src/videos/da-visualization/script.ts:71-74` (beat `plan`); `video/src/videos/da-visualization/HookScene.tsx:45`.
- Fix: Narrate "We'll draw seventeen of them, most the wrong way and the right way, and finish with five short ones." On screen, "drawn, most wrong then right".

### 17. [P3] pacing: Question 16's small panels are up for about 2 s, and Question 17's "in grayscale" panel is in color
- When: 476.7-479.1 s, beat `cap` (frame element-478.jpeg); 495-500 s, beat `access-fix`
- What: "Or small panels" and its four mini charts, with names at 17px, draw at "split the chart into small panels" and clear at "Question seventeen", after about 2.4 s with a 0.7 s gap. In Question 17, the third panel is titled "With labels, in grayscale" from `cueAt`, but its lines stay red and green until `grayAt`, about 4 s later.
- Why it matters: one of the two fixes for too many categories gets no reading time, and a title says something its chart does not yet show.
- Cause: `video/src/videos/da-visualization/PaletteScene.tsx:360-373` (panels at `panelsAt`, out at `out16 = q17At - 4`); `video/src/videos/da-visualization/script.ts:292-296` (`pauseAfter: 0.7`); `video/src/videos/da-visualization/PaletteScene.tsx:404-406` (title at `cueAt - 4`).
- Fix: Raise `cap`'s `pauseAfter` to 1.5. Title the third panel "With labels" at `cueAt - 4`, and fade in ", in grayscale" at `grayAt`.

### 18. [P3] confusion: the cleaned data-ink chart deletes the only word saying what it measures
- When: 523.2-531.8 s, beat `r-ink` (frame element-531.jpeg)
- What: The cluttered version carries a legend box, "Visits". The cleaned version drops it and adds value labels, so the final chart is seven numbers by weekday with no indication of what they count. Yet the verdict reads "same week, less ink" next to "if nothing is lost, it was clutter".
- Why it matters: the example deletes a mark that carried information, which is the one thing the rule says not to do.
- Cause: `video/src/videos/da-visualization/RapidScene.tsx:174-179` (the legend, faded with the clutter) and `RapidScene.tsx:183-189` (value labels, no title).
- Fix: At `losesAt`, add a panel title "Visits per day" above the cleaned bars, the legend's job done as a direct label.

### 19. [P3] confusion: Question 7's rule is the title over a chart that breaks it
- When: 208.8-232 s, beats `baseline` and `baseline-show` (frame element-231.jpeg)
- What: "bars: **length**, so start at zero" sits where a panel title would be, directly over a bar chart drawn from 92. The verdict below says it is wrong, but for the first few seconds the bars, in data blue, sit under a caption they contradict. "either way, label the axis" is placed under the bars only, though it applies to both panels.
- Why it matters: the rule reads as a description of the chart beneath it.
- Cause: `video/src/videos/da-visualization/AxisScene.tsx:104-113` (the rules as panel headers); `AxisScene.tsx:145-149`.
- Fix: Title the panels "As bars, from 92" and "As a line, from 92". Move the two rules into the verdict lines ("bars are length: a 3.6% rise, the last bar 2.55 times as tall"; "lines are position: a slope you can read"). Center "either way, label the axis" under both panels.

### 20. [P3] other: the Question 7 card does not match what is read
- When: 203.4-207 s, beat `baseline`
- What: The card reads "Is a non-zero baseline always wrong?" and the narration reads "So is a non-zero baseline always wrong?". Every other card in the video is read word for word.
- Why it matters: a small mismatch with the series' card-is-read-verbatim convention.
- Cause: `video/src/videos/da-visualization/AxisScene.tsx:75`; `video/src/videos/da-visualization/script.ts:172-175`.
- Fix: Set the card to "So is a non-zero baseline always wrong?", which is also the page's own wording ("So a non-zero baseline is always wrong?").
