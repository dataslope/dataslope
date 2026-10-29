# DataScientist-0-Interview (1:58)

## Verdict
- A clean, legible opener. Its four scenes (the loop as a four-stop route, five scoring columns, four AI panels, the eleven-video strip) each build in step with the narration. Nothing overlaps or clips, and the smallest type is the 19px "Part N" label. The numbers check out: 158 questions is the sum of `data.ts` and matches every topic script's header, and the bank does hold 110 `<MultipleChoice>` blocks.
- The defects are in what it claims, not in how it looks. "Five things, scored in every round" says more than the page does. "On every page: … challenges that run in your browser · 110 multiple-choice questions" is wrong twice over: only 4 of the 9 topic pages have challenges, and the 110 questions are one bank, not 110 on each page.
- The AI scene leaves out the most useful line on the page: AI-allowed rounds grade how you verify the assistant's output. It also drops the provider changing the model in the middle of a test.
- Pacing is comfortable: 2.0 to 2.75 words/s, 1.6 s gaps between scenes, and each finished scene held at least 1.3 s. Only the single 31 s `ai` beat feels dense.
- The rest is polish: color used against the series' meanings, a stray dot, a hyphen spaced by tabular figures, one tile that wraps, and the "Next" hairline crowding the strip.

## Findings

### 1. [P2] accuracy: "Five things, scored in every round" overstates the page
- When: 19.0-46.9 s, beat `probe` (frames element-022.jpeg, element-047.jpeg)
- What: The headline turn reads "scored in every round." and the narration says "Across all four, interviewers score the same five things." The page heading is only "What interviewers probe", and no single round scores all five: a SQL screen does not score experiment design. The figure undercuts the claim too. Cards 1-4 (Statistics & probability, Modeling, Experimentation, Coding) are numbered in the same blue circles as the four rounds the previous scene just numbered 1-4, so a viewer sees each scored thing as one round's subject plus communication.
- Why it matters: a candidate who believes every round grades every axis will prepare, and frame answers, the wrong way.
- Cause: `video/src/videos/ds-interview/ProbeScene.tsx:86` (turn "scored in every round."); `video/src/videos/ds-interview/script.ts:40` (beat `probe` text).
- Fix: change the turn to "probed across the loop." and the narration's first sentence to "Across the loop, interviewers probe five things." Re-voice `probe` only; the cue `"the same five things"` becomes `"five things"`.

### 2. [P2] accuracy: the practice line says every page has challenges, and reads as 110 questions a page
- When: 98.7-112 s, beat `practice` (frames element-099.jpeg, element-107.jpeg)
- What: The narration says "Each page carries practice too: concept checks, challenges that run in your browser, and a hundred and ten multiple-choice questions across the whole track." The screen sets one line, "On every page: concept checks · challenges that run in your browser · **110 multiple-choice questions**". Challenges (`ChallengeCard` / `SqlChallengeCard`) exist only on probability, machine-learning, python-and-pandas and sql. Statistics, deep-learning, experimentation, product-sense and llm-evaluation have none, and product-sense has no runnable code at all. The index page itself says "(where it fits) runnable challenges". On screen, the bold 110 sits under "On every page:", and "across the whole track" never appears.
- Why it matters: it promises practice that 5 of the 11 videos' pages do not have, and the on-screen line says the opposite of what the narration says about the bank.
- Cause: `video/src/videos/ds-interview/SeriesScene.tsx:171-174` (one line headed "On every page:"); `video/src/videos/ds-interview/script.ts:56-58` (beat `practice`).
- Fix: narration: "Every page has concept checks, four add challenges that run in your browser, and a bank of a hundred and ten multiple-choice questions covers the whole track." On screen: "Every page: concept checks · four pages: challenges that run in your browser", then a second line at `y(LINE_Y + 44)`, "A bank of 110 multiple-choice questions, across the track", cued to "a bank". Re-voice `practice` only.

