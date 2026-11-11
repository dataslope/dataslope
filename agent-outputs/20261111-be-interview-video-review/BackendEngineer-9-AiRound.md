# BackendEngineer-9-AiRound (9:57)

## Verdict
- A solid closer. Every number checks out against the page and `results.json`: the 50 to 55 minutes, the 3,500 / 105,000 dollars, the 1,000 vs 750 halvings, METR's 19% / 20% with 16 developers and 246 tasks, OWASP's first place, the seeded 115. Layouts are clean at 1080p: no text under 19px, no clipping, no collisions, and no scene clears to an empty page between questions.
- The biggest problems are about the answers, not the pixels. Question 7 tells the viewer to "give a concrete workflow" and then never gives one. The jitter follow-up gives "115" with nothing to compare it against. Question 4's six-box flowchart appears in under a second without a word of narration.
- Two things work against the series' own rules. Question 5 puts a 13-line Python listing with f-string format specs on screen for about 34 s in a series that "never teaches syntax". Question 1 strikes through a sentence the narration says is true ("Not whether working code exists at the end.").
- Pacing is comfortable: 2.2 to 2.9 words/s almost everywhere, and the only beats above 3 w/s are short. The one rushed thing is the unread two-line footnote on the jitter chart.
- As interview answers, Q1 to Q3 and Q6 hold up well. Q3's "name the answer, not just the edge" and Q5's "why not cut the answer?" step are the best moments. Q4, Q5 and Q7 each stop one step before the follow-up an interviewer would ask.

## Findings

### 1. [P2] answer: Question 7 says "give a concrete workflow" but never shows one
- When: 519-539 s, beat `daily-concrete` (frames element-520.jpeg, element-538.jpeg)
- What: The four bins say what kind of thing goes in each one. "Verify" holds only "how you check what it writes" and "The time it was wrong" holds "one specific time / and how you caught it". The video names the parts of a good answer and gives none of them. A viewer leaves still not knowing what to say, and the vague answer it strikes ("I use Claude Code a lot") is the only sample answer on screen.
- Why it matters: The question is behavioral, and the follow-up ("give me an example") is the whole round. An answer made of category headings scores the way the struck vague answer does.
- Cause: `video/src/videos/be-ai-round/DailyScene.tsx:74-82` (Verify and "time it was wrong" hold restatements of the narration, not content); `script.ts` beat `daily-concrete`.
- Fix: Fill the two thin bins with a worked example and voice one sentence of it after "how you caught it". For example, Verify: "run the tests, read the diff like a PR". Wrong: "it called a pagination parameter the API doesn't have; the test against the real client failed". Add a beat such as "For example: it once invented a parameter on our payments client, and the integration test caught it before review."

### 2. [P2] confusion: a true statement struck through in Question 1
- When: 30-58 s, beats `grade` to `grade-canva` (frames element-031.jpeg, element-057.jpeg)
- What: "Not whether working code exists at the end." is drawn and then struck in red, next to "Whether you drove." The narration says this sentence as the answer. Striking a sentence that opens with "Not" reads literally as "it *is* whether working code exists", the opposite of the point. It stays on screen, struck, for 27 s.
- Why it matters: This is the series' recurring "correct statement struck through" defect, on the headline answer of the first question.
- Cause: `video/src/videos/be-ai-round/GradeScene.tsx:158` (`<Strike>` wraps the whole sentence, "Not" included).
- Fix: Strike the claim being rejected, not its negation. Render `<Strike>Working code at the end</Strike>` followed by an unstruck `Whether you drove.`, or keep "Not whether working code exists at the end." unstruck in `INK_SOFT`.

### 3. [P2] other: a 13-line Python listing in a series that argues "never syntax"
- When: 336-370 s, beats `cost` to `cost-result` (frames element-352.jpeg, element-365.jpeg)
- What: The page's code block is shown whole: assignments, `/ 1_000_000`, and `print(f"total:  {daily:,.0f} USD/day, about {daily * 30:,.0f} USD/month")`. The narration reads none of the code, only the numbers. The plan keeps code on screen for Part 7 alone ("code on screen only where reading it is the skill").
- Why it matters: For about 34 s, half the frame is format specs and underscores that the answer does not need. The point (three multiplications, two prices) is lighter than the listing that carries it.
- Cause: `video/src/videos/be-ai-round/CostScene.tsx:219` (`<Listing lines={code}>` from `COST.source`).
- Fix: Replace the listing with the arithmetic as two rows: "1,000,000 × 2,000 tokens × $1 / M = $2,000" and "1,000,000 × 300 tokens × $5 / M = $1,500", then the total and ×30. Keep the same marks and cues and the "What it prints" console beside it, or fold that console into the rows.

