# BackendEngineer-5-Concurrency: fixes

Folder `video/src/videos/be-concurrency/`. Review report:
`agent-outputs/20261111-be-interview-video-review/BackendEngineer-5-Concurrency.md`
(0 P1, 6 P2, 12 P3). Nothing committed by me; the coordinator's checkpoint 4
(`e801ff25`) caught the work part-way. Compare against `f7144056` to see the whole change.

## Findings

| # | Sev | Status | What changed |
| --- | --- | --- | --- |
| 1 | P2 | fixed | The beats are reordered to `race-count` → `race-hides` → `race-lock`. Neither beat's text changed, so both keep their existing take audio and nothing was re-voiced. "Which order runs is timing: ✓ today: pass · ✕ tomorrow: fail · same code" now builds while the 20-order grid and its eighteen red 6s are still up. One 7 is ringed on "pass today" and one 6 on "fail tomorrow" (`K_PASS`/`K_FAIL`, the first right and first wrong order in results.json). The line leaves on "The fix is a lock", so the cure arrives on a clean page. `race-lock` already opens "The fix is a lock…", so it already reads as the cure. |
| 2 | P2 answer | fixed | `proc-iso` is split. "Processes each get their own memory." becomes `proc-own`, cut from take-1 for free. The rest was re-voiced: "A crash in one can't corrupt another. In CPython, they're also how Python runs in parallel, since its threads take turns. The price is talking: data between them is usually serialized, through pipes or queues, and every process costs more memory." On screen, the process boxes say "runs on" (the "in parallel" is gone). Under the threads, "**In CPython**, these threads take turns (question 4)" and, in green, "processes are how Python runs in parallel". The serialization line now says "usually serialized", with a soft "(the exception: memory shared on purpose, with its own locks)". |
| 3 | P2 answer | fixed | New beat `gil-free`: "Since Python three fourteen, there's also an officially supported build with no GIL. There, threads do run in parallel, so the counter's lock matters even more." On screen it sits under the counter listing, below a hairline: "Since Python 3.14: a supported build with **no GIL**" / "There, threads run in parallel, so **the lock matters even more**" / soft "free-threaded, opt-in (experimental in 3.13); this video's Python 3.14.2 is the default build, GIL on". The last clause is measured: `check.mjs` now records `runtime.gil` (`sys._is_gil_enabled` exists, the GIL is enabled, `Py_GIL_DISABLED` is unset), checks it, and `data.ts` (`GIL_BUILD`) throws if it changes. |
| 4 | P2 accuracy | fixed | `r-atomic` is split: the first two sentences are cut from take-6 for free. New beat `r-cas`: "An atomic add instruction makes it so, or compare-and-swap: write only if the value is unchanged since the read, and retry if not. Or hold a lock around all three." The fused chips are now captioned "an atomic add: one instruction". A new row reads "or compare-and-swap: [read: 5] [add: 6] [write 6, only if still 5]", with a dashed "changed? retry" loop back to the read, then "or a lock held around all three". |
| 5 | P2 answer | fixed | New beat `async-os`: "Under it, the loop asks the operating system which sockets are ready, and wakes the coroutines waiting on them." Coroutine a now stays parked ("awaiting the network") until "wakes", instead of returning on its own clock. Above it: "the loop asks the OS: which sockets are ready?". On "wakes", a green arrow runs from a back to the ring with "ready: woken", and a rides back onto the loop. |
| 6 | P2 | fixed | The left lock diagram now redraws for each fix (`DeadScene.tsx`). **Timeout:** the stuck pair returns (red waits), an hourglass "timeout" fills beside thread 2 and turns red on "gives up". Thread 2's hold on B retracts on "releases its first", thread 1 takes B, and thread 2's grey wait on A comes back on "tries again", captioned "Thread 2 times out and lets go of B, then tries again". **Coarse lock:** A and B slide together and become one "lock AB", held by thread 1 with thread 2 waiting ("One lock for both: nobody holds one and waits"). **Share:** both threads send work into a three-slot queue that feeds "owner thread: the state" (orange, the third thread colour), with packets moving along the arrows ("Threads send work; only the owner touches the state"). The "0 of 2 schedules" note now leaves when the timeout begins rather than at "keep critical sections short". |
| 7 | P3 | fixed | The ring holds still, dimmed to 0.4, from "Two fetches" until "Nothing interrupts a running coroutine", then turns again. Its a to d no longer move beside the timeline's a and b. |
| 8 | P3 | fixed | "There's no preemption." is replaced by a new beat, `async-nopre`: "Nothing interrupts a running coroutine." The rest of `async-coop` is cut from take-4 for free. On screen: "**Nothing interrupts it**: it switches only at an await". "No preemption" now appears only for Coffman's condition. |
| 9 | P3 | fixed | Under the formula: "s: the share that can't be split · n: the cores". `conc-amdahl` `pauseAfter` is raised from 0.8 to 2.4 (timing only), so the finished chart holds about 0.8 s longer before the cut. |
| 10 | P3 | fixed | The pipe now leaves process 1's bottom edge and enters process 3's. "runs on" and "process 2: crashed" moved inside the boxes so the pipe has a clear path. Each box's occupant is labelled "worker", and the crashed one is greyed out. |
| 11 | P3 | fixed | The code on screen is replaced with words. `gather returns ['a done', 'b done']` → "Gathered, the results come back **a, then b**", derived from results.json. `loop.run_in_executor(…)` → "runs off the loop's thread; the loop doesn't wait". "run on asyncio" → "run for real". `pool.map(...)` and its output are gone (see 14). `.result()` → "collect it by blocking or by awaiting it". I also changed the blocking call's own label, `time.sleep(…)`, to "a blocking sleep". The only code left is `counter += 1` and its four instructions (Q4), plus the same line in Q11; the script header now says so. |
| 12 | P3 answer | fixed | Two new beats. `prevent-all`: "Or take every lock you need at once." The hold-and-wait fix label gains ", or all at once", and the left caption gains "or take every lock you need at once". `prevent-detect`, after `prevent-short`: "If one happens anyway, a thread dump shows who's waiting on whom." On screen: "Found one anyway? **A thread dump** shows who waits on whom:", then two lines built from results.json's stuck schedule ("thread 1 holds A, waits for B" / "thread 2 holds B, waits for A: **a cycle**"), and soft "(databases find their own and abort one transaction)". |
| 13 | P3 answer | fixed | New beat `r-promise`: "A promise is the same idea, seen from the side that fills in the value." On screen: "**Promise**: the same idea, *from the side that fills in the value*" (highlighted), and soft "(in JavaScript, one Promise object is both)". The work bar now reads "the work, done" once the value arrives. |
| 14 | P3 | fixed | `r-pool` is split at its last sentence, and "Map a function over a list with it…" is dropped. That cost nothing: the first two sentences were recut from take-6. The pool figure now runs nine tasks through four workers a round at a time, and task 9 is still queued at the end, so "a queue of tasks" is never over empty space. `r-future` → `r-promise` → `next`: `r-promise` takes `pauseAfter: 1.2` before the bridge. |
| 15 | P3 | partly | **gil-race:** the interpreter box (refcounts and the one lock) now stays on the right at 0.4 opacity until the processes replace it. **choose:** the question and the empty fork draw on "Match the tool to the bottleneck", about 5 s earlier, and each branch label swells on its own words. **hook:** unchanged; the report's fix named only the other two, and the opening's lower half fills at `hook-share`. |
| 16 | P3 | fixed | `GilScene` now reads "I/O-bound: the waits overlap, so threads still help". Every on-screen spelling is now "I/O". |
| 17 | P3 | fixed | **Semaphore:** each download now runs 30 frames, and each slot starts 6 frames after the previous one, so slots free one at a time and the next download takes the free slot. "waiting/done" counts each download as it finishes (0, 1, 2, …). **Starvation:** "1 high" fades out where the high-priority tokens stop (`LOCK_X - 150`), short of the lock, and the caption reads "a fair lock serves in arrival order (the numbers)". |
| 18 | P3 | partly | The two beats are no longer back to back. `race-hides` follows `race-count` (0.8 s gap), gets `pauseAfter: 1.0` before `race-lock`, and `race-lock` ends the scene with the 1.6 s scene gap. I did not cut "one thread first or the other" from `race-lock`: that means re-voicing the whole sentence (about 150 characters), and the P3 budget went to 8, 12 and 13. |

