import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "What a token costs" (16:9), Unit 4 of How Large Language
 * Models Work. One argument in three parts, after
 * content/courses/how-llms-work/pricing-structure.mdx, estimating-cost.mdx and
 * controlling-cost.mdx:
 *
 *   1. The price sheet ("hook" to "estimate-in"): Unit 3 ended on every token
 *      the model reads, writes or thinks being billed, so the video opens on
 *      exactly that; then the five numbers on every price sheet, why output
 *      costs more than input (one parallel pass against one pass per token),
 *      why cached input is cheap and what breaks it, the October 2026 market
 *      table, and the length threshold.
 *   2. Estimating ("request" to "control-in"): one request against a hundred
 *      thousand of them, the conversation that resends itself every turn,
 *      thinking tokens billed as output, and a month of four workloads.
 *   3. Controlling it ("levers" to "next"): the lesson's six levers in its
 *      order, the first two with their savings. It ends on Unit 5's question:
 *      "the cheapest model that passes" needs a test to pass.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Nothing is looked up: the prices are the lessons' October 2026
 * snapshot. measure.py pulls every Python block out of the three lessons, runs
 * it, checks that it prints exactly what the site's Pyodide printed
 * (lib/generated/block-outputs.json, all seven match), and computes every
 * number below with the functions those blocks define; data.ts reads its
 * measurements.json.
 *   - "sheet", "rows": the lesson's "five numbers" are said as "five prices
 *     ... always in the same proportions" (the October review: the table holds
 *     relationships, not prices, so the narration promises proportions). They
 *     are pricing-structure's table, verbatim on screen ("5 times input, sometimes more", "10% of input or less",
 *     "Slightly above input", "About 50% off"). "The ratios hardly move" is
 *     its "remarkably stable across vendors and across years".
 *   - "parallel", "serial", "weights", "gap": "Why output costs more than
 *     input". "Weights" is its "The hardware spends most of its time moving
 *     weights around rather than computing": every pass moves the whole
 *     model, whether it carries the prompt's 11 tokens or one answer token,
 *     and Fig. 3's "work per pass" meters are those counts, 11 against 1. The
 *     tokens drawn going in and coming out are o200k_base pieces of the
 *     video's own two lines, tokenized by measure.py (tiktoken 0.12.0).
 *   - "reuse", "twentieth": "Why cached input is so cheap" (the 50,000-token
 *     prefix, "roughly a tenth of the work", a twentieth on Opus 5.5, Sonnet
 *     5.5 and GPT-6.1 Sol, a fortieth on Fable 5.1). On Sonnet 5.5, with
 *     estimating-cost's `cost`: 50,000 tokens at $2.00 a million is $0.10
 *     ("ten cents"), at the $0.10 cached rate $0.005 ("half a cent").
 *     "prefix": "A single changed byte anywhere in the prefix invalidates
 *     everything after it"; the timestamp on screen is controlling-cost's
 *     own, "Session started 2026-08-03T14:22:01Z".
 *   - "market" to "choice": "The landscape, October 2026", the ten rows
 *     verbatim. The ratio is 5x in eight rows and never lower; the cheapest
 *     input ($0.10, Haiku 5.5 and GPT-6 Luna) is a hundredth of the dearest
 *     ($10.00, Fable 5.1 and GPT-6 Astra). "Usually" is the lesson's ("model
 *     selection is usually a bigger cost lever").
 *   - "threshold", "oversized": the threshold table verbatim (half the
 *     table's rows have one). The case is the lesson's own concept check, a
 *     300,000-token prompt against the GPT-6 family's 272,000-token line, on
 *     GPT-6.1 Sol ($2.00 input): $0.60 at the headline rate, $1.20 with the
 *     whole request at 2x. Fig. 6 hatches every token of that bar, not the
 *     28,000 past the line (the concept check's wrong answer).
 *   - "request" to "apart": estimating-cost, "A single request" (1,200 in,
 *     300 out): Sonnet $0.0054 ("about half a cent"); per 100,000 requests
 *     Haiku $27.00 and Fable $2,700.00, a factor of 100.
 *   - "resend" to "triple": "A conversation, with the resend",
 *     `conversation_cost("sonnet", turns)` with its defaults (2,000-token
 *     system prompt, 150-token messages, 400-token replies): 10 turns
 *     $0.1325, 20 turns $0.3750, 40 turns $1.1900, the page's own table.
 *     Doubling 10 to 20 is x2.8 and 20 to 40 x3.2 ("roughly triples, and it
 *     keeps getting worse": the ratio grows with every doubling). "Sum": the
 *     function adds each turn's whole history at the input rate plus each
 *     reply at the output rate ("every one of these bars, plus each reply").
 *     The
 *     bars are the input each turn sends: 2,150 tokens on turn 1, 23,600 on
 *     turn 40. The lesson's chart token-cost-stack draws the same idea with
 *     other numbers (400, 180, 320); the video keeps to the code block's, so
 *     the bars and the dollars are one conversation.
 *   - "think" to "invisible": "Thinking tokens", `request_cost("sonnet",
 *     2000, 400, k)`: 8,000 thinking tokens 11.0x ("eleven times"), 20,000
 *     26.0x. Fig. 1's request (2,000 read, 2,000 thought, 400 written) is the
 *     same block's 2,000-token budget, so Fig. 9 grows it.
 *   - "month" to "total": "a monthly estimate", `monthly` on its four
 *     workloads: code review on Opus $720.00 a month, document summaries on
 *     Sonnet $864.00, total $1,759.50 ("about seventeen hundred and sixty").
 *   - "levers" to "prompt": controlling-cost's six headings in its order.
 *     "route-cost": its routing block (50,000 a day, 600 in, 15 out), Opus
 *     $4,050.00 a month and Haiku $101.25 ("a hundred and one"). "cache": the
 *     same 40-turn chat with `cached=True`, $1.19 to $0.2563 ("twenty-six
 *     cents"), 78% less, the page's table. "cache-resend": the cached path
 *     still sends the whole history each turn and bills what was sent last
 *     turn at the cache rate, so the chat is resent in full and the stored
 *     prefix is read back. "output": "a token saved on the
 *     output side is worth at least five saved on the input side".
 *     "effort": "Set it to the lowest level that passes your evaluation";
 *     "the thinking budget" ties the setting to Fig. 9, which returns beside
 *     it with its 20,000 and 0 rows (26.0x and 1.0x).
 *     "batch": "Roughly 50% off"; "nobody's waiting" is its concept check's
 *     "it works wherever nobody is waiting". "retrieval" is lever 6's own
 *     exception: "if you are pasting a large document on every turn when
 *     three paragraphs would do, that is a retrieval problem rather than a
 *     prompt-length problem, and it belongs at the top of this list". Fig.
 *     14's document is drawn, not measured: the lesson gives it no size.
 *
 * Written for Drew's voice, casual and curious: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers, and one audio tag.
 */
export const script: NarrationScript = {
  id: "llm-cost",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Part 1. The price sheet ───────────────────────────────────────────
    { id: "hook", scene: true, text: "Every token a model reads, writes or thinks ends up on a bill.", pauseAfter: 0.6 },
    {
      id: "kinds",
      text: "Your prompt is what it reads. The answer is what it writes. And a reasoning model's thinking is written too, even though you never see it.",
      pauseAfter: 0.7,
    },
    { id: "ask", text: "So what does a token actually cost?" },
    {
      id: "sheet",
      scene: true,
      text: "Every big provider prices tokens the same way: five prices per million tokens, always in the same proportions.",
      pauseAfter: 0.5,
    },
    {
      id: "rows",
      text: "Input is the baseline. Output, five times that or more. Cached input, a tenth or less. Writing to the cache, a little over input. And batch, about half off.",
      pauseAfter: 1.0,
    },
    { id: "ratios", text: "The prices keep falling. The ratios hardly move.", pauseAfter: 0.8 },
    {
      id: "why",
      scene: true,
      text: "So why does output cost so much more? It's not a pricing whim. It's the computation.",
      pauseAfter: 0.5,
    },
    { id: "parallel", text: "Your prompt goes through the model all at once, in one parallel pass.", pauseAfter: 0.7 },
    {
      id: "serial",
      text: "The answer comes out one token at a time, and every token needs its own pass through the whole model.",
      pauseAfter: 0.8,
    },
    // Why a pass is the cost: it moves every weight, for eleven tokens or one. Voiced after the take.
    {
      id: "weights",
      text: "Each pass moves every weight in the model, whether it carries eleven tokens or one. So while it writes, the hardware mostly waits.",
      pauseAfter: 0.9,
    },
    { id: "gap", text: "Five times the price is a real gap in the work.", pauseAfter: 0.8 },
    { id: "cached", scene: true, text: "Cached input runs the other way.", pauseAfter: 0.5 },
    {
      id: "reuse",
      text: "Send the same fifty-thousand-token prefix every turn, and the provider can keep what it computed and just read it back.",
      pauseAfter: 0.6,
    },
    {
      id: "twentieth",
      text: "That's about a tenth of the work, and some models now charge a twentieth. On Sonnet, ten cents a turn becomes half a cent.",
      pauseAfter: 0.9,
    },
    {
      id: "prefix",
      text: "The catch: it only matches an exact prefix. Put a timestamp at the top, and one changed byte sends everything after it back to full price.",
      pauseAfter: 1.0,
    },
    { id: "market", scene: true, text: "Here's the market in October twenty twenty-six.", pauseAfter: 0.5 },
    { id: "ratio", text: "Output is five times input in eight of these ten rows, and never less.", pauseAfter: 0.8 },
    {
      id: "spread",
      text: "But the cheapest input, ten cents a million, is a hundredth of the priciest, ten dollars.",
      pauseAfter: 0.7,
    },
    { id: "choice", text: "So the model you pick usually moves the bill more than any prompt trick.", pauseAfter: 1.0 },
    {
      id: "threshold",
      text: "And half these rows hide a length threshold. Past two hundred seventy-two thousand tokens on GPT six, the whole request pays double for its input.",
      pauseAfter: 0.6,
    },
    {
      id: "oversized",
      text: "So on Sol, a three-hundred-thousand-token prompt costs a dollar twenty to send, not sixty cents.",
      pauseAfter: 0.9,
    },
    { id: "estimate-in", text: "That's the price sheet. Now, what does a real workload cost?" },

    // ── Part 2. Estimating ────────────────────────────────────────────────
    {
      id: "request",
      scene: true,
      text: "Take one support-bot request: twelve hundred tokens in, three hundred out.",
      pauseAfter: 0.5,
    },
    { id: "nothing", text: "On Sonnet, that's about half a cent. Basically nothing.", pauseAfter: 0.7 },
    {
      id: "volume",
      text: "Now serve a hundred thousand of them. Twenty-seven dollars on Haiku, twenty-seven hundred on Fable.",
      pauseAfter: 0.6,
    },
    { id: "apart", text: "Same task, same tokens, a hundred times apart.", pauseAfter: 1.0 },
    { id: "resend", scene: true, text: "Conversations are where estimates go wrong.", pauseAfter: 0.5 },
    {
      id: "stateless",
      text: "The model keeps no memory between turns, so every turn resends the whole chat so far.",
      pauseAfter: 0.7,
    },
    { id: "slice", text: "The new message is a thin slice on top of everything you've already paid for.", pauseAfter: 0.7 },
    // What the bill is: every bar, plus each reply. Voiced after the take.
    { id: "sum", text: "The bill pays for every one of these bars, plus each reply.", pauseAfter: 0.7 },
    {
      id: "turns",
      text: "On Sonnet, ten turns cost thirteen cents. Twenty, thirty-seven and a half. Forty, a dollar nineteen.",
      pauseAfter: 0.6,
    },
    { id: "triple", text: "Double the turns, and the bill roughly triples, and it keeps getting worse.", pauseAfter: 1.0 },
    {
      id: "think",
      scene: true,
      text: "Thinking tokens are the other surprise. They're billed as output.",
      pauseAfter: 0.6,
    },
    {
      id: "budget",
      text: "Keep the request and its four-hundred-token answer the same. Add eight thousand thinking tokens, and it costs eleven times as much. Twenty thousand, twenty-six times.",
      pauseAfter: 0.9,
    },
    { id: "invisible", text: "And the answer you see never got any longer.", pauseAfter: 1.0 },
    {
      id: "month",
      scene: true,
      text: "Now put a whole month together: four workloads, each with its own model and volume.",
      pauseAfter: 0.6,
    },
    { id: "guess", text: "Code review on Opus looks like the big line. [curious] It isn't.", pauseAfter: 0.6 },
    {
      id: "answer",
      text: "Document summaries on Sonnet are, at eight hundred sixty-four dollars a month, because volume and tokens multiply.",
      pauseAfter: 0.9,
    },
    { id: "total", text: "The whole month comes to about seventeen hundred and sixty dollars.", pauseAfter: 0.7 },
    { id: "control-in", text: "So once you can see the bill, how do you shrink it?" },

    // ── Part 3. Controlling it ────────────────────────────────────────────
    { id: "levers", scene: true, text: "Six levers, in the order they usually pay off.", pauseAfter: 0.5 },
    { id: "route", text: "First, route each task to the cheapest model that passes.", pauseAfter: 0.5 },
    {
      id: "route-cost",
      text: "Fifty thousand classifications a day cost four thousand and fifty dollars a month on Opus, and a hundred and one on Haiku.",
      pauseAfter: 0.9,
    },
    {
      id: "cache",
      text: "Second, cache the stable prefix: whatever never changes goes first. That forty-turn chat drops from a dollar nineteen to twenty-six cents.",
      pauseAfter: 0.6,
    },
    // How that squares with a model that keeps no memory. Voiced after the take.
    { id: "cache-resend", text: "You still resend it all. The provider just recognizes that part and reads it back.", pauseAfter: 0.8 },
    { id: "output", text: "Third, cut output, not input. Each output token you save is worth five input ones.", pauseAfter: 0.9 },
    { id: "effort", text: "Fourth, turn reasoning effort, the thinking budget, down to the lowest level that passes.", pauseAfter: 0.9 },
    { id: "batch", text: "Fifth, batch anything nobody's waiting on, at about half off.", pauseAfter: 0.6 },
    { id: "prompt", text: "And only then, trim the prompt.", pauseAfter: 0.7 },
    // Lever 6's exception, the lesson's own. Voiced after the take.
    {
      id: "retrieval",
      text: "Unless you're pasting a whole document every turn when three paragraphs would do. That's a retrieval problem, and it goes straight to the top.",
      pauseAfter: 1.0,
    },
    { id: "passes", text: "Notice the word that came up twice: passes.", pauseAfter: 0.7 },
    { id: "next", text: "Passes what? That takes a test, and that's next: measuring whether a model is good enough." },
  ],
};
