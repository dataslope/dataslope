// Computes every number the mle-serving-llms video says or shows, and writes
// results.json, which data.ts reads. No model is served here: no GPU, no
// batch scheduler, no paged cache and no draft model runs, so nothing below
// is any system's output or a benchmark. The numbers are of three kinds, each
// named on screen and aloud as what it is:
//
//   - The page's own runnable block (llm-systems-and-evals.mdx, "What is the
//     KV cache, and how large does it get?"), lifted out of the MDX and run
//     in Pyodide, the runtime the page runs it in. Its four printed lines are
//     checked against what the site's browser recorded for the same block
//     (lib/generated/block-outputs.json).
//   - Arithmetic with the block's own kv_cache_bytes, on the block's own
//     model and node (80 layers, 8 KV heads of dimension 128, 16-bit values;
//     eight 80 GB GPUs, about 140 GB of weights), and on assumptions said
//     aloud: a 2,000-token prompt; a request that reserves 8K tokens and uses
//     2,000; blocks of 16 tokens; 4-bit weights on one 80 GB GPU.
//   - Two seeded simulations, each called a simulation aloud:
//       * batching: 8 slots, 1,000 requests all waiting at the start, answer
//         lengths exponential with mean 200 tokens, rounded and clipped to
//         10..1,000 (seed 7); static batching runs each group of eight until
//         its longest answer ends, continuous batching fills a slot the step
//         after it frees. Prefill is left out; only decode steps count.
//       * speculative decoding: 4-token drafts, each drafted token accepted
//         independently with probability 0.9 or 0.5 until the first
//         rejection, each verifying pass adding one token of its own (the
//         correction, or one more when all four pass), 200,000 passes each
//         (seed 11), checked against the closed form (1 - a^5) / (1 - a).
//
// Then it fails (exit 1) if the page stops saying what the narration quotes,
// if the block's output stops matching the recorded one, or if a number the
// narration says stops matching what is computed here. From the repo root:
//
//   node video/src/videos/mle-serving-llms/check.mjs
/* global console, process */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const PAGE = "content/interview/machine-learning-engineer/llm-systems-and-evals.mdx";
const page = readFileSync(join(root, PAGE), "utf8");
const problems = [];

// ── The page's block, lifted out of the MDX ─────────────────────────────────
const blocks = [...page.matchAll(/starterCode: `([\s\S]*?)`,\n/g)].map((m) => m[1]);
if (blocks.length !== 1) throw new Error(`expected one runnable block on the page, found ${blocks.length}`);
const code = blocks[0];
if (!code.includes("def kv_cache_bytes(layers, kv_heads, head_dim, tokens, bytes_per_value=2):")) {
  throw new Error("the page's block no longer defines kv_cache_bytes as the narration describes it");
}

