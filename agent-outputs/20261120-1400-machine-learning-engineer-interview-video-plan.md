# Machine Learning Engineer interview prep: video series plan

**Status:** requested 2026-11-20 ("create the Machine Learning Engineer
interview series", images on GPT Image 2.6 at quality low with a transparent
background). Built the way the Backend Engineer series was
(`20261106-backend-interview-video-plan.md`): scripts and measured facts
first, an independent read of the scripts before any voice is spent, then one
builder per video. Build files: `20261120-mle-interview-build/`.

## What the series is for

The same direction the owner gave the Backend series: **argue decisions and
trade-offs, never syntax**. An ML Engineer round asks why a model fails on
new data, which model and loss fit a problem, what a serving system costs, and
how you would know it broke; the videos answer those with figures, runs and
small simulations. Code is on screen only where reading it is the skill
(a few lines in Part 3, where the question is what the code does).

The source is the site's track, `content/interview/machine-learning-engineer/`
(eight topic pages and the index, about 21,000 words, 167 questions). Every
claim and number comes from those pages or from a run.

## The parts

Eleven videos. Composition ids `MachineLearningEngineer-<n>-<Name>`, folders
`mle-*`, in an `Interview-Machine-Learning-Engineer` Studio folder, merged
for YouTube like the other tracks.

| # | Video | Source page | The argument |
| --- | --- | --- | --- |
| 0 | The interview, now | index, llm-systems-and-evals | What the four rounds test, what LLMs added (application design, inference economics, evaluation without one right answer, when not to use an LLM). The map of the series. |
| 1 | Generalization and evaluation | ml-fundamentals | Bias and variance, the three splits, leakage, cross-validation, over- and underfitting, L1 and L2, early stopping, the metrics (precision, recall, F1, ROC-AUC and PR-AUC, RMSE, MAE, R²) and class imbalance. |
| 2 | Models and how they learn | ml-fundamentals | Gradient descent and its batch sizes, the learning rate, losses (why cross-entropy for classification), logistic regression, trees, forests and boosting, kNN, k-means, PCA, SVMs, parametric vs non-parametric, and the features that feed them. |
| 3 | Coding for machine learning | coding | Vectorization and broadcasting, top-k with a heap, hash maps, cosine similarity, mini-batching, stable softmax, metrics from scratch, reservoir sampling, float32 vs float64, pairwise distances, shuffling features and labels together. Reasoning about cost and correctness, not syntax. |
| 4 | Statistics and probability | statistics-and-probability | Distributions, MLE, standard error, the CLT and the law of large numbers, confidence intervals, the bootstrap, p-values and tests, permutation tests, errors and power, sampling and its biases, Bayes, correlation and causation. |
| 5 | Deep learning | deep-learning | The perceptron, why non-linearity, activations, backprop, optimizers, regularizers, vanishing and exploding gradients, initialization, normalization, CNNs, RNNs, LSTMs and GRUs, transfer learning, softmax with cross-entropy. |
| 6 | NLP and LLMs | nlp-and-llms | Tokenization, embeddings static and contextual, self-attention and multi-head attention, the transformer and why it replaced RNNs, pretraining and fine-tuning, LoRA, prompting, RAG and when to fine-tune instead, context windows, hallucination, temperature, evaluating NLP models, attention's quadratic cost. |
| 7 | ML system design | ml-system-design | Batch vs online inference, feature stores, training-serving skew, cold start, data validation, feedback loops, serving latency and throughput, GPU vs CPU, quantization, distillation, request batching, autoscaling, and two sketches: fraud detection and a recommender. |
| 8 | Shipping and monitoring models | mlops, ml-system-design | What MLOps adds to DevOps, versioning and reproducibility, registries, CI/CD and evaluation gates, continuous training, monitoring, three kinds of drift and PSI, drift without labels, shadow, canary, blue/green, champion/challenger, rollback. |
| 9 | Serving LLMs | llm-systems-and-evals | Prefill and decode, the KV cache worked out, continuous batching and PagedAttention, quantization and speculative decoding, and the other levers. |
| 10 | Evaluating LLM systems | llm-systems-and-evals | Layered evals, LLM judges and their biases, RAG evaluated in halves, agents and tool calling, evaluating outcomes and trajectories, and when not to use an LLM. |

