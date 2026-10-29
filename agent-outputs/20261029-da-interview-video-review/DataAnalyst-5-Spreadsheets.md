# DataAnalyst-5-Spreadsheets (7:21)

## Verdict
- The numbers hold up. Every result said or shown (290 from two orders, 9.00, #N/A, Kitchen, P-102, Not found, 10% from the 500 tier, 24.00, 8.00/20.00/6.40 against 0.00, Unknown and #REF!, 1070 against 1220, 560/290/3/140, Ava Smith, ava.smith, 45352 and 30, two cells over 150, the repeated email) matches `results.json` and the page. All ten question cards are read word for word. Drawing every answer as a live spreadsheet (range outlines, a formula bar, a column insert) works well, and the ten worked answers are right.
- The biggest problems are in what the screen says next to a formula. "the fourth argument: FALSE" is set directly under two XLOOKUPs whose fourth argument is "Not found". The mixed-reference answer is drawn over the tax sheet, where `$F2` is the cell a red note has just called empty, and the grid it "fills" is never drawn. In Question 6 the "exact" label heads the approximate formula.
- Several answers stop one step short of the follow-up. INDEX/MATCH's robustness is asserted, not shown, and neither MATCH's position nor its `0` is explained. VLOOKUP's default (approximate) is only implied. IFNA is offered as the fix while it still hides the stray-space key on screen. The duplicate flag marks both copies.
- Typography repeats two series fixes that missed this video's grid: tabular figures widen every hyphen in the sheets ("P - 101", "2024 - 01"), and the row gutter, column letters, the rapid round's tables and one formula are under 19px.
- Pacing is comfortable: content beats run at 2.4 to 2.9 words a second, no gap is under 0.55 s, and the scene bridges get 1.6 s. Only the hook (3.06), plan (3.21) and `r-named` (3.26) are dense. A few things leave too fast: the full I4 formula is up for about 1.3 s, and the last notes of `r-split` and `r-named` are readable for about a second.

## Findings

### 1. [P2] confusion: "the fourth argument: FALSE" sits under two XLOOKUPs whose fourth argument is "Not found"
- When: 168.6-171.7 s, beat `approx-in` (element-169.jpeg)
- What: At "the argument everyone forgets", a 30px line "the fourth argument: FALSE" (FALSE highlighted) appears under `=XLOOKUP("Mug",B2:B5,A2:A5)` and `=XLOOKUP("P-109",A2:A5,D2:D5,"Not found")`. Those two formulas are dimmed but still the only ones on screen. The function the label belongs to (VLOOKUP) is not named on screen or in the narration until the next scene. Question 6 then never says what leaving the argument off means. "Leave off false" and a 24.00 imply that it falls back to approximate, but nobody says that VLOOKUP and MATCH default to approximate while XLOOKUP defaults to exact. An interviewer asks exactly that.
- Why it matters: a viewer has just learned that XLOOKUP's fourth argument is the not-found text, and the screen now says it is FALSE.
- Cause: `video/src/videos/da-spreadsheets/LookupScene.tsx:264-271` puts the bridge note in the XLOOKUP layout, and `:251, :262` only dim the XLOOKUP bars (`dim={forgetAt}`). `script.ts:151` has no default stated.
- Fix: write the note as "VLOOKUP's fourth argument: FALSE" and fade the XLOOKUP bars (`out={forgetAt}` instead of `dim`). In `approx-trap`, say "Leave off false, and V lookup falls back to approximate: look up P one oh five, which doesn't exist." Add a 23px note under the TRUE bar in `ApproxScene`: "left off, VLOOKUP and MATCH mean approximate; XLOOKUP means exact".

### 2. [P2] confusion: The mixed-reference formula is drawn over the tax sheet, and the grid it fills never appears
- When: 239.8-249.6 s, beat `refs-mixed` (element-248.jpeg)
- What: At "The cross-tab formula", `G2 =SUMIFS($D$2:$D$11,$B$2:$B$11,$F2,$C$2:$C$11,G$1)` types in under the tax sheet. That sheet's column F holds "8%" and two empty cells, and the red note "F2 and F3 are empty: no tax" stays beside it. `$F2` is highlighted directly below the cell that note calls empty. The cross-tab the formula belongs to (regions in F2:F4, months in G1:I1) was last seen at 79 s and is not redrawn, so "$F: the column stays on the regions" and "one formula fills the whole grid" point at nothing. The second bar (`I4 … $F4 … I$1`) starts on "fills the whole grid" and is complete for about 1.3 s before Question 7's figure clears (element-248 still shows it half typed).
- Why it matters: mixed references are the third part of Question 7, and the only picture of them refers to a sheet the viewer cannot see.
- Cause: `video/src/videos/da-spreadsheets/RefsScene.tsx:164-202` adds only formula bars and notes. The tax sheet (`:124-137`) and its note (`:160-162`) stay to `out7`. The I4 bar has `at={wholeAt - 6}` (`:185`). `script.ts:171` uses `pauseAfter: 0.7`.
- Fix: at `mixedAt`, fade out the tax sheet and its note (`out={mixedAt}`). Draw the cross-tab F1:I4 from `PIVOT.grid` in their place, as `PivotScene`'s `pg` does (`firstCol: 5`), with the F column and row 1 tinted `LOCK`, G2 outlined at `lockAt` and I4 at `rowAt`. Cue the I4 bar at `rowAt`, and set `pauseAfter: 1.4` on `refs-mixed`.

### 3. [P2] answer: IFNA is offered as the fix while it still hides the stray-space key
- When: 277-290 s, beat `iferror-trap` (element-283.jpeg)
- What: The final frame shows the IFNA column as Mug / Unknown / Unknown / #REF!. The stray-space row reads "Unknown" in both columns, but only the IFERROR cell is marked red. The IFNA cell is plain, as if fine. "fix the cause first: trim the key, fix the column" leaves as IFNA arrives. The narration ends on "it takes the missing key, and lets the broken formula show". A key with a trailing space is #N/A too, so IFNA swallows it exactly as IFERROR did.
- Why it matters: a viewer leaves thinking IFNA solves the problem the scene opened with. The obvious follow-up ("and the stray space?") is answered only by a note that has already gone.
- Cause: `video/src/videos/da-spreadsheets/RefsScene.tsx:212-217` (no fill on row 4, column 2). `:258-260` (`out={ifnaAt}`). `script.ts:187`.
- Fix: add `{ r: 4, c: 2, at: ifnaAt + 10, color: MARK_BAD }`, and keep the "fix the cause first" note (drop its `out`, move it to `lg.top + h(150)`). End the beat with "…and lets the broken formula show. The stray space still needs trim."

### 4. [P2] explanation: INDEX/MATCH's robustness is asserted, never shown
- When: 135.6-146.3 s, beat `index` (element-144.jpeg)
- What: "it points at ranges, not a column number, so after the insert the price range moves with the data". The price formula is typed from the start as `=INDEX(D2:D5,…)`, after the insert has already happened, so nothing moves on screen. The viewer never sees the formula that was written (`C2:C5`) become `D2:D5`, which is the whole answer to "why is it more robust?".
- Why it matters: this is the half of Question 4 the question card asks about, and it gets no picture.
- Cause: `video/src/videos/da-spreadsheets/LookupScene.tsx:225-236` uses `A.indexMatchPrice`. The pre-insert cell `L.indexMatchPrice` (`INDEX(products!C2:C5,…)`, in `results.json`) is never used.
- Fix: type `screen(L.indexMatchPrice)` at `rangesAt`, with `C2:C5` marked. At `n.word("index", "moves with the data")`, swap it to `screen(A.indexMatchPrice)` with `D2:D5` marked yellow, and slide the purple box from C to D. Add a note: "written as C2:C5; the insert made it D2:D5".

### 5. [P2] explanation: MATCH's position is never shown, and its `0` is never explained
- When: 123-135 s, beat `index` (element-132.jpeg)
- What: "Match finds the position of a value in one range. Index returns what sits at that position in another." The screen shows the formula, a teal box on the names and a purple box on the SKUs for about 12 s, with the right half of the frame empty, and then "P-102". The position itself (2) never appears. The trailing `0` in `MATCH("Mug",B2:B5,0)` is the exact-match flag. That is the same idea as Question 6's FALSE, and the page states it ("FALSE/0 in VLOOKUP/MATCH"), but it is never pointed at.
- Why it matters: "position" is the mechanism of the answer, and "what's the zero for?" is a standard follow-up.
- Cause: `video/src/videos/da-spreadsheets/LookupScene.tsx:202-224` has no intermediate step. `script.ts:127`.
- Fix: under the first bar, add a step line at `matchAt + 10`: `MATCH("Mug",B2:B5,0) → 2`. At `indexAt`, add "2nd of A2:A5 → P-102", with a "2" tag beside row 3 of the sheet. Add a 23px note "0: exact match". In the narration: "Match finds the position of a value in one range: mug is second, and the zero asks for an exact match."

### 6. [P2] confusion: In Question 6 the "exact" label heads the approximate formula
- When: 177.7-214 s, beats `approx-what`, `approx-trap` (element-212.jpeg)
- What: "exact: a precise hit, or #N/A" is set at the top of the right column. The first formula under it is `=VLOOKUP(640,A2:B5,2,TRUE) → 10%`, the approximate one. Approximate gets no label of its own; only the note "the largest 'from' not above 640 is 500" sits under it. The exact formula (`…,FALSE) → #N/A`) is 380px further down, unlabelled.
- Why it matters: the question is the difference between the two modes, and the layout pairs the "exact" label with the approximate result.
- Cause: `video/src/videos/da-spreadsheets/ApproxScene.tsx:92-96` puts the exact note at `tg.top - h(4)`, directly above the TRUE bar (`:97-106`).
- Fix: put "approximate (TRUE): the largest value not above the key" in that slot. Move "exact (FALSE): a precise hit, or #N/A" under the FALSE bar at `pg.top + h(150)`, cued at `naAt + 6`, and lower the "unsorted?" note to `pg.top + h(200)`.

### 7. [P2] pacing: The rapid round's last notes leave within about a second
- When: 383.9-385.4 s, beat `r-split` (element-384.jpeg); 400.1-402.0 s, beat `r-dates` (element-401.jpeg); 417.8-419.8 s, beat `r-named` (tiles 418, 419)
- What: "the empty "" leaves no double space" (7 words, not read aloud) is cued on "skips the blanks", the beat's last words. It is fully readable for about 0.8 s. The named-range note "TaxRate names $F$1: the same cell, read in words" (9 words) and the `=A2*$F$1 → 8.00` bar arrive on "still points at F one", at 3.26 words a second, and are readable for about 1 s. The DATEVALUE result 45352 is up for about 1.5 s. Each body starts fading 10 frames before the next beat.
- Why it matters: at 2 words a second those notes need 3.5 to 4.5 s, and the round is where unspoken text matters most.
- Cause: `video/src/videos/da-spreadsheets/RapidScene.tsx:132` (`at={blanksAt}`), `:154` (`convertsAt + 4`), `:204-210` (`pointsAt`). `video/src/editorial/interview.tsx:204` fades a body at `next - 2`. `script.ts:229-244` gives these beats no `pauseAfter`.
- Fix: set `pauseAfter: 1.5` on `r-split`, `r-dates` and `r-named`. Cue the `r-split` note at `joinAt + 12` and the named note at `meansAt + 6`. Split `r-named` after "reads as what it means".

### 8. [P2] other: Tabular figures widen every hyphen in the sheets
- When: whole video, every sheet (element-027, 117, 283, 354, 409.jpeg)
- What: sheet cells render "P - 101", "2024 - 01" and "\"P - 102 \" (stray space)" with a digit-wide hyphen. The formula bars, in mono, spell the same codes "P-102", so the code reads differently in the cell and in the formula beside it.
- Why it matters: this is the series fix for tabular hyphens missing a case, and it is on screen for nearly all 7 minutes, on the SKUs the narration keeps reading.
- Cause: `video/src/videos/da-spreadsheets/parts.tsx:237` spreads `...TABULAR` over every cell value. The `npm test` check sees only static spans, so a dynamic cell value slips past it.
- Fix: `...(side === "right" ? TABULAR : {})`, which gives tabular figures to right-aligned numbers only.

### 9. [P2] spacing: The grid chrome, the rapid round's tables and one formula are under 19px
- When: whole video. Rapid round 345-365 s and 402-411 s (element-354, 409.jpeg). 376-385 s (element-384.jpeg)
- What: row numbers are 17px and column letters 18px in every sheet. The formula bar's cell name ("G2", "B3", "I4") is 18px. The rapid round's orders tables (SUMIF, COUNTIF, conditional formatting) are set at 18px. The `=LEFT("ava.smith@example.com",FIND(…)-1)` formula drops to 18px, visibly smaller than the TEXTJOIN bar under it, in a 1040px bar it would fit at 20px.
- Why it matters: this breaks the house 19px floor, and the narration reads row and column names aloud ("F one", "A two").
- Cause: `video/src/videos/da-spreadsheets/parts.tsx:192` (`label(17, …)`), `:174, :184, :396` (`label(18, …)`). `RapidScene.tsx:46, :189` (`size={18}`). `RapidScene.tsx:38` (`> 54 ? 18 : 21`).
- Fix: use `label(19, …)` for the gutter, the letters and the cell name. Set `size={19}` on the rapid sheets with `rowH: c.h(34)`. Change the slot rule to `> 54 ? 20 : 21`.

### 10. [P3] pacing: "the sum, pointed at the months" is up for about a second, beside a formula that still reads 290
- When: 12.9-14.3 s, beat `hook` into `plan` (tile 14 s, sheet-00)
- What: the hook's third failure (a red dashed box slipping onto the month column) gets a 6-word note that fades in on the hook's last words and is cleared by "Eighteen questions", about 1 s at full strength. The formula bar above it still shows the correct SUMIFS and 290.
- Why it matters: the hook's payoff can't be read, and the picture contradicts it.
- Cause: `video/src/videos/da-spreadsheets/HookScene.tsx:119-121` (`out={eighteenAt}`), and `:86-89` keeps the result.
- Fix: change the note's `out` to `tenAt`, which keeps it up about 2.5 s longer, and pass `dim={wrongAt}` to the formula bar so the 290 stops reading as the answer.

### 11. [P3] other: Question 8 sits on an empty page for 4.3 s
- When: 249.9-254.2 s, beat `iferror` (tiles 250-252). Also 318.6-319.9 s, beat `risks`
- What: Question 7's figure clears as "Question eight" starts. The lookups sheet arrives only as the question finishes, so the page below the card is blank for 4.3 s. Question 10 does the same for about 1.3 s.
- Why it matters: it is the one place the video drops to a bare page between questions, which the series tries to avoid.
- Cause: `video/src/videos/da-spreadsheets/RefsScene.tsx:208` (`at={asked8 - 6}`). `ToolScene.tsx:158, 170` (`q10TextAt + 10`).
- Fix: bring the lookups sheet's header and the P-102 row in at `q8TextAt`. Bring the revenue column in at `q10At + 6`.

### 12. [P3] confusion: Formulas whose ranges don't match the sheet beside them
- When: 112-118.7 s, beat `lookup-limits` (element-117.jpeg); 255-290 s, beats `iferror-what`, `iferror-trap` (element-283.jpeg)
- What: after the column insert, the first bar visibly retypes itself as `A2:D5`, as if someone edited it, while the second bar keeps `A2:C5`. Excel would have widened both without retyping either. In Question 8, every bar reads `VLOOKUP(…,A2:C5,…)` beside the "looks up" sheet, whose own A2:C5 holds the results, because the products sheet is not drawn there.
- Why it matters: the range is what the viewer checks a formula against, and here it points at the wrong cells.
- Cause: `video/src/videos/da-spreadsheets/LookupScene.tsx:167-177` (`L.leftward` kept to `out3`), `:187-199` (new bar typed with `typeDur={10}`). `RefsScene.tsx:223, 234, 247, 265` with `data.ts:61` stripping the `products!` prefix.
- Fix: at `insertAt + 12`, swap both bars' text in place (`typeDur={1}`) to `screen(A.vlookup)` and `screen(A.leftward)`, with `A2:D5` marked. In `RefsScene`, keep the prefix (`c.formula` rather than `screen(c)`), so the bar reads `products!A2:C5`.

### 13. [P3] confusion: Green and blue used against their series meanings
- When: 227-240 s, beat `refs-fill` (tiles 234, 239); 312-318 s, beat `tool-when` (element-317.jpeg)
- What: the outline that walks down the filled cells is green, including around C3 and C4 as they come out 0.00 in red. Green is the right answer. The Question 9 takeaway "the same manual steps every week? it belongs in SQL" is set in blue, the data color.
- Why it matters: one meaning per color is a series rule, and here green frames a wrong value.
- Cause: `video/src/videos/da-spreadsheets/RefsScene.tsx:150, 155` (`ds("green", 600)`). `ToolScene.tsx:150` (`BLUE_INK`).
- Fix: draw the active-cell outline in `INK_SOFT` or `ds("gray", 500)`. Set the takeaway in `INK` at weight 650 with a `Mark` under "it belongs in SQL".

### 14. [P3] spacing: Double-width spaces in inline mono
- When: 402-411 s, beat `r-format` (element-409.jpeg: "cell value >  150"); 63-79 s, beat `crosstab-count` (element-077.jpeg: "SUM(CASE WHEN …)")
- What: two inline code spans use a raw JetBrains Mono span, so each space is a full glyph wide in the middle of an Inter line.
- Why it matters: this is the series fix for double-width spaces in inline code (`Mono`'s `wordSpacing: -0.3em`) missing two cases.
- Cause: `video/src/videos/da-spreadsheets/RapidScene.tsx:182` and `PivotScene.tsx:192` use `fontFamily: MONO` directly.
- Fix: wrap both in `<Mono>` from `parts.tsx`, or add `wordSpacing: "-0.3em"` to the spans.

### 15. [P3] answer: The duplicate flag marks both copies
- When: 419.9-440 s, beat `r-dupes` (element-439.jpeg)
- What: `=COUNTIF($A$2:$A$5,A2)>1` puts TRUE on rows 2 and 4, the original and the repeat. Then "Check the flags, then remove duplicates". A viewer who deletes the flagged rows deletes both. The usual follow-up is how to flag only the later copy.
- Why it matters: it is the step after the page's own answer, and a natural misuse of the flags as shown.
- Cause: `video/src/videos/da-spreadsheets/RapidScene.tsx:226-238`. `script.ts:247`.
- Fix: add a note under the table: "both copies flag; `COUNTIF($A$2:A2,A2)>1` flags only the repeat". Or say "…flags every copy. Remove Duplicates keeps the first."

### 16. [P3] answer: The text-as-number risk is shown but not how to spot or fix it
- When: 330-341 s, beat `risks` (element-340.jpeg)
- What: the 150 stored as text sits left in red and SUM gives 1070. The scene never says that the left alignment is the tell, or how to find and fix it. `check.mjs` already computed `ISTEXT(D4) → TRUE` (`CONDITIONS.textCell`), and nothing uses it.
- Why it matters: "how would you catch that?" is the next question.
- Cause: `video/src/videos/da-spreadsheets/ToolScene.tsx:177-195`.
- Fix: add a bar under "with it as a number: 1220" showing `=ISTEXT(D4) → TRUE`, and a note: "text sits left; VALUE() converts it".

### 17. [P3] answer: "current versions of Excel" is vaguer than the page
- When: 146.4-151 s, beat `xlookup` (tile 151)
- What: the narration and the note say "the newer lookup, in current Excel". The page says Excel 365 / 2021+. Shared workbooks opened in older Excel are the standard objection to XLOOKUP.
- Why it matters: an interviewer will ask when you can't use it.
- Cause: `video/src/videos/da-spreadsheets/script.ts:132`. `LookupScene.tsx:240`.
- Fix: say "It's the newer lookup, in Excel 365 and 2021 on; older versions can't read it." Set the note to "Excel 365 and 2021+".

### 18. [P3] explanation: "Clean before you look up" names a function the video never shows, and TEXTJOIN's TRUE is not pointed at
- When: 365-385 s, beats `r-clean`, `r-split` (tiles 373, 384)
- What: CLEAN is a real function the page lists (it removes non-printing characters), so "Clean before you look up" reads as an instruction to use it, though the scene shows only TRIM and PROPER. In `TEXTJOIN(" ",TRUE,"Ava","","Smith")`, TRUE is the argument that "skips the blanks", but nothing marks it.
- Why it matters: small, but both are terms a viewer may repeat.
- Cause: `video/src/videos/da-spreadsheets/script.ts:227, 231`. `RapidScene.tsx:114-116, 131`.
- Fix: say "Tidy the keys before you look up, or they won't match." Pass `marks={[{ text: "TRUE", color: MARK }]}` to the TEXTJOIN bar, and set the note to "TRUE skips the empty \"\": no double space".