### 4. [P2] explanation: Question 4's flowchart builds in under a second, unnarrated
- When: 239.5-241 s, end of beat `design` (frames element-240.jpeg, element-241.jpeg)
- What: Client, App server, Quota and rate limit, Response cache and Schema validation pop in 5 frames apart, with eight edges, all on "and design for that". The narration moves straight to "Latency". No one ever walks the request path: client, quota, cache, provider on a miss, validation, back to the app, streamed to the client. Until then the viewer has seen only a lone "LLM provider" box for 10 s (231-240 s).
- Why it matters: The diagram is the skeleton the six concerns hang on. A viewer who did not read it in that second cannot tell why "miss" or "invalid" mean what they do, and the request path is what an interviewer expects you to draw first.
- Cause: `video/src/videos/be-ai-round/DesignScene.tsx:111-112` (`boxAt` at `buildAt` + 0 to 20 frames, `edgeAt = buildAt + 24`).
- Fix: Add a short beat after `design` that walks the path: "A request goes through a quota check and a cache; on a miss it calls the provider, validates what comes back, and streams it to the client." Cue each box to its word, the way the concerns are cued.

### 5. [P2] answer: the jitter follow-up gives "115" with nothing to measure it against
- When: 305.8-327.8 s, beat `design-jitter` (frames element-322.jpeg, element-326.jpeg)
- What: "No tenth of it gets more than a hundred and fifteen" is the conclusion, but the video never says whether 115 gets through. The simulation has no capacity line. The name an interviewer listens for, the thundering herd or synchronized retries, is never said. The page's own Q4 calls this pattern "backoff and jitter", and the video names neither the herd nor the ratio (the peak falls from 1,000 to 115, about nine times lower).
- Why it matters: "Why jitter?" is answered with a number rather than a reason, which is exactly where the interviewer presses next ("so what?").
- Cause: `script.ts` beat `design-jitter`; `video/src/videos/be-ai-round/JitterScene.tsx:152` (115 marked with no reference line).
- Fix: Reword the last sentence to "With a random wait of up to that second, the busiest tenth gets 115, a peak nearly nine times lower: retries arrive as a trickle the provider can absorb instead of a herd that knocks it over again." Optionally draw a dashed "what the provider takes" line (for example 200 per tenth) across both charts.

### 6. [P3] pacing: an unread two-line footnote shown for about 3 s before the cut
- When: 324.5-327.8 s, end of beat `design-jitter` (frame element-326.jpeg)
- What: "Requests per tenth of a second, in a simulation (Python's random.Random, seed 1); no provider is called. The next two waves, after 2 and 4 s: busiest tenths 60 and 35 with jitter, 1,000 without." That is about 36 words, unread, on screen about 3.3 s before the cut. The 2 and 4 s waves are the only place the video shows exponential backoff and jitter working together.
- Why it matters: At about 2 words/s it needs 15 s or more. As it is, nobody reads it, and the one figure that would show backoff compounding is lost.
- Cause: `video/src/videos/be-ai-round/JitterScene.tsx:161-168` (`tenthAt + 20` / `+ 30`); `script.ts` `design-jitter` `pauseAfter: 0.8`.
- Fix: Bring the first line in with "seeded simulation" (`simAt`). Either voice the second line ("and as the backoff doubles, the busiest tenth falls to 60, then 35") or cut it.

### 7. [P3] confusion: the commentary on the better prompt sits under the "Weak" heading
- When: 209-224 s, beat `prompt-past` (frame element-223.jpeg)
- What: "The edge comes with its answer.", "Name the answer, not just the edge." and the red "Left out, the assistant decides…" appear in the left column under "Weak / a wish". The column rule separates them from the green-highlighted span they describe. Only the red line is about what a weak prompt leaves out.
- Why it matters: The green "its answer" and the advice read as properties of the weak prompt at a glance.
- Cause: `video/src/videos/be-ai-round/PromptScene.tsx:159-170` (`x={X0}`, `width={LEFT_W}`).
- Fix: Move the first two notes under the Better listing at `BETTER_X`, below "A smaller diff, easier to review." (there is room from about y 860), and keep only the red "Left out…" note in the left column.

### 8. [P3] spacing: the "LLM provider" box sits alone for 10 s with its title off-centre
- When: 231-241 s, beat `design` (frame element-236.jpeg)
- What: The only drawing on screen while the six risks are read is the provider box, at the lower right of an empty frame, with "LLM provider" pushed to the top of the box. The invisible "+ prompt caching" subtitle already takes up its line. The same happens to the Response cache, Schema validation and Quota boxes until their subtitles fade in.
- Why it matters: An unbalanced box, alone on an empty page, holds the frame during the first 10 s of the answer.
- Cause: `video/src/videos/be-ai-round/DesignScene.tsx:196-201` (the `sub` spans are always rendered, at opacity 0); `parts.tsx:170-182` (flex column centres title and sub together).
- Fix: Pass `sub` only once its cue has arrived (`frame >= exactAt ? … : undefined`), or give the sub `position: absolute` under a centred title. Also place the provider box near the risk words (or centre it) until the flowchart builds around it.