No finding was judged wrong. One place where the page is looser than the video now is: the page's threads-vs-processes answer qualifies parallelism with "in CPython", which the video now does too, but the page never mentions free-threaded CPython (the plan noted this already). I did not edit the page.

## Voice

**891 characters re-voiced** (the `narrate --dry-run` count), each beat voiced on its own with `--only`. No new take, no `--force`.

- **P2s, 680:** `proc-iso` 246, `gil-free` 160, `r-cas` 163, `async-os` 111.
- **P3s, 211 (of 300):** `prevent-all` 36, `prevent-detect` 65, `async-nopre` 39, `r-promise` 71.

Four beats were cut from the kept takes for free with `--recut`: `proc-own` (take-1), `async-coop` (take-4), and `r-atomic` and `r-pool` (take-6). `race-hides` and `race-lock` are moved only, so their audio is untouched. Compared with the committed `alignment.json`, exactly those 12 entries changed (8 new voiced, `proc-own` new, and `proc-iso`, `async-coop`, `r-atomic`, `r-pool` changed). Every other beat's MP3 and entry is byte-identical, and `takes/be-concurrency/` is untouched.

## Facts

`check.mjs` was re-run from the repo root. Every existing value in `results.json` came back identical. The only addition is `runtime.gil` (`{probe: true, enabled: true, freeThreadedBuild: false}`), which `check.mjs` asserts and `data.ts` re-checks.