Each follows the house interview format (`src/editorial/interview.tsx`): a
question read aloud and on screen, the answer argued through figures, a rapid
round of the shorter questions, and a "Next" line into the following part.
The overview has no question cards.

## Ids, folders, heroes, budgets

Every hero is a creature no earlier video drew (checked against every
`illustrations.json` and the thumbnails). The overview's red panda is also
the track's YouTube thumbnail animal.

| # | Composition | Folder | Component | Hero | Characters (cap 9,500) |
| --- | --- | --- | --- | --- | --- |
| 0 | MachineLearningEngineer-0-Interview | mle-interview | MleInterview | red panda | ~2,500 |
| 1 | MachineLearningEngineer-1-Generalization | mle-generalization | MleGeneralization | flamingo | ~8,500 |
| 2 | MachineLearningEngineer-2-Models | mle-models | MleModels | toucan | ~9,300 |
| 3 | MachineLearningEngineer-3-Coding | mle-coding | MleCoding | tree frog | ~7,500 |
| 4 | MachineLearningEngineer-4-Statistics | mle-statistics | MleStatistics | zebra | ~8,500 |
| 5 | MachineLearningEngineer-5-DeepLearning | mle-deep-learning | MleDeepLearning | orangutan | ~9,000 |
| 6 | MachineLearningEngineer-6-NlpAndLlms | mle-nlp-llms | MleNlpLlms | dolphin | ~9,300 |
| 7 | MachineLearningEngineer-7-SystemDesign | mle-system-design | MleSystemDesign | giraffe | ~9,300 |
| 8 | MachineLearningEngineer-8-Mlops | mle-mlops | MleMlops | walrus | ~9,000 |
| 9 | MachineLearningEngineer-9-ServingLlms | mle-serving-llms | MleServingLlms | kingfisher | ~6,000 |
| 10 | MachineLearningEngineer-10-LlmEvals | mle-llm-evals | MleLlmEvals | pelican | ~7,500 |
| | | | | **Total** | **~86,000** |

## Which video answers which question

Each of the 167 questions is answered once. Where two pages ask the same
thing, it is answered once, in the video named, and counted "together".
Headings are the pages' own.

- **0, The interview, now:** the index (what interviewers probe, how AI has
  changed this interview, the topics) and llm-systems-and-evals' "How has the
  ML Engineer interview changed with LLMs?". No question cards; a narrated
  overview, as `be-interview` is.
- **1, Generalization and evaluation** (ml-fundamentals, 12; statistics, 1
  together): "Explain the bias–variance trade-off." with statistics' "Explain
  the bias–variance decomposition."; "Why split data into train / validation /
  test?"; "What is data leakage, and how do you prevent it?"; "What is k-fold
  cross-validation and when do you use it?"; "What is overfitting and how do
  you combat it?"; "What is underfitting?"; "L1 vs L2 regularization?";
  "Explain early stopping."; "What are precision, recall, and F1-score?";
  "What is ROC-AUC and when does PR-AUC matter more?"; "What is the difference
  between RMSE, MAE, and R²?"; "What is class imbalance and how do you handle
  it?".
- **2, Models and how they learn** (ml-fundamentals, 18; deep-learning, 1
  together): "Supervised vs unsupervised vs reinforcement learning?"; "How
  does gradient descent work?"; "What is the difference between batch
  gradient descent, SGD, and mini-batch GD?"; "How do you choose the learning
  rate?" with deep-learning's "How do you choose and schedule the learning
  rate?"; "What loss functions are used for regression vs classification?";
  "What is cross-entropy loss and why is it preferred over MSE for
  classification?"; "How does logistic regression work?"; "What is the
  difference between a parametric and a non-parametric model?"; "How does
  k-nearest neighbours (kNN) work?"; "What is k-means clustering?"; "What is
  PCA and what does it do?"; "How does a support vector machine (SVM) work?";
  "What are ensembles? Explain bagging and boosting."; "How does a Random
  Forest differ from a single decision tree?"; "What is gradient boosting?";
  "What is feature scaling and why does it matter?"; "What is one-hot
  encoding?"; "What is feature engineering?".
