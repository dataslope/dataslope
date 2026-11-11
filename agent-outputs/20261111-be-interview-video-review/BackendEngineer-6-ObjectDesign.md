# BackendEngineer-6-ObjectDesign (9:32, 571.8 s)

## Verdict
- A strong video overall. All fifteen answers are correct and match the page, and every number checks out (9/12 subclasses against 6/7 parts, 5 x 4 = 20 against 4 x 4 = 16, 5 and 6 for shipping, 0 against 3 for the loyalty count). The one-shop device works: each of the three hook requests comes back as an answer. It argues trade-offs, not syntax, as the plan asks.
- The worst defect is a figure that contradicts itself in the quick round. The encapsulation account turns its constructor door green ("opening: checked too") while its balance still reads -50 and "overdrawn already".
- The composition payoff ("after: 3") is on screen for about one second before the whole comparison is cleared.
- Pacing is comfortable: most beats run at 2.1 to 2.9 words/s, no gap between beats is under 0.55 s, and every scene ends on a 1.6 s hold. The only dense stretch is DIP's fake-and-plug pair (3.19 and 3.07 w/s back to back).
- As interview answers, four of them stop one step short of the follow-up. LSP states the rule but never says which half the square breaks. Interface vs abstract class leaves out "implement many, extend one". Observer gives readability as its only cost, with no failure isolation. DIP never separates inversion from injection.

## Findings

### 1. [P2] confusion: the guarded constructor still shows a balance of -50
- When: 483-487 s, beat `r-encap` (element-486.jpeg)
- What: After "is overdrawn already", the left door turns from dashed red to green and its label changes to "opening: checked too". The balance inside stays a red "-50", "overdrawn already" stays under it, and the red "open at -50" arrow still runs into the now-green door. The finished frame therefore claims that the checked constructor let -50 in.
- Why it matters: this is the one place the video teaches the invariant, and the final picture shows the guard failing.
- Cause: `video/src/videos/be-object-design/RapidScene.tsx:94` (`value` flips to `ACCOUNT.opening` at `opensAt` and never flips back), `:134` (the door re-tones to "ok" at `alreadyAt + 16`), `:146` ("overdrawn already" never leaves). The narration states the fix before the problem (`script.ts:413`: "Guard every way in, the constructor too. An account that opens at minus fifty is overdrawn already."), so the figure is drawn in that order too.
- Fix: put the problem before the rule: "...so no withdrawal can overdraw it. But an account that opens at minus fifty is overdrawn already, so guard every way in, the constructor too." In the figure, when the door turns green, bounce the -50 arrow off it (as the withdraw arrow does), add "refused" under it, return the value to 100, and fade "overdrawn already".

### 2. [P2] pacing: "three after" is shown for about one second, then the comparison is cleared
- When: 133.8-134.8 s, beats `comp-hold` to `comp-mix` (element-133.jpeg, element-134.jpeg)
- What: "after 3" appears on "three after" at about 133.8 s. The whole inheritance and composition figure starts fading at `mixAt - 6` (about 134.8 s), so the result the scene builds to is on screen for about one second. The 0 against 3 contrast is the answer to Question 2.
- Why it matters: the viewer never gets to see red 0 beside green 3 at rest, which is the picture worth remembering.
- Cause: `video/src/videos/be-object-design/CompScene.tsx:106` (`aOut = mixAt - 6`) and `script.ts:237` (`comp-hold` pauseAfter 0.6).
- Fix: raise `comp-hold` pauseAfter to 1.2, and move `aOut` to `n.word("comp-mix", "Notifications go by")`, so the comparison stays through "It also combines freely" (about 2.5 s more).

### 3. [P2] answer: LSP gives the rule but not which half the square breaks
- When: 194.7-199.3 s, beat `lsp-rule` (element-212.jpeg)
- What: "So a subclass mustn't demand more of its callers, or promise them less" is shown with both halves highlighted equally. The narration never connects it to the square. The square keeps every precondition; it breaks the postcondition: setting the width no longer leaves the height alone. The page states it as "do not weaken guarantees or strengthen preconditions".
- Why it matters: "which part of LSP does the square violate?" is the standard next question, and the video leaves it to the viewer.
- Cause: `video/src/videos/be-object-design/script.ts:270` (`lsp-rule`); `LspScene.tsx:175-178` (both Marks equal).
- Fix: change the beat to "So a subclass mustn't demand more of its callers, or promise them less. The square promises less: setting its width no longer leaves the height alone." Add a short pointer from "promise them less" to the square's "expected 20", and drop the Mark on "demand more" or make it lighter.