## Length and checks

- `npm run cues -- be-concurrency`: 63 beats, 1,574 words, **657.5 s (10:57.5)**, up from 612.5 s (10:13). That is +45 s: about 36 s for the eight new or longer beats, the rest the new pauses (findings 9, 14, 18) and the extra pause after the split beats.
- Typecheck and eslint for `src/videos/be-concurrency/`: clean.
- `npm run check:cues`: pass. `npm test`: 79 of 79 pass.
- `check:motion`: pass. 10:57.5 checked; one stretch still for 2 s (4:14 to 4:16, the deadlock scene) and nothing still for 3 s.
- `check:sync`: pass. 63 beats, worst +0.03 s (`conc`).
- `check:mix`: pass. Where both sound, the speech is a median 28.3 dB above the effects (5th percentile 12.8 dB).
- `check:frames`: pass. 28 arrows within 10° under their heads, no stretched images, no hyphen in tabular figures, word spacing and line families clean.
- Stills, each looked at: 70.5, 72.5, 104, 111, 150, 155.5, 157, 158, 160.5, 166, 171, 225, 237, 248, 320, 330, 333.5, 338, 344, 352, 357, 363, 363.5, 371, 390, 395, 397.2, 397.5, 397.8, 405, 413, 417, 425, 476, 487, 492, 535, 538, 541, 552, 560, 566, 567, 612, 614, 616.5, 620, 622.5, 624, 625, 636, 642, 644 s. Four defects from the first round were fixed before the checks ran:
  - the "today" order's swell overlapped the next column, so it became a ring;
  - "a cycle" floated loose, so it now ends thread 2's dump line;
  - the woken arrow crossed the ring, so it is now aimed at the ring's near edge;
  - "or compare-and-swap:" touched its first chip, so the chips moved right by 34 px.

## Noticed, left

- `hook` (0 to 15 s) still has its lower 45% empty (finding 15's third stretch). Filling it would mean a new figure in the opening.
- At `async-coop` the red "CPU" hog disc sits over whichever disc is at the top of the ring. This is what the scene did before; the review did not flag it.
- No shared change needed.
