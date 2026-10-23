import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";
import { INTRO_LEAD_IN } from "../../editorial/intro.ts";

/**
 * Narration for "Choosing the next token" (16:9), Unit 3 of How Large Language
 * Models Work. One argument in four parts, after the unit's four lessons in
 * content/courses/how-llms-work/:
 *
 *   1. Sampling ("hook" to "hall-in"), after sampling.mdx: the scores the last
 *      layer hands over (Unit 2 ends there, so the video opens on it), softmax,
 *      temperature, top-p and the nucleus that adapts, and randomness that
 *      compounds over an answer. Kept brisk: the standalone LlmTemperature
 *      video (Hope) teaches temperature at length on the same example, and its
 *      scenes are adapted here (ScoreScene, TempScene, TopPScene).
 *   2. Why models hallucinate ("plausible" to "ctx-in"), after
 *      why-models-hallucinate.mdx: the one-sentence explanation, the grounded
 *      and the invented continuation, no "I do not know" signal, where the
 *      risk concentrates, why asking it to say so fails, and what reduces it.
 *   3. Context windows ("window" to "reason-in"), after context-windows.mdx:
 *      one budget for everything, a hard edge, what filling it costs in money
 *      and in recall, and the square that made long context hard.
 *   4. Reasoning models ("think" to "next"), after reasoning-models.mdx:
 *      thinking tokens, what training changed, steep diminishing returns,
 *      where it helps, and that every thinking token is billed. It ends on
 *      Unit 4's question, what a token costs.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. Every number, token and string on screen is computed by measure.py
 * (NumPy 2.4.6, tiktoken 0.12.0, the site's Pyodide versions), which re-runs
 * the lessons' own code blocks and asserts each against the output the page
 * prints (lib/generated/block-outputs.json); measurements.json is its output
 * and data.ts reads it.
 *   - sampling, "Softmax turns scores into probabilities": " cat", " dog",
 *     " bird", " rock" score 3.2, 2.1, 1.5 and -0.4 (the lesson's illustrative
 *     scores, labelled so on screen); softmax gives 64.8%, 21.6%, 11.8% and
 *     1.77% ("sixty-five percent", "under two"), and "A 1.1 logit gap became a
 *     3.0 x probability ratio" ("three times dog's share"). The sentence they
 *     continue, "Her new pet is a", is LlmTemperature's, chosen so the
 *     lesson's four tokens are its candidates. The three runs of the picker
 *     ("different answers": dog, cat, cat) are the first three of
 *     LlmTemperature's twenty seeded draws at T = 1 (seed 72, the most typical
 *     of seeds 0 to 99), re-made in measure.py and asserted equal.
 *   - "Temperature reshapes the distribution": dividing by a positive T never
 *     reorders the tokens (asserted from 0.01 to 2.00); T = 0.2 gives cat
 *     99.57% ("over ninety-nine"); T = 0 is argmax (greedy decoding); T = 1.5
 *     gives rock 4.79% ("almost five"). 0.2, 0.7 and 1.0 match the page's
 *     printed rows; 1.5 is LlmTemperature's stop, not one the lesson prints.
 *   - "Top-p (nucleus) sampling", the lesson's top_p at p = 0.9: after
 *     T = 1.5, cat 52.8%, with dog 78.2%, with bird 95.2%, so rock is dropped.
 *     Its own block: the confident context's nucleus holds 1 token (cat alone
 *     is 95.6%), the uncertain one all 6 ("torn between six, all six stay").
 *   - "Watch randomness accumulate" (seed 0): the five runs baaaccbc,
 *     bccacaca, cbabaabb, bbccbbbb, acbabcca, as the page prints them. The
 *     compounding over a real answer is the lesson's prose ("agree for a
 *     sentence and then separate completely"), drawn as a diagram, not data.
 *   - why-models-hallucinate: the one-sentence explanation is the lesson's
 *     blockquote; "The capital of France is Paris" and "A 2019 study on this
 *     by Chen et al. found a 23% improvement" are its first block's two
 *     continuations ("not in the data at all"); "There is no confidence tag
 *     attached to a fact"; its risk score block, run as written: Capital of
 *     France 0 of 5, Population of a small town 2, Page number of a quotation
 *     3, Name of the study that proved X 4 ("Four"); hedges that are
 *     "stylistic, not diagnostic"; and the four fixes of "What actually
 *     reduces it" in its order, NOT_FOUND being its own example.
 *   - context-windows: the budget block, run as written: 1,500 + 180,000 +
 *     12,000 + 200 = 193,700 of a 200,000 window, leaving 6,300 ("six
 *     thousand three hundred"); the hard edge and the silent trimming are the
 *     lesson's; "a 500,000-token document in a ten-turn conversation is five
 *     million billed input tokens unless caching intervenes" ("unless a cache
 *     steps in"); the "lost in the middle" block's recall
 *     by position (0.97 at the start, 0.68 halfway, 0.96 at the end),
 *     stylized as the lesson says and labelled so; "a bigger window is
 *     permission, not a recommendation"; 8,000 to 1,000,000 tokens is 125
 *     times the length and 15,625 times the naive attention work ("over
 *     fifteen thousand", where the lesson rounds to "roughly 15,000").
 *   - reasoning-models: the thinking transcript is its first block's, and its
 *     arithmetic is checked in measure.py (240 is simple interest; 1,259.71
 *     is compound). The page estimates its length as words times 1.3 (~72
 *     thinking, ~9 answer); the video shows o200k_base's real count of the
 *     working and of the answer, 106 and 13 ("read thirteen tokens and pay
 *     output prices for a hundred and nineteen"); both put thinking near
 *     eight times the answer. The second block's stylized curve (accuracy
 *     0.42 with no thinking to 0.79 at 8,000 and 16,000 tokens), labelled
 *     so: the first 500 tokens buy 0.24 of the 0.37 gain, 65% ("nearly two
 *     thirds"), and the last doubling buys nothing ("past eight thousand").
 *     Where it helps, the "overthinking" failure ("talk it out of a right
 *     first answer"), that thinking tokens are billed at the output rate
 *     whether shown or not, and "the lowest setting that passes your
 *     evaluation" are the lesson's.
 *
 * Written for Drew's voice, casual and curious: short spoken sentences, no
 * symbols or parentheses, numbers as words, contractions, questions the next
 * sentence answers, an ellipsis where a speaker would hold, and one audio tag.
 */
