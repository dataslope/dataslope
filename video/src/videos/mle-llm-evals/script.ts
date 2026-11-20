import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Evaluating LLM systems" (16:9), Part 10 and the last of the
 * Machine Learning Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "10, Evaluating LLM systems"), after
 * content/interview/machine-learning-engineer/llm-systems-and-evals.mdx. It
 * answers the page's six evaluation, agent and judgment questions, every one
 * worked through, numbered aloud and read in the page's words:
 *
 *   1. "How do you evaluate an LLM application?" ("q1").
 *   2. "When can you trust an LLM as a judge?" ("q2"), with the page's third
 *      concept check (a judge that flips with the order) as its worked case.
 *   3. "How do you evaluate a RAG system?" ("q3"), with the page's fourth
 *      concept check (recall at five of 0.45) as its follow-up.
 *   4. "What is an agent, and how does tool calling work?" ("q4").
 *   5. "How do you evaluate an agent?" ("q5").
 *   6. "When should you not use an LLM?" ("q6").
 *
 * No quick round: the page has six questions and each has a mechanism worth
 * drawing, so the budget goes to six short deep dives. The order is the
 * page's, which is already one argument: the layers (1), the judge the
 * layers lean on (2), the two halves of a retrieval system (3), the loop an
 * agent adds (4) and how to grade it (5), and when to use none of it (6),
 * which closes on question two again (the labeler is a judge).
 *
 * One running system, the plan's "design an assistant over our documents"
 * (the page's intro): an assistant that answers from a company's documents
 * and can file a support ticket. It gives each question its object: the
 * judge grades its answers, retrieval is its first half, filing the ticket is
 * its tool, and a ticket filed is the outcome its agent is graded on.
 *
 * Opening and close. It opens on Part 9's bridge (fast and cheap is not
 * enough if you cannot tell whether the answers are good) by asking exactly
 * that of the assistant, never "in the last video". The series ends here, so
 * there is no "Next:" line: it closes on the question the track's rounds
 * share, and on the practice.
 *
 * Overlap. The Data Scientist series' ds-llm-evaluation answers how to
 * measure an LLM feature (rubric, sampled traffic, expert labels, an
 * interval), how large an eval set must be (72% to 88% on a hundred items,
 * McNemar on paired items), a judge's kappa worked out (0.44), an A B test,
 * the Rogan-Gladen correction and benchmark contamination. None of those
 * worked examples is used here. Question one argues from the engineer's
 * side (scoring matched to the output, evals as CI that block regressions,
 * offline and online agreeing); question two works the page's position-bias
 * concept check instead of kappa, which it names and leaves to the Data
 * Scientist track, as the page does. Part 6 answers what RAG is and when to
 * pick it over fine-tuning; here it is only how to grade it.
 *
 * On screen, beat by beat (for phase 2; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap, green the right
 * answer, yellow what the narration points at, blue data. The pelican hero
 * sits right of the opening; three spots (a balance scale, a wrench, a short
 * chain) appear where named.
 *   hook: the assistant as three outlined boxes, "Documents" → "Assistant"
 *     → "File a ticket", drawn as named; a user's question coming in; the
 *     pelican. On "fast now, and cheap", two small green ticks (Part 9's two
 *     levers met); on "Is it any good?", a yellow question mark over the
 *     answer.
 *   hook-hard: two small panels with a hairline between. "Classifier": one
 *     input, one label, a tick. "Assistant": one question and three
 *     different answers, two of them good (green) and one wrong (red).
 *   q1: question card; an empty ladder of five numbered rungs, "cheap" at
 *     the bottom and "expensive" at the top. Only the rung being said keeps
 *     its chips and notes: when the next rung inks in, the one before fades
 *     back to its title (rung 2 keeps its judge chip, which q1-human points
 *     back at), so the finished ladder is five titles with
 *     q1-agree's arrow and q1-bench's chip beside it, not twenty-odd labels
 *     on one page.
 *   q1-set: rung 1, "Offline eval set: realistic inputs, a reference or a
 *     rubric"; "100–200 well-chosen > thousands synthetic" under it;
 *     "grows from production failures" with a small arrow feeding back in.
 *   q1-score: rung 2, "Scoring matched to the task", with three chips lit as
 *     said: "exact match / execution" (JSON, SQL, code), "retrieval
 *     metrics", "rubric LLM judge".
 *   q1-ours: the assistant's two outputs under rung 2, "ticket fields" led
 *     to the exact-match chip and "policy explanation" to the judge chip,
 *     each lit on its words.
 *   q1-human: rung 3, "Human review of a sample", an arrow from it to the
 *     judge chip on "check the judge".
 *   q1-ci: rung 4, "Evals as CI": three change chips (prompt, model,
 *     retrieval) each running the suite; one red regression, a bar across
 *     it on "block regressions".
 *   q1-online: rung 5, "Online: A/B on user outcomes", with three guardrail
 *     chips, latency, cost, refusal rate.
 *   q1-agree: a short arrow between rung 1 and rung 5, "wins offline, loses
 *     online" in red, and "Fix the eval set" in green.
 *   q1-bench: a "Public benchmarks" chip set apart from the ladder, in grey,
 *     with "saturated" and "may have leaked into training" under it.
 *   q2: question card; the balance-scale spot. q2-bias: three rows lit as
 *     named, "Position: the first answer shown", "Verbosity: the longer answer",
 *     "Self-enhancement: its own answers" with "inconclusive" beside it in
 *     grey (the page, after #746: the first two found clearly, the third
 *     inconclusive), with the source line "Zheng et al., NeurIPS 2023
 *     Datasets and Benchmarks".
 *   q2-case: two bars, both 100% wide, split by winner, the first-shown
 *     answer named on each bar's left. "A shown first": A
 *     70, B 30. "B shown first": B 65, A 35 (results.json position). A is
 *     blue and B a light blue in both bars (two data series, so neither red
 *     nor green, and not yellow, which means "pointed at"), with each bar's
 *     first-shown segment underlined in yellow on "first", so the eye sees
 *     the first-shown share stay big while the winner changes.
 *   q2-read: "First shown wins ~2/3" on "two thirds" (70% and 65%, mean
 *     67.5%); then "At least 35% of verdicts flipped" in red, with the
 *     arithmetic as a small line under it, "70% − 35% = 35%" (A's win rate
 *     shown first, less A's shown second).
 *   q2-fix: three lines in green, each inked on its words: "Score both
 *     orders; count a win only when they agree", "A pass/fail rubric, not 1
 *     to 10", "A judge from another model family".
 *   q2-cal: "Calibrate against experts: chance-corrected agreement (Cohen's
 *     kappa)", and under it "Worked through on the Data Scientist track" in
 *     grey.
 *   q2-again: the judge chip relabelled "new model / new rubric" with a
 *     yellow "recalibrate".
 *   q3: question card; the assistant split into two outlined halves,
 *     "Retrieval" and "Generation", with a vertical hairline between.
 *   q3-retrieval: under Retrieval, "recall@k: did the right documents make
 *     the top k?" and "MRR: how high did the first relevant one rank?", each
 *     lit on its words.
 *   q3-example: three queries as rows of five ranked slots, one right
 *     document each, in green at rank 1, at rank 3, and missing (the third
 *     row empty of green, "nowhere"); beside them, "recall@5 = 2/3" and "MRR =
 *     (1 + 1/3 + 0) / 3 = 0.44" (results.json rag), inked as said.
 *   q3-generation: under Generation, "faithfulness", "answer relevance",
 *     "citation accuracy", each lit as said.
 *   q3-faith: a claim with a tick for "true" and a red cross for "not in the
 *     passages": "Fails faithfulness"; then "you can't check it" in grey.
 *   q3-follow: "recall@5 = 0.45" (the page's concept check) in red on the
 *     Retrieval half; "Rewrite the prompt" struck in red; "Better chunking,
 *     hybrid keyword search, a reranker" in green on the Retrieval half;
 *     "55% of the time the passage never arrives" (results.json
 *     recallFollow).
 *   q3-middle: a long context as a bar, the start and end in full blue, the
 *     middle paler blue, "Lost in the middle (Liu et al., TACL 2024)"; "Top 50"
 *     struck in red, "a few well-ranked" in green.
 *   q4: question card; the loop drawn as it is said: Model → "tool call:
 *     name + JSON arguments" → Application runs it → result → back into the
 *     context. The wrench spot by the application box.
 *   q4-loop: the loop's arrow lit going round, a counter of steps; "MCP: one
 *     integration, many clients" with one tool box joined to three client
 *     boxes.
 *   q4-design: four chips around the loop, inked on their words: "step and
 *     cost budget", "timeouts and retries", "permissions scoped to the
 *     user", "a trace of every step".
 *   q4-idem: "file ticket" called twice by a retry; one ticket results,
 *     green, "Idempotent".
 *   q4-inject: the loop's result box lit as what a tool brings back; a
 *     retrieved page's injected instruction in red, "Untrusted input"; and
 *     "No damaging tool without a confirmation" in green.
 *   q4-compound: a chain of ten drawn links (the chain spot beside it),
 *     each "95%", the product "≈ 60%" at the end in red (results.json
 *     chain).
 *   q4-fewer: two shorter rows beneath it: ten links at "99%" → "90%", and
 *     five links at "95%" → "77%", both green; "Fewer, more reliable steps"
 *     as the line under them.
 *   q5: question card; three outcome checks as rows with ticks, "ticket
 *     filed", "tests pass", "database in the expected state", each on its
 *     words. q5-code: "checked with code, not a judge" under them on
 *     "code".
 *   q5-traj: the agent's steps as a row of chips (tool, arguments, steps,
 *     cost), and one trajectory that reaches the green outcome through a red
 *     step ("a path you'd never allow"), on "never".
 *   q5-repeat: four attempts at one task as four rows; "pass@k: at least one
 *     succeeds" and "pass^k: all k succeed" set out as two definitions, the
 *     source "Yao et al., τ-bench, 2024".
 *   q5-numbers: two curves over k = 1 to 8 (results.json passK), pass@k in
 *     blue rising to the top and pass^k in ink falling, both from 80% at
 *     k = 1; at k = 4, the two points ringed in yellow as said, "99.8%" and
 *     "41%" (pass@k reaches 99.999% by k = 7: label it "≈100%", never
 *     "100%").
 *   q5-which: the label "Customer-facing: pass^k" in green beside the
 *     pass^k curve, which stays ink (a falling curve drawn green would read
 *     as a good result); its k = 8 point ringed in yellow, "17%", on
 *     "seventeen".
 *   q6: question card; "a smaller model or a rule" as the headline's answer.
 *   q6-list: four rows, each inked on its words: "Tabular prediction",
 *     "Strict latency or cost budget", "Calibrated probabilities, or
 *     explanations a regulator accepts", "A regular expression solves it".
 *   q6-middle: a pipeline of outlined boxes: "LLM labels data" → "train a
 *     small, fast classifier" → "serve it"; "LLM: once per label" under the
 *     first box and "classifier: every request" under the last, on "once
 *     per label".
 *   q6-check: a box "check against a human-labeled sample" drops in before
 *     training, yellow, with a small link back to Question 2's balance.
 *   q6-why: the line "Shipped, not only prototyped" as a line of its own.
 *   close: the pelican returns; the two questions as the headline in the
 *     serif, inked one after the other, "Will it hold up on data it hasn't
 *     seen?" and "How would you know?".
 *   close-practice: "Concept checks on every topic page" and "110
 *     multiple-choice questions" (results.json practice) as two short lines.
 *     No NextLine: the series ends here.
 *
 * The five "-in" beats ("q2-in" to "q6-in") are one-line turns spoken over
 * the finished figure, as the README's transitions are; each names what the
 * next question is for, and nothing new draws on them except where noted:
 * "q2-in" lights the judge chip on the ladder, and "q4-in" the "File a
 * ticket" box of the hook's diagram, drawn small in the corner.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a
 * cue whose word disappears throws in the Studio rather than silently
 * drifting.
 *
 * Facts. check.mjs (no runtime needed: arithmetic and counts) computes every
 * number into results.json, which data.ts reads, and fails if the page stops
 * saying what the narration quotes or the narration stops matching a number:
 *   - hook: the assistant is the page's own design prompt ("design an
 *     assistant over our documents"), with a ticket tool from its agent
 *     answers ("did the ticket get filed?").
 *   - q1: the five layers, "A hundred or two well-chosen cases beat
 *     thousands of synthetic ones", "grow the set from real production
 *     failures", the scoring list, "check the automated judge", "rerun the
 *     suite on every prompt, model, or retrieval change, and block
 *     regressions", the online guardrails, and public benchmarks
 *     ("saturated", "may have leaked into training data"): the page. "The
 *     layers have to agree" is the page's own question-zero item
 *     ("connecting offline scores to online outcomes") stated as the check
 *     an interviewer asks next; the fix is the video's reasoning.
 *   - q1-ours: the page's scoring rule (exact match for structured output,
 *     a rubric judge for open-ended text) applied to the assistant's two
 *     outputs.
 *   - q2: "Only after you have measured it", the three biases Zheng et al.
 *     tested, the first two found clearly and the third inconclusive,
 *     the four mitigations, Cohen's kappa and the pointer to the Data
 *     Scientist track: the page. The case is its third concept check: A
 *     preferred in 70% of pairs, then B wins 65% shown first. Arithmetic:
 *     the first-shown answer wins 70% and 65%, mean 67.5% ("about two
 *     thirds"); A wins 70% shown first and 35% shown second, so at least 70
 *     − 35 = 35% of pairs changed verdict with the order (a lower bound:
 *     the share whose verdict differs is at least the difference of the two
 *     rates). That a changed judge model or rubric needs calibrating again
 *     follows from calibrating "before you rely on its scores".
 *   - q3: the halves, recall@k, MRR, faithfulness, answer relevance,
 *     citation accuracy, "If retrieval misses, no prompt fixes it", Liu et
 *     al.'s finding and "a reranker earns its latency": the page. The
 *     three-query example is the video's own: ranks 1, 3 and none, one
 *     relevant document each, so recall@5 is 2/3 and MRR (1 + 1/3 + 0) / 3
 *     = 0.444 ("point four four"). The follow-up is the fourth concept check
 *     (recall@5 of 0.45; "more than half the time the right passage is not
 *     in the context"; chunking, hybrid keyword search, a reranker). That
 *     faithfulness fails a true but unsupported claim follows from the
 *     page's definition ("supported by the retrieved passages").
 *   - q4: tool calling, the loop, MCP, the five design concerns, "a step may
 *     run twice", prompt injection (a tool result or retrieved document is
 *     untrusted input; an agent that reads outside content should not also
 *     hold damaging tools unconfirmed), and 0.95^10 ≈ 60%: the page. Arithmetic on the page's
 *     formula: 0.95^10 = 0.599, 0.99^10 = 0.904 ("ninety"), 0.95^5 = 0.774
 *     ("seventy-seven"). Filing one ticket twice is the video's example of
 *     an idempotent tool.
 *   - q5: outcomes ("did the ticket get filed, do the tests pass, is the
 *     database in the expected state?"), trajectories, repeating each task,
 *     τ-bench's pass@k and pass^k, "a customer-facing agent needs the
 *     second, which falls quickly as k grows": the page. Arithmetic on an
 *     assumption said aloud (each attempt succeeds 80% of the time,
 *     independently): pass@4 = 1 − 0.2^4 = 0.9984 ("over ninety-nine
 *     percent"), pass^4 = 0.8^4 = 0.4096 ("forty-one"), pass^8 = 0.168
 *     ("seventeen percent"). That an outcome check alone passes a bad path is
 *     why the page adds trajectories. "Checked with code, not a judge" is
 *     question one's scoring rule (exact match or execution for structured
 *     outputs) applied to the page's three outcomes.
 *   - q6: the four cases, the middle path and "after checking the labels
 *     against a human-labeled sample": the page; "the question that
 *     separates candidates who have shipped from those who have only
 *     prototyped" is its question-zero answer. Tying the check to question
 *     two is the video's, and so is "once per label, not once per request",
 *     which is what labelling once and serving a small classifier means.
 *   - the turns ("q2-in" to "q6-in") claim nothing new: the judge in
 *     question one's layers 2 to 4, what a judge grades, the ticket tool,
 *     outcomes, and question six coming before the rest.
 *   - close-practice: concept checks on all eight topic pages and the bank of
 *     110 multiple-choice questions, the track's last page, counted by
 *     check.mjs.
 *
 * Written for Drew's ear: LLM, CI, MCP, MRR (expanded once: "the mean
 * reciprocal rank") and SQL as initialisms (SQL said "sequel" and JSON
 * "jay-son" by the lexicon); RAG is said as a word, "rag", and is listed for
 * the lexicon, expanded once ("retrieval-augmented generation"); "A B tests"
 * as the README's exception; pass@k said "pass at k" and pass^k "pass hat
 * k"; τ-bench written "tau-bench"; "Zheng and colleagues" for "Zheng et
 * al."; no sentence opens with "A" before an initialism.
 */
export const script: NarrationScript = {
  id: "mle-llm-evals",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Here's the LLM design prompt in its usual form: an assistant that answers questions from a company's documents, and can file a support ticket. It's fast now, and cheap. Is it any good?",
      pauseAfter: 0.7,
    },
    {
      id: "hook-hard",
      text: "A classifier has one right label per example. This has many good answers to every question, and more bad ones, so measuring it is a design problem of its own. Six questions.",
      pauseAfter: 0.8,
    },

    // ── 1. Evaluating an LLM application ──────────────────────────────────
    {
      id: "q1",
      scene: true,
      text: "Question one. How do you evaluate an LLM application? In layers, from cheap to expensive.",
      pauseAfter: 0.5,
    },
    {
      id: "q1-set",
      text: "First, an offline eval set: realistic inputs, each with a reference answer or a rubric. A hundred or two well-chosen cases beat thousands of synthetic ones, and the set grows from real production failures.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-score",
      text: "Second, scoring matched to the task: exact match or execution for structured output like JSON, SQL or code, retrieval metrics for search, and a rubric-driven LLM judge for open-ended text.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-ours",
      text: "For the assistant, whether a ticket was filed with the right fields can be checked exactly. Whether it explained a policy correctly needs the judge.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-human",
      text: "Third, human review of a sample, to catch what the metrics miss and to check the judge.",
      pauseAfter: 0.5,
    },
    {
      id: "q1-ci",
      text: "Fourth, evals as CI: rerun the suite on every prompt, model or retrieval change, and block regressions.",
      pauseAfter: 0.5,
    },
    {
      id: "q1-online",
      text: "Fifth, online: A B tests on user outcomes, with guardrails on latency, cost and refusal rate.",
      pauseAfter: 0.7,
    },
    {
      id: "q1-agree",
      text: "The layers have to agree. When a change wins offline and loses online, fix the eval set: it's measuring something users don't care about.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-bench",
      text: "And public benchmarks are a weak guide to your task: many are saturated, and their test items may have leaked into training data.",
      pauseAfter: 0.8,
    },
    { id: "q2-in", text: "Several of those layers lean on an LLM judge, so the judge comes next." },

    // ── 2. Trusting a judge ───────────────────────────────────────────────
    {
      id: "q2",
      scene: true,
      text: "Question two. When can you trust an LLM as a judge? Only after you've measured it.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-bias",
      text: "Zheng and colleagues tested judges for three biases: position, favoring the answer shown first; verbosity, favoring the longer one; and self-enhancement, favoring its own answers. The first two showed up clearly; the third was inconclusive, but worth guarding against.",
      pauseAfter: 0.7,
    },
    {
      id: "q2-case",
      text: "Here's position bias in numbers. A judge prefers version A of the assistant, shown first, over version B in seventy percent of pairs. Rerun every pair with B shown first, and B wins sixty-five percent.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-read",
      text: "The answers didn't change, only their order. Whichever goes first wins about two thirds of the time, and at least thirty-five percent of the verdicts flipped with the order.",
      pauseAfter: 0.8,
    },
    {
      id: "q2-fix",
      text: "So score each pair in both orders, and count a win only when the two verdicts agree. Grade against a specific pass-fail rubric, not a score from one to ten. And use a judge from a different model family than the system it grades.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-cal",
      text: "Then calibrate it against people. Experts label a sample, and you report the judge's agreement with them, corrected for chance with Cohen's kappa, before you rely on its scores.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-again",
      text: "Change the judge's model or its rubric, and it's a new instrument: calibrate it again.",
      pauseAfter: 0.8,
    },
    { id: "q3-in", text: "But a judge grades the answer, not whether the right passage was ever found." },

    // ── 3. Evaluating RAG ─────────────────────────────────────────────────
    {
      id: "q3",
      scene: true,
      text: "Question three. How do you evaluate a RAG system? Retrieval-augmented generation has two halves, so measure each one, and a failure points at its cause.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-retrieval",
      text: "Retrieval comes first, over a labeled set of queries and their relevant documents. Recall at k: did the right documents make the top k? And MRR, the mean reciprocal rank: how high did the first relevant one rank?",
      pauseAfter: 0.6,
    },
    {
      id: "q3-example",
      text: "Take three queries, each with one right document. The right one ranks first, third, and nowhere. Recall at five is two in three. MRR averages one, a third and zero: point four four.",
      pauseAfter: 0.8,
    },
    {
      id: "q3-generation",
      text: "Then generation. Faithfulness: is every claim supported by the retrieved passages? Answer relevance: does it address the question? And citation accuracy.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-faith",
      text: "Faithfulness is judged against the passages, not against the truth. So a right answer the passages don't support still fails, because it's one you can't check.",
      pauseAfter: 0.7,
    },
    {
      id: "q3-follow",
      text: "The follow-up: answers are wrong, and recall at five is point four five. Rewriting the prompt won't help, because more than half the time the right passage never reached the model. Fix retrieval first, with better chunking, hybrid keyword search, or a reranker.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-middle",
      text: "And don't just pass the top fifty instead. Models use the start and end of a long context better than the middle, so a few well-ranked passages often beat many loosely relevant ones. That's why a reranker earns its latency.",
      pauseAfter: 0.8,
    },
    { id: "q4-in", text: "Filing the ticket is where the assistant stops answering and starts acting." },

    // ── 4. Agents and tool calling ────────────────────────────────────────
    {
      id: "q4",
      scene: true,
      text: "Question four. What is an agent, and how does tool calling work? Tool calling lets a model request an action instead of answering: it emits a structured call, a tool name and JSON arguments, and the application runs it and puts the result back into the context.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-loop",
      text: "An agent is that loop, repeated until the model decides it's done. The Model Context Protocol, or MCP, is an open standard for exposing tools and data to models, so one integration serves many clients.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-design",
      text: "Interviewers listen for the design around the loop: a budget on steps and cost, timeouts and retries for each tool, permissions scoped to the user, and a trace of every step.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-idem",
      text: "And idempotent tools, since a retried step can run twice. Filing the same ticket twice should still leave one ticket.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-inject",
      text: "And treat what a tool brings back as untrusted: a retrieved page can carry instructions the model may follow, so an agent that reads outside content shouldn't also hold tools that do damage without a confirmation.",
      pauseAfter: 1.4,
    },
    {
      id: "q4-compound",
      text: "Then reliability, which compounds. If each step succeeds ninety-five percent of the time, a ten-step task succeeds about sixty percent of the time.",
      pauseAfter: 0.8,
    },
    {
      id: "q4-fewer",
      text: "Make each step ninety-nine percent reliable, and ten steps reach ninety. Or cut the task to five steps, and it's seventy-seven. Fewer, more reliable steps beat a clever long chain.",
      pauseAfter: 0.8,
    },
    { id: "q5-in", text: "And an agent that acts is graded on what it did." },

    // ── 5. Evaluating an agent ────────────────────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. How do you evaluate an agent? Check outcomes, not prose: did the ticket get filed, do the tests pass, is the database in the state you expected?",
      pauseAfter: 0.6,
    },
    {
      id: "q5-code",
      text: "Those are checked with code, not a judge: the ticket exists with the right fields, or it doesn't.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-traj",
      text: "Then inspect the trajectory: the right tool, valid arguments, the number of steps, the cost. An outcome check alone would pass an agent that got there by a path you'd never allow.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-repeat",
      text: "Runs aren't deterministic, so repeat each task. The authors of tau-bench separate two scores: pass at k, at least one of k attempts succeeds, and pass hat k, all k succeed.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-numbers",
      text: "Say each attempt succeeds four times in five, independently. Pass at four is over ninety-nine percent. Pass hat four is forty-one.",
      pauseAfter: 0.8,
    },
    {
      id: "q5-which",
      text: "A customer meets every attempt, not the best one, so a customer-facing agent needs pass hat k. And it falls fast: at eight attempts, seventeen percent.",
      pauseAfter: 0.8,
    },
    { id: "q6-in", text: "Last, the call that comes before any of this." },

    // ── 6. When not to use an LLM ─────────────────────────────────────────
    {
      id: "q6",
      scene: true,
      text: "Question six. When should you not use an LLM? When a smaller model or a rule does the job better on the axes that matter.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-list",
      text: "That means tabular prediction, a strict latency or cost budget, a need for calibrated probabilities or for explanations a regulator will accept, or a task a regular expression solves.",
      pauseAfter: 0.7,
    },
    {
      id: "q6-middle",
      text: "A common middle path: use an LLM to label data, then train a small, fast classifier on those labels. You pay for the LLM once per label, not once per request.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-check",
      text: "But check the labels against a sample people labeled first. The labeler is a judge, so question two applies to it too.",
      pauseAfter: 0.7,
    },
    {
      id: "q6-why",
      text: "This is the question that separates candidates who have shipped from those who have only prototyped.",
      pauseAfter: 0.9,
    },

    // ── Close ─────────────────────────────────────────────────────────────
    {
      id: "close",
      scene: true,
      text: "From bias and variance to agents, every round on this track asks two things: will it hold up on data it hasn't seen, and how would you know?",
      pauseAfter: 0.8,
    },
    {
      id: "close-practice",
      text: "To find the rounds that still need work, try each page's concept checks, and the hundred and ten multiple-choice questions that close the track.",
    },
  ],
};
