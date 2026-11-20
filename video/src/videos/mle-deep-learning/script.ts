import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Deep learning" (16:9), Part 5 of the Machine Learning
 * Engineer interview prep videos
 * (agent-outputs/20261120-1400-machine-learning-engineer-interview-video-plan.md,
 * "5, Deep learning"), after
 * content/interview/machine-learning-engineer/deep-learning.mdx. It answers
 * fifteen of the page's nineteen questions: "How do you choose and schedule
 * the learning rate?" is Part 2's, and "What is self-attention?", "What is
 * multi-head attention, and why use multiple heads?" and "Describe the
 * transformer architecture." are Part 6's. Three ml-fundamentals.mdx
 * questions are answered together with their deep-learning counterparts, as
 * the plan lists. Thirteen are worked through and numbered aloud; two are
 * quick (12 and 13, numbered on screen only), placed before the recurrent
 * pair so the video ends on recurrence and the bridge into attention.
 *
 *   1. "What is a perceptron?" ("q1").
 *   2. "Why do we need non-linear activation functions?" ("q2"). One XOR
 *      figure carries both.
 *   3. "Compare sigmoid, tanh, and ReLU." ("q3"), with ml-fundamentals'
 *      "Name common activation functions and their trade-offs." (its softmax
 *      line is "q3-fix"'s last sentence).
 *   4. "Explain backpropagation and the chain rule." ("q4").
 *   5. "What causes vanishing and exploding gradients, and how do you fix
 *      them?" ("q5"), with ml-fundamentals' "What is the vanishing gradient
 *      problem?".
 *   6. "Why does weight initialization matter? Xavier vs He." ("q6").
 *   7. "What is batch normalization, and how does layer norm differ?" ("q7").
 *   8. "What is the difference between SGD, Momentum, RMSProp, and Adam?"
 *      ("q8").
 *   9. "Explain dropout, L2, and early stopping as regularizers." ("q9"),
 *      with ml-fundamentals' "What is dropout and how does it regularize a
 *      neural network?" (its "commonly 0.2 to 0.5" and inverted dropout are
 *      in "q9").
 *   10. "How does a convolutional neural network (CNN) work?" ("q10").
 *   11. "Why are CNNs well suited to images compared to a fully-connected
 *       net?" ("q11"). One digit-and-filter figure carries both.
 *   Quick ("rapid-in"): 12. "What is transfer learning / fine-tuning in deep
 *   learning?" ("r-transfer"); 13. "Why is cross-entropy paired with softmax
 *   for classification?" ("r-softmax").
 *   14. "What is an RNN, and why does it struggle with long sequences?"
 *       ("q14").
 *   15. "How do LSTMs and GRUs address that?" ("q15").
 *
 * Each deep dive reads its question in a beat of its own ("q4") when the
 * answer runs past it ("q4-a"), and a one-line turn closes a scene before
 * the next topic ("act-in", "backprop-in", "norm-in", "opt-in", "reg-in",
 * "cnn-in", "rnn-in"), so the fifteen read as one argument: what a unit
 * computes, which non-linearity, how the weights learn, what breaks that,
 * how to keep it steady, how each step moves, what stops memorizing, then
 * architectures shaped to their data.
 *
 * The angle is the ML engineer's, which is what this track's page adds over
 * the Data Scientist one: what each idea costs in memory or compute, and how
 * each one breaks in a training job or behind a serving endpoint (a dead
 * unit, a gradient that turns into not-a-number, batch norm or dropout left
 * in training mode, softmax applied twice). None of ds-deep-learning's worked
 * examples is reused: it had a three-input neuron, two 2x2 matrices, softmax
 * of 2, 1 and 0.1, one sigmoid neuron's chain, a quarter and one and a half
 * to the tenth, a ravine for the optimizers, a toy overfitting curve, a batch
 * of eight for batch norm and a ten-layer forward signal; this video uses
 * XOR (the page's own example), scikit-learn's digits, a twenty-layer
 * backward signal, and the page's own CNN listing.
 *
 * Opening and bridge. It opens on the plan's 4 to 5 bridge (maximum
 * likelihood is what training minimizes, and a deep network does it at
 * scale) without "in the last video", and closes on 5 to 6: recurrence reads
 * one step at a time, attention reaches every position at once, and language
 * models are built on it.
 *
 * On screen, beat by beat (for the builder; nothing is built yet). Colors keep
 * the series' meanings (interview.tsx): red the trap or the error, green the
 * right answer, yellow what the narration points at, blue data. The
 * orangutan hero sits beside the opening and the close only. Three small
 * watercolor spots (illustrations.json), each beside the figure it names, as
 * built: dice at "q6-sym" (Xavier's random start breaks the tie), a
 * magnifying glass at "q10-a" (a filter's small patch), dominoes at
 * "q14-slow" (step fifty waits for step forty-nine).
 *   hook: three small diagrams in a row, inked as named: a logistic
 *     regression (inputs, one weighted sum, a sigmoid), then the same thing
 *     stacked many layers deep, then a gradient arrow running back down the
 *     stack (yellow). "Maximum likelihood" above the first, "at scale" above
 *     the second.
 *   plan: fifteen numbered chips: thirteen blue, two grey (quick, 12 and
 *     13), lit in groups as the beat names them; a small grid of digit
 *     images (scikit-learn's digits, blue) on "handwritten digits".
 *   q1, q1-a: question card; one perceptron box: two inputs, weights, a sum, a
 *     step. Beside it, XOR's four points on a unit square: (0,1) and (1,0)
 *     filled blue (output one), (0,0) and (1,1) hollow (output zero).
 *   q1-xor: a line sweeps across the square and settles; the one point on
 *     its wrong side ringed red; "Best line: 3 of 4" (results.json
 *     xor.bestLine, from a search over 226,981 lines), "No line gets all
 *     four" in red under it.
 *   q2: question card; the two-unit hidden layer drawn between inputs and
 *     output with its weights (W1 all ones, biases 0 and -1, output weights 1
 *     and -2, from results.json); each point's output written beside it as
 *     the beat says "zero, one, one, zero", green.
 *   q2-collapse: the two ReLU marks fade out (removed, not struck: nothing
 *     wrong is being crossed out); the diagram folds into one
 *     box, "-x1 - x2 + 2" (outlined, mono), and the square returns with one
 *     line and one red ring: "3 of 4" again; on "with one", the box
 *     unfolds and "Non-linear between layers" is written under it.
 *   q3: question card; three small curves side by side (sigmoid, tanh,
 *     ReLU), each with its derivative under it (results.json
 *     activations.curves), separated by vertical hairlines.
 *   q3-sat: the flat tails of sigmoid and tanh shaded yellow; the page's
 *     block's five sigmoid slopes as a row, 0.105 0.235 0.25 0.235 0.105,
 *     with 0.25 lit on "a quarter"; on tanh's derivative, a dot at 0 ("1")
 *     and one at 2 ("0.071"), lit on "point oh seven".
 *   q3-relu: the ReLU derivative's step lit (0 then 1); a unit icon whose
 *     input stays left of zero goes grey and gets a red "dead" badge.
 *   q3-fix: leaky ReLU and GELU curves faded in over ReLU's, each labelled;
 *     "GELU: transformers" beside it; "Softmax: the multi-class output" as a
 *     line under the three.
 *   q4, q4-a: question card; a three-layer stack, the forward pass inked upward
 *     (blue), each layer's activations kept as a small stacked slab beside
 *     it; then the backward pass inked downward (yellow) on "multiplying".
 *   q4-cost: two bars on one axis, in forward passes per gradient: "nudge
 *     every weight: 26,123" and "backprop: 1 + 1.68 = 2.68", the second
 *     green; the network's sizes "64, 128, 128, 10" (results.json backprop).
 *   q4-check: twenty points on a line y = x, numeric gradient against
 *     backprop's, all on it; "worst gap 3 in 10 million" (2.9e-7) in green.
 *   q4-memory: the kept activation slabs grow taller as "batch size" and
 *     "depth" are named; "Training" and "Serving" columns, serving with no
 *     slabs.
 *   q5: question card; a chain of twenty layer boxes with a gradient arrow
 *     travelling down it.
 *   q5-sim: a log-scale chart, gradient size against layer (20 back to 1),
 *     results.json vanish.byLayer: sigmoid falling to 2.5e-13 (red), ReLU
 *     with He level near 1 (green); "simulation: 20 layers of 128, random
 *     inputs" as its note.
 *   q5-explode: the third line, ReLU at twice He's spread, climbing to 1.4
 *     million (red), the top of the axis extended to hold it; "NaN" in red at
 *     its end on "not a number".
 *   q5-fix: the five fixes as a list, each lit as named; under clipping, an
 *     arrow longer than a dashed circle shrunk onto its rim, same direction.
 *   q5-watch: "Log the gradient norm every step" as the takeaway line.
 *   q6, q6-a: question card; the exploding line from q5 shown small, lit yellow
 *     on "starting scale". Then two formulas as text, "Xavier: variance 2 /
 *     (inputs + outputs)" and "He: variance 2 / inputs", tanh and sigmoid
 *     under the first and ReLU under the second.
 *   q6-sym: two rows of four 8x8 weight images (the first four hidden units'
 *     incoming weights, results.json init.constantUnits and xavierUnits):
 *     the constant row identical (red ring round all four, "16 copies"), the
 *     Xavier row all different; "38%" red and "98%" green under them.
 *   q6-why: "Equal units, equal gradients" as a line.
 *   q7, q7-a: question card; a batch as eight 8x8 digit images in a row, one
 *     pixel's column picked out across them (yellow).
 *   q7-batch: the same digit (a 6, pixel at row 4, column 4, brightness
 *     0.5) in two batches, seven bright neighbours above and seven dark ones
 *     below (results.json norm.brightBatch, darkBatch); its normalized value
 *     "-2.43" and "+2.62" beside each, the digit ringed yellow in both.
 *   q7-one: the digit alone, "0" (red); then "running averages" as a small
 *     note; "Training mode, batch of 1: the layer ignores its input" in red.
 *   q7-ln: the digit's own 64 pixels normalized across its row: "0.45" in
 *     both batches and alone, green.
 *   q8, q8-a: question card; four labelled rows, SGD, momentum, RMSProp, Adam,
 *     each with what it keeps per weight drawn as small outlined boxes:
 *     nothing, a velocity, a squared-gradient average, both.
 *   q8-rms: two bars per optimizer for the two parameters' average step
 *     (results.json optim), all blue (data; neither optimizer is wrong):
 *     SGD's 0.0102 and 0.0000985 ("104x", the small bar barely visible),
 *     Adam's 0.00988 and 0.00956 ("1.03x"), each ratio lit yellow as said.
 *   q8-mem: a stacked bar per optimizer in bytes per weight, weights 4 and
 *     gradient 4 for all, then +4 momentum, +8 Adam; a second axis "for a
 *     billion weights": 8 GB, 12 GB, 16 GB; "float32, before activations" as
 *     its note.
 *   q8-choice: Adam's bar lit "default"; SGD with momentum's lit "vision".
 *   q9, q9-a: question card; a layer of twelve units with a random half greyed on
 *     each of three frames (training steps), survivors drawn thicker
 *     ("scaled up").
 *   q9-bug: the digit (an 8, results.json dropout.image) and ten "calls" as
 *     a column of results: eight "8" in blue with their percentages, two
 *     "1" in red; "Evaluation mode: 8 at 89%, every call" in green above
 *     them.
 *   q9-dash: two numbers, "accuracy 98% / 97%" (neutral ink: the trap is
 *     that it barely moves), then "1 image in 10 changes its answer" in red;
 *     "Serve in evaluation mode" green.
 *   q9-l2: L2 as weights shrinking toward zero on a small bar row, with
 *     "Adam: decoupled weight decay (AdamW)" as a line under it on "decay
 *     the weights directly"; early stopping as a validation curve with its
 *     low point marked and the weights taken from there.
 *   q10, q10-a: question card; the digit zero as an 8x8 grid (results.json
 *     cnn.image), a 3x3 window sliding across it, the filter's nine weights
 *     beside it; the feature map filling in cell by cell (results.json
 *     cnn.map, diverging blue and red would read as right and wrong, so one
 *     blue ramp for magnitude, sign as + and -).
 *   q10-props: "local", "shared", "found anywhere" lit in turn; the digit
 *     shifts two cells right and the map shifts with it (cnn.shiftedMap);
 *     a 2x2 pooling grid on "Pooling".
 *   q11, q11-a: question card; on "Count weights", two numbers set as bars
 *     on a log axis, "dense to
 *     1,000 units: 150,529,000" and "first convolution: 448" (green).
 *   q11-cost: the page's listing as four outlined boxes with their counts
 *     (448, 4,640, 330, total 5,418); then "first layer: each weight used at 50,176
 *     positions" and "21.7 million multiply-adds" (yellow).
 *   q11-bias: "Nearby pixels belong together" as the takeaway line.
 *   rapid-in: RapidFire rows 12 and 13.
 *   r-transfer: a backbone block (grey, a lock on it) with a new head (blue)
 *     on "freeze"; the lock comes off its top layers on "fine-tune"; then one
 *     backbone with three heads on "many heads".
 *   r-softmax: logits, softmax, probabilities, loss as a row; "prediction
 *     minus target" under it; then a second softmax box inserted (red) and
 *     the best probability bar capped at 23%, "loss never below 1.46" in red.
 *   q14, q14-a: question card; a row of RNN cells unrolled over steps, the same
 *     weights badge on each, the hidden state passed along.
 *   q14-why: the gradient arrow travelling back from step 50 to step 1,
 *     thinning; "0.5^50 = 8.9e-16" (red), "assumed: each step halves it" as
 *     its note.
 *   q14-slow: the cells lighting one after another, a clock beside them.
 *   q15, q15-a: question card; an LSTM cell with its cell-state line running
 *     straight through the top and three gates (input, forget, output) as
 *     outlined boxes; the gradient along the cell line, "0.95^50 = 0.077"
 *     (green), "assumed: forget gate at 0.95" as its note.
 *   q15-gru: a GRU cell beside it, two gates, no cell line; "4 blocks / 3
 *     blocks" under the two.
 *   q15-limit: both rows of cells still lighting one at a time.
 *   The turns ("act-in" and the rest) add nothing on screen: the finished
 *     figure holds under them until the cut.
 *   next: one row of tokens with every position joined to every other in one
 *     step (yellow lines), all lit at once; the orangutan; <NextLine> "Next:
 *     NLP and LLMs" on "Next" (Part 6's title in series.ts; only the
 *     narration expands it, "NLP and large language models").
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. check.mjs runs in Pyodide 314.0.7 with NumPy and scikit-learn 1.8.0
 * (the runtime the page's block runs in) and writes results.json, which
 * data.ts reads; it fails if a page stops saying what is quoted or the
 * narration stops saying what was measured. Seeded throughout:
 *   - "q1-xor": XOR's four points; a search over 226,981 lines (weights and
 *     bias on a grid from -3 to 3) gets at most 3 of 4, which is also the
 *     proof's answer; scikit-learn's Perceptron gets 2 of 4. The page: "it
 *     can't learn XOR".
 *   - "q2", "q2-collapse": the hand-set network (hidden units relu(x1 + x2)
 *     and relu(x1 + x2 - 1), output h1 - 2 h2) gives 0, 1, 1, 0; without the
 *     ReLU, the same weights give 2, 1, 1, 0, which is -x1 - x2 + 2 exactly.
 *     "approximate almost any function": the page's universal approximation.
 *   - "q3-sat": the page's own block, run as written: sigmoid' at -2, -0.5,
 *     0, 0.5 and 2 is 0.105, 0.235, 0.25, 0.235, 0.105 (the page's "peaks at
 *     only 0.25"); tanh' is 1 at 0 and 0.071 at 2. "q3-relu", "q3-fix": the
 *     page and ml-fundamentals (softmax at the multi-class output). "GELU is
 *     the usual choice in transformers" is standard knowledge, not the
 *     page's.
 *   - "q4-cost": a 64-128-128-10 ReLU network for the digits has 26,122
 *     parameters ("twenty-six thousand"); nudging each one takes 26,123
 *     forward passes per gradient. A forward pass is 25,856 multiply-adds; the
 *     backward pass 43,520 (the weight gradients plus the input gradients of
 *     layers 2 and 3), 1.68 times a forward pass ("one point seven"). The
 *     page says backprop costs "a small multiple of one forward pass (about
 *     two, since each layer needs the gradient for its inputs and for its
 *     weights)" (fixed 2026-11-20); the count agrees, 1.7 here, because the
 *     first layer needs no input gradient. "q4-check": a
 *     central-difference check on 20 random weights, on 32 digits, agrees
 *     with backprop to a worst relative error of 2.9e-7. "q4-memory": the
 *     page's "the forward pass caches intermediate activations".
 *   - "q5-sim", "q5-explode": a seeded simulation, 20 layers of 128 units, a
 *     batch of 256 random inputs, a random gradient at the top. What reaches
 *     the first layer, as a share of what left the top: sigmoid with Xavier
 *     2.5e-13 ("under a trillionth"), ReLU with He 1.3 ("about the size it
 *     left"), ReLU at twice He's spread 1.36 million ("over a million"). The
 *     page's "updates blow up to nan" is "not a number". "q5-fix": the page's
 *     list; a residual path's derivative of one is standard. "q5-watch":
 *     standard practice, said as advice.
 *   - "q6": the variances 2 / (fan in + fan out) and 2 / fan in are the
 *     standard Xavier and He formulas (the page names the methods and why
 *     He's is larger). "q6-sym": a 64-16-10 tanh network trained full-batch
 *     for 1,000 steps on 1,257 digits: started at 0.01 everywhere, its 16
 *     hidden units end identical to the last bit and it scores 38% on the
 *     540 held out; started from Xavier, 16 distinct units and 98% (97.6).
 *   - "q7-batch": one digit (a 6) whose pixel at row 4, column 4 is 0.5,
 *     batch-normalized with seven of the brightest-at-that-pixel digits
 *     (above 0.75) gives -2.43, with seven darkest (below 0.25) +2.62; alone,
 *     0 (its own mean). "q7-ln": layer norm across its 64 pixels gives 0.45
 *     in any batch. "q7-one": running averages at inference are the page's;
 *     that a batch of one in training mode makes the layer's output the same
 *     for every input follows from the arithmetic.
 *   - "q8-rms": a seeded simulation, two parameters with noisy gradients of
 *     mean 1 and 0.01, 100 steps at rate 0.01: SGD's average steps are 104
 *     times apart, Adam's (beta 0.9 and 0.999, bias-corrected) 1.03.
 *     "q8-mem": arithmetic from stated assumptions, float32 throughout:
 *     weights 4 bytes, gradient 4, momentum 4, Adam's two averages 8; a
 *     billion weights, 8 GB for SGD and 16 for Adam (12 for momentum, "a
 *     quarter less"), activations not counted. "q8-choice": the page.
 *   - "q9-bug", "q9-dash": a 64-128-10 ReLU network trained on the digits
 *     with inverted dropout at 0.5 (60 epochs, Adam, batches of 32): in
 *     evaluation mode 98.0% on the 540 held out, and one image of an 8 at
 *     89%. Left on, ten calls on that image give 8 eight times (48% to 93%)
 *     and 1 twice; across the test set, 10.2% of images change their answer
 *     at least once in ten calls ("one image in ten"), two calls disagree on
 *     3.5%, and accuracy is 97.2% ("ninety-eight to ninety-seven"). "q9":
 *     the pages (commonly 0.2 to 0.5; inverted dropout). "q9-l2": the page;
 *     that L2 equals weight decay only for plain SGD, and that Adam wants the
 *     decay applied to the weights directly (AdamW), is standard, not the
 *     page's, said because the page's "L2 (weight decay)" is the line an
 *     interviewer corrects. "q8-rms": RMSProp divides by the root of the
 *     average, as the page's formula has it (its prose says "by a running
 *     average", see the report).
 *   - "q10": the digits' first image, a 0, under a 3x3 vertical-edge filter
 *     (Sobel's), padding 1. "q10-props": shifted two pixels right, its map
 *     equals the original's shifted two, away from the edge the shift
 *     pushed pixels out of (asserted).
 *   - "q11", "q11-cost": the page's 224 x 224 x 3 image is 150,528 inputs; a
 *     dense layer to 1,000 units (the video's assumption, said aloud) has
 *     150,529,000 weights and biases ("a hundred and fifty million"). The
 *     page's listing: 448, 4,640 and 330, 5,418 in all; its
 *     AdaptiveAvgPool2d(1) is what makes it take any image size. The first
 *     convolution on a 224-pixel image runs at 50,176 positions, 21,676,032
 *     multiply-adds ("twenty-two million"). "q11-bias": the page.
 *   - "r-transfer": the page; "one shared backbone with many heads" is the
 *     engineering consequence of freezing it. A run was tried and dropped:
 *     on the digits, features pretrained on 0 to 4 did not beat training
 *     from scratch on 5 to 9 at any label count, so the video makes no
 *     numeric claim. "r-softmax": the page's gradient and fused call;
 *     softmax applied twice with ten classes caps the right class at
 *     e / (e + 9) = 23.2% and the loss at -ln of that, 1.46.
 *   - "q14-why": arithmetic from a stated assumption, a half per step:
 *     0.5^50 = 8.9e-16 ("about one in a thousand trillion"). "q14-slow":
 *     the recurrence. "q15": a forget gate held at 0.95 (assumption, said):
 *     0.95^50 = 0.077 ("about eight percent"). "q15-gru": an LSTM has four
 *     weight blocks (three gates and the candidate), a GRU three (two gates
 *     and the candidate), so a quarter fewer; "similar performance" is the
 *     page's. "next": the page's "until attention did it better".
 *
 * Written for Drew's ear: initialisms in plain caps (XOR, which the lexicon
 * says "ex-or"; SGD, CNN, RNN, LSTM, GRU, GELU, ELU, ReLU, RMSProp, NLP, LLM),
 * each expanded the first time a beginner might not know it; ReLU, GELU and
 * ELU are said as words (see the report); no sentence opens with "A" before
 * an initialism; "nan" said as "not a number"; numbers as they are said.
 */
export const script: NarrationScript = {
  id: "mle-deep-learning",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ──────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Training a deep network is still maximum likelihood: find the weights that make the labels most probable. The difference is scale: many layers, millions of weights, and a gradient that must make it back through all of them.",
      pauseAfter: 0.7,
    },
    {
      id: "plan",
      text: "Fifteen questions: thirteen worked through, several on small digit networks, and two quick ones.",
      pauseAfter: 0.7,
    },
    // ── 1, 2. The perceptron and XOR ─────────────────────────────────────
    { id: "q1", scene: true, text: "Question one. What is a perceptron?" },
    {
      id: "q1-a",
      text: "A weighted sum of its inputs plus a bias, through an activation. Alone, it's a linear classifier: one straight line.",
      pauseAfter: 0.6,
    },
    {
      id: "q1-xor",
      text: "So it famously can't learn XOR, which is one when exactly one input is one: no line separates the ones from the zeros, and the best gets three of the four.",
      pauseAfter: 0.7,
    },
    {
      id: "q2",
      text: "Question two. Why do we need non-linear activation functions? Add two hidden units with ReLU, which zeroes negatives, and XOR comes out exactly: zero, one, one, zero.",
      pauseAfter: 0.6,
    },
    {
      id: "q2-collapse",
      text: "Take the ReLU out, and the same weights collapse to one linear function, minus each input, plus two: one line again. Without a non-linearity, stacked layers are one layer; with one, a wide network can approximate almost any function.",
      pauseAfter: 0.7,
    },
    { id: "act-in", text: "So, which non-linearity?" },
    // ── 3. Activations ───────────────────────────────────────────────────
    { id: "q3", scene: true, text: "Question three. Compare sigmoid, tanh, and ReLU." },
    {
      id: "q3-sat",
      text: "Sigmoid maps to zero to one, tanh to minus one to one, centered on zero. Both flatten at the ends, passing almost no gradient: the page's code finds sigmoid's slope peaks at a quarter, and tanh's, peaking at one, is point oh seven by an input of two.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-relu",
      text: "ReLU's slope is one for any positive input, it costs one comparison, and it's the default for hidden layers. The catch: a unit whose input is always negative outputs zero, gets zero gradient, and never recovers.",
      pauseAfter: 0.6,
    },
    {
      id: "q3-fix",
      text: "Leaky ReLU keeps a small slope below zero; ELU and GELU bend smoothly, and GELU is the usual choice in transformers. Softmax belongs at a multi-class output.",
      pauseAfter: 0.7,
    },
    { id: "backprop-in", text: "Next, how the weights learn." },
    // ── 4. Backpropagation ───────────────────────────────────────────────
    { id: "q4", scene: true, text: "Question four. Explain backpropagation and the chain rule." },
    {
      id: "q4-a",
      text: "The forward pass computes each layer and keeps its activations. The backward pass runs from the loss down, multiplying local derivatives, so every weight gets its gradient in one sweep.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-cost",
      text: "This digit network has twenty-six thousand parameters. Nudging each to measure its effect takes twenty-six thousand forward passes per step. Backprop takes one, plus a backward pass worth one point seven, counting multiply-adds.",
      pauseAfter: 0.7,
    },
    {
      id: "q4-check",
      text: "Nudging is still how you test a backward pass: on twenty weights here, the two agree to better than one part in a million.",
      pauseAfter: 0.6,
    },
    {
      id: "q4-memory",
      text: "The price is memory: kept activations grow with batch size and depth, so training takes far more memory than serving.",
      pauseAfter: 0.8,
    },
    // ── 5. Vanishing and exploding gradients ─────────────────────────────
    {
      id: "q5",
      scene: true,
      text: "Question five. What causes vanishing and exploding gradients, and how do you fix them? That backward sweep is a long product: factors mostly below one, and the gradient vanishes; mostly above, it explodes.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-sim",
      text: "Simulate twenty layers of a hundred and twenty-eight units. With sigmoid, under a trillionth of the gradient reaches the first layer, so early layers barely learn. With ReLU and He initialization, it arrives about the size it left.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-explode",
      text: "Start the same ReLU network with weights twice as spread out, and it arrives over a million times larger. The updates blow up, and the loss becomes not a number.",
      pauseAfter: 0.7,
    },
    {
      id: "q5-fix",
      text: "The fixes: ReLU-family activations, careful initialization, residual connections, which give the gradient a path with a derivative of one, and normalization. For explosions, clip: past a threshold, scale the gradient down, keeping its direction.",
      pauseAfter: 0.6,
    },
    {
      id: "q5-watch",
      text: "Log the gradient norm every training step: a slide toward zero, or a spike before the loss breaks, shows there first.",
      pauseAfter: 0.8,
    },
    // ── 6. Initialization ────────────────────────────────────────────────
    { id: "q6", scene: true, text: "Question six. Why does weight initialization matter? Xavier versus He." },
    {
      id: "q6-a",
      text: "That explosion was the starting scale alone. Xavier sets the variance to two over inputs plus outputs, for tanh and sigmoid; He, two over inputs, since ReLU zeroes half of what it sees.",
      pauseAfter: 0.6,
    },
    {
      id: "q6-sym",
      text: "And never start the weights equal. Sixteen hidden units started at point oh one end a thousand steps as exact copies, one unit in effect, scoring thirty-eight percent on held-out digits. From Xavier's random start, ninety-eight.",
      pauseAfter: 0.6,
    },
    { id: "q6-why", text: "Equal units get equal gradients, so nothing ever breaks the tie.", pauseAfter: 0.7 },
    { id: "norm-in", text: "Normalization keeps that scale steady in training." },
    // ── 7. Batch norm and layer norm ─────────────────────────────────────
    { id: "q7", scene: true, text: "Question seven. What is batch normalization, and how does layer norm differ?" },
    {
      id: "q7-a",
      text: "Batch norm shifts and scales each feature to mean zero and variance one across the mini-batch, then applies a learned scale and shift.",
      pauseAfter: 0.6,
    },
    {
      id: "q7-batch",
      text: "So the answer depends on the neighbors. This pixel, at half brightness, normalizes to minus two point four beside seven brighter digits, and to plus two point six beside seven darker ones.",
      pauseAfter: 0.7,
    },
    {
      id: "q7-one",
      text: "In a batch of one, a feature is its own mean, so it normalizes to zero whatever the input; hence running averages at inference. Left in training mode and served one request at a time, that layer ignores its input.",
      pauseAfter: 0.7,
    },
    {
      id: "q7-ln",
      text: "Layer norm normalizes across one example's features instead: this pixel gets the same value in any batch, or alone. Free of batch size, it's what transformers use.",
      pauseAfter: 0.7,
    },
    { id: "opt-in", text: "Then, how each step moves." },
    // ── 8. Optimizers ────────────────────────────────────────────────────
    { id: "q8", scene: true, text: "Question eight. What is the difference between SGD, Momentum, RMSProp, and Adam?" },
    {
      id: "q8-a",
      text: "Stochastic gradient descent steps against each mini-batch's gradient. Momentum keeps a decaying average of past gradients, which damps the zigzag.",
      pauseAfter: 0.6,
    },
    {
      id: "q8-rms",
      text: "RMSProp divides each parameter's step by the root of a running average of its squared gradients; Adam does both. Give two parameters gradients a hundred times apart: SGD's steps are a hundred and four times apart, Adam's, one point oh three.",
      pauseAfter: 0.7,
    },
    {
      id: "q8-mem",
      text: "The follow-up is memory. In thirty-two-bit floats, a weight and its gradient take eight bytes; momentum adds four, Adam eight. A billion weights need eight gigabytes with SGD and sixteen with Adam, before any activations.",
      pauseAfter: 0.7,
    },
    {
      id: "q8-choice",
      text: "Adam is the usual default; well-tuned SGD with momentum often generalizes slightly better on vision, in a quarter less memory.",
      pauseAfter: 0.7,
    },
    { id: "reg-in", text: "A network that trains well can still memorize." },
    // ── 9. Regularizers ──────────────────────────────────────────────────
    { id: "q9", scene: true, text: "Question nine. Explain dropout, L2, and early stopping as regularizers." },
    {
      id: "q9-a",
      text: "Dropout zeroes a random share of units each training step, commonly a fifth to a half, so none can rely on particular others. Survivors are usually scaled up in training, so at inference it's simply off.",
      pauseAfter: 0.6,
    },
    {
      id: "q9-bug",
      text: "Leave it on in a digit classifier trained with it. Ten calls on one image of an eight: eight say eight, at forty-eight to ninety-three percent, and two say one. Across the test set, one image in ten changes its answer within ten calls.",
      pauseAfter: 0.7,
    },
    {
      id: "q9-dash",
      text: "Yet accuracy only slips from ninety-eight to ninety-seven percent, so no dashboard flags it. Check that serving runs in evaluation mode, and that one input gets one output.",
      pauseAfter: 0.7,
    },
    {
      id: "q9-l2",
      text: "L2 penalizes squared weights, pulling them toward zero. With plain SGD that's the same as weight decay; with Adam it isn't, so decay the weights directly. Early stopping keeps the weights from the best validation epoch, and all three limit what a network can memorize.",
      pauseAfter: 0.7,
    },
    { id: "cnn-in", text: "Then, architectures shaped to their data." },
    // ── 10, 11. CNNs ─────────────────────────────────────────────────────
    { id: "q10", scene: true, text: "Question ten. How does a convolutional neural network, or CNN, work?" },
    {
      id: "q10-a",
      text: "It slides small learned filters over the image, each computing a local weighted sum. This three-by-three filter lights up on a handwritten zero's vertical edges.",
      pauseAfter: 0.6,
    },
    {
      id: "q10-props",
      text: "Each output sees a small patch through one shared filter, so a pattern is found anywhere: shift the digit two pixels right, and the map shifts with it. Pooling then shrinks it, tolerating small shifts.",
      pauseAfter: 0.7,
    },
    { id: "q11", text: "Question eleven. Why are CNNs well suited to images compared to a fully-connected net?" },
    {
      id: "q11-a",
      text: "Count weights. For a color image two hundred and twenty-four pixels square, a dense layer to a thousand units needs a hundred and fifty million; the page's first convolution, four hundred and forty-eight.",
      pauseAfter: 0.7,
    },
    {
      id: "q11-cost",
      text: "The page's whole network has five thousand four hundred and eighteen. But its first layer reuses each weight at fifty thousand positions: twenty-two million multiply-adds, cheap to store, not to compute.",
      pauseAfter: 0.7,
    },
    {
      id: "q11-bias",
      text: "That built-in assumption, that nearby pixels belong together, is why a CNN needs far less data.",
      pauseAfter: 0.8,
    },
    // ── Quick: 12, 13 ────────────────────────────────────────────────────
    { id: "rapid-in", scene: true, text: "Two quick ones.", pauseAfter: 0.5 },
    {
      id: "r-transfer",
      text: "Transfer learning: start from a pretrained network. With little data, freeze it and train a new head; with more, fine-tune some or all layers. It cuts data and compute, and one frozen backbone can serve many heads.",
      pauseAfter: 0.6,
    },
    {
      id: "r-softmax",
      text: "Why pair softmax with cross-entropy? Their combined gradient is prediction minus target, large exactly when the model is confidently wrong. Libraries fuse them on raw logits, so don't apply softmax first: applied twice over ten classes, the right class tops out at twenty-three percent, and the loss can't drop below one point four six.",
      pauseAfter: 0.8,
    },
    { id: "rnn-in", text: "Last, sequences." },
    // ── 14, 15. RNNs, LSTMs and GRUs ─────────────────────────────────────
    {
      id: "q14",
      scene: true,
      text: "Question fourteen. What is an RNN, and why does it struggle with long sequences?",
    },
    {
      id: "q14-a",
      text: "A recurrent neural network reads a sequence one step at a time, updating one hidden state with the same weights each step.",
      pauseAfter: 0.6,
    },
    {
      id: "q14-why",
      text: "So the gradient from step fifty back to step one passes through fifty similar factors. If each halves it, one part in a thousand trillion is left: long-range patterns are forgotten, or, with factors above one, they explode.",
      pauseAfter: 0.6,
    },
    {
      id: "q14-slow",
      text: "And step fifty can't start until step forty-nine is done, so a GPU can't work on a sequence's steps in parallel.",
      pauseAfter: 0.7,
    },
    { id: "q15", text: "Question fifteen. How do LSTMs and GRUs address that?" },
    {
      id: "q15-a",
      text: "The LSTM, or long short-term memory, adds a cell state changed mostly by addition, under input, forget and output gates. Along it, the gradient meets only the forget gate: at point nine five, fifty steps keep about eight percent.",
      pauseAfter: 0.6,
    },
    {
      id: "q15-gru",
      text: "The GRU, gated recurrent unit, uses two gates and no separate cell: three blocks of weights to the LSTM's four, for similar results.",
      pauseAfter: 0.6,
    },
    { id: "q15-limit", text: "But both still read one step at a time.", pauseAfter: 0.7 },
    {
      id: "next",
      text: "Attention did it better: every position reaches every other in one step, all at once, and language models are built on it. Next: NLP and large language models.",
    },
  ],
};