### 3. [P2] answer: the AI scene drops what AI-allowed rounds grade, and the model swap mid-test
- When: 48.5-79.4 s, beat `ai` (frames element-069.jpeg, element-080.jpeg)
- What: The page's last AI point is "Some coding rounds allow an assistant and grade how you verify it; others ban it." The video keeps only "some rounds allow an assistant while others ban it", so panel 4 shows just "allowed / banned / ask the recruiter". The page's second point, "a provider can change the model in the middle of a test", is also gone. Panel 2 says only "the output changes from one run to the next".
- Why it matters: "you are graded on checking the assistant's work" is the one piece of advice here a candidate can act on in the room, and the page treats it as the point of the item.
- Cause: `video/src/videos/ds-interview/script.ts:46` (beat `ai` text); `video/src/videos/ds-interview/AiScene.tsx:117-126` and `153-180` (panels 2 and 4 have no line for either).
- Fix: narration: "Experiments on AI features, where the output changes from one run to the next and the provider can swap the model mid-test. … Some coding rounds allow an assistant and grade how you check its work; others ban it, so ask the recruiter about each round." Add "and the model can change mid-test" as a third line in panel 2. Add "graded on how you check it" (26px, INK) under the pills in panel 4, cued to "grade how you check".

### 4. [P3] accuracy: the bridge's "most loops open with probability and statistics" has no source, and only Statistics lights up
- When: 108.8-115.8 s, beat `next` (frames element-111.jpeg, element-117.jpeg)
- What: "Most loops open with probability and statistics questions, and so does this series." The index page lists those questions first but never says loops open with them. The series opens with Statistics because it follows the track's order, which the `series` beat has just said. On "probability and statistics", only the Part 1 Statistics tile highlights, and Part 2 Probability dims with the rest.
- Why it matters: an unsourced claim about interview order, plus a highlight that disagrees with the word being spoken.
- Cause: `video/src/videos/ds-interview/script.ts:60`; `video/src/videos/ds-interview/SeriesScene.tsx:95-96` (only `i === 0` lights; every other tile dims on `openAt`).
- Fix: either reword to "The track starts with the statistics every other round leans on, and so does this series. Next: Statistics.", or keep the line and light Parts 1 and 2 together on "probability and statistics" (`i <= 1`), dimming Part 2 again on "Next".

### 5. [P3] confusion: red and green used against the series' meanings
- When: 11-18 s, beat `loop` (element-018.jpeg); 76-80 s, beat `ai` (element-080.jpeg)
- What: In the AI scene, the advice "ask the recruiter which is which" is set in the red accent ink, the series' color for a trap or error. In the loop scene, the B arm is green and A is blue, which reads as "B is the right answer".
- Why it matters: across twelve videos green means right and red means wrong, and both uses here are neutral.
- Cause: `video/src/videos/ds-interview/AiScene.tsx:178` (`note(26, ACCENT_INK)`); `video/src/videos/ds-interview/LoopScene.tsx:171-177` (`k ? OK : BAR`).
- Fix: set the recruiter line in `INK` with a `<Mark>` (yellow, "what the narration points at"). Draw both A and B arms in data blue (`BAR` / `BLUE_INK`) and tell them apart by letter only.

### 6. [P3] confusion: the two AI-panel mini-figures have no labels
- When: 61-80 s, beat `ai` (frames element-069.jpeg, element-080.jpeg)
- What: Panel 1's interval floats on a bare baseline with no scale and no "pass rate" tick. Panel 2 shows three blue bars that keep breathing, with no axis, no "run 1/2/3" and no sign of what their height measures. They read as a generic bar chart, not as three runs of one prompt (the code comment's intent).
- Why it matters: a figure with no labels adds motion without adding meaning.
- Cause: `video/src/videos/ds-interview/AiScene.tsx:108-114`, `120-125`.
- Fix: under panel 2's bars, add "run 1", "run 2", "run 3" (`label(20, INK_SOFT)`, centred on x = 42, 112, 182). Under panel 1's interval, add "0%" and "100%" end labels with a "pass rate" caption, all at 20px.

### 7. [P3] other: a stray blue dot sits in panel 1 for about 8 s
- When: 53-61 s, beat `ai` (frame element-058.jpeg)
- What: A 4px blue dot at about (790, 420) appears with the panel and stays until "a confidence interval" draws the interval out of it.
- Why it matters: it looks like a rendering speck.
- Cause: `video/src/videos/ds-interview/AiScene.tsx:110`. The zero-length interval line has `strokeLinecap="round"` and no opacity, so at `ciP = 0` its round cap draws a dot.
- Fix: add `opacity={ciP}` to that `<line>`, as the two whiskers already have.

