import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Concurrency" (16:9), Part 5 of the Backend / Software
 * Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md), after
 * content/interview/backend-engineer/concurrency.mdx. It answers all sixteen
 * of the page's questions, the GIL included: nine worked through, numbered
 * aloud and read in the page's words, then seven quickly (10 to 16, numbered
 * on screen only). The four deadlock conditions and their prevention are
 * answered here in general; Part 4 answers the database's side of deadlock.
 *
 *   1. "Concurrency vs parallelism, what is the difference?" ("conc").
 *   2. "Processes vs threads, how do they differ?" ("proc").
 *   3. "What is a race condition?" ("race").
 *   4. "What is the GIL and why does it exist?" ("gil").
 *   5. "What is a deadlock, and what four conditions cause it?" ("dead").
 *   6. "How do you prevent deadlocks in practice?" ("prevent"), in question
 *      5's scene: each fix strikes the condition it breaks.
 *   7. "What is async/await, and how does the event loop work?" ("async").
 *   8. "Why can't you just call a blocking function inside a coroutine?"
 *      ("block").
 *   9. "When do you choose threads vs multiprocessing vs async?" ("choose").
 *   Quick ("rapid-in"): 10. "What are locks, mutexes, and semaphores?";
 *   11. "What is an atomic operation?"; 12. "What is thread-safety, and how
 *   do you achieve it?"; 13. "What is a livelock, and how does it differ from
 *   a deadlock?"; 14. "What is starvation?"; 15. "What is a thread pool, and
 *   why use one?"; 16. "What is a future or promise?"
 *
 * Opening: takes up the plan's bridge from Part 4 (many requests arrive at
 * once) without naming it. Close: the plan's bridge into Part 6 (code that
 * has to keep changing without breaking).
 *
 * No syntax. The only code on screen is the four bytecode instructions of
 * `counter += 1` (question 4), read as a list, because what that one line
 * does is the question. Every other figure is a mechanism.
 *
 * On screen, beat by beat (what phase 2 builds):
 *   hook        A second of a server's time as a bar per request, mostly
 *               pale "waiting" with a sliver of work; one after another they
 *               overrun the second; overlapped they fit. Then three shared
 *               things drop in under them: a counter, a lock, a connection.
 *   plan        Sixteen question chips: nine large, seven small.
 *   conc        One core, three tasks as colored blocks taking turns on one
 *               lane (the hummingbird hero beside it, visiting one flower at
 *               a time). "par": a second and third lane, the blocks side by
 *               side. "conc-both": two labels, "async: concurrent" and
 *               "processes on cores: both".
 *   conc-amdahl The page's Amdahl chart, the 5% curve highlighted, its
 *               ceiling at 20x dashed; a dot at 100 cores, "16.8x".
 *   proc        One process box with three threads inside sharing one memory
 *               block; "proc-risk": two threads' arrows hit the same cell,
 *               red. "proc-iso": three process boxes, each its own memory;
 *               one crashes (struck), the others carry on; between them a
 *               pipe with a packed message.
 *   race        The tally counter at 5, two threads A and B, each a strip of
 *               three steps: read, add, write. "race-lost": both read 5,
 *               both write 6; one increment struck. "race-count": a grid of
 *               the 20 orders, two green (7), eighteen red (6). "race-lock":
 *               the three steps fused into one block under a padlock; two
 *               orders, both 7. "race-hides": a test marked pass, then fail,
 *               same code.
 *   gil         A single key labelled GIL passed between threads; only the
 *               holder's bytecode runs. "gil-why": an object with its
 *               reference count, one lock around the interpreter instead of
 *               a lock on each object. "gil-cost": CPU-bound threads take
 *               turns (no speedup); IO-bound threads hand the key over while
 *               they wait. "gil-race": `counter += 1` and under it its four
 *               instructions, from a real compile. "gil-proc": several
 *               interpreters, each with its own key, on separate cores.
 *   dead        Two threads, locks A and B; T1 holds A and reaches for B, T2
 *               holds B and reaches for A; the two waits form a cycle (the
 *               schedule from results.json). "dead-four": four links of a
 *               chain, one per condition. "dead-break": one link opens.
 *   prevent     The same four links. Each fix arrives beside the condition
 *               it breaks and strikes it: "prevent-order" circular wait, with
 *               both threads taking A first and T2 waiting holding nothing;
 *               "prevent-timeout" no preemption (the hourglass); "prevent-
 *               hold" hold and wait (one coarse lock); "prevent-share"
 *               mutual exclusion (one owner fed by a queue). "prevent-
 *               short" a critical section shrinking. "prevent-live": two
 *               threads retrying in step, a pointer to the quick round.
 *   async       One thread, an event loop as a ring, coroutines queued on it;
 *               one awaits and steps off, the next steps on. "async-run": a
 *               timeline, a's wait 20 ms, b's 10 ms, overlapping; b finishes
 *               first; the results list reads a, b. "async-coop": a
 *               coroutine with no await holding the ring, the rest frozen.
 *   block       The same timeline with a's wait a blocking sleep: a's bar
 *               now holds the thread; b's wait starts only after it; total
 *               30 ms against 20; a finishes first. "block-server": a row of
 *               requests frozen behind one call. "block-fix": the call moved
 *               to a pool beside the loop, the loop running again.
 *   choose      A two-way fork on "waiting on IO, or burning CPU?", then three
 *               leaves: async, threads (in a pool), processes. "choose-mix":
 *               an async server with an arrow to a process pool.
 *   rapid-in    Seven question chips, 10 to 16.
 *   r-lock      One door with a single key (mutex), a turnstile counting five
 *               through (semaphore, peak 5 of 12 downloads from the run), a
 *               key that opens its own lock again (reentrant).
 *   r-atomic    The increment's three steps fused into one (compare-and-swap,
 *               or a lock around it).
 *   r-safe      Three remedies; the third, one owner thread fed by a queue,
 *               highlighted.
 *   r-live      Two figures stepping aside the same way, repeatedly; a CPU
 *               meter busy; then random waits and they pass.
 *   r-starve    A queue where one low-priority thread is passed again and
 *               again; a fair lock serves in arrival order.
 *   r-pool      Four workers taking tasks from one queue; results back in
 *               input order.
 *   r-future    A claim ticket handed over at once; the result collected
 *               later.
 *   next        A hairline and "Next: designing objects".
 *
 * Facts. check.mjs computes every number in Pyodide 314.0.7 (Python 3.14.2)
 * into results.json, which data.ts reads. No thread runs anywhere: the
 * site's Python has none to start (the page says so), so every schedule is
 * drawn or enumerated, never presented as a real run.
 *   - "conc", "par", "conc-both", processes, threads, the GIL, the four
 *     conditions, the fixes, the event loop, blocking calls, the choice and
 *     all seven quick answers: the page's own answers, heading by heading.
 *   - "conc-amdahl": the page's chart (charts/amdahl-law.mjs), speedup = 1 /
 *     (s + (1 - s)/n): five percent serial caps at 20x, and 100 cores give
 *     16.81x ("about seventeen"). "Amdahl's law" names the chart's formula
 *     (the spec's own title line).
 *   - "race-count": every order of two threads' read, add, write from a
 *     counter of five, enumerated: 20 orders, 2 give seven, 18 give six. With
 *     the three steps under a lock: 2 orders, both seven. (Two increments
 *     each, on screen only: 924 orders, 6 right.) These are counts of
 *     possible orders, not frequencies, and the narration says "orders".
 *   - "race-lock": the page's fix, a lock around the critical section.
 *   - "gil-race": dis on the page's worker (its loop, no lock) in Python
 *     3.14.2: LOAD_GLOBAL counter, LOAD_SMALL_INT 1, BINARY_OP +=,
 *     STORE_GLOBAL counter, four instructions (the loop's JUMP_BACKWARD is
 *     filed under the same line and is listed apart). "doesn't promise the
 *     four run together": the page's concept check ("the GIL serializes
 *     bytecode, but a single += spans multiple bytecodes"). The narration
 *     does not say where CPython switches threads; see the report.
 *   - "gil-proc": the page's concept check (separate processes, each its own
 *     interpreter and GIL).
 *   - "dead-ex": every schedule of T1 (A then B) and T2 (B then A),
 *     enumerated: the two that deadlock are exactly "both take their first
 *     lock first" (each example's trace is two steps). "prevent-order": with
 *     both A then B, no schedule deadlocks (0 of 2), and the thread that
 *     loses the race for A waits holding nothing.
 *   - "prevent-timeout", "prevent-hold", "prevent-share": the page's fixes
 *     (timeouts, a single coarse lock, lock-free queues), each matched to
 *     the condition it removes, as the textbook prevention scheme does
 *     (breaking no preemption is releasing what you hold when a request
 *     can't be granted).
 *   - "async-run": the page's asyncio block, run: it prints ['a done',
 *     'b done']; with the finishing order recorded, b finishes first; the
 *     pair's wall clock is checked to fall at or above the longer wait (20
 *     ms) and below the sum, so the narration says "about twenty".
 *   - "block-run": the same with a's await replaced by time.sleep: a
 *     finishes first, results still a then b, wall clock at least the sum
 *     (30 ms). The delays are the page's; no millisecond is a measurement.
 *   - "block-server": the page's examples of blocking calls (a synchronous
 *     HTTP request, time.sleep, a heavy CPU loop).
 *   - "choose-mix": the page's fix for blocking work (offload to a thread or
 *     process pool with run_in_executor), applied to the CPU-bound branch.
 *   - "r-lock" (screen): twelve downloads through a semaphore of five, run
 *     on asyncio: never more than five in flight.
 *   - "r-future": "claim ticket" is the video's image for the page's
 *     "placeholder for a result that is not ready yet".
 *
 * Written for Drew's ear: initialisms as people write them. GIL is said as a
 * word ("gil"), and is expanded once ("global interpreter lock"); CPU, IO
 * and HTTP are read letter by letter. "IO-bound" is how Python's own docs
 * write it; on screen it may read I/O. No API or module is named aloud
 * (asyncio, run_in_executor, ThreadPoolExecutor stay on the page). No
 * sentence opens with "A" before an initialism; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "be-concurrency",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A thousand requests arrive in the same second. Each one spends most of its time waiting: on a database, on another service. Serve them one after another, and the server sits idle through every wait while the queue grows.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-share",
      text: "Serve them at once, and they start sharing things: a counter, a lock, a connection. That's where the bugs live.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Sixteen questions on concurrency. Nine get a figure each, and seven go quickly at the end.",
      pauseAfter: 0.7,
    },

    // ── 1. Concurrency and parallelism ────────────────────────────────────
    {
      id: "conc",
      scene: true,
      text: "Question one. Concurrency versus parallelism, what is the difference? Concurrency is dealing with many tasks at once. One core switches between them, and each makes progress in turns.",
      pauseAfter: 0.6,
    },
    {
      id: "par",
      text: "Parallelism is doing many at the same instant, which takes more than one core.",
      pauseAfter: 0.6,
    },
    {
      id: "conc-both",
      text: "So async code on one thread is concurrent, but not parallel. Processes spread across cores are both.",
      pauseAfter: 0.6,
    },
    {
      id: "conc-amdahl",
      text: "The follow-up is what parallelism can buy. If five percent of the work can't be split, no number of cores makes it more than twenty times faster, and a hundred cores already get about seventeen. That's Amdahl's law.",
      pauseAfter: 0.8,
    },

    // ── 2. Processes and threads ──────────────────────────────────────────
    {
      id: "proc",
      scene: true,
      text: "Question two. Processes versus threads, how do they differ? Threads live inside one process and share its memory, so talking is cheap: one thread writes a value, another reads it.",
      pauseAfter: 0.5,
    },
    {
      id: "proc-risk",
      text: "That sharing is also the danger. Two threads can corrupt the same state.",
      pauseAfter: 0.6,
    },
    { id: "proc-own", text: "Processes each get their own memory.", pauseAfter: 0.55 },
    {
      id: "proc-iso",
      text: "A crash in one can't corrupt another. In CPython, they're also how Python runs in parallel, since its threads take turns. The price is talking: data between them is usually serialized, through pipes or queues, and every process costs more memory.",
      pauseAfter: 0.8,
    },

    // ── 3. Race conditions ────────────────────────────────────────────────
    {
      id: "race",
      scene: true,
      text: "Question three. What is a race condition? It's when the result depends on the timing of operations on shared state. The classic case is a counter that two threads each add one to.",
      pauseAfter: 0.5,
    },
    {
      id: "race-steps",
      text: "Adding one isn't one step. It's three: read the value, add one, write it back.",
      pauseAfter: 0.6,
    },
    {
      id: "race-lost",
      text: "The counter is at five. Both threads read five, both add one, both write six. Two increments, and one is lost.",
      pauseAfter: 0.8,
    },
    {
      id: "race-count",
      text: "Count every order those six steps can run in, and there are twenty. Only two of them give seven. The other eighteen lose an update.",
      pauseAfter: 0.8,
    },
    {
      id: "race-hides",
      text: "And since the bad orders depend on where a thread happens to pause, the same test can pass today and fail tomorrow, with no change to the code.",
      pauseAfter: 1.0,
    },
    {
      id: "race-lock",
      text: "The fix is a lock around the three steps, so they run as one critical section. Then two orders are left, one thread first or the other, and both give seven.",
      pauseAfter: 0.8,
    },

    // ── 4. The GIL ────────────────────────────────────────────────────────
    {
      id: "gil",
      scene: true,
      text: "Question four. What is the GIL, and why does it exist? In CPython, the standard Python interpreter, the global interpreter lock, or GIL, is a single lock that lets only one thread run Python bytecode at a time.",
      pauseAfter: 0.6,
    },
    {
      id: "gil-why",
      text: "It exists to keep memory management thread-safe. Every object counts its references, and one lock around the interpreter protects all those counts without a lock on every object.",
      pauseAfter: 0.6,
    },
    {
      id: "gil-cost",
      text: "The consequence: threads give no speedup to CPU-bound Python. They just take turns. They still help IO-bound work, because a thread releases the GIL while it waits on the network or the disk.",
      pauseAfter: 0.7,
    },
    {
      id: "gil-race",
      text: "And it doesn't make the counter safe. The GIL runs one bytecode instruction at a time, and that one line of Python compiles to four: load the counter, load the one, add, store. Nothing promises the four run together, so the lock is still needed.",
      pauseAfter: 0.7,
    },
    {
      id: "gil-proc",
      text: "For CPU-bound work, use processes instead. Each has its own interpreter and its own GIL, so they really do run in parallel.",
      pauseAfter: 0.7,
    },
    {
      id: "gil-free",
      text: "Since Python three fourteen, there's also an officially supported build with no GIL. There, threads do run in parallel, so the counter's lock matters even more.",
      pauseAfter: 0.8,
    },

    // ── 5, 6. Deadlock, and preventing it ─────────────────────────────────
    {
      id: "dead",
      scene: true,
      text: "Question five. What is a deadlock, and what four conditions cause it? A deadlock is a set of threads, each waiting forever for something another one holds.",
      pauseAfter: 0.5,
    },
    {
      id: "dead-ex",
      text: "Two threads, two locks. The first takes A, then wants B. The second takes B, then wants A. If both take their first lock before either takes its second, each waits on the other, for good.",
      pauseAfter: 0.7,
    },
    {
      id: "dead-four",
      text: "Coffman's four conditions all have to hold. Mutual exclusion: a lock has one holder at a time. Hold and wait: a thread keeps one lock while it waits for another. No preemption: nothing can take a lock away. And circular wait: a cycle of threads, each waiting on the next.",
      pauseAfter: 0.7,
    },
    { id: "dead-break", text: "Break any one, and the deadlock can't happen.", pauseAfter: 0.8 },
    {
      id: "prevent",
      text: "Question six. How do you prevent deadlocks in practice? Go after the conditions, one at a time.",
      pauseAfter: 0.5,
    },
    {
      id: "prevent-order",
      text: "Circular wait is the usual target: every thread takes its locks in one global order, A before B. Now whichever thread gets A also gets B, and the other waits holding nothing. No schedule deadlocks.",
      pauseAfter: 0.7,
    },
    {
      id: "prevent-timeout",
      text: "No preemption: take a lock with a timeout, so a thread that can't get its second lock gives up, releases its first, and tries again.",
      pauseAfter: 0.5,
    },
    {
      id: "prevent-hold",
      text: "Hold and wait: one coarse lock instead of several, so no thread holds one while it waits for another.",
      pauseAfter: 0.55,
    },
    { id: "prevent-all", text: "Or take every lock you need at once.", pauseAfter: 0.6 },
    {
      id: "prevent-share",
      text: "Mutual exclusion: share nothing. Give the state one owner thread and send it work through a queue, so no other thread needs a lock on it.",
      pauseAfter: 0.5,
    },
    { id: "prevent-short", text: "And keep critical sections short, so contention stays low.", pauseAfter: 0.6 },
    { id: "prevent-detect", text: "If one happens anyway, a thread dump shows who's waiting on whom.", pauseAfter: 0.7 },
    {
      id: "prevent-live",
      text: "One catch: threads that time out and retry in lockstep can collide forever. That's livelock, in the quick round.",
      pauseAfter: 0.8,
    },

    // ── 7. The event loop ─────────────────────────────────────────────────
    {
      id: "async",
      scene: true,
      text: "Question seven. What is async await, and how does the event loop work? It's cooperative concurrency on a single thread. Coroutines run on an event loop. When one awaits a network call, it hands control back, and the loop runs another that's ready.",
      pauseAfter: 0.6,
    },
    {
      id: "async-os",
      text: "Under it, the loop asks the operating system which sockets are ready, and wakes the coroutines waiting on them.",
      pauseAfter: 0.7,
    },
    {
      id: "async-run",
      text: "Two fetches: a waits twenty milliseconds, b waits ten. The waits overlap, so b finishes first, and the pair takes about twenty, not thirty. Gathered together, the results still come back in the order you asked: a, then b.",
      pauseAfter: 0.7,
    },
    { id: "async-nopre", text: "Nothing interrupts a running coroutine.", pauseAfter: 0.55 },
    {
      id: "async-coop",
      text: "The loop can only switch at an await, so a coroutine that never awaits, like a tight CPU loop, starves every other one.",
      pauseAfter: 0.6,
    },
    {
      id: "async-scale",
      text: "Where it shines is IO at high concurrency: thousands of sockets, on one thread.",
      pauseAfter: 0.8,
    },

    // ── 8. A blocking call in a coroutine ─────────────────────────────────
    {
      id: "block",
      scene: true,
      text: "Question eight. Why can't you just call a blocking function inside a coroutine? Because the loop is one thread, and a blocking call never yields.",
      pauseAfter: 0.5,
    },
    {
      id: "block-run",
      text: "Swap a's await for a blocking sleep. Now a holds the thread for its whole twenty milliseconds, and b can't even start its wait. This time a finishes first, and the pair takes thirty: the waits add up instead of overlapping.",
      pauseAfter: 0.7,
    },
    {
      id: "block-server",
      text: "In a server, that one call stalls every request on the loop until it returns. A synchronous HTTP request or a heavy computation does the same.",
      pauseAfter: 0.6,
    },
    {
      id: "block-fix",
      text: "Use async-native libraries, or hand the blocking work to a thread or process pool, and await its result.",
      pauseAfter: 0.8,
    },

    // ── 9. Choosing ───────────────────────────────────────────────────────
    {
      id: "choose",
      scene: true,
      text: "Question nine. When do you choose threads versus multiprocessing versus async? Match the tool to the bottleneck. The deciding question is always: is the program waiting on IO, or burning CPU?",
      pauseAfter: 0.7,
    },
    { id: "choose-async", text: "Waiting, on many connections: async. One thread, the lowest overhead.", pauseAfter: 0.5 },
    {
      id: "choose-threads",
      text: "Waiting, but through blocking libraries: threads, which release the GIL while they wait, in a pool that caps how many run.",
      pauseAfter: 0.5,
    },
    {
      id: "choose-proc",
      text: "Burning CPU: multiprocessing. Separate processes sidestep the GIL for true parallelism.",
      pauseAfter: 0.6,
    },
    {
      id: "choose-mix",
      text: "And real services mix them: an async server that hands its heavy computation to a process pool.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Seven more, a sentence or two each.", pauseAfter: 0.5 },
    {
      id: "r-lock",
      text: "Locks, mutexes and semaphores. A mutex allows exactly one holder. A semaphore allows up to some number, say five downloads at once. And a reentrant lock can be taken again by the thread that already holds it, so recursive code doesn't deadlock on itself.",
      pauseAfter: 0.6,
    },
    {
      id: "r-atomic",
      text: "An atomic operation completes in one indivisible step: no other thread can see it half done. Adding one to the counter isn't atomic.",
      pauseAfter: 0.55,
    },
    {
      id: "r-cas",
      text: "An atomic add instruction makes it so, or compare-and-swap: write only if the value is unchanged since the read, and retry if not. Or hold a lock around all three.",
      pauseAfter: 0.6,
    },
    {
      id: "r-safe",
      text: "Thread-safe code behaves correctly when many threads call it at once. Avoid shared mutable state, guard it with a lock, or best, keep it in one thread and send that thread work through a thread-safe queue. Share by communicating, not by sharing memory.",
      pauseAfter: 0.6,
    },
    {
      id: "r-live",
      text: "In a livelock, threads keep running but make no progress: they react to each other and retry, like two people stepping aside the same way, again and again. The CPU looks busy, so it's harder to spot than a deadlock. Randomized backoff usually breaks it.",
      pauseAfter: 0.6,
    },
    {
      id: "r-starve",
      text: "Starvation is a thread that never gets the resource, because others keep getting priority, like a low-priority thread that never wins a lock. Fair locks help, and so does not handing out shared resources by priority.",
      pauseAfter: 0.6,
    },
    {
      id: "r-pool",
      text: "A thread pool keeps a fixed set of reusable workers and a queue of tasks. You skip creating a thread per task, and you bound how many run at once.",
      pauseAfter: 0.6,
    },
    {
      id: "r-future",
      text: "And a future is a claim ticket for a result that isn't ready yet. Start the work, take the ticket at once, and collect the value later, by blocking on it or awaiting it.",
      pauseAfter: 0.7,
    },
    {
      id: "r-promise",
      text: "A promise is the same idea, seen from the side that fills in the value.",
      pauseAfter: 1.2,
    },
    {
      id: "next",
      text: "All of this was about code running at the same time.",
      pauseAfter: 0.6,
    },
    {
      id: "next-change",
      text: "Just as hard is code that has to keep changing without breaking. Next: designing objects.",
    },
  ],
};
