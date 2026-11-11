# BackendEngineer-3-ApiDesign (650.3 s, 10:50)

## Verdict
- A strong, accurate video. Every number I checked matches `results.json` and the page: the Postgres plans (20, 10,000 and 100,000 rows read), the cursor `{"id": 99981}`, the 164-character JWT, the 43-character session ID, and 3,663 to 610 bytes gzipped. The figures carry the arguments (the drifting page 2, the three charges against one, the hybrid token timeline) and are almost always on screen as the words are spoken.
- The biggest visual problem is in Question 8. Question 7's panels clear, and the page then stays nearly empty for about 11 s (371 to 382 s) while the narrator starts the answer. The other visual problems are small: one counter-example (`codes-why`) that is gone almost as soon as it appears, the "429" labels jammed under their heading, and a few orphan or redundant labels.
- Pacing is comfortable. Only four beats reach 3 words/s (`rest-why`, `methods-patch`, `codes-why`, `page-drift`), and each has its figure in place. Every scene holds about 1.6 s before its cut. The quick round gives each question 11 to 19 s.
- The answers hold up, and they argue trade-offs, not syntax. They stop short at three predictable follow-ups:
  - what the racing idempotent retry actually gets back, and a reused key with a different body (Q5);
  - the index a cursor depends on (Q6);
  - the versioning alternatives the page itself names (Q13).

## Findings

### 1. [P2] confusion: Question 8 opens on an almost empty page for about 11 s
- When: 371.0 to 382 s, beats `revoke` and the start of `revoke-session` (frames element-373.jpeg, element-381.jpeg)
- What: At `q8At`, all of Question 7's panels leave. From 377.1 s the narrator says "When you need instant revocation, to log a user out or ban them now, and can afford a session store every server shares", and the only thing on screen is the green note "Sessions: revoke at once" (element-381). The servers and the shared store do not arrive until "a session store every server shares", at about 382 s. The `tiles.txt` entry at 373 holds 10 s.
- Why it matters: The viewer hears the core of the answer (instant revocation) over a blank page, right after a dense three-panel scene.
- Cause: `video/src/videos/be-api-design/AuthScene.tsx:145` (`leave = q8At - 6` clears every Q7 panel) together with `AuthScene.tsx:342-346`, where the servers and the store are cued at `sharesAt`, not at `instantAt` (line 128).
- Fix: Cue the two server nodes and the store at `instantAt + 4` (arrows `+10`), so the diagram is drawn while "instant revocation" is spoken. Keep `sharesAt` for a pulse on the store. If you keep the current cues, keep Q7's Session panel until `instantAt` (`out={instantAt}` on the session notes) instead of clearing at `q8At`.

### 2. [P2] pacing: the "parse the message" counter-example is struck and gone within about 2 s
- When: 148.6 to 150.5 s, beat `codes-why` (frames element-148.jpeg, element-149.jpeg)
- What: The red line `if "not found" in message: …` appears on "parsing an error message". It is struck through 10 frames later, which buries most of its glyphs under the red stroke (element-149). The whole Question 3 block then leaves at `q4At - 6`, about 1.5 s after that. The contact sheets never even catch it: the tile at 147 s shows only the green line.
- Why it matters: This is the contrast the beat is about (branch on the code, not the string), and it is unreadable in the time it is up.
- Cause: `video/src/videos/be-api-design/CodesScene.tsx:159-165` (`at={parseAt}`, `Strike at={parseAt + 10}`) together with `CodesScene.tsx:83` (`leave = q4At - 6`). Also `script.ts:257-258`, where `codes-why` has `pauseAfter: 0.6`.
- Fix: Raise `codes-why`'s `pauseAfter` to 1.6, as the other question ends have. Move the strike to `parseAt + 24`, so the line can be read before it is crossed out, or drop the strike and keep only the red cross.

### 3. [P2] answer: Q5 stops before what the racing retry gets, and before a reused key with a different body
- When: 239.4 to 248.8 s, beat `idem-race` (frame element-249.jpeg)
- What: The video ends on the database refusing the second insert, and shows the raw `ERROR: duplicate key value violates unique constraint`. It never says what the API then returns to that client. Nor does it say what happens when the same key arrives with a different amount, or how long keys are kept. An interviewer asks all three straight after "use an idempotency key". The page's own concept check says the server "returns the original result on any retry".
- Why it matters: The clip leaves "the database throws" as the end state. A candidate who repeats it has described a 500, not an idempotent API.
- Cause: `video/src/videos/be-api-design/script.ts:304-306` (the `idem-race` text) and `IdemScene.tsx:187-215`.
- Fix: Add one sentence to `idem-race`: "The server catches that refusal and answers with the stored payment, and a key reused with a different body is rejected." Under the error, add a green note "→ 200, payment 1" cued to it.