export const script: NarrationScript = {
  id: "llm-generation",
  voice: "drew",
  // The series intro plays first; its lead-in lives in editorial/intro.ts.
  leadIn: INTRO_LEAD_IN,
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  // The three takes as recorded: each part-sized take starts where `take` says,
  // and the closing scene rides with the take before it.
  takeChars: 2100,
  beats: [
    // ── Part 1. Sampling ──────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "A model's last layer gives every token in its vocabulary a score, called a logit. Something still has to pick one.",
      pauseAfter: 0.6,
    },
    {
      id: "logits",
      text: "Say the sentence so far is, her new pet is a. Cat scores three point two... and rock scores minus zero point four.",
      pauseAfter: 0.5,
    },
    {
      id: "softmax",
      text: "Softmax turns scores into probabilities. It raises e to each score, then divides by the total.",
      pauseAfter: 0.7,
    },
    {
      id: "share",
      text: "Cat gets sixty-five percent, three times dog's share from a gap of one point one. Rock gets under two.",
      pauseAfter: 0.9,
    },
    {
      id: "picker",
      text: "And the picking isn't done by the model. It's a few lines of code with a couple of settings... and it's why one prompt can give different answers.",
      // Holds the three draws, the first of them the 21.6% token, before the cut.
      pauseAfter: 1.4,
    },
    {
      id: "divide",
      scene: true,
      text: "Temperature divides every score before the softmax. The order never changes... only the shape does.",
      pauseAfter: 0.8,
    },
    { id: "low", text: "Below one, the gaps grow. At zero point two, cat takes over ninety-nine percent.", pauseAfter: 0.5 },
    { id: "greedy", text: "At zero, it takes the top token every time. That's greedy decoding.", pauseAfter: 0.7 },
    {
      id: "high",
      text: "Above one, the gaps shrink. At one point five, rock climbs to almost five percent.",
      pauseAfter: 0.9,
    },
    {
      id: "topp",
      scene: true,
      text: "Top p trims the tail before the draw. Keep the likeliest tokens until they cover ninety percent, and drop the rest.",
      pauseAfter: 0.6,
    },
    { id: "topp-cut", text: "At one point five, that keeps cat, dog and bird. Rock can't be drawn at all.", pauseAfter: 0.7 },
    {
      id: "adapt",
      text: "And the cut adapts. When the model's sure, one token covers ninety percent on its own. When it's torn between six, all six stay in.",
      pauseAfter: 0.9,
    },
    {
      id: "runs",
      scene: true,
      text: "Still, every pick is a draw. Five runs over the same three close scores give five different strings.",
      pauseAfter: 0.7,
    },
    {
      id: "compound",
      text: "In a real model, each pick becomes context for the next, so two answers can agree for a sentence and then split completely.",
      pauseAfter: 0.8,
    },
    { id: "hall-in", text: "And the sampler always picks something, even when nothing true is on the list." },

    // ── Part 2. Why models hallucinate ─────────────────────────────────────
    {
      id: "plausible",
      scene: true,
      take: true,
      text: "That explains hallucination. The model writes plausible continuations, and a plausible continuation of a question is an answer.",
      pauseAfter: 0.6,
    },
    { id: "check", text: "Whether a real answer exists isn't something it can check.", pauseAfter: 0.9 },
    { id: "paris", text: "The capital of France is... Paris. It's seen that millions of times.", pauseAfter: 0.5 },
    {
      id: "chen",
      text: "A twenty nineteen study on this by... Chen et al. found a twenty-three percent improvement. Just as fluent, and that study was never in its data.",
      pauseAfter: 0.9,
    },
    {
      id: "shape",
      text: "It's read millions of citations, so it nails the shape: names, a year, a journal. But nothing marks a fact as, I actually know this one.",
      pauseAfter: 0.9,
    },
    {
      id: "risk",
      scene: true,
      text: "The risk isn't spread evenly, though. It climbs when the fact is rare, specific, or made of several parts, when it's past the training cutoff... and when the question assumes there's an answer.",
      pauseAfter: 0.6,
    },
    {
      id: "score",
      text: "The capital of France scores zero out of five. The name of the study that proved this? Four.",
      pauseAfter: 1.0,
    },
    { id: "hedge", scene: true, text: "[curious] So why not just say, tell me if you don't know?", pauseAfter: 0.5 },
    {
      id: "hedge-why",
      text: "You'll get more hedges... but they land on right and wrong answers alike, because nothing inside knows which ones are wrong.",
      pauseAfter: 0.9,
    },
    {
      id: "works",
      text: "What works is changing the task. Paste in the source. Ask for something you can check. Constrain the shape. And give it an exit, like, reply not found.",
      // Time to read the lesson's reason under each fix.
      pauseAfter: 1.0,
    },
    { id: "exit", text: "It's picking a continuation either way, so hand it an easy, honest one.", pauseAfter: 0.7 },
    {
      id: "ctx-in",
      text: "Pasting in the source means filling the context window. And the window has limits of its own.",
    },

    // ── Part 3. Context windows ────────────────────────────────────────────
    {
      id: "window",
      scene: true,
      text: "The context window is everything the model reads in one request: the system prompt, the documents, the history, the question... and the answer it writes, all from one budget.",
      pauseAfter: 0.7,
    },
    {
      id: "fill",
      text: "In a two hundred thousand token window, one long document leaves just six thousand three hundred tokens to answer in.",
      pauseAfter: 0.9,
    },
    {
      id: "edge",
      text: "And past the edge, nothing fades. It's simply not there. Apps quietly trim old turns to fit, which is how a long chat forgets its own beginning.",
      pauseAfter: 0.9,
    },
    {
      id: "costs",
      scene: true,
      take: true,
      text: "Filling it isn't free, either. You pay for every input token, every turn. In a million-token window, a five hundred thousand token document resent over ten turns is five million tokens billed, unless a cache steps in.",
      pauseAfter: 0.8,
    },
    {
      id: "middle",
      scene: true,
      text: "And the model doesn't read it all equally well. Facts at the start and the end come back reliably. The middle sags. It's called lost in the middle.",
      pauseAfter: 0.8,
    },
    {
      id: "permission",
      text: "So a bigger window is permission, not a recommendation. Paste the three chapters that matter, and put the key facts first or last.",
      pauseAfter: 0.9,
    },
    {
      id: "square",
      scene: true,
      text: "Why did long context take years to build? Every token attends to every other token, so the work grows with the square of the length.",
      pauseAfter: 0.6,
    },
    {
      id: "square-num",
      text: "From eight thousand tokens to a million is a hundred and twenty-five times the text... and over fifteen thousand times the work.",
      pauseAfter: 0.9,
    },
    { id: "reason-in", text: "Reasoning models spend tokens on purpose." },

    // ── Part 4. Reasoning models ───────────────────────────────────────────
    {
      id: "think",
      scene: true,
      text: "A reasoning model writes out its working before it answers: attempts, checks, corrections. Those are thinking tokens.",
      pauseAfter: 0.8,
    },
    { id: "same", text: "It's the same next-token machine, with nothing new inside. What changed is the training.", pauseAfter: 0.6 },
    {
      id: "rl",
      text: "It's rewarded for answers that can be checked, like math with a known result, or code that passes its tests. So habits like checking its own work get reinforced.",
      pauseAfter: 0.6,
    },
    { id: "slip", text: "Here it tries simple interest, catches the slip, and redoes it as compound growth.", pauseAfter: 0.8 },
    {
      id: "returns",
      scene: true,
      text: "More thinking helps, up to a point. The first five hundred tokens buy nearly two thirds of the gain.",
      pauseAfter: 0.7,
    },
    { id: "flat", text: "Past eight thousand, doubling the budget buys nothing at all.", pauseAfter: 0.8 },
    {
      id: "where",
      text: "It pays off where steps can be checked, like math, code and planning. But no amount of thinking recalls a fact it never had.",
      pauseAfter: 0.8,
    },
    {
      id: "overthink",
      text: "On an easy problem, more thinking can even talk it out of a right answer.",
      pauseAfter: 1.0,
    },
    {
      id: "bill",
      scene: true,
      text: "And thinking tokens are output tokens, billed whether you see them or not. In that answer, you'd read thirteen tokens and pay output prices for a hundred and nineteen.",
      pauseAfter: 0.8,
    },
    {
      id: "effort",
      text: "Most providers give you a reasoning effort setting. Pick the lowest effort that passes your own tests, on purpose.",
      pauseAfter: 0.7,
    },
    {
      id: "next",
      text: "Every token the model reads, writes or thinks ends up on the bill. So what does a token actually cost?",
    },
  ],
};