const require = createRequire(join(root, "package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide({ packages: ["numpy"] });
const printed = [];
py.setStdout({ batched: (line) => printed.push(line) });
py.runPython(code);
py.setStdout({});

// What the reader's browser printed for the same block, as the site records it.
const recorded = JSON.parse(readFileSync(join(root, "lib/generated/block-outputs.json"), "utf8"))[PAGE];
const recordedText = recorded ? Object.values(recorded).flatMap((e) => e.cells.filter((c) => c.type === "stdout").map((c) => c.content)) : [];
if (recordedText.length !== 1) problems.push(`block-outputs.json holds ${recordedText.length} stdout entries for the page, not one`);
else if (recordedText[0].trim() !== printed.join("\n").trim()) problems.push(`the block printed:\n${printed.join("\n")}\nthe site recorded:\n${recordedText[0]}`);

// ── Everything else, with the block's own function, in the same namespace ───
const out = py.runPython(`
import json, sys
import numpy as np

R = {"runtime": {"python": sys.version.split()[0], "numpy": np.__version__}}
GiB, KiB = 2**30, 1024

# The block's model and node.
L, KV, D, B16 = 80, 8, 128, 2
QUERY_HEADS = 64                      # the page's second concept check
GPUS, GPU_BYTES = 8, 80e9             # "Eight 80 GB GPUs"
WEIGHTS16 = 140e9                     # "about 140 GB of 16-bit weights"
free = GPUS * GPU_BYTES - WEIGHTS16
per_token = kv_cache_bytes(L, KV, D, 1)
ctx128k = kv_cache_bytes(L, KV, D, 131072)
per8k = kv_cache_bytes(L, KV, D, 8192)
R["kv"] = {
    "layers": L, "kvHeads": KV, "headDim": D, "bytesPerValue": B16, "queryHeads": QUERY_HEADS,
    "perTokenBytes": per_token, "perTokenKiB": per_token / KiB,
    "context128kTokens": 131072, "context128kGiB": ctx128k / GiB,
    "noGqa128kGiB": kv_cache_bytes(L, QUERY_HEADS, D, 131072) / GiB,
    "gqaFactor": QUERY_HEADS // KV,
    "weightsGB": WEIGHTS16 / 1e9, "gpus": GPUS, "gpuGB": GPU_BYTES / 1e9,
    "nodeGB": GPUS * GPU_BYTES / 1e9, "freeGB": free / 1e9,
    "per8kBytes": per8k, "per8kGiB": per8k / GiB,
    "fit8k": int(free // per8k),
    "fit128k": int(free // ctx128k),
    "fitNoGqa8k": int(free // kv_cache_bytes(L, QUERY_HEADS, D, 8192)),
}

# Prefill against decode: how many multiply-adds each weight read from memory
# takes part in. One prefill pass over a P-token prompt uses every weight once
# per prompt token; a decode step for one sequence uses it once.
PROMPT = 2000
R["reuse"] = {"promptTokens": PROMPT, "prefill": PROMPT, "decode": 1}

# Quantized weights, and what one GPU then holds, by the block's own method
# (weights subtracted, nothing else).
w8, w4 = WEIGHTS16 * 8 / 16, WEIGHTS16 * 4 / 16
R["quant"] = {
    "weights16GB": WEIGHTS16 / 1e9, "weights8GB": w8 / 1e9, "weights4GB": w4 / 1e9,
    "shareOfBytes4": w4 / WEIGHTS16,
    "gpusFor16bitWeights": int(-(-WEIGHTS16 // GPU_BYTES)),
    "oneGpu4bitFreeGB": (GPU_BYTES - w4) / 1e9,
    "oneGpu4bit": int((GPU_BYTES - w4) // per8k),
    "kv8bitKiBPerToken": kv_cache_bytes(L, KV, D, 1, bytes_per_value=1) / KiB,
}

# Paging, on assumptions said aloud.
RESERVED, USED, BLOCK = 8192, 2000, 16
R["paging"] = {
    "reservedTokens": RESERVED, "usedTokens": USED, "emptyShare": round((RESERVED - USED) / RESERVED, 4),
    "blockTokens": BLOCK, "worstWasteTokens": BLOCK - 1, "worstWasteShare": round((BLOCK - 1) / USED, 4),
}

# ── Simulation: static against continuous batching ──────────────────────────
rng = np.random.default_rng(7)
SLOTS, N, MEAN, LO, HI = 8, 1000, 200, 10, 1000
lengths = np.clip(np.round(rng.exponential(MEAN, N)), LO, HI).astype(int)
tokens = int(lengths.sum())
static_steps = int(sum(lengths[i:i + SLOTS].max() for i in range(0, N, SLOTS)))
# Continuous: each step, every free slot takes the next waiting request, then
# every busy slot produces one token.
queue = list(lengths); slots = [0] * SLOTS; steps = 0
while queue or any(slots):
    for j in range(SLOTS):
        if slots[j] == 0 and queue:
            slots[j] = queue.pop(0)
    steps += 1
    for j in range(SLOTS):
        if slots[j] > 0:
            slots[j] -= 1
# The first two groups, for the figure: each request's length, by slot.
R["batching"] = {
    "seed": 7, "slots": SLOTS, "requests": N, "meanTarget": MEAN, "min": int(lengths.min()), "max": int(lengths.max()),
    "mean": round(float(lengths.mean()), 1), "median": int(np.median(lengths)),
    "shortShare": round(float((lengths <= MEAN).mean()), 3),
    "tokens": tokens,
    "staticSteps": static_steps, "staticBusy": round(tokens / (SLOTS * static_steps), 4),
    "continuousSteps": steps, "continuousBusy": round(tokens / (SLOTS * steps), 4),
    "firstGroups": [[int(v) for v in lengths[i:i + SLOTS]] for i in (0, SLOTS)],
}

# ── Simulation: speculative decoding ────────────────────────────────────────
rng = np.random.default_rng(11)
DRAFT, PASSES = 4, 200_000
spec = []
for a in (0.9, 0.5):
    acc = rng.random((PASSES, DRAFT)) < a
    # Accepted tokens: drafted tokens up to the first rejection.
    first_reject = np.where(acc.all(axis=1), DRAFT, np.argmin(acc, axis=1))
    per_pass = first_reject + 1
    closed = (1 - a ** (DRAFT + 1)) / (1 - a)
    spec.append({"accept": a, "tokensPerPass": round(float(per_pass.mean()), 3), "closedForm": round(closed, 3),
                 "allAccepted": round(float((first_reject == DRAFT).mean()), 3)})
R["speculative"] = {"seed": 11, "draftTokens": DRAFT, "passes": PASSES, "runs": spec}

json.dumps(R)
`);

const R = JSON.parse(out);
R.block = { page: PAGE, printed };
const check = (ok, what) => {
  if (!ok) problems.push(what);
};

// ── The page still says what the narration quotes ───────────────────────────
const quotes = [
  "### Why is LLM inference split into prefill and decode?",
  "### What is the KV cache, and how large does it get?",
  "### What are continuous batching and PagedAttention?",
  "### What do quantization and speculative decoding trade?",
  "processes the whole prompt in one parallel pass",
  "**compute-bound**, and it sets the **time to\n  first token** (TTFT)",
  "Each step reads every weight and the\n  whole cached context to do a small amount of arithmetic",
  "**memory-bandwidth-bound**, and it sets the **time per output token**",
  "A chat product cares most about\nTTFT and smooth streaming; an offline summarization job cares about total\nthroughput and cost per request. Long prompts make prefill expensive; long\nanswers make decode expensive.",
  "would be quadratic waste",
  "For a 70B-class model with 80 layers, 8 KV\nheads of dimension 128, and 16-bit values, that is 320 KiB **per token**, or\n40 GiB for a single 128K-token context, against about 140 GB for the weights.",
  "Memory, not compute, usually caps how many requests a GPU can serve at once",
  "several query\nheads share one key/value head",
  "(64 instead of 8) would need eight times the cache",
  "Eight 80 GB GPUs, minus about 140 GB of 16-bit weights.",
  "waits until the longest one finishes",
  "(also called\nin-flight batching) admits a new request into the batch at any decode step and\nreleases a finished one immediately",
  "the way an\noperating system pages virtual memory",
  "lets sequences\nshare blocks for a common prefix",
  "reported 2–4x higher\nthroughput than earlier serving systems at the same latency",
  "8-bit or 4-bit instead of 16",
  "(and sometimes the KV cache)",
  "moving fewer\nbytes makes it faster as well as smaller",
  "often shows up on reasoning and rare cases before it shows on average\nperplexity, and missing fast kernels for your hardware",
  "Evaluate on your own\ntask, not a generic benchmark.",
  "a small draft model propose several tokens",
  "verifies in one forward pass",
  "With the standard acceptance\nrule the output distribution is unchanged",
  "it helps most on predictable text",
  "prefix caching for a shared system prompt, routing\neasy requests to a smaller model, distilling a large model into a small one for\na narrow task, and streaming to cut perceived latency",
  // q1-follow: the first concept check and its explanations.
  "takes several seconds before any text appears, although answers then stream quickly",
  "Prefix caching and shorter prompts cut it directly",
  "Waiting to batch adds queueing delay",
];
for (const q of quotes) check(page.includes(q), `${PAGE} no longer says: ${q}`);
// q3-latency: the system design page's throughput-latency trade.
const design = readFileSync(join(root, "content/interview/machine-learning-engineer/ml-system-design.mdx"), "utf8");
check(design.includes("larger batches improve\nthroughput but increase per-request latency"), "ml-system-design.mdx no longer says larger batches raise throughput and latency");

// ── Sanity on the computed values ───────────────────────────────────────────
check(R.kv.perTokenKiB === 320 && R.kv.context128kGiB === 40 && R.kv.noGqa128kGiB === 320 && R.kv.fit8k === 186, "the block's four numbers moved");
check(printed.join("\n").includes(`8K-token requests that fit: ${R.kv.fit8k}`), "the block's printed fit disagrees with kv_cache_bytes");
for (const s of R.speculative.runs) check(Math.abs(s.tokensPerPass - s.closedForm) < 0.02, `speculative simulation at ${s.accept} is ${s.tokensPerPass}, closed form ${s.closedForm}`);
check(R.batching.shortShare > 0.5, "most answers are no longer short");

// ── What the narration says, checked against the numbers ────────────────────
const { script } = await import(pathToFileURL(join(here, "script.ts")).href);
const beat = (id) => {
  const b = script.beats.find((x) => x.id === id);
  if (!b) throw new Error(`script.ts has no beat "${id}"`);
  return b.text;
};
const pct = (v) => Math.round(v * 100);
const [fast, slow] = R.speculative.runs;
const said = [
  ["hook-cost", "eight GPUs", 8, R.kv.gpus],
  ["q1-reuse", "With a two-thousand-token prompt", 2000, R.reuse.promptTokens],
  ["q1-reuse", "to work two thousand times", 2000, R.reuse.prefill],
  ["q1-reuse", "uses it once", 1, R.reuse.decode],
  ["q2-model", "eighty layers", 80, R.kv.layers],
  ["q2-model", "eight KV heads", 8, R.kv.kvHeads],
  ["q2-model", "dimension a hundred and twenty-eight", 128, R.kv.headDim],
  ["q2-model", "at sixteen bits", 16, R.kv.bytesPerValue * 8],
  ["q2-model", "three hundred and twenty kibibytes for every token", 320, R.kv.perTokenKiB],
  ["q2-context", "a hundred and twenty-eight K tokens", 131072, R.kv.context128kTokens],
  ["q2-context", "forty gibibytes", 40, R.kv.context128kGiB],
  ["q2-context", "about a hundred and forty gigabytes of weights", 140, R.kv.weightsGB],
  ["q2-fit", "Eight eighty-gigabyte GPUs", 8, R.kv.gpus],
  ["q2-fit", "Eight eighty-gigabyte GPUs", 80, R.kv.gpuGB],
  ["q2-fit", "leave five hundred gigabytes", 500, R.kv.freeGB],
  ["q2-fit", "a hundred and eighty-six fit", 186, R.kv.fit8k],
  ["q2-long", "At a hundred and twenty-eight K, eleven", 11, R.kv.fit128k],
  ["q2-gqa", "sixty-four query heads", 64, R.kv.queryHeads],
  ["q2-gqa", "the cache grows eight times", 8, R.kv.gqaFactor],
  ["q2-gqa", "twenty-three of those eight K requests", 23, R.kv.fitNoGqa8k],
  ["q2-gqa", "not a hundred and eighty-six", 186, R.kv.fit8k],
  ["q3-sim", "eight slots", 8, R.batching.slots],
  ["q3-sim", "a thousand requests", 1000, R.batching.requests],
  ["q3-sim", "from ten to a thousand tokens", 10, R.batching.min],
  ["q3-sim", "from ten to a thousand tokens", 1000, R.batching.max],
  ["q3-sim", "busy thirty-seven percent of the time", 37, pct(R.batching.staticBusy)],
  ["q3-sim", "Continuous batching, ninety-nine", 99, pct(R.batching.continuousBusy)],
  ["q3-mem", "Reserve eight K tokens", 8192, R.paging.reservedTokens],
  ["q3-mem", "using two thousand", 2000, R.paging.usedTokens],
  ["q3-mem", "three quarters of its buffer sits empty", 0.75, Math.round(R.paging.emptyShare * 4) / 4],
  ["q3-paged", "blocks of sixteen tokens", 16, R.paging.blockTokens],
  ["q3-paged", "under one percent", 1, R.paging.worstWasteShare < 0.01 ? 1 : 0],
  ["q4-bytes", "about a hundred and forty gigabytes to thirty-five", 35, R.quant.weights4GB],
  ["q4-bytes", "a quarter of the weight bytes", 0.25, R.quant.shareOfBytes4],
  ["q4-fit", "fit on one of those GPUs", 1, R.quant.weights4GB < R.kv.gpuGB ? 1 : 0],
  ["q4-fit", "room left for sixteen eight K requests", 16, R.quant.oneGpu4bit],
  ["q4-sim", "four-token drafts", 4, R.speculative.draftTokens],
  ["q4-sim", "accepted nine times in ten", 0.9, fast.accept],
  ["q4-sim", "yields about four tokens", 4, Math.round(fast.tokensPerPass)],
  ["q4-sim", "At half, under two", 0.5, slow.accept],
  ["q4-sim", "At half, under two", 1, slow.tokensPerPass < 2 ? 1 : 0],
];
for (const [id, words, means, value] of said) {
  if (!beat(id).includes(words)) problems.push(`${id}: no longer says "${words}"`);
  else if (Math.abs(means - value) > 1e-9 * Math.max(1, Math.abs(means))) problems.push(`${id}: "${words}" is ${means}, computed ${value}`);
}
// Static batching in the narration is "most of them short": the median sits
// under the mean.
check(beat("q3-sim").includes("most of them short") && R.batching.median < R.batching.mean, "the answer lengths are no longer mostly short");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
R.said = said.map(([b, words, means]) => ({ beat: b, words, means }));
writeFileSync(join(here, "results.json"), `${JSON.stringify(R, null, 2)}\n`);
console.log(JSON.stringify({ printed, kv: R.kv, reuse: R.reuse, quant: R.quant, paging: R.paging, batching: { ...R.batching, firstGroups: undefined }, speculative: R.speculative }, null, 1));
console.error(`ok: the page's block reproduces the site's output, and ${said.length} spoken numbers match`);
