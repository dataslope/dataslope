// What the mle-serving-llms video draws, read from results.json, which
// check.mjs computed: the page's own KV-cache block run in Pyodide (and
// checked against the output the site recorded for it), arithmetic with that
// block's function on the page's model and node, and two seeded simulations
// (batching, speculative decoding), each called a simulation on screen and
// aloud. Nothing here is a real serving system's output. Pure: no React, no
// Remotion, so the scenes and any test can import it.
import results from "./results.json" with { type: "json" };

export const VIDEO = "mle-serving-llms";

/** The kingfisher and the three spots (hourglass, tiles, pencil and pen) in
 *  illustrations.json; generated and imported by the builder. */
export const ILLUSTRATIONS = true;

/** The page's block, as it printed in Pyodide (four lines, identical to the
 *  site's recorded output). */
export const BLOCK_OUTPUT: readonly string[] = results.block.printed;

/** The page's model and node, and what its KV cache costs ("q2" to
 *  "q2-gqa"). Bytes are exact; KiB and GiB are binary (1024), GB decimal,
 *  as the page writes them. */
export const KV = results.kv as {
  layers: number;
  kvHeads: number;
  headDim: number;
  bytesPerValue: number;
  queryHeads: number;
  perTokenBytes: number;
  /** 320 */
  perTokenKiB: number;
  context128kTokens: number;
  /** 40 */
  context128kGiB: number;
  /** 320, with a KV head per query head (64). */
  noGqa128kGiB: number;
  /** 8 */
  gqaFactor: number;
  /** About 140 (16-bit). */
  weightsGB: number;
  gpus: number;
  gpuGB: number;
  /** 640 */
  nodeGB: number;
  /** 500 */
  freeGB: number;
  per8kBytes: number;
  /** 2.5 */
  per8kGiB: number;
  /** 186: the block's last line. */
  fit8k: number;
  /** 11 */
  fit128k: number;
  /** 23 */
  fitNoGqa8k: number;
};

/** "q1-reuse": multiply-adds per weight read, prefill over a stated
 *  2,000-token prompt against one decode step. */
export const REUSE = results.reuse as { promptTokens: number; prefill: number; decode: number };

/** "q4-bytes", "q4-fit": the weights at 16, 8 and 4 bits (GB), and one 80 GB
 *  GPU holding the 4-bit weights plus 16 requests of 8K tokens. */
export const QUANT = results.quant as {
  weights16GB: number;
  weights8GB: number;
  weights4GB: number;
  shareOfBytes4: number;
  gpusFor16bitWeights: number;
  oneGpu4bitFreeGB: number;
  oneGpu4bit: number;
  kv8bitKiBPerToken: number;
};

/** "q3-mem", "q3-paged": an 8K reservation for a request that uses 2,000
 *  tokens (76% empty), and blocks of 16 tokens (at most 15 wasted, 0.75%). */
export const PAGING = results.paging as {
  reservedTokens: number;
  usedTokens: number;
  emptyShare: number;
  blockTokens: number;
  worstWasteTokens: number;
  worstWasteShare: number;
};

/** "q3-sim": the batching simulation (seed 7). Busy shares are of slot-steps
 *  doing decode work: static 0.374, continuous 0.992. `firstGroups` are the
 *  first sixteen answer lengths, as two groups of eight, for the bars. */
export const BATCHING = results.batching as {
  seed: number;
  slots: number;
  requests: number;
  meanTarget: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  shortShare: number;
  tokens: number;
  staticSteps: number;
  staticBusy: number;
  continuousSteps: number;
  continuousBusy: number;
  firstGroups: number[][];
};

/** "q4-sim": the speculative-decoding simulation (seed 11), 4-token drafts,
 *  acceptance 0.9 then 0.5: tokens per pass of the large model, simulated
 *  and closed form. */
export const SPECULATIVE = results.speculative as {
  seed: number;
  draftTokens: number;
  passes: number;
  runs: { accept: number; tokensPerPass: number; closedForm: number; allAccepted: number }[];
};

/** The source line for "q3-paper", as the page's footnote gives it. */
export const VLLM_SOURCE = "Kwon et al., SOSP 2023 (vLLM)";