### 4. [P2] answer: Q6 says a cursor reads "twenty rows at any depth" without the index that makes it true
- When: 289.8 to 315.3 s, beats `page-cursor` and `page-cost-two` (frame element-315.jpeg)
- What: The 20-rows-at-every-depth bars are true only because the query seeks on `articles_pkey`; the plans in `results.json` are all `Index Scan Backward using articles_pkey`. The second cost the video names is "an order that's unique and never changes" (`(created_at, id)`), but it never says that order needs a matching index. Without one, `WHERE (created_at, id) < …` scans and sorts.
- Why it matters: "Which index does keyset pagination need?" is the standard follow-up, and the video's own measurement depends on the answer.
- Cause: `video/src/videos/be-api-design/script.ts:327-334` (the `page-cursor` and `page-cost-two` text) and `PageScene.tsx:310-312`.
- Fix: Change `page-cost-two` to end "…adds the ID as a tiebreaker, with an index on that pair." On screen, make it "a unique, unchanging order, indexed: (created_at, id)".

### 5. [P2] answer: Q13 names only path versioning, where the page names three strategies and why the path wins
- When: 579.5 to 595.0 s, beat `r-version` (frame element-594.jpeg)
- What: The narration says "A version in the path, slash v one, is the most visible and the pragmatic default". It never mentions the alternatives the page lists (a header such as `Accept: application/vnd.api.v2+json`, or `?version=2`), or the page's other reason, that the path is cache-friendly. "Most visible" compared with what is left unsaid. The example is also `/v1/orders`, which steps off the blog the hook promised to use throughout.
- Why it matters: "Path or header?" is the usual follow-up to this question, and the clip gives no other option to weigh.
- Cause: `video/src/videos/be-api-design/script.ts:449-451` (`r-version`) and `RapidScene.tsx:144`.
- Fix: Use "A version in the path, slash v one, beats a header or a query parameter on visibility and caching, so it's the pragmatic default." Change the example to `GET /v1/articles/42`, with a field such as `"views"` removed and `"status"` retyped.

### 6. [P2] spacing: the "429" labels sit almost on the heading above the backoff bars
- When: 455 to 477 s, beats `limit-client` and `limit-safe` (frame element-476.jpeg)
- What: The heading "After a 429, it waits Retry-After, then doubles the wait" has its baseline at about y 580. The three red "429" tick labels start at about y 586, so the two rows nearly touch. The first "429" also hangs about 20 px left of the column's left edge (x 993, where the column starts at 1012).
- Why it matters: The house rule is about 25 px between rows of text. Here the labels read as part of the heading line.
- Cause: `video/src/videos/be-api-design/LimitScene.tsx:200-211`. The bars sit at `top = wTop + h(56)` and the label at `top - h(34)`, which leaves about 22 px under a 22 px heading set at `wTop`.
- Fix: Set `top = wTop + h(80)`, which moves the bars and the "429" labels about 24 px lower, and move the jitter and crowd notes at `wTop + h(150)` down by the same amount. There is room: the rule above "The same backoff" is at y 836.

### 7. [P3] answer: Q7 never says that OAuth on its own is not a login
- When: 356.5 to 370.3 s, beat `auth-oauth` (frame element-370.jpeg)
- What: "OAuth isn't a token format… a framework for delegated authorization" is correct. The question that usually follows, "so is 'Log in with Google' OAuth?", has the answer OpenID Connect (an ID token on top of OAuth), and the video does not reach it. The page does not have it either, so this is above the page's bar.
- Why it matters: It is the commonest trap in the sessions/JWT/OAuth question.
- Cause: `video/src/videos/be-api-design/script.ts:355-357`.
- Fix: Append "Logging a user in on top of it is OpenID Connect, which adds an ID token." On screen, add a grey note under "its tokens: JWTs or opaque strings".

### 8. [P3] accuracy: "the payload, decoded" drops the `iat` claim
- When: 343 to 370 s, beat `auth-jwt` (frame element-370.jpeg)
- What: The box shows `sub`, `role` and `exp`. The token's payload (`results.json` → `jwt.claims`) also carries `"iat": 1793966400`. The label says it is the decoded payload.
- Why it matters: A viewer who decodes the token on screen finds a fourth claim the figure said was not there.
- Cause: `video/src/videos/be-api-design/AuthScene.tsx:281-285` lists three of the four claims.
- Fix: Add an `iat` row without a highlight. If the height cannot take it, relabel the box "part of the payload, decoded without the key".

### 9. [P3] spacing: the ticks straddle the top borders of orders, search and billing, and the caption hugs the boxes
- When: 396 to 415 s, beats `revoke-jwt` and `revoke-hybrid` (frame element-414.jpeg)
- What: Each green tick is drawn across its box's top edge. The border line runs through the tick at about (1197, 640). The caption "each verifies the signature itself, no session store" starts about 15 px below the boxes' bottom edge.
- Why it matters: A line through a mark. A caption this tight reads as part of the boxes.
- Cause: `video/src/videos/be-api-design/AuthScene.tsx:374-376` (tick at `top: svcRow - 12`) and `AuthScene.tsx:379` (caption at `svcRow + h(80)` under boxes of `h(70)`).
- Fix: Place the tick inside the box, to the right of the title (`left: x + 196, top: svcRow + h(70)/2 - 13`), or fully above it (`top: svcRow - 34`). Move the caption to `svcRow + h(96)`.