### 4. [P2] answer: interface vs abstract class leaves out "implement many, extend one"
- When: 528.4-542.4 s, beat `r-abstract` (tiles 529-540 on sheet-15)
- What: The answer is "declares methods, no implementation" against "can also share code and state". That is the page's answer, but it leaves out the difference interviewers usually press for: a class can implement many interfaces but extend only one class. It also skips that Java and C# interfaces now carry default methods, which makes "no implementation" only roughly true.
- Why it matters: "no implementation" is exactly what an interviewer who knows Java 8 will push back on, and the single-inheritance point is what makes "use an interface for a pure contract" a real decision rather than a preference.
- Cause: `video/src/videos/be-object-design/script.ts:433`.
- Fix: add one sentence before "Use an interface...": "And a class can implement many interfaces, but extend only one class." Add a third line under the figure: "implement many / extend one".

### 5. [P2] answer: Observer's only cost is readability, with no failure isolation
- When: 391.8-400.4 s, beat `obs-cost` (element-400.jpeg)
- What: The cost given is indirection: "you have to go and find who subscribed". For a backend checkout, the follow-up is what happens when the analytics listener throws or hangs. In the simple synchronous version it fails or slows the order. That is why real systems move the listeners behind a queue: the "publish-subscribe" that `obs-use` names but never connects.
- Why it matters: it is the backend version of this question, and the shop example sets it up.
- Cause: `video/src/videos/be-object-design/script.ts:377`.
- Fix: add to `obs-cost`: "And in the simple version the listeners run inside the order: if analytics throws, checkout fails. Put a queue between them, and that's publish-subscribe." Show it with the Analytics box turning red and a red flash travelling back along its line to the Order box.

### 6. [P3] answer: DIP and dependency injection are never told apart
- When: 254.1-261.7 s and 272.6-317.8 s, beats `solid-d`, `dip`, `dip-arrows` (element-318.jpeg)
- What: Both definitions are said as injection ("inject the concrete pieces"; "the concrete implementation is passed in"). `dip-arrows` does show the real inversion (the confirmation owns the "sends a message" shape), but it never says that this, and not the passing in, is the principle. "Isn't that just dependency injection?" is a common follow-up.
- Why it matters: a viewer could answer that DIP and DI are the same thing.
- Cause: `video/src/videos/be-object-design/script.ts:331` (`dip-arrows`).
- Fix: add after "Policy stops depending on detail.": "Injection is just how the emailer gets passed in; the inversion is that the confirmation owns the interface."

### 7. [P3] explanation: numbers on screen that the narration never explains
- When: 343-351 s, beat `strat-third` (tile 347 on sheet-10); 488-495 s, beat `r-poly`; 382-387 s, beat `obs-order` (tiles 382, 387 on sheet-11)
- What: (a) The free-above-ten card shows "weight 3: 5, weight 12: 0". The narration says only "free above a weight of ten", so the 5 at weight 3 (it falls back to the flat rate) is never explained. (b) Polymorphism shows "3.14", "4" and "= 7.14" with no radius or side given. (c) The Observer order changes from "1042 placed" to "1043 placed" when loyalty joins, and every listener's result changes with it, without a word in the narration.
- Why it matters: numbers that change or appear without a reason make a careful viewer stop and look for one.
- Cause: `video/src/videos/be-object-design/StratScene.tsx:165`; `ObsScene.tsx:61,98,136` (`second`, the switch to order 1043).
- Fix: (a) write "weight 3: flat 5" in the label; (b) add "r = 1" and "side 2" under the circle and square; (c) add "a new order" over the 1043 relight, or keep 1042 and light only the loyalty row.