- **3, Coding for machine learning** (coding, all 15).
- **4, Statistics and probability** (statistics-and-probability, 17: all but
  the bias–variance decomposition, which Part 1 answers).
- **5, Deep learning** (deep-learning, 15; ml-fundamentals, 3 together): all
  but the learning-rate question (Part 2) and the three attention questions
  (Part 6). Answered together: "Compare sigmoid, tanh, and ReLU." with
  ml-fundamentals' "Name common activation functions and their trade-offs.";
  "Explain dropout, L2, and early stopping as regularizers." with "What is
  dropout and how does it regularize a neural network?"; "What causes
  vanishing and exploding gradients, and how do you fix them?" with "What is
  the vanishing gradient problem?".
- **6, NLP and LLMs** (nlp-and-llms, all 19; deep-learning, 3 together;
  ml-fundamentals, 1 together): "What is self-attention?", "What is
  multi-head attention…" and "Describe the transformer architecture." are
  asked on both pages and answered once; ml-fundamentals' "What are
  embeddings?" is answered with "What are word embeddings? Contrast word2vec
  and GloVe.".
- **7, ML system design** (ml-system-design, 17; mlops, 3 together): "Batch
  vs online (real-time) inference?" with mlops' "Batch vs online inference,
  and how do you choose?"; "What is a feature store and why use one?" with
  mlops' "What is a feature store, and what problem does it solve?"; "What is
  a feature store's offline vs online store?"; "What is training–serving
  skew?" (both pages); "What is the difference between online and offline
  feature computation?"; "How do you handle the cold-start problem in a
  recommendation system?"; "What is data validation and why does it matter
  before training?"; "What is label collection and how do feedback loops
  work?"; "How do you reduce model serving latency?"; "When should you use GPU
  vs CPU for model serving?"; "What is model quantization?"; "What is
  knowledge distillation?"; "What is throughput vs latency in model
  serving?"; "How does request batching improve GPU throughput?"; "How do you
  scale a model serving endpoint under variable load?"; "Sketch a fraud
  detection ML system."; "Sketch a recommendation / ranking system.".
- **8, Shipping and monitoring models** (ml-system-design, 14; mlops, 17, of
  which 7 together): from ml-system-design, "How do you monitor a model in
  production?", "What is drift, and what do you do about it?", "How do you
  roll out a new model version safely?", "What is A/B testing for models and
  how does it differ from shadow testing?", "How do you trigger model
  retraining?", "What is a model registry?", "How do you ensure
  reproducibility of ML experiments?", "How do you design a CI/CD pipeline for
  ML?", "What is shadow deployment?", "What is a canary deployment?", "How do
  you do rollback for a model?", "How do you version training data?", "How do
  you detect and respond to concept drift?", "What is population stability
  index (PSI)?"; answered together with them, mlops' monitoring, registry,
  CI/CD stages, shadow, canary, rollback and data versioning questions; and
  mlops' own "What is MLOps, and how does it differ from traditional DevOps?",
  "What do you need to version to reproduce a model?", "What is an evaluation
  gate, and why is it essential?", "What is continuous training (CT)?", "Data
  drift vs concept drift vs performance degradation?", "How do you detect
  drift when labels are delayed or unavailable?", "How does blue/green
  deployment apply to models?", "What tools support experiment tracking, and
  why does it matter?", "How do you package a model for deployment?", "What
  is a champion/challenger setup?".
