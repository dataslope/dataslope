import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Why a chat's bill grows faster than the chat" (16:9), a
 * deep dive in Unit 4 of How Large Language Models Work. It is embedded at
 * content/courses/how-llms-work/estimating-cost.mdx, "A conversation, with
 * the resend" (and belongs beside token-counts-in-practice.mdx, "Estimating a
 * conversation"). The unit video states that doubling the turns roughly
 * triples the bill; this one shows why, step by step:
 *
 *   1. The puzzle ("hook", "why"): two chats on Sonnet, one twice as long as
 *      the other, and a bill that grows by more than twice.
 *   2. The staircase ("memory" to "forty"): the model keeps no memory, so
 *      each turn resends the whole chat. Turn one, turn two read up close,
 *      then the camera pulls back to forty turns of stacked bars: what was
 *      sent before in one tone, what is new this turn in another.
 *   3. The area ("area" to "four"): the bill pays for every bar, so it is the
 *      area under the staircase. Cut in two: a rectangle (the system prompt,
 *      the same every turn) and a triangle (the chat, resent). Take twenty
 *      turns and double them: the rectangle doubles, the triangle
 *      quadruples, four copies of the old one tiling the new.
 *   4. The bills ("bills" to "toward"): 10, 20 and 40 turns, each bill split
 *      the same way, and what each doubling does: between twice (all
 *      rectangle and replies) and four times (all triangle), closing in on
 *      four.
 *   5. The cache ("cache" to "stable"): what was sent last turn, system
 *      prompt included, billed at a twentieth; the staircase flattens to its
 *      new slices. The cache matches a prefix, so what never changes goes
 *      first.
 *   6. What to do ("fresh" to "end"): start a fresh chat. One staircase
 *      against eight short ones, priced without the cache and with it, and
 *      the takeaway.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Nothing is looked up or typed: measure.py runs estimating-cost's own
 * blocks (checked against the site's printed output), and every number on
 * screen is a call to its `conversation_cost`, with its own defaults, on
 * Sonnet: the same conversation and the same function as the unit video
 * (llm-cost), so every number both videos show is identical. data.ts reads
 * measurements.json.
 *   - "first", "second", "forty": the function's defaults, a 2,000-token
 *     system prompt, 150-token messages and 400-token replies. Turn one sends
 *     2,150 tokens; turn two resends those and adds the reply and the next
 *     message, 550 new; turn forty sends 23,600 (the unit's Fig. 8 too).
 *   - "area", "split", "triangle": the bill is the sum of every turn's input
 *     at Sonnet's $2.00 a million plus each 400-token reply at $10.00. It
 *     splits, exactly, into the system prompt sent every turn and the
 *     replies (each $0.004 a turn, a straight line) and the chat resent (the
 *     triangle). measure.py asserts the split adds back to the lesson's total.
 *   - "double", "four": the straight-line part doubles with the turns; the
 *     triangle's part grows 4.1 times from 10 to 20 turns, 4.05 from 20 to
 *     40, 4.02 from 40 to 80. On screen the four copies are drawn as exact
 *     halves of the triangle; the staircase follows its slope to within one
 *     step.
 *   - "bills", "ratios", "eighty": the page's own table, $0.1325, $0.3750,
 *     $1.1900 ("thirteen cents", "thirty-seven and a half", "a dollar
 *     nineteen"); x2.83 and x3.17 ("two point eight", "three point two").
 *     Eighty turns is `conversation_cost("sonnet", 80)`, $4.14, x3.48 ("three
 *     and a half"): the lesson's function, past the lesson's table.
 *   - "ends": the straight-line part (system prompt and replies) doubles
 *     exactly with the turns; the triangle's part grows about four times.
 *   - "toward": the triangle is 40% of the 10-turn bill, 57% of the 20 and
 *     73% of the 40.
 *   - "cache", "twentieth", "flat": `cached=True`. Everything sent the turn
 *     before, system prompt included, is read back at Sonnet's cached rate,
 *     $0.10 a million, a twentieth of input (pricing-structure says so in
 *     words; measure.py checks both; other tiers run from a tenth to a
 *     fortieth, hence "on Sonnet"); only the new 550 pay in full. Forty
 *     turns, $1.1900 to $0.2563 ("twenty-six cents"), 78% less, the page's
 *     table: the whole bill, replies included. Fig. 6 draws each turn's input
 *     cost in cents, so its bars are Fig. 3's scaled by the price until the
 *     cache shrinks the repeat.
 *   - "prefix", "stable": pricing-structure, caches "match on an exact
 *     prefix. A single changed byte anywhere in the prefix invalidates
 *     everything after it"; controlling-cost, "Put stable content first,
 *     volatile content last."
 *   - "nocache": `conversation_cost("sonnet", 5)` eight times, $0.4200,
 *     against the 40-turn $1.1900: the lesson's own "a 40-turn conversation
 *     can cost more than eight separate 5-turn ones covering the same
 *     ground", which is its uncached table.
 *   - "withcache": the same pair with `cached=True`, $0.2391 ("twenty-four
 *     cents") against $0.2563 ("twenty-six"), 7% apart: the cache the scene
 *     before recommends closes most of the gap. What is left is
 *     token-counts-in-practice's "a cost decision as well as an accuracy
 *     one", and the accuracy is context-windows' "lost in the middle":
 *     information in the middle of a long context "is recalled noticeably
 *     less well".
 *
 * Written for Drew: short spoken sentences, numbers as they are said, no
 * symbols or parentheses, contractions, and one audio tag.
 */
export const script: NarrationScript = {
  id: "llm-conversation-cost",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── 1. The puzzle ─────────────────────────────────────────────────────
    { id: "hook", scene: true, text: "Make a chat with a model twice as long, and its bill roughly triples.", pauseAfter: 0.6 },
    { id: "why", text: "[curious] So why doesn't it just double?", pauseAfter: 0.7 },

    // ── 2. The staircase ──────────────────────────────────────────────────
    {
      id: "memory",
      scene: true,
      text: "Because the model keeps no memory between turns. So every turn, the app sends the whole chat again, from the top.",
      pauseAfter: 0.8,
    },
    { id: "first", text: "Turn one sends a two-thousand-token system prompt and your first message.", pauseAfter: 1.0 },
    {
      id: "second",
      text: "Turn two sends all of that again, plus the reply and your next message. That's five hundred fifty new tokens.",
      pauseAfter: 0.8,
    },
    { id: "climb", text: "Every turn resends the last one and adds a slice, so the requests climb like a staircase.", pauseAfter: 0.6 },
    { id: "forty", text: "By turn forty, one request is twenty-three thousand six hundred tokens.", pauseAfter: 0.9 },

    // ── 3. The area ───────────────────────────────────────────────────────
    {
      id: "area",
      scene: true,
      text: "You pay for every one of those bars. So the bill is the area under the staircase, plus the replies.",
      pauseAfter: 0.9,
    },
    { id: "split", text: "Cut that area in two. The bottom is a rectangle: the system prompt, the same every turn.", pauseAfter: 0.6 },
    { id: "triangle", text: "On top sits a triangle: the chat itself, sent again and again.", pauseAfter: 0.9 },
    { id: "double", text: "Take twenty turns, and double them.", pauseAfter: 0.6 },
    { id: "twice", text: "The rectangle just gets twice as long.", pauseAfter: 0.6 },
    {
      id: "four",
      text: "But the triangle gets twice as long and twice as tall, so four of the old one fit inside.",
      pauseAfter: 1.0,
    },

    // ── 4. The bills ──────────────────────────────────────────────────────
    {
      id: "bills",
      scene: true,
      text: "On Sonnet, ten turns cost thirteen cents. Twenty, thirty-seven and a half. Forty, a dollar nineteen.",
      pauseAfter: 0.6,
    },
    { id: "ratios", text: "That's two point eight times, then three point two.", pauseAfter: 0.6 },
    { id: "eighty", text: "Eighty turns would be three and a half.", pauseAfter: 0.8 },
    { id: "ends", text: "A bill that was all rectangle and replies would just double. All triangle, it would quadruple.", pauseAfter: 0.7 },
    {
      id: "toward",
      text: "The longer the chat, the more of the bill is triangle, so each doubling creeps toward four times.",
      pauseAfter: 1.0,
    },

    // ── 5. The cache ──────────────────────────────────────────────────────
    { id: "cache", scene: true, text: "Prompt caching goes after the repeat. Here are the same forty turns, in cents.", pauseAfter: 0.7 },
    {
      id: "twentieth",
      text: "You still send it all, but whatever you sent last turn, system prompt included, is read back, on Sonnet, at a twentieth of the price.",
      pauseAfter: 0.8,
    },
    {
      id: "flat",
      text: "Only the new slice pays in full, so the staircase flattens. Forty turns drop from a dollar nineteen to twenty-six cents.",
      pauseAfter: 0.9,
    },
    { id: "prefix", text: "The cache matches a request from its first token, up to the first thing that changed.", pauseAfter: 0.6 },
    { id: "stable", text: "So put whatever never changes first, where the cache can match it.", pauseAfter: 0.8 },

    // ── 6. What to do ─────────────────────────────────────────────────────
    {
      id: "fresh",
      scene: true,
      text: "And when a chat runs long, start a fresh one.",
      pauseAfter: 0.6,
    },
    {
      id: "nocache",
      text: "Without a cache, eight five-turn chats cost forty-two cents. One forty-turn chat, a dollar nineteen.",
      pauseAfter: 0.8,
    },
    {
      id: "withcache",
      text: "With the cache, it's twenty-four cents against twenty-six. So the bigger reason to start fresh is accuracy: a model recalls the middle of a long chat less well.",
      pauseAfter: 0.9,
    },
    { id: "end", text: "A chat grows by one slice a turn. Its bill grows by the whole chat." },
  ],
};