### 8. [P3] pacing: the densest stretch is DIP's fake and plug, back to back
- When: 283.5-306.0 s, beats `dip-ex` (3.19 w/s, 14.1 s) and `dip-plug` (3.07 w/s), 0.6 s apart; also `comp-break` (3.14 w/s), which carries the fragile-base-class mechanism, and `lsp-break` (3.16 w/s, four numbers)
- What: `dip-ex` introduces production wiring, a recording fake, and testing without a mail server in one 45-word sentence chain. A new metaphor (the lamp) follows 0.6 s later.
- Why it matters: these are the two new ideas of Question 5, and they arrive at the fastest rate in the video.
- Cause: `video/src/videos/be-object-design/script.ts:321`.
- Fix: split `dip-ex` after "it's handed the email sender." into a second beat ("A test hands it a fake...") with pauseAfter 0.6, and raise `dip-ex`'s own pauseAfter to 0.8 before the plug.

### 9. [P3] confusion: in "The fix", only the Square is green
- When: 199.9-214 s, beat `lsp-fix` (element-212.jpeg)
- What: Under "The fix", Rectangle and Square are siblings under Shape, and the narration says "both keep every promise". Square turns green, but Rectangle stays a plain black box, so the colors suggest that only the square was fixed. On the right, the old red square ("4 x 4 = 16") is still on screen under the green fix with nothing marking it as the old design.
- Why it matters: green means the right answer in this series, and here it marks only half of it.
- Cause: `video/src/videos/be-object-design/LspScene.tsx:126` (the Rectangle box takes no "ok" tone at the fix cue).
- Fix: give Rectangle the same `tones={[[fixAt, "ok"]]}` as the Square, and dim the right-hand comparison to 0.4 at the fix cue.

### 10. [P3] spacing: the D row of SOLID is blank until everything dims
- When: 254.1-262.3 s, beat `solid-d` (element-260.jpeg)
- What: The D row's right-hand column is empty for most of `solid-d`. "→ the next question" appears on "That's the next question" (about 260.5 s) and fades with the whole list at `lawsAt - 2` (about 262.2 s), so it is fully visible for under 2 s. The other four rows each get a shop example.
- Why it matters: it is the only empty row of the five, and it fills just as the list dims.
- Cause: `video/src/videos/be-object-design/SolidScene.tsx:146` (cued on `nextAt`), `:62` (`dim = lawsAt - 2`).
- Fix: cue it on `dAt + 8`, and draw a small "Confirmation → sends a message ← Emailer" preview in that row, so the row has an example like the others and leads into Question 5.

### 11. [P3] other: on-screen text and naming slips
- When: throughout Question 2; 434-448 s; 552-558 s; 283-318 s
- What: (a) The Question 2 definition line has no closing period ("...can break it"), although the line under it has one (element-133.jpeg). (b) "Name the trigger, not the pattern: the second shipping rule" puts the colon inside the green span (element-446.jpeg). (c) "Ask which it is  before you inherit" shows a double-width gap after the highlighted span (element-556.jpeg). (d) DIP calls the same object "Email sender" in the top figure and "Emailer" in the before/after row (element-318.jpeg). The faded "Email sender" box also stays parked unattached above the fake until the cut.
- Why it matters: polish, but each is in the frame for seconds.
- Cause: `video/src/videos/be-object-design/CompScene.tsx:165`; `OverScene.tsx:146`; `RapidScene.tsx:457`; `DipScene.tsx:132,156,167`.
- Fix: (a) add "." after "can break it"; (b) move ":" out of the green span; (c) drop the space before "before", or the Mark's right padding; (d) use "Email sender" in both places, and fade the parked box out at `dip-arrows`.

### 12. [P3] spacing: half-empty frames in Observer and over-engineering
- When: 361.8-402 s (Observer) and 402-448 s (over-engineering) (element-378.jpeg, element-446.jpeg)
- What: Observer's diagram sits in the left 55% of the frame, and below y about 650 the frame is empty for 20 s until `obs-cost` adds its path. The three over-engineering columns use the band from y 400 to 650, and the bottom 25% of the frame is empty for the whole scene. Neither scene has a spot illustration (nor do LSP and SOLID), so nothing fills the space. The listener boxes and labels (24px) could be about 20% larger.
- Why it matters: the figures read smaller than the space allows.
- Cause: `video/src/videos/be-object-design/ObsScene.tsx` (`LIS_TOPS`, `RES_X` layout); `OverScene.tsx` column layout.
- Fix: scale the Observer figure up about 1.2x and move it down 40px, or give the scene a spot (a bell or a megaphone) at the right edge, as the other scenes have.