- **9, Serving LLMs** (llm-systems-and-evals, 4): prefill and decode; the KV
  cache and its size; continuous batching and PagedAttention; quantization and
  speculative decoding (with the page's other levers).
- **10, Evaluating LLM systems** (llm-systems-and-evals, 6): "How do you
  evaluate an LLM application?", "When can you trust an LLM as a judge?",
  "How do you evaluate a RAG system?", "What is an agent, and how does tool
  calling work?", "How do you evaluate an agent?", "When should you not use an
  LLM?".

Check: ml-fundamentals 12 + 18 + 3 + 1 = 34; coding 15; statistics 1 + 17 =
18; deep-learning 1 + 15 + 3 = 19; nlp-and-llms 19; ml-system-design 17 + 14
= 31; mlops 3 + 17 = 20; llm-systems-and-evals 1 + 4 + 6 = 11. Total 167.

## How the videos join up

- **0 → 1:** classical ML did not leave, and the first thing every ML round
  tests is whether a model works on data it has not seen.
- **1 → 2:** you can now tell whether a model generalizes; next, the models
  themselves and how they learn.
- **2 → 3:** each of these is a few lines of NumPy, and the coding round asks
  you to write them fast and safely.
- **3 → 4:** code gives you a number; statistics says how far to trust it.
- **4 → 5:** maximum likelihood is what training minimizes, and a deep
  network minimizes it at scale.
- **5 → 6:** attention replaced recurrence, and language models are built on
  it.
- **6 → 7:** a model in a notebook is not a product: next, the system around
  it.
- **7 → 8:** once it is live, the world it learned from keeps changing.
- **8 → 9:** large language models bring a serving problem of their own:
  generation is slow and memory-hungry.
- **9 → 10:** fast and cheap is not enough if you cannot tell whether the
  answers are good.
- **10** closes the series.

## Look

The editorial style every video uses (white page, numbered figures, ink
wipes, watercolor spot art), with every rule under "What goes on screen" in
`video/README.md` from the first draft: one size and one family per line,
no cards (badges stay, borderless), outlined diagram boxes, vertical
hairlines between columns, sentence case, nothing under 19px. A few small
spot images, only where they earn it. Thumbnails use the green interview
scheme, with the overview's red panda.

## Images

Every image goes through the site's pipeline, as the request specifies:
OpenAI **`gpt-image-2.6-flare`, `quality: "low"`, `background:
"transparent"`**, synchronous (2.6 is not on the Batch API), with the alpha
check, about $0.02 per image. Heroes at 1536x1024 (`video-hero`), spots at
1024x1024 (`video-icon`), all in the shared watercolor style.

## Narration and cost

- **Voice:** Drew, as for every other interview series, on
  `eleven_v4_turbo`, in takes of about 1,800 characters.
- **Length:** about 86,000 characters for eleven videos. At the roughly 0.22
  credits a character measured on the Backend fixes, about **19,000
  ElevenLabs credits**, plus a few hundred for redos. The account had 162,092
  of 162,141 credits left when the build started.
- Scenes are built and checked on estimated timing before any audio exists,
  and the scripts get an independent read before anything is voiced.

## How it gets built

1. **Scripts and facts**, five writers (`BRIEF-SCRIPTS.md`): Parts 1 and 2
   (ml-fundamentals); 3 and 4 (coding, statistics); 5 and 6 (deep learning,
   NLP); 7 and 8 (system design, MLOps); 0, 9 and 10 (the index and LLM
   systems).
2. **A read of the scripts** by one reviewer who did not write them:
   question coverage, facts against runs and pages, bridges, overlap between
   parts, the series' rules. Fixes before voice.
3. **The coordinator wires the series in:** `src/Root.tsx`, `src/series.ts`,
   the lexicon entries the writers list, per-video entries under `out/`.
4. **Builders**, one per video (`BRIEF-BUILD.md`): scenes, art, voice, then
   `check:frames`, `check:motion`, `check:sync`, `check:mix`, and stills
   looked at.
5. **The coordinator** adds the thumbnail track, updates the README, runs the
   package checks and commits.
