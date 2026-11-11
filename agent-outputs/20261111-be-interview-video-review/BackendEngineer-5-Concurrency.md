# BackendEngineer-5-Concurrency (10:13)

## Verdict
- A solid video. Every number I checked holds (Amdahl 20x ceiling and 16.8x on 100 cores, 20 orders with 2 right, 6 deadlock schedules with 2 deadlocking, the four 3.14 bytecodes, 20 ms against 30 ms). The figures are built word by word and nothing clips. Pacing is comfortable: almost every beat is under 3 w/s, gaps are at least 0.55 s, and every scene holds 1.6 s before its cut.
- The biggest visual problem is in question 3. "The same test can pass today and fail tomorrow" appears under the locked, fixed figure with a green 7, so the screen seems to say the fix is flaky. Question 6 is the other weak figure: three of its four fixes are text labels only, while the diagram beside them sits unchanged for 30 s.
- As interview answers, most stop one step before the obvious follow-up. Question 2 says processes run "truly in parallel" without saying that this is about CPython, so it reads as true of threads in general. Question 4 never mentions free-threaded CPython, which the plan itself flagged. Question 7 never says how the loop learns that a socket is ready. Question 11 shows compare-and-swap as "one instruction" that fuses read, add and write, which is not what CAS does.
- Small things: a few bits of code on screen go against the series rule (and against the script's own header), "no preemption" carries two meanings two minutes apart, and the rapid round is dense at the end (3.2 to 3.4 w/s).

## Findings

### 1. [P2] confusion: "pass today, fail tomorrow" sits under the fixed, locked counter
- When: 156.4-165.5 s, beat `race-hides` (frames element-159.jpeg, element-165.jpeg)
- What: By `race-hides` the screen has already moved to the fix: both threads show "🔒 read, add, write", the line "One critical section: a lock around all three" is in green, there are two orders that both give 7, and the counter reads a green 7. The 18 losing orders are gone. Then "Which order runs is timing: ✓ today: pass · ✕ tomorrow: fail · same code, no change" appears under all of that, so the flakiness seems to belong to the locked code.
- Why it matters: The viewer sees the correct fix next to a failing test, which turns the lesson upside down.
- Cause: `video/src/videos/be-concurrency/script.ts:262-271` puts `race-hides` after `race-lock`. `RaceScene.tsx:341-349` then draws the pass/fail line under the locked state.
- Fix: Swap the two beats, so the order is `race-count` → `race-hides` → `race-lock`, and draw the pass/fail line while the 20-order grid with its red 6s is still up. Then rephrase the lock beat as the cure ("The fix is a lock…"). If the order has to stay, dim the locked figure and bring back two grid rows, one 7 and one 6, beside "today" and "tomorrow".

### 2. [P2] accuracy: Question 2 makes "truly in parallel" a property of processes in general
- When: 90.2-105.6 s, beat `proc-iso` (frame element-105.jpeg)
- What: Narration: "Processes each get their own memory… and they run truly in parallel. … data passed between them has to be serialized through pipes or queues." On screen, each process shows "runs on, in parallel". The threads side never says the reason threads would not run in parallel. The page's own answer adds "and, in CPython, are serialized by the GIL". The video drops that clause, so the contrast reads as a general fact. In Java, Go, C# or C++, threads run in parallel across cores. "Has to be serialized" also leaves out shared memory, which is a standard way for processes to communicate.
- Why it matters: A viewer interviewing in any language other than Python would repeat a wrong contrast.
- Cause: `script.ts:234-238` (`proc-iso` text). `ProcScene.tsx:192,200` (the "in parallel" labels).
- Fix: "Processes each get their own memory, so a crash in one can't corrupt another. In CPython they're also the way to run Python code in parallel, since its threads take turns; we'll see why in question four. The price is talking: data between them is usually serialized through pipes or queues, unless you set up shared memory, and every process costs more memory." On screen, change "runs on, in parallel" to "runs on" and add one line on the threads side: "in CPython: one at a time (question 4)".

### 3. [P2] answer: The GIL answer stops before free-threaded CPython
- When: 167.1-232.0 s, beats `gil` to `gil-proc` (frames element-204.jpeg, element-231.jpeg)
- What: The answer covers what the GIL is, why it exists, and the CPU-bound and IO-bound cases correctly. It never says that CPython 3.13 shipped an optional build without a GIL, which is officially supported in 3.14 (PEP 703 and PEP 779). "Is the GIL going away?" is the standard follow-up in 2026. The plan already noted the gap ("The page also never mentions free-threaded CPython (supported in 3.14)", plan lines 203-208). The same plan entry measured that the page's unlocked `+=` loop came out exact in 5 of 5 runs on current CPython. That fact would also strengthen `race-hides`: the race "passes today".
- Why it matters: An interviewer who asks about the GIL usually asks next whether it still matters, and this answer has nothing to say.
- Cause: `script.ts:274-299`. Nothing in the GIL beats mentions it.
- Fix: Add one beat after `gil-proc`: "And it's on its way out: since Python 3.13 there's a free-threaded build with no GIL, supported from 3.14. There, threads do run CPU-bound Python in parallel, and the counter's lock matters even more." On screen, under the processes column, add "3.13+: optional free-threaded build, no GIL".

### 4. [P2] accuracy: Compare-and-swap drawn as read, add and write fused into "one instruction"
- When: 509.1-523.9 s, beat `r-atomic` (frame element-523.jpeg)
- What: The three steps fuse into one green block, captioned "compare-and-swap: one instruction". Narration: "Compare-and-swap instructions make it so." CAS does not do the add. It writes a new value only if the location still holds the expected old value. An increment built on it is a loop: read, compute, CAS, and retry if another thread got there first. The single instruction that does read-add-write is fetch-and-add (atomic increment).
- Why it matters: "How does CAS work?" is the next question, and the picture teaches the wrong mechanism.
- Cause: `RapidScene.tsx:164` (caption). `script.ts:428-431` (`r-atomic` text).
- Fix: Narration: "Hardware atomics make it so: an atomic add, or compare-and-swap, which writes only if the value hasn't changed since you read it, and retries if it has. Or a lock held around the whole thing." Caption: "atomic add: one instruction · compare-and-swap: write only if unchanged, else retry".

### 5. [P2] answer: "How does the event loop work?" never says how the loop learns that IO is ready
- When: 347.2-363.8 s, beat `async` (frames element-349.jpeg to element-363.jpeg)
- What: The answer says a coroutine "hands control back, and the loop runs another that's ready", and it never explains how a waiting coroutine becomes ready. The mechanism the question is asking for is this: the loop registers sockets with the OS (epoll, kqueue), asks which ones are ready, and resumes the coroutines waiting on those. On screen, the ring only spins.
- Why it matters: The question is literally "how does the event loop work", and the interviewer's follow-up is exactly that missing step.
- Cause: `script.ts:352-357`. `AsyncScene.tsx` has no element for OS readiness.
- Fix: Add to `async`: "…and the loop runs another that's ready. Under it, the loop asks the operating system which sockets have data, and wakes the coroutines waiting on them." On screen, place a small "OS: which sockets are ready?" label beside the parked coroutine "a", with an arrow back into the ring when it returns (`park` in `AsyncScene.tsx:83`).

### 6. [P2] explanation: Question 6's diagram stays unchanged for 30 s while three fixes are only labels
- When: 307.6-337.0 s, beats `prevent-timeout`, `prevent-hold`, `prevent-share`, `prevent-short` (tiles 310, 319 and 326 hold 9 s, 7 s and 8 s; frame element-345.jpeg)
- What: After `prevent-order` the left diagram shows the fixed order and never changes again. Timeout-and-release, one coarse lock, and one owner thread fed by a queue each arrive as a one-line green label beside a chain link. The script header promises an hourglass, a coarse lock and an owner with a queue, and none of them was drawn. The timeout case is the subtle one ("gives up, releases its first, and tries again"), and it is the one that sets up livelock.
- Why it matters: Three mechanisms are only stated, and the livelock catch that follows depends on seeing the timeout's release and retry.
- Cause: `DeadScene.tsx:225-262`. The left figure only swaps notes. The fixes are text in the condition table at `DeadScene.tsx:20-25`.
- Fix: Reuse the left lock diagram for each fix. For `timeoutAt`, thread 2 holds B, waits on A, then its B line retracts and redraws. For `coarseAt`, A and B merge into one "lock AB". For `queueAt`, both threads' lines are replaced by arrows into a small queue that feeds one owner. Give each about 3 s and drop the static "0 of 2 schedules" note sooner.

### 7. [P3] confusion: The event-loop ring keeps turning on its own clock while the timeline runs
- When: 364-391 s, beats `async-run`, `async-coop` (frames element-367.jpeg to element-378.jpeg)
- What: The ring's coroutines are labelled a, b, c, d and rotate through "running" once per 9 s regardless of the timeline beside them. While the timeline shows a awaiting for 20 ms, the ring puts a at the top marked running (around 374 s). Two things move at once, and the shared letters invite a comparison that fails.
- Cause: `AsyncScene.tsx:77-96` (`turn` runs from `loopAt` with no tie to the timeline).
- Fix: Label the ring discs 1 to 4, or freeze the ring at `fetchesAt` and dim it to 0.4 while the timeline is read, and resume it at `noPreAt`.

### 8. [P3] explanation: "No preemption" means two different things two minutes apart
- When: 307.6 s (`prevent-timeout`, the Coffman condition: nothing takes a lock away) and 380.7 s (`async-coop`: the scheduler can't interrupt a coroutine)
- What: Both appear in bold on screen as "No preemption", with different meanings and no note on the difference.
- Cause: `script.ts:329-332` and `script.ts:363-366`. `AsyncScene.tsx:195`.
- Fix: In `async-coop`, say "The loop can't interrupt a coroutine. It can only switch at an await…", and label it on screen "Cooperative: it switches only at an await".

### 9. [P3] explanation: The Amdahl formula's `s` and `n` are never defined
- When: 69.3-72 s, beat `conc-amdahl` (frame element-071.jpeg)
- What: "Amdahl's law: speedup = 1 / (s + (1 − s) / n)" appears as the narration says "That's Amdahl's law". Nothing defines s and n, and the scene cuts 2 s later.
- Cause: `ConcScene.tsx:258`.
- Fix: Write it as "speedup = 1 / (s + (1 − s) / n), s = the share that can't be split, n = cores", or drop the formula and keep "Amdahl's law: the serial share caps the speedup".

### 10. [P3] confusion: The process figure's pipe is detached and runs under the crashed process
- When: 96-107 s, beat `proc-iso` (frame element-105.jpeg)
- What: The "pipe" is a bracket below the "runs on / crashed alone" labels. It touches none of the process boxes, and it spans from process 1 to process 3 underneath the crashed process 2. Inside the process boxes the occupants are labelled "thread 1/2/3", so the red label reads "thread 2: crashed" in a question about processes against threads.
- Cause: `ProcScene.tsx:207-208` (the pipe path starts at `pTop + pH + h(54)`, under the labels). `ProcScene.tsx:180` (the thread labels).
- Fix: Run the pipe between process 1 and process 3 above the boxes, or between 1 and 2 before the crash. Label the occupants "worker" or leave them out, and make the crash label "process 2: crashed".

### 11. [P3] other: Code on screen, against the series rule and the script's own header
- When: 376-398 s (`gather returns ['a done', 'b done']`), 435-442 s (`loop.run_in_executor(…)`), 498-509 s ("run on asyncio"), 584-588 s (`pool.map(square, range(6))` and its output), 597-599 s (`.result()`) (frames element-388.jpeg, element-440.jpeg, element-587.jpeg, element-598.jpeg)
- What: The script header says "No syntax. The only code on screen is the four bytecode instructions." Five API names or calls appear anyway, none of them read aloud.
- Cause: `AsyncScene.tsx:244`, `BlockScene.tsx:219`, `RapidScene.tsx:85,476,586`.
- Fix: Replace them with words: "results: a, then b (in the order asked)", "hand it to a pool", "never more than 5 of the 12 at once", "map over 0 to 5 → 0, 1, 4, 9, 16, 25, in input order", "collect it by blocking or by awaiting".

### 12. [P3] answer: The deadlock answers stop before detection and the textbook fix for hold-and-wait
- When: 280.8-345.6 s, beats `dead-break` to `prevent-live`
- What: There is nothing on what to do once a deadlock has happened: a thread dump or wait-for graph to find the cycle, which is how databases detect one and abort a victim (Part 4's subject). "How would you debug it in production?" is the usual follow-up. Hold-and-wait is broken only by "one coarse lock". The standard answer is to take all your locks at once, or release what you hold before asking for more.
- Cause: `script.ts:334-347`.
- Fix: Extend `prevent-hold`: "Hold and wait: take every lock you need at once, or use one coarse lock." Add to `prevent-live` or a new beat: "And when one happens anyway, a thread dump shows the cycle; databases find it themselves and abort one transaction."

### 13. [P3] answer: "Futures and promises" never says what a promise is; the work bar still says "running" after the value arrives
- When: 588.4-599.7 s, beat `r-future` (frame element-598.jpeg)
- What: The list item reads "16 Futures and promises", but the narration and figure only cover a future. The usual answer: a promise is the side that sets the value, and in JavaScript the word covers both. In the final state the ticket reads "future: the value" while the bar above it still reads "the work, running".
- Cause: `script.ts:453-456`. `RapidScene.tsx:570` (the label never changes).
- Fix: "A future is a claim ticket… a promise is the same idea from the side that fills it in, and in JavaScript one object is both." Change the bar to "the work, done" once `ready` passes 0.5.

### 14. [P3] pacing: The quick round's last answers and the bridge are the densest narration in the video
- When: 573.5-602.9 s, beats `r-pool` (3.20 w/s), `r-future` (3.29 w/s), `next` (3.44 w/s)
- What: Each of these brings a new figure. `r-pool` adds a code line and an output list nobody reads aloud. The pool's final state (element-587.jpeg) shows "a queue of tasks" over empty space, because the queue has drained.
- Cause: `script.ts:448-461`. `RapidScene.tsx:430,476`.
- Fix: Remove "Map a function over a list with it" from `r-pool`, along with its code line (see finding 11). Keep one task left in the queue at the end, or fade the "a queue of tasks" label with it. Give `r-future` a `pauseAfter` of 1.2.

### 15. [P3] spacing: Long stretches with half the frame empty
- When: 0-22 s (`hook`: the bottom 45% is empty, element-014.jpeg); 206-223 s (`gil-race`: the right 60% is empty after the earlier figures clear, element-211.jpeg); 443-457 s (`choose`: one centred line for 14 s, element-452.jpeg)
- What: Narration continues while large areas stay blank. In `gil-race` the scene clears the CPU/IO and refcount figures, so for 17 s the code block is the only thing on screen.
- Cause: `GilScene.tsx` (the first figures exit at `gil-race`). `ChooseScene.tsx:83` (the fork appears only at `choose-async`).
- Fix: In `gil-race`, keep the CPU-bound key strip dimmed on the right until `gil-proc`. In `choose`, draw the two empty branches ("waiting on I/O" and "burning CPU") as the question is read at about 453 s, instead of at 457 s.

### 16. [P3] other: "IO" in Question 4 and "I/O" in Question 9
- When: 199-206 s ("IO-bound: the waits overlap", element-204.jpeg) against 452-487 s ("Waiting on I/O", element-486.jpeg)
- Cause: `GilScene.tsx:189` and `ChooseScene.tsx:22,83`.
- Fix: Use "I/O" on screen throughout ("I/O-bound: the waits overlap, so threads still help").

### 17. [P3] confusion: Small defects in the rapid-round figures (semaphore, starvation)
- When: 499-509 s (`r-lock`) and 568-572 s (`r-starve`) (frames element-507.jpeg, element-569.jpeg)
- What: In the semaphore, all five slots empty and refill together ("done" jumps 0, 5, 10, 12), but a semaphore frees one slot each time a download finishes. In the starvation figure, the "1 high" token fades through the lock glyph (overlap at 569 s), and the arrival numbers in "3 high / 2 low" are never explained, so "fair lock serves in arrival order" has to be worked out.
- Cause: `RapidScene.tsx:42-47` (waves of `limit`). `RapidScene.tsx:379-380`.
- Fix: Stagger the semaphore so each slot finishes on its own (offset each slot's wave by `s * 6` frames). Fade "1 high" before it reaches `LOCK_X - 40`, and add the small caption "numbers: arrival order".

### 18. [P3] pacing: Two beats over 3 w/s, back to back, carry the race's two key ideas
- When: 145.6-165.5 s, beats `race-lock` (3.03 w/s) and `race-hides` (3.09 w/s), gap 0.60 s
- What: The critical section and "two orders left" come straight before the nondeterminism point, both at the fastest pace in the worked questions.
- Cause: `script.ts:262-271` (`pauseAfter: 0.6` on `race-lock`).
- Fix: Raise `race-lock`'s `pauseAfter` to 0.9 (or the matching gap, if finding 1's reorder is applied), and cut "one thread first or the other," from `race-lock`, since the figure shows it.
