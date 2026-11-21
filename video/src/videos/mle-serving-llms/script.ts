import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Serving LLMs" (16:9), Part 9 of the Machine Learning
 * Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "9, Serving LLMs"), after
 * content/interview/machine-learning-engineer/llm-systems-and-evals.mdx. It
 * answers the page's four inference questions, each worked through, numbered
 * aloud and read in the page's words, then the page's "other levers worth
 * naming" as a quick round of four rows:
 *
 *   1. "Why is LLM inference split into prefill and decode?" ("q1"), with the
 *      page's first concept check (text slow to appear, then streaming
 *      quickly) as its follow-up ("q1-follow").
 *   2. "What is the KV cache, and how large does it get?" ("q2"), the page's
 *      own runnable block worked to its last step, and its second concept
 *      check (64 KV heads against 8) as "q2-gqa".
 *   3. "What are continuous batching and PagedAttention?" ("q3").
 *   4. "What do quantization and speculative decoding trade?" ("q4").
 *   Quick ("rapid-in"): the page's "Other levers worth naming": prefix
 *   caching, routing easy requests to a smaller model, distillation for a
 *   narrow task, the reasoning budget (added to the page by #746, voiced
 *   on its own as "r-reason"), streaming ("r-prefix" to "r-stream").
 *
 * One argument, on one model: the page's 70B-class model on its node of
 * eight 80 GB GPUs. Decode reads every weight per token (1), so memory is
 * what caps a server, and the cache is where it goes (2); batching is how a
 * weight read serves many sequences, and paging is how the memory holds them
 * (3); then the two levers that read fewer bytes or verify more tokens per
 * read (4), and four more (quick).
 *
 * Opening and bridge. It opens on Part 8's bridge (LLMs bring a serving
 * problem of their own: generation is slow and memory-hungry) by saying why,
 * never "in the last video". It closes on the plan's bridge into Part 10:
 * fast and cheap is not enough if you cannot tell whether the answers are
 * good.
 *
 * Overlap. Part 7 answers the system design page's quantization (32-bit to
 * INT8 for any model), request batching (waiting a few milliseconds to fill
 * a batch) and distillation (soft targets); this video keeps to what
 * generation changes: decode's bandwidth bound, the KV cache, answers that
 * end at different lengths, and drafting tokens. The llm-cost course video
 * draws "work per pass" with its own two lines (11 tokens against 1); the
 * reuse count here is the page's model and a stated 2,000-token prompt. No
 * Data Scientist part asks these questions.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap, green the right
 * answer, yellow what the narration points at, blue data. Grey is idle or
 * empty, never red: an idle slot is how static batching works, not an
 * error. The kingfisher hero sits right of the opening; three spots (an
 * hourglass, square tiles, a pencil beside a fountain pen) appear where
 * named.
 *   hook: two rows. "Classifier": one input, one arrow through a model box,
 *     one output. "Language model": the same box, the arrow looping back
 *     through it once per token as tokens appear one by one in blue, a small
 *     counter "pass 1, 2, 3 …" under it.
 *   hook-cost: the model box labelled "70B parameters", and beside it the
 *     node: eight GPU outlines, "8 × 80 GB" (the page's block). The
 *     kingfisher.
 *   q1: question card; a timeline of one request. A wide block "Prefill"
 *     (the prompt's tokens in one column, all lit at once) then a row of
 *     narrow ticks "Decode", one token each.
 *   q1-prefill: "Compute-bound" under prefill; a bracket from the request's
 *     start to the first output token, "time to first token (TTFT)", in
 *     yellow on "time to first token". The hourglass spot beside it.
 *   q1-decode: "Bandwidth-bound" under decode; a bracket between two ticks,
 *     "time per output token", yellow on its words; under each tick, a thin
 *     bar "reads all weights + the cache".
 *   q1-reuse: two numbers on lines of their own, "Prefill, 2,000-token
 *     prompt: each weight used 2,000 times per read" and "Decode step, one
 *     request: once" (results.json reuse), the second lit on "once". Not a
 *     bar chart: 2,000 against 1 would leave one bar invisible.
 *   q1-levers: two columns with a hairline between, "Chat product: TTFT,
 *     smooth streaming" and "Offline summarization: throughput, cost per
 *     request"; under the timeline, the prefill block widens on "Long
 *     prompts" and the decode row lengthens on "long answers".
 *   q1-follow: the timeline again with a long prefill block and quick ticks;
 *     "Shorten the prompt" and "Cache a shared prefix" in green on their
 *     words; "Wait to fill a bigger batch" struck in red on "Waiting".
 *   q2: question card; a row of past tokens, each holding a small key and
 *     value pair (two outlined cells, "K" and "V"), the new token's arrow
 *     reaching back to all of them; on "Recomputing", the pairs flash red
 *     and recompute, then settle into a box labelled "KV cache", green, on
 *     "cached".
 *   q2-formula: the page's formula as a row of factors, each lit as said:
 *     "2 × layers × KV heads × head dim × tokens × bytes per value".
 *   q2-model: the factors fill with the model's numbers, "2 × 80 × 8 × 128
 *     × 1 × 2", and "= 320 KiB per token" (results.json, the block's first
 *     line) on "three hundred and twenty".
 *   q2-context: "128K tokens: 40 GiB" (the block's second line) as a bar
 *     beside "Weights: ~140 GB" (the page), both in blue, the units as
 *     written (the page means GiB for the cache and GB for the weights).
 *   q2-fit: the node: eight GPU outlines merged into one bar, "8 × 80 GB =
 *     640 GB", the weights' 140 GB shaded, "500 GB free" in yellow; the free
 *     part fills with 186 small cells on "a hundred and eighty-six", "8K
 *     tokens each" (the block's last line), "at most" beside the count on
 *     "at most".
 *   q2-long: the same bar refilled with 11 wide cells, "128K each", on
 *     "eleven"; "Memory caps concurrency" as a line of its own.
 *   q2-gqa: a small diagram of four query heads drawing lines to one shared
 *     key/value head on "share"; then the 186 cells regroup into 23
 *     eight-times-wider ones on "eight times" (results.json fitNoGqa8k),
 *     labelled "64 KV heads: 23" in ink beside "8 KV heads (grouped-query):
 *     186" in green. The 64-head case is the ordinary design, not an error,
 *     so it is not red; grouped-query attention is the answer.
 *   q3: question card; one weight-read arrow fanning out to eight sequences
 *     (eight slots, the simulation's), each a row of tokens growing to the
 *     right at different lengths.
 *   q3-static: the eight rows as bars from a common start; a dashed line at
 *     the longest; the space between each short bar and the line in grey
 *     hatching, "idle"; the next batch waits behind the line.
 *   q3-cont: the same slots with new bars starting the moment one ends, no
 *     grey; "admit" and "release" ticks lit on their words.
 *   q3-sim: the simulation's two results as numbers, "Static: 37% busy" and
 *     "Continuous: 99% busy" (results.json batching), the second in green;
 *     "Simulation: 8 slots, 1,000 requests, answers 10 to 1,000 tokens,
 *     mostly short" as its note.
 *   q3-mem: one request's buffer as a long outlined bar of 8,192 tokens; the
 *     used 2,000 filled blue, the rest grey, "76% empty" (results.json
 *     paging.emptyShare) on "three quarters".
 *   q3-paged: the same 2,000 tokens as a row of small square blocks of 16
 *     (the tiles spot), handed out one by one as the answer grows; the last
 *     block part-filled, "At most part of one block: < 1%" in green on
 *     "under one percent"; two requests' rows pointing at the same first
 *     blocks on "share", labelled "shared prompt prefix".
 *   q3-paper: on "Less waste", the 8K buffer of q3-mem shrinks to its used
 *     blocks and the freed space takes three more requests' rows (an
 *     illustration, no number); then "Kwon et al., SOSP 2023 (vLLM): 2–4×
 *     throughput at the same latency", the source line in the figure's note
 *     style.
 *   q3-latency: "at the same latency" under the yellow highlighter; a small
 *     two-axis sketch, batch size along the bottom, throughput rising and
 *     time per token rising with it, no numbers (a mechanism, not data).
 *   q4: question card; three blocks of the weights side by side, "16-bit",
 *     "8-bit", "4-bit", their widths halving.
 *   q4-bytes: "~140 GB → 35 GB" under the 4-bit block (results.json
 *     quant), "¼ of the weight bytes per step" in yellow.
 *   q4-fit: one GPU outline, "80 GB": the 35 GB of weights and 16 cells of
 *     8K requests (results.json oneGpu4bit), green on "sixteen"; beside it,
 *     the 16-bit weights overflowing the same outline (140 > 80), grey.
 *   q4-risk: three short lines, "Reasoning and rare cases slip first",
 *     "Average perplexity can look fine", "Fast kernels may be missing", the
 *     first two in red; "Evaluate on your own task" in green.
 *   q4-spec: a small "draft" box writing four pale tokens ahead (the pencil
 *     spot); one large-model pass checking them, ticks green, the first
 *     rejected token red and replaced; under the pass, "≈ one decode step:
 *     one read of the weights" on "one decode step"; "Same output
 *     distribution" as a line of its own.
 *   q4-sim: two rows, "accepted 9 in 10: ~4.1 tokens per pass" and
 *     "accepted 1 in 2: ~1.9", from results.json speculative (simulated and
 *     the closed form both, asserted equal), with "Simulation: 4-token
 *     drafts" as the note.
 *   q4-cost: "Draft costs time and memory" under both rows; the 1-in-2 row
 *     dimmed on "lose".
 *   rapid-in: the quick round's five rows (RapidFire), headed "Other levers".
 *   r-prefix: a shared system prompt's cache drawn once, three requests'
 *     prefill bars starting after it; the row ticks.
 *   r-route: an arrow splitting, easy requests to a small model box, hard
 *     ones to the large one.
 *   r-distill: a large box and a small one, an arrow "imitates" between them,
 *     "narrow task".
 *   r-reason: a request's timeline as question 1 drew it: prefill, then grey
 *     decode steps of thinking, then the first visible tokens; the wait
 *     bracketed; "Spend them only where a request needs them" in green.
 *   r-stream: the decode ticks appearing one by one on a reader's line;
 *     "Same work, earlier start".
 *   close: the node bar from "q2-fit" small at the left, "Weights read per
 *     step" and "Cache held per request" lit as said.
 *   next: <NextLine> "Next: evaluating LLM systems", cued to "Next".
 *
 * The three "-in" beats ("q2-in", "q3-in", "q4-in") are one-line turns
 * spoken over the finished figure, as the README's transitions are; each
 * names what the next question is for, and nothing new draws on them except
 * where noted: "q2-in" lights the "+ the cache" half of decode's bar.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a
 * cue whose word disappears throws in the Studio rather than silently
 * drifting.
 *
 * Facts. check.mjs runs the page's own block in Pyodide, checks its four
 * lines against what the site's browser recorded
 * (lib/generated/block-outputs.json), computes everything else with the
 * block's own kv_cache_bytes, and fails if the narration's words stop
 * matching. Nothing about real serving runs here: every other number is
 * arithmetic on stated assumptions or a seeded simulation, said aloud as one.
 *   - hook: "a 70B-class model", "Eight 80 GB GPUs": the page and its block.
 *     That every generated token is another pass through the model is the
 *     page's decode ("produces one token per step. Each step reads every
 *     weight").
 *   - q1: the page's answer, nearly verbatim (one parallel pass, compute-
 *     bound, TTFT; one token per step, every weight and the cached context,
 *     bandwidth-bound, time per output token; chat vs offline job; long
 *     prompts vs long answers). "Count it" is arithmetic on an assumption
 *     said aloud: in one prefill pass over a 2,000-token prompt each weight
 *     read from memory is used in 2,000 multiply-adds, one per token; a
 *     decode step for one sequence uses it in one. q1-follow is the page's
 *     first concept check and its explanations ("Prefix caching and shorter
 *     prompts cut it directly"; "Waiting to batch adds queueing delay").
 *   - q2: the formula, "quadratic waste", 320 KiB per token, 40 GiB for one
 *     128K context against about 140 GB of weights, "Memory, not compute,
 *     usually caps how many requests a GPU can serve at once": the page.
 *     The block prints 320 KiB, 40 GiB, 320 GiB without GQA and 186 8K-token
 *     requests in 500 GB (640 GB less 140 GB), said "at most" because the
 *     block subtracts only the weights (activations and the runtime take
 *     their share in practice). check.mjs adds, with the
 *     block's function: 11 requests at 128K (500e9 // 42,949,672,960) and
 *     23 at 8K with 64 KV heads (the page's "eight times", 500e9 //
 *     21,474,836,480). Grouped-query attention and its 64 against 8: the
 *     page and its second concept check.
 *   - q3: static batching, continuous (in-flight) batching, PagedAttention
 *     as OS paging, fragmentation, shared prefix blocks, and Kwon et al.'s
 *     "2–4x higher throughput than earlier serving systems at the same
 *     latency": the page. vLLM is glossed as an open-source serving engine,
 *     which is what the paper introduced. The batching simulation is the
 *     video's own (seed 7): 8 slots, 1,000 requests all queued at the
 *     start, answer lengths exponential with mean 200 tokens, rounded and
 *     clipped to 10 to 1,000; prefill is left out. Static batching runs
 *     each group of eight until its longest finishes; continuous fills a
 *     slot the step after it frees. Busy share: 37% and 99%. The paging
 *     numbers are arithmetic on assumptions said aloud: an 8K reservation
 *     (the block's request size) for a request that uses 2,000 tokens leaves
 *     76% empty ("three quarters"); blocks of 16 tokens (an assumption)
 *     waste at most 15 tokens, 0.75% of 2,000. "Less waste means more
 *     requests in the batch" joins the page's "removes most fragmentation"
 *     to its "Memory, not compute, usually caps how many requests a GPU can
 *     serve at once"; no number is put on it. That throughput rises with
 *     batch size while each sequence's time per token rises too is the
 *     system design page's "larger batches improve throughput but increase
 *     per-request latency", applied to decode.
 *   - q4: 8-bit or 4-bit instead of 16, "sometimes the KV cache", bandwidth,
 *     quality loss on reasoning and rare cases before average perplexity,
 *     missing fast kernels, "Evaluate on your own task, not a generic
 *     benchmark"; the draft model, one forward pass, the standard acceptance
 *     rule leaving the distribution unchanged, the speedup depending on how
 *     often the draft is right: the page. Arithmetic: 140 GB at 4 bits is 35
 *     GB, a quarter of the weight bytes each step reads (the cache is read
 *     too, so not a quarter of all of them); an 80 GB GPU less 35 GB holds
 *     16 8K requests by the
 *     block's own method (weights subtracted, nothing else). That checking
 *     a few drafted tokens costs about one decode step is question one's
 *     argument applied to a pass over five tokens: the step's time is
 *     reading the weights, and the five share that read, as a prompt's
 *     tokens do in prefill. The
 *     speculative simulation is the video's own (seed 11): 4-token drafts,
 *     each drafted token accepted independently with probability 0.9 or 0.5
 *     until the first rejection, and every verifying pass adding one token
 *     of its own (the correction, or one more when all four pass), 200,000
 *     passes each: 4.09 and 1.94 tokens per pass, matching the closed form
 *     (1 - a^5) / (1 - a). That a draft that is usually wrong can make
 *     decoding slower follows from its own cost, which the page's "the
 *     speedup depends on how often the draft is right" implies; no timing is
 *     given or measured.
 *   - the turns: "q2-in" is the page's decode ("reads every weight and the
 *     whole cached context"); "q3-in" its "Memory, not compute, usually caps
 *     how many requests a GPU can serve at once"; "q4-in" sums up question
 *     four (fewer bytes per step; more tokens per pass).
 *   - quick: the page's "Other levers worth naming", one line each, and its
 *     reasoning budget ("decode time the user waits through before the first
 *     visible token. Spend them on the requests that need them").
 *   - close and bridge: the video's own summary; the plan's bridge.
 *
 * Written for Drew's ear: LLM, GPU, KV, TTFT (expanded once: "time to first
 * token, or TTFT") and SOSP (on screen only) as letters; vLLM is said as
 * written and listed for the lexicon ("vee L L M"); PagedAttention as two
 * words; units as the page means them, "kibibytes" and "gibibytes" for the
 * cache, "gigabytes" for the weights and GPUs; "a hundred and twenty-eight
 * K" and "eight K" for 128K and 8K, as people say them; no sentence opens
 * with "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "mle-serving-llms",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A classifier answers in one pass through its model. A language model writes its answer one token at a time, and every token is another pass.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-cost",
      text: "That's why generation is slow, and why it's hungry for memory. Four questions, all on one model: seventy billion parameters, served from eight GPUs.",
      pauseAfter: 0.8,
    },

    // ── 1. Prefill and decode ─────────────────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. Why is LLM inference split into prefill and decode? Because generating a response has two phases, with different bottlenecks.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-prefill",
      text: "Prefill processes the whole prompt in one parallel pass. That's large matrix multiplication, so it's compute-bound, and it sets the time to first token, or TTFT.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-decode",
      text: "Decode then produces one token per step. Each step reads every weight and the whole cached context to do a little arithmetic, so it's bound by memory bandwidth, and it sets the time per output token.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-reuse",
      text: "Count it. With a two-thousand-token prompt, prefill puts every weight it reads to work two thousand times. A decode step for one request uses it once.",
      pauseAfter: 0.8,
    },
    {
      id: "q1-levers",
      text: "So the levers differ. A chat product cares most about TTFT and smooth streaming; an offline summarization job, about throughput and cost per request. Long prompts make prefill expensive, and long answers make decode expensive.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-follow",
      text: "The follow-up: users wait seconds before any text appears, and then it streams quickly. That's prefill. Shorten the prompt, or cache a long shared prefix. Waiting to fill a bigger batch first would only add delay.",
      pauseAfter: 0.8,
    },
    { id: "q2-in", text: "Every decode step also reads the cached context, and that cache is the part that grows." },

    // ── 2. The KV cache ───────────────────────────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. What is the KV cache, and how large does it get? During decode, each new token attends to every token before it. Recomputing their keys and values at every step would be quadratic waste, so they're cached.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-formula",
      text: "Per sequence, its size is two, for one key and one value, times the layers, the KV heads, the head dimension, the tokens, and the bytes per value.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-model",
      text: "This model has eighty layers and eight KV heads of dimension a hundred and twenty-eight, at sixteen bits. That's three hundred and twenty kibibytes for every token.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-context",
      text: "One context of a hundred and twenty-eight K tokens takes forty gibibytes, beside about a hundred and forty gigabytes of weights.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-fit",
      text: "Now the last step, the one to do on the whiteboard: how many requests fit? Eight eighty-gigabyte GPUs, minus the weights, leave five hundred gigabytes. At eight K tokens a request, at most a hundred and eighty-six fit.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-long",
      text: "At a hundred and twenty-eight K, eleven. Memory, not compute, usually caps how many requests a GPU serves at once, and this cache is where the memory goes.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-gqa",
      text: "That's why grouped-query attention matters: several query heads share one key and value head. Give each of the sixty-four query heads its own, and the cache grows eight times: twenty-three of those eight K requests, not a hundred and eighty-six.",
      pauseAfter: 0.8,
    },
    { id: "q3-in", text: "So memory caps the batch, and the next question is how to keep it full." },

    // ── 3. Continuous batching and PagedAttention ─────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Question three. What are continuous batching and PagedAttention? Batching lets one read of the weights serve many sequences at once. The catch is that answers end at different lengths.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-static",
      text: "Static batching groups requests and waits until the longest one finishes, so the slots that finished early sit idle.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-cont",
      text: "Continuous batching, also called in-flight batching, admits a new request at any decode step, and releases a finished one immediately.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-sim",
      text: "In a simulation, eight slots work through a thousand requests whose answers run from ten to a thousand tokens, most of them short. Static batching keeps the slots busy thirty-seven percent of the time. Continuous batching, ninety-nine.",
      pauseAfter: 0.8,
    },
    {
      id: "q3-mem",
      text: "Every busy slot needs cache memory, and no one knows in advance how long an answer will be. Reserve eight K tokens for a request that ends up using two thousand, and three quarters of its buffer sits empty.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-paged",
      text: "PagedAttention stores the cache in fixed-size blocks, the way an operating system pages memory, and hands out blocks as the answer grows. With blocks of sixteen tokens, the only waste is the unfilled end of a request's last block: under one percent of two thousand. And requests that share a prompt prefix can share its blocks.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-paper",
      text: "Less waste means more requests in the batch. PagedAttention came with vLLM, an open-source serving engine, whose paper reported two to four times the throughput of earlier systems at the same latency.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-latency",
      text: "Notice that last part. A bigger batch raises throughput while each user's tokens arrive more slowly, so a throughput number only means something at a stated latency.",
      pauseAfter: 0.8,
    },
    { id: "q4-in", text: "The last two levers make every byte read go further." },

    // ── 4. Quantization and speculative decoding ──────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. What do quantization and speculative decoding trade? Quantization stores the weights, and sometimes the KV cache, in fewer bits: eight or four instead of sixteen.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-bytes",
      text: "Decode is bound by bandwidth, so moving fewer bytes makes it faster as well as smaller. At four bits, this model's weights shrink from about a hundred and forty gigabytes to thirty-five, a quarter of the weight bytes every step reads.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-fit",
      text: "They'd fit on one of those GPUs, with room left for sixteen eight K requests.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-risk",
      text: "The price is quality. It often slips on reasoning and rare cases before it shows in average perplexity, and your hardware may lack fast kernels for the format. So evaluate on your own task, not a generic benchmark.",
      pauseAfter: 0.8,
    },
    {
      id: "q4-spec",
      text: "Speculative decoding lets a small draft model propose several tokens, and the large model verify them all in one forward pass, which costs about one decode step, since reading the weights dominates either way. With the standard acceptance rule, the output distribution doesn't change, so quality isn't the price.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-sim",
      text: "The speedup depends on how often the draft is right. In a simulation with four-token drafts, if each drafted token is accepted nine times in ten, a pass of the large model yields about four tokens. At half, under two.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-cost",
      text: "And the draft model costs time and memory of its own, so it helps most on predictable text, and can lose where the draft is usually wrong.",
      pauseAfter: 0.8,
    },

    // ── Quick: the other levers ───────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Five more levers, one line each.",
      pauseAfter: 0.5,
    },
    {
      id: "r-prefix",
      text: "Prefix caching: compute a shared system prompt's cache once, so each request's prefill covers only what comes after it.",
      pauseAfter: 0.6,
    },
    { id: "r-route", text: "Routing: send the easy requests to a smaller model.", pauseAfter: 0.6 },
    {
      id: "r-distill",
      text: "Distillation: train a small model to imitate the large one on a narrow task.",
      pauseAfter: 0.6,
    },
    {
      id: "r-reason",
      text: "Reasoning budget: a model's thinking tokens are decode steps the user waits through before the first visible word, so spend them only on requests that need them.",
      pauseAfter: 0.6,
    },
    {
      id: "r-stream",
      text: "And streaming, which cuts the wait you feel rather than the work: the reader starts while the rest is still being written.",
      pauseAfter: 0.8,
    },
    {
      id: "close",
      scene: true,
      text: "Most of these come down to bytes: the weights each step reads, and the cache each request holds.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "But fast and cheap isn't enough if you can't tell whether the answers are good. Next: evaluating LLM systems.",
    },
  ],
};