### 10. [P3] confusion: a faint "article 42" floats alone at the right of the 404 row
- When: 181 to 188 s, beat `authn-404` (frame element-187.jpeg)
- What: Grey 50%-opacity mono text, "article 42", sits at x 1660, about 60 px right of the 404 response and attached to nothing. The comment says it is "the resource drawn faint", but nothing tells the viewer so.
- Why it matters: It reads as a stray label, not as "the article exists but is hidden".
- Cause: `video/src/videos/be-api-design/CodesScene.tsx:209-211`.
- Fix: Delete it, since "hides that it exists" already says it. Or put "(article 42 exists)" in the 404 box's second line: "on purpose: article 42 exists".

### 11. [P3] confusion: striking "log in again" turns a correct sentence into a double negative
- When: 176 to 188 s, beat `authn-403` (frame element-187.jpeg)
- What: The note reads "~~log in again~~ won't necessarily help". The sentence is right as written, so the strike says "not this" on top of "won't help". This is the "correct statement struck through" pattern from the earlier series.
- Why it matters: A viewer can read it as "logging in again is wrong", which is not the claim.
- Cause: `video/src/videos/be-api-design/CodesScene.tsx:201` (`<Strike at={againAt + 10}>log in again</Strike>`).
- Fix: Drop the `Strike` and keep the plain note "logging in again won't necessarily help".

### 12. [P3] other: 301 and 500 are the only codes on screen without a reason phrase
- When: 131 to 150 s, beat `codes` (frame element-148.jpeg)
- What: Every other code has its name (`304 Not Modified`, `503 Service Unavailable`), but the 3xx and 5xx columns open with a bare `301` and a bare `500`. The page lists them the same way, but on screen the gap looks like a truncation, and the 5xx column has the width for both names.
- Why it matters: It is a small inconsistency in a figure that is otherwise a reference card.
- Cause: `video/src/videos/be-api-design/CodesScene.tsx:18` and `:26`.
- Fix: Use `"301 Moved Permanently"` (the 3xx column is 340 px wide, so check it fits at that size, or widen the column to 380) and `"500 Internal Server Error"`.

### 13. [P3] confusion: the hook's "both sides agree on how" bracket covers only the second link
- When: 9 to 30 s, beat `hook` (frame element-029.jpeg)
- What: The bracket starts at the first service's right edge and ends at the second service's right edge, so it covers one arrow and one box. "asks → / ← answers" labels only the first arrow. The code comment says "a bracket under the whole row".
- Why it matters: The two labels split the claim across the two links, as if one link asks and the other agrees.
- Cause: `video/src/videos/be-api-design/HookScene.tsx:108-117`, where the path starts at `GAPS[1].from - 10`.
- Fix: Start the path at `BOXES[0].x`, so it spans client to second service, and centre the "both sides agree on how" note under the whole row.

### 14. [P3] confusion: in the closing REST/gRPC diagram, only "orders" is connected
- When: 532 to 540 s, beat `styles-mix` (frame element-539.jpeg)
- What: The gRPC arrow from "your API" ends at "orders". "search" and "billing" sit beside it with no arrow, as if only one internal service is called over gRPC.
- Why it matters: The point is "gRPC between its own services", plural.
- Cause: `video/src/videos/be-api-design/StylesScene.tsx:215-221`. There is one `Flow` to x 1170, while three nodes are laid out at `1180 + i * 205`.
- Fix: End the arrow at a short vertical bracket spanning the three nodes. Or draw the three services as a stacked column with a fan of three arrows, as the load balancer in Q1 does.

### 15. [P3] other: Retry-After is explained twice on the same figure
- When: 446 to 477 s, beats `limit-contract` to `limit-safe` (frame element-476.jpeg)
- What: The gloss beside the header row already says "seconds to wait". A second line under the card repeats "`Retry-After`: how long to wait".
- Why it matters: It is redundant text in a figure that is otherwise tight.
- Cause: `video/src/videos/be-api-design/LimitScene.tsx:165` (the note), with the gloss at `LimitScene.tsx:78`.
- Fix: Delete the note at line 165. The yellow mark on the `Retry-After: 30` row already ties the header to "how long to wait".

### 16. [P3] explanation: the content-negotiation example shows a single representation
- When: 623.8 to 640.4 s, beat `r-content` (frame element-639.jpeg)
- What: "One URL serves several representations" is illustrated by one JSON request answered with JSON. Only the encoding half (gzip) shows a real choice. The page also names `Accept-Language`.
- Why it matters: The figure shows the headers but not the negotiation itself.
- Cause: `video/src/videos/be-api-design/RapidScene.tsx:294-308`.
- Fix: Under the JSON pair, add a second, smaller request/response pair: `Accept: text/csv` → `Content-Type: text/csv`, cued to "several representations". Keep the gzip bars as they are.