### 8. [P3] spacing: "How would you predict this?" wraps to an orphan with no leading
- When: 8-18 s, beat `loop` (frame element-018.jpeg)
- What: The italic quote breaks as "How would you predict / this?”". The descender of "predict" almost touches the "t" of "this" on the line below.
- Why it matters: it is the only two-line label on the route, and it looks cramped next to the single-line stops.
- Cause: `video/src/videos/ds-interview/LoopScene.tsx:15` (`TITLE_W = 340`) and `145-157` (`headline(32, true)`, whose line height is near 1).
- Fix: give this div `width: 420` (left `cx(1) - 210`) and `whiteSpace: "nowrap"`, so it sits on one line. Otherwise keep the wrap and add `lineHeight: 1.3`.

### 9. [P3] other: "multiple-choice" renders as "multiple - choice"
- When: 105-112 s, beat `practice` (frame element-107.jpeg)
- What: The hyphen in the bold "110 multiple-choice questions" is set at figure width, with visible space on both sides.
- Why it matters: it reads as a typo.
- Cause: `video/src/videos/ds-interview/SeriesScene.tsx:167` spreads `TABULAR` (`tabular-nums`) over the whole sentence, and Inter's `tnum` widens the hyphen.
- Fix: remove `...TABULAR` from that div. The number never changes, so it needs no tabular figures.

### 10. [P3] spacing: the Product sense tile wraps and drops its count off the row
- When: 84-118 s, beats `series` to `next` (frames element-091.jpeg, element-117.jpeg)
- What: "Product sense & metrics" wraps to two lines, so its "14 questions" sits about 28px lower than the counts in the other five tiles of row 2.
- Why it matters: one ragged baseline in an otherwise regular grid.
- Cause: `video/src/videos/ds-interview/SeriesScene.tsx:116` (24px title in a 260px tile) and `data.ts` (`title: "Product sense & metrics"`).
- Fix: title the tile "Product sense", which is the Part 8 video's own subject. Otherwise bottom-anchor the text block (`bottom: 22` in place of `top: ART + 26`) so every count shares a baseline.

### 11. [P3] spacing: the "Next" hairline sits 18px under the tile strip
- When: 111-118 s, beat `next` (frame element-117.jpeg)
- What: The NextLine rule is drawn at y ≈ 910, just under row 2's tile bottoms at about 892. It reads as the strip's own baseline rather than a separate closing line.
- Why it matters: it breaks the house rule of clear space between neighbours.
- Cause: `video/src/videos/ds-interview/SeriesScene.tsx:177` (`y(LINE_Y) - h(8)`, where `LINE_Y = 834` at line 20).
- Fix: put the NextLine at `y(LINE_Y) + h(12)` so the rule clears the tiles by about 40px. "Next: Statistics" still lands about 70px above the bottom edge.

### 12. [P3] explanation: "LLM judge", "eval set" and "pass rate" go unexplained
- When: 53-66 s, beat `ai` (frames element-058.jpeg, element-064.jpeg)
- What: The narration and panel 1 use "an eval set", "a confidence interval on its pass rate" and "an LLM judge agrees with experts" ("does the judge agree with experts?" on screen) without saying what any of them is. "LLM" is also on screen in the panel title about 2 s before the narration expands it.
- Why it matters: this is the opener, which a newcomer watches first. "Judge" in particular reads as a human interviewer unless the video says it is a model grading other answers.
- Cause: `video/src/videos/ds-interview/script.ts:46`; `video/src/videos/ds-interview/AiScene.tsx:101-107`.
- Fix: change the narration to "…an eval set of test prompts, a confidence interval on the share it passes, and a check that an LLM judge, a model grading the answers, agrees with experts." Cue panel 1's title to "a large language model" in place of "Evaluating a feature".

### 13. [P3] pacing: four AI ideas in one 31 s beat, the densest in the video
- When: 48.5-79.4 s, beat `ai` (2.75 w/s, 85 words)
- What: All four changes and three new terms come in one unbroken beat. The other beats run 2.0 to 2.6 w/s and each carries one idea.
- Why it matters: the panels each get only the length of a sentence before the next one starts.
- Cause: `video/src/videos/ds-interview/script.ts:44-47` (a single beat with `pauseAfter: 0.8`).
- Fix: split into `ai` (headline and LLM evaluation), `ai-exp`, `ai-check` and `ai-rounds`, each with `pauseAfter: 0.5`, and re-voice them along with the wording changes in findings 3 and 12. The cues already name each phrase, so the scene code needs only `n.word("ai-exp", …)` and similar.
