import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Deep learning" (16:9), Part 5 of the Data Scientist
 * interview prep videos (agent-outputs/20261022-0445-data-scientist-interview-video-plan.md),
 * after content/interview/data-scientist/deep-learning.mdx. The page asks
 * sixteen questions; gradient descent and the learning rate are answered in
 * Part 3 (machine learning I), so this video takes the other fifteen: twelve
 * worked on networks small enough to show every number, numbered aloud, then
 * three quickly (numbered 13 to 15 on screen only).
 *
 *   1. what one neuron computes; 2. why activations must be non-linear
 *      ("neuron").
 *   3. the common activations ("act").
 *   4. backpropagation; 5. vanishing and exploding gradients ("backprop").
 *   6. SGD, momentum, RMSProp and Adam ("opt").
 *   7. overfitting in a network; 8. dropout; 9. weight decay and L2
 *      ("overfit").
 *   10. batch normalization ("bn").
 *   11. CNN, RNN or transformer; 12. self-attention ("arch").
 *   Quickly ("rapid-in"): the loss for each output layer; initialization;
 *   epoch, batch and iteration.
 *
 * Questions 4 and 5 run in the order the ideas build (the chain rule, then
 * what a long product of slopes does), not the plan's, which put the
 * activations' slopes and vanishing gradients together.
 *
 * Written fresh against every Data Analyst and Data Scientist script (asked
 * for on 2026-10-22): no opening on a score, a border or a puzzle, but on
 * what the round asks you to explain; a different line into the quick round,
 * and a bridge of its own into Part 6.
 *
 * No series intro yet (decided 2026-10-21): the first scene opens at frame 0,
 * and adding the intro later needs no re-voicing.
 *
 * Every animation in the scenes is cued to a word below, so edit freely: a cue
 * whose word disappears throws in the Studio rather than silently drifting.
 *
 * Facts. No deep-learning framework runs in Pyodide, so every number on
 * screen is NumPy by hand, in Pyodide 314.0.7 (NumPy 2.4.6), by check.mjs
 * into results.json, which data.ts reads. Seeded throughout:
 *   - "neuron", the video's own: inputs 0.5, -1 and 2, weights 0.8, 0.3 and
 *     0.6, bias 0.1, sum 1.4, sigmoid 0.802. Two made-up 2x2 matrices: the
 *     input (1, -1) comes out as (1, -8) through both layers and through
 *     their product; a ReLU between them gives (3, -6).
 *   - "act": softmax of 2, 1 and 0.1 is 0.66, 0.24 and 0.10.
 *   - "backprop", one sigmoid neuron (x 1.5, w 0.8, b -0.2, target 1): the
 *     three local slopes -0.538, 0.197 and 1.5 multiply to -0.159, and a
 *     finite difference agrees. The page's own block: sigmoid'(z) at -2, 0
 *     and 2 is 0.10499, 0.25 and 0.10499 by formula and by finite difference.
 *     0.25 to the tenth is 9.5e-7; 1.5 to the tenth is 57.67.
 *   - "opt", the video's own ravine 0.5 (0.1 x^2 + 10 y^2) from (-8, 1),
 *     fifty full-gradient steps each at a rate that suits it: plain 3.07
 *     from the minimum, momentum 0.13, RMSProp 0.21, Adam 0.28; plain needs
 *     175 steps to get as close as Adam.
 *   - "overfit", the video's own toy network (one hidden layer of 100 tanh
 *     units, twenty noisy points from sin 3x, 4,000 full-batch Adam steps):
 *     validation loss bottoms at 0.103 at epoch 160 and ends at 0.237 while
 *     training loss ends at 0.049; with decoupled weight decay, validation
 *     ends at 0.111. One step of weight decay and one of an L2 penalty under
 *     plain SGD land on identical weights. A real dropout draw zeroes four of
 *     eight activations.
 *   - "bn", a batch of eight with mean 6.58 and spread 1.75.
 *   - "arch", four tokens of random vectors, length four: every row of
 *     attention weights adds to 1.00.
 *   - at speed: ten ReLU layers 256 wide take the signal's spread from 1 to
 *     26 billion at weight spread 1, to 2.6e-10 at 0.01, and to 0.76 under
 *     He initialization; 10,000 examples in batches of 32 are 313 iterations.
 *
 * Written for Drew's ear: initialisms in plain caps (SGD, RMSProp, CNN,
 * LSTM), which he reads as one unit where spaced letters each took a stress
 * (the acronym rule of 2026-10-22, src/narration/acronyms.test.ts); no
 * sentence opens on "A" before an initialism; decimals as said ("point
 * eight").
 */
export const script: NarrationScript = {
  id: "ds-deep-learning",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Interviewers rarely ask a data scientist to train a network. They ask you to explain one: what a single neuron computes, how the error travels back through the layers, and why, in a deep enough stack, it fades to almost nothing on the way.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Of the fifteen questions in this video, twelve get opened up on networks small enough to show every number, worked by hand in NumPy. Three quick ones close it.",
      pauseAfter: 0.7,
    },
    { id: "neuron-in", text: "The smallest piece first." },

    // ── 1, 2. The neuron, and why it needs a non-linearity ────────────────
    {
      id: "neuron",
      scene: true,
      text: "Question one. What does a single artificial neuron compute? A weighted sum of its inputs, plus a bias, passed through an activation function. These three inputs, times their weights, plus the bias, come to one point four. A sigmoid turns that into point eight. Leave out the activation, and the neuron is just linear regression.",
      pauseAfter: 0.7,
    },
    {
      id: "linear",
      text: "Question two. Why do networks need non-linear activations? Because two linear layers are only one. This input goes through two weight matrices and comes out as one, minus eight. Multiply the matrices together first, and that single matrix gives one, minus eight as well, for every input.",
      pauseAfter: 0.6,
    },
    {
      id: "linear-fix",
      text: "Ten layers would collapse the same way. Put an activation between them that zeroes the negatives, and the answer becomes three, minus six. Now depth adds something.",
      pauseAfter: 0.7,
    },
    { id: "act-in", text: "So, which activation?" },

    // ── 3. The activations ────────────────────────────────────────────────
    {
      id: "act",
      scene: true,
      text: "Question three. Compare the common activation functions. Sigmoid squashes any input into zero to one, and goes flat at both ends. Tanh, the hyperbolic tangent, does the same between minus one and one, centered on zero.",
      pauseAfter: 0.6,
    },
    {
      id: "act-relu",
      text: "ReLU, the rectified linear unit, passes positives through and zeroes the rest. It's cheap, it never flattens for positive inputs, and it's the default for hidden layers. A unit whose inputs stay negative stops learning, so leaky ReLU keeps a small slope there.",
      pauseAfter: 0.6,
    },
    {
      id: "act-soft",
      text: "And softmax turns a layer's scores into probabilities that add to one, for a multiclass output. Scores of two, one and point one become sixty-six, twenty-four and ten percent.",
      pauseAfter: 0.7,
    },
    { id: "backprop-in", text: "Training a stack of them takes one more idea." },

    // ── 4, 5. Backpropagation, and vanishing gradients ────────────────────
    {
      id: "backprop",
      scene: true,
      text: "Question four. What is backpropagation, intuitively? It's the chain rule, run backward from the loss. Each layer multiplies the gradient arriving from above by its own local slope, and passes the product down. One backward sweep hands every weight its gradient, for about the cost of the forward pass.",
      pauseAfter: 0.6,
    },
    {
      id: "backprop-chain",
      text: "For this one neuron, that's three local slopes: minus point five four, point two, and one point five. Their product, minus point one six, is the weight's gradient, and nudging the weight by hand gives the same number.",
      pauseAfter: 0.6,
    },
    {
      id: "backprop-page",
      text: "The middle slope is the sigmoid's own, sigma times one minus sigma, and the page's code checks it the same way: point one oh five, point two five, point one oh five, by formula and by nudging alike.",
      pauseAfter: 0.7,
    },
    {
      id: "vanish",
      scene: true,
      text: "Question five. What causes vanishing and exploding gradients? That backward sweep is a long product. The sigmoid's slope is a quarter at most, so ten sigmoid layers shrink the gradient by a quarter to the tenth: less than one in a million. The early layers barely learn. Factors above one compound the other way. One and a half, ten times over, is almost fifty-eight, and the gradient explodes.",
      pauseAfter: 0.6,
    },
    {
      id: "vanish-fix",
      text: "The fixes: ReLU, careful initialization, skip connections that let the gradient bypass layers, normalization, and, for exploding gradients, clipping.",
      pauseAfter: 0.7,
    },
    {
      id: "opt-in",
      text: "The step size was a question in the machine learning round. This one is about the path.",
    },

    // ── 6. Optimizers ─────────────────────────────────────────────────────
    {
      id: "opt",
      scene: true,
      text: "Question six. Compare SGD, momentum, RMSProp, and Adam. Stochastic gradient descent, SGD, steps against the gradient of each mini-batch. In a narrow valley like this one, plain steps zigzag across the steep walls and creep along the floor.",
      pauseAfter: 0.6,
    },
    {
      id: "opt-rest",
      text: "Momentum keeps a running velocity, so it builds speed along the floor and damps the zigzag. RMSProp, root mean square propagation, divides each parameter's step by the recent size of its gradients, so the steep direction and the shallow one move at a similar pace. Adam, adaptive moment estimation, does both, which is why it's the usual default.",
      pauseAfter: 0.6,
    },
    {
      id: "opt-result",
      text: "After fifty steps, plain descent is still three units from the bottom. The other three are within a third of a unit. Plain steps would need a hundred and seventy-five to get as close as Adam.",
      pauseAfter: 0.7,
    },
    { id: "overfit-in", text: "Give a network enough units, and it can learn too much." },

    // ── 7, 8, 9. Overfitting, dropout, weight decay ───────────────────────
    {
      id: "overfit",
      scene: true,
      text: "Question seven. How does overfitting show up in a neural network, and how do you fight it? In the loss curves. This toy network has a hundred hidden units and twenty noisy points to learn from. Training loss keeps falling. Validation loss bottoms out at epoch a hundred and sixty, then climbs to more than twice that low: it's memorizing the noise.",
      pauseAfter: 0.6,
    },
    {
      id: "overfit-fix",
      text: "The fixes: more data, or augmented data. Dropout. Weight decay. Early stopping, at that low point. Or a smaller network.",
      pauseAfter: 0.7,
    },
    {
      id: "dropout",
      scene: true,
      text: "Question eight. What does dropout do, and why does it help? On every training step, it zeroes a random share of a layer's activations, here half, and doubles the survivors, so the expected total stays the same. No unit can lean on any one neighbor, so what the network learns is spread out, like training many thinned networks at once. At inference, it's off.",
      pauseAfter: 0.7,
    },
    {
      id: "decay",
      text: "Question nine. What is weight decay, and how does it relate to L two regularization? Weight decay shrinks every weight a little toward zero on each step. For plain SGD, that's the same update as adding an L two penalty to the loss: one step of each lands on exactly the same weights.",
      pauseAfter: 0.6,
    },
    {
      id: "decay-adam",
      text: "With Adam the two differ, so AdamW applies the decay separately. On the toy network, it holds validation loss at point one one, where it had climbed to point two four.",
      pauseAfter: 0.7,
    },
    { id: "bn-in", text: "Then, a layer that steadies the whole stack." },

    // ── 10. Batch normalization ───────────────────────────────────────────
    {
      id: "bn",
      scene: true,
      text: "Question ten. What is batch normalization, and why does it help? For each mini-batch, it shifts and scales a layer's inputs to mean zero and variance one. This batch has a mean of six point six. After normalizing, zero. Then two learned numbers, gamma and beta, set the scale and the shift the network actually wants.",
      pauseAfter: 0.6,
    },
    {
      id: "bn-why",
      text: "It steadies training, tolerates larger learning rates, and makes the starting weights matter less. At inference it uses running averages instead of the batch. Transformers use layer norm, which normalizes across the features of each example.",
      pauseAfter: 0.7,
    },
    { id: "arch-in", text: "The last two long ones are about the shape of the network itself." },

    // ── 11, 12. CNN, RNN, transformer, and self-attention ─────────────────
    {
      id: "arch",
      scene: true,
      text: "Question eleven. When do you use a CNN, an RNN, or a transformer? A convolutional neural network slides one small filter across a grid, looking for the same pattern everywhere, so it suits images and audio.",
      pauseAfter: 0.5,
    },
    {
      id: "arch-rnn",
      text: "A recurrent neural network reads a sequence one step at a time, carrying a hidden state forward. It fits ordered data, but it's slow, and it forgets over long spans. Gated versions like the LSTM, long short-term memory, forget less.",
      pauseAfter: 0.5,
    },
    {
      id: "arch-tf",
      text: "A transformer relates every position to every other at once, in parallel. That handles long-range context, and it's the backbone of modern language models.",
      pauseAfter: 0.7,
    },
    {
      id: "attn",
      scene: true,
      text: "Question twelve. What is self-attention? Each token makes a query, a key and a value. Score every query against every key, divide by the square root of their length so the softmax doesn't saturate, and softmax each row into weights.",
      pauseAfter: 0.6,
    },
    {
      id: "attn-grid",
      text: "Here are four tokens with random vectors of length four. Every row adds up to one. Each token's output is its row's blend of all four values, and all four rows are computed at once.",
      pauseAfter: 0.8,
    },

    // ── Quickly ───────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "To close, three questions about setting up a training run, answered quickly.",
      pauseAfter: 0.5,
    },
    {
      id: "r-loss",
      text: "Which loss goes with which output? A softmax output with cross-entropy for several classes, or a sigmoid with binary cross-entropy for two. For regression, a plain linear output with mean squared error, or a robust loss when outliers matter. Squared error on a sigmoid output stalls once the unit saturates.",
    },
    {
      id: "r-init",
      text: "Why does initialization matter? Start every weight equal, and the units in a layer stay copies of each other. Start at the wrong scale, and the signal explodes or vanishes with depth. Through ten ReLU layers, a weight spread of one blows it up to twenty-six billion, and point oh one shrinks it to almost nothing. He initialization, scaled to each layer's width, keeps it on the same scale; Xavier is the version for tanh.",
    },
    {
      id: "r-epoch",
      text: "And epoch, batch and iteration? An epoch is one pass over the training set. A batch is the examples behind one update, and an iteration is one update. Ten thousand examples in batches of thirty-two make three hundred and thirteen iterations an epoch.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "A network that does well on held-out data has still only won offline. Whether it helps real users is decided by a test. Next: designing the experiment.",
    },
  ],
};