### 9. [P3] explanation: "circuit breaker" is named and never said to do anything
- When: 253.7-267.6 s, beat `design-fail` (frame element-262.jpeg)
- What: "Then a circuit breaker" appears in the failure stack with no gloss. The neighbours each say what they do: the retries say "on 429s and server errors", the fallback lists three options.
- Why it matters: "What does the breaker do that retries don't?" is a standard follow-up. The answer (stop calling a failing provider for a while, so retries do not pile onto an outage) is one clause.
- Cause: `script.ts` beat `design-fail`; `video/src/videos/be-ai-round/DesignScene.tsx:125`.
- Fix: Narrate "Then a circuit breaker, which stops calling the provider for a while once it keeps failing, and a fallback…", and add a sub-line "stops calling a failing provider" under "circuit breaker".

### 10. [P3] answer: Question 5 never gives the number a product decision is made with
- When: 360-404 s, beats `cost-result` to `cost-past` (frame element-404.jpeg)
- What: The video totals 3,500 dollars a day and 105,000 a month, but never divides by the requests: 0.35 cents a request, 3.5 dollars per thousand. That figure is the one compared against what a user is worth, and an interviewer asks "is that viable?" next.
- Why it matters: The estimate stops one step short of the follow-up the question exists for.
- Cause: `script.ts` beat `cost-result`; `CostScene.tsx` (no per-request figure).
- Fix: Add "or about a third of a cent a request" to `cost-result`, and show "≈ $0.0035 per request" under the bar's "As written" label.

### 11. [P3] answer: the scoping defense doesn't say which part of the attack it stops
- When: 463.9-488 s, beat `inj-defend` (frame element-484.jpeg)
- What: "Scope the refund tool to the current user's own orders" is drawn as a dashed ring on the refund tool. In this example the bot reads customer emails, so it is not obvious who "the current user" is. If order 991 is the sender's own, scoping does not stop the refund. Human confirmation does.
- Why it matters: An interviewer will ask what each control actually blocks, and the two-part answer (scoping stops refunds on other people's orders, confirmation stops the rest) is implied but never stated.
- Cause: `script.ts` beat `inj-defend`.
- Fix: Reword it to "Least privilege: the tool can refund only the order this conversation is about, so the email can't name someone else's. Human confirmation before anything consequential catches the rest."

### 12. [P3] confusion: the METR chart has no axis meaning
- When: 541-571 s, beats `daily-metr` and `daily-caveat` (frame element-570.jpeg)
- What: Two bars leave a "no change" line in opposite directions: "19% longer" to the right and "about 20% faster" to the left. Nothing says the axis is time on task (right = slower). One label speaks in time ("longer") and the other in speed ("faster").
- Why it matters: A viewer has to work out from the labels why "faster" points left, on the chart that carries the video's only empirical claim.
- Cause: `video/src/videos/be-ai-round/DailyScene.tsx:197-202` (only "no change" is labelled).
- Fix: Add end labels under the axis: "← less time" at the left and "more time →" at the right, or a caption "time to finish a task, versus without AI".

### 13. [P3] answer: "fifty to fifty-five minutes" leaves the rest of the hour unexplained
- When: 145-154 s, beat `hour-past` (frame element-154.jpeg)
- What: The bracket marks 50 to 55 minutes against 60, and the dashed tail to 55 is drawn, but the narration does not say what the last 5 to 10 minutes are for.
- Why it matters: The figure invites the question, and "slack for the interviewer's questions or a bug that bites late" is the useful answer.
- Cause: `script.ts` beat `hour-past`.
- Fix: Reword it to "That's fifty to fifty-five minutes, leaving a few for the interviewer's questions or a late bug, and building is only half of it."

### 14. [P3] spacing: the "indirect" arrow starts in empty space beside the list
- When: 422-440 s, beat `inj-kinds` (frame element-438.jpeg)
- What: The direct arrow leaves "the user" box, but the indirect arrow's tail floats at (400, 647), between "an email" and "a retrieved document", attached to neither. The list it stands for runs from y 574 to 739.
- Why it matters: It reads as coming from "an email" alone rather than from all four sources.
- Cause: `video/src/videos/be-ai-round/InjectionScene.tsx:198` (`[[400, y(600)], …]`).
- Fix: Draw a thin bracket to the right of the four source lines (x about 380, spanning y 560 to 750) and start the arrow from its midpoint.
