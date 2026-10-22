# Data Scientist interview prep: video plan

**Track:** `content/interview/data-scientist/` (9 topic pages, a role overview, and a 110-question bank)
**Format:** the editorial style the Data Analyst series uses (`video/README.md`; its plan is `agent-outputs/20261021-2314-data-analyst-interview-video-plan.md`): `<EditorialPage>`, `EDITORIAL_DEFAULTS`, and the interview kit in `video/src/editorial/interview.tsx` (`QuestionCard`, `RapidFire`).
**Narrator:** Drew, as in the Data Analyst series (the user may change it; see Decisions).
**Opening:** no Dataslope series intro for now, as in the Data Analyst videos.
**Estimate:** about **84 minutes (75 to 93) in 12 videos**, about 64,400 characters of narration. One overview of about 2 minutes, then 11 topic videos of 5.5 to 11.5 minutes. Together they answer every one of the track's **158 unique interview questions** once.

## How the videos are cut

One video per topic page, in the track's own order, plus a short overview that opens the series. Two pages are too long for one video under the 9,500-character cap, so each becomes two parts: Machine learning (30 questions, about 16 minutes as one video) and Experimentation (28 questions once deduplicated, about 14). Every other page is one video.

Two speeds inside each video, as in the Data Analyst series:

- **Deep dives** take the questions with a trap or an idea worth drawing: a rare-disease test that is mostly wrong when it says yes, a confidence interval read as a probability, a split that flatters a model, peeking at a running test, a merge that fans out, an LLM judge that agrees 90% of the time and is still weak. Each gets a question card and a figure built up as it is answered, 30 to 60 seconds.
- **A rapid-fire round** closes each video with the questions whose answer is one line. The Data Analyst rounds ran at about 7 seconds a question, which is most of why those videos came in under their estimates.

**Each question is answered once.** The pages repeat each other. A repeated question is answered in the video of the page whose topic it is; where two pages have an equal claim, in the first of them in track order. That takes the pages' 175 questions to 158:

| Asked on | Question | Answered in | Why |
| --- | --- | --- | --- |
| Statistics | Conditional probability; mutually exclusive vs. independent; Bayes' theorem | Probability | the Probability page's own subject, and it asks all three |
| Statistics | The normal, Poisson and binomial distributions (3) | Probability | its walk through the common distributions and its Poisson-vs-binomial question answer all three at once |
| Statistics | Type I and II errors; power; one- vs. two-tailed; multiple comparisons; Simpson's paradox | Experimentation | the Experimentation page asks each about an experiment, and the Data Analyst series set the same precedent (Type I/II and power moved to A/B testing) |
| Probability | The Law of Large Numbers; the CLT and how it differs from the LLN | Statistics | both pages ask both; Statistics comes first and asks them as part of sampling, so its answer covers the difference |
| Deep learning | Gradient descent and the learning rate | Machine learning I | word for word the same question; ML comes first |
| Experimentation | Guardrail metrics | Product sense | a question about metrics |
| Experimentation | Bayesian A/B tests vs. frequentist | Statistics | the same idea as Statistics' frequentist-vs-Bayesian question, answered there on an A/B posterior |
| Product sense | The novelty effect | Experimentation | an experiment effect, and Experimentation asks it with primacy |

**No video:** the 110-question bank (it is practice), the runnable challenges, concept checks, and syntax a page shows only as code.

### Questions the Data Analyst series already answers

Many Data Scientist questions are asked, in the same words or nearly, on Data Analyst pages that already have videos. This plan **keeps them** so that each Data Scientist video stands alone on its page, and builds them from the Data Analyst scenes and results where the idea is the same, so the cost is narration rather than new figures. Only Python & pandas and SQL overlap enough that dropping the duplicates is worth a decision (see Decisions).

| Data Scientist video | Same idea, already answered in | Questions |
| --- | --- | --- |
| Python & pandas | DA Part 2, Pandas | 13 of 14: everything but the merge that blows up the row count |
| SQL | DA Part 1, SQL; DA Part 4, Advanced SQL | 9 of 15: `WHERE` vs. `HAVING`; window functions vs. `GROUP BY`; `ROW_NUMBER`/`RANK`/`DENSE_RANK`; day-over-day change (`LAG`); top N per group; running totals; keeping the latest row per key; pivoting; `COUNT(*)` vs. `COUNT(col)` |
| Statistics | DA Part 3, Statistics & communication; DA Part 7, A/B testing | correlation vs. causation; parameter vs. statistic (DA asks population vs. sample); p-values and confidence intervals at an analyst's level |
| Experimentation I and II | DA Part 7 | power, Type I/II errors and the minimum detectable effect; peeking; Simpson's paradox; novelty and primacy |
| Product sense | DA Part 7 | north star, guardrail and vanity metrics; ratio metrics |
| LLM evaluation | DA Part 8, AI-assisted analysis | checking an analysis an assistant wrote |

New to this series, with nothing to borrow: SQL's safe rates with `NULLIF`, cohort retention, sessionization, medians and percentiles, and churn (DA Part 1 teaches the anti-join, not the churn question); the merge that fans out (the pandas side of the SQL fan-out in DA Part 1); all of Probability, Machine learning, Deep learning and LLM evaluation; most of Experimentation and Product sense.

## What the estimate is based on

Measured on 2026-10-22.

**Questions** are the `###` headings under each page's `## Q&A`, up to the first `## Concept checks`, `## Challenges`, `## Go deeper` or `## Practice`. Deep learning has 17 such headings, but the 17th titles a code block ("The runnable check below: sigmoid and its derivative."), so it has 16 questions. **Prose words** are what is left of the page after stripping the frontmatter, fenced code, JSX components (`<CodeBlock>`, `<SqlCodeBlock>`, `<Chart>`, `<Figure>`, `<MultipleChoice>`, …), MDX comments and `$…$` math, and cutting everything from those closing sections on. **Answer words** are the same count for the text under each question heading.

| Page | Questions | Prose words | Answer words | Median answer | Model, as one video |
| --- | --- | --- | --- | --- | --- |
| statistics | 30 | 3,112 | 2,824 | 90 | 19.6 min |
| probability | 16 | 1,437 | 1,253 | 70 | 9.4 |
| machine-learning | 30 | 2,791 | 2,536 | 86 | 18.2 |
| deep-learning | 16 | 1,324 | 1,066 | 68 | 8.4 |
| experimentation | 30 | 2,737 | 2,430 | 75 | 17.6 |
| product-sense-and-metrics | 15 | 1,387 | 1,161 | 72 | 8.7 |
| python-and-pandas | 14 | 850 | 674 | 51 | 6.1 |
| sql | 15 | 1,265 | 1,053 | 46 | 8.2 |
| llm-evaluation | 9 | 1,309 | 1,127 | 128 | 7.6 |
| **Total** | **175** | **16,212** | **14,124** | **74** | |

The Data Analyst pages, counted the same way, run 34 to 89 words a median answer and 57 across the track; these run 46 to 128, and 74 across the track.

**The model** is the Data Analyst plan's: narration at **137 words a minute** (12.8 characters a second, measured across the 18 shipped course videos), each question posed in about 12 words and answered at about **70% of its written length**, plus about **10 words to read a result** on screen, and **0.4 minutes per video** for the opening and the closing bridge.

**What the Data Analyst videos actually came to**, from each video's narrated length (`npm run cues`: the last beat's end plus its 2.6 s tail):

| DA video | Planned | Built | Built ÷ planned |
| --- | --- | --- | --- |
| 1. SQL | ~10 | 7:57 | 0.80 |
| 2. Pandas | ~11.5 | 8:57 | 0.78 |
| 3. Statistics & communication | ~8.5 | 8:04 | 0.95 |
| 4. Advanced SQL | ~8 | 6:36 | 0.83 |
| 5. Excel & spreadsheets | ~7.5 | 7:18 | 0.97 |
| 6. Data visualization (voiced, in review) | ~11.5 | 9:45 | 0.85 |
| 7. A/B testing & metrics (voiced, in review) | ~9.5 | 9:05 | 0.96 |
| 8. AI-assisted analysis | ~6.5 | 5:20 | 0.82 |
| **Total** | **~73** | **63:02** | **0.87** |

The rapid rounds ran faster than the 10 to 15 s a question the model assumed, so the model reads long. **The estimates below are the model times 0.87.** The range in the headline is the same model times 0.78 and 0.97, the lowest and highest ratios built. Characters are minutes times 768 (12.8 a second).

The videos that came in nearest their estimate (Statistics & communication, Spreadsheets, A/B testing) are mostly deep dives, which is what this track is too. So read the Statistics estimate as the one at risk: at 0.95 it would be 12.4 minutes, at the cap. The cap is checked on the script, before anything is voiced, so a long draft is cut on paper (see Decisions for the fallback split).

## The videos

Order follows the track (`content/interview/data-scientist/meta.json`), so each video can be embedded on its page and still lead into the next one. Compositions are named `DataScientist-<n>-<Name>` in a Studio folder `Interview-Data-Scientist`, as the Data Analyst ones are.

| # | Composition | Folder | Page | Questions | Min | Characters |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | DataScientist-0-Interview | ds-interview | index | (overview) | ~2 | ~1,500 |
| 1 | DataScientist-1-Statistics | ds-statistics | statistics | 19 | ~11.5 | ~8,700 |
| 2 | DataScientist-2-Probability | ds-probability | probability | 14 | ~7 | ~5,500 |
| 3 | DataScientist-3-MlEvaluation | ds-ml-evaluation | machine-learning (I) | 15 | ~8 | ~6,100 |
| 4 | DataScientist-4-MlModels | ds-ml-models | machine-learning (II) | 15 | ~8 | ~6,300 |
| 5 | DataScientist-5-DeepLearning | ds-deep-learning | deep-learning | 15 | ~7 | ~5,200 |
| 6 | DataScientist-6-ExperimentDesign | ds-experiment-design | experimentation (I) | 14 | ~7.5 | ~5,900 |
| 7 | DataScientist-7-ExperimentsInPractice | ds-experiments-in-practice | experimentation (II) | 14 | ~6.5 | ~5,000 |
| 8 | DataScientist-8-ProductSense | ds-product-sense | product-sense-and-metrics | 14 | ~7 | ~5,500 |
| 9 | DataScientist-9-PythonPandas | ds-python-pandas | python-and-pandas | 14 | ~5.5 | ~4,100 |
| 10 | DataScientist-10-Sql | ds-sql | sql | 15 | ~7 | ~5,500 |
| 11 | DataScientist-11-LlmEvaluation | ds-llm-evaluation | llm-evaluation | 9 | ~6.5 | ~5,100 |
| | | | **Total** | **158** | **~84** | **~64,400** |

Every video is under the 9,500-character cap (about 12.4 minutes). Statistics is the closest at about 8,700; nothing else passes 6,300.

Below, **Draws on** lists what can be borrowed: the page's own charts (`charts/<slug>.mjs`, already in the brand colors and reviewed in `/dashboard/admin/charts`), course videos in `video/src/videos/`, and Data Analyst scenes. **Facts** says which engine computes each number and what cannot be computed honestly. The Python engine is the site's Pyodide, **314.0.7** (Python 3.14.2), which ships NumPy 2.4.6, pandas 3.0.2, SciPy 1.18.0, scikit-learn 1.8.0, statsmodels 0.14.6, XGBoost 2.1.4 and LightGBM 4.6.0, and has **no** PyTorch, TensorFlow or SHAP. The SQL engine is DuckDB-Wasm 1.32.0, the one the SQL page's `<SqlCodeBlock dialect="duckdb">` blocks run.

### 0. The Data Scientist interview (~2 min)

From `index.mdx`: what the loop looks like (probability and statistics questions, a modeling case such as "how would you predict X?", an A/B-test design discussion, and usually a Python/pandas or SQL screen), the five things interviewers probe (statistics and probability, modeling, experimentation, coding, communication), what AI has changed (evaluating LLM features as a measurement problem, experiments where the treatment itself varies, checking work an assistant wrote, rounds with and without AI allowed), and how the series runs: deep dives, then a rapid round, with practice on each page.

**Hero:** an otter.

### 1. Statistics (19 questions, ~11.5 min; built at 10:25)

**Deep dives**
1. Parameter vs. statistic, standard error vs. standard deviation, and the sampling distribution (3)
2. Why the Central Limit Theorem matters, the Law of Large Numbers, and how the two differ (2, with the Probability page's CLT question)
3. Maximum likelihood, and what makes an estimator unbiased: why the sample variance divides by n − 1 (2)
4. What a 95% confidence interval actually means: of 100 intervals from 100 samples, about 95 cover the truth, and any one of them either does or does not
5. Hypothesis testing's four steps, on the null and alternative for a click-through-rate test (2)
6. What a p-value is, and what it is not
7. Choosing a test: z vs. t, chi-square, and ANOVA (3)
8. Effect size beside the p-value: a tiny difference is significant at a large enough n
9. p-hacking: the garden of forking paths

**Rapid-fire:** frequentist vs. Bayesian (answering Experimentation's Bayesian A/B question with a Beta posterior on a conversion rate); parametric vs. non-parametric; correlation vs. causation.

**Draws on:** charts `standard-error-vs-n`, `sampling-distribution-build`, `clt-convergence`, `lln-convergence`, `mle-likelihood-curve`, `bessel-correction`, `ci-coverage`, `p-value-tail-area`, `t-vs-normal`, `chi-square-shapes`, `anova-between-within`, `effect-size-overlap`, `forking-paths`, `beta-posterior-update`, `mann-whitney-vs-t`. Course videos Stats-5-3 SamplingDistributions, Stats-5-4 CentralLimitTheorem, Stats-5-5 StandardError, Stats-6 Estimation, Stats-7 TestingHypotheses and Stats-8 InterpretingResults teach each of these from scratch; this video stays at the length of an answer and its numbers must agree with theirs. Correlation vs. causation is DA Part 3's figure.

**Facts:** all computable in Pyodide with NumPy and SciPy, seeded: standard error against n, interval coverage over repeated samples, the likelihood curve, the n − 1 bias, `scipy.stats` z, t, chi-square, ANOVA and Mann–Whitney on the page's own examples (the page has 10 runnable Python blocks; reuse their data and seeds).

**Abbreviations to expand on first use:** SE, CLT, LLN, MLE, CI, CTR, ANOVA.

**Hero:** a hedgehog.

### 2. Probability (14 questions, ~7 min; built at 7:44)

**Deep dives**
1. Conditional probability and Bayes' theorem (2)
2. The rare-disease test: 1% prevalence, 99% sensitivity and a 5% false-positive rate give a positive result about a 17% chance of being right
3. Independent vs. mutually exclusive: nearly opposites (2)
4. Expectation, variance, and linearity of expectation (2)
5. The distributions to know, Poisson vs. binomial, and what "memoryless" means for the exponential (3, with Statistics' normal, Poisson and binomial questions)
6. Monty Hall: switching wins two times in three
7. The birthday problem: 23 people, 253 pairs, just over 50%

**Rapid-fire:** covariance vs. correlation; the expected value of a bet that pays $10 one time in five and loses $3 otherwise (minus 40 cents a play).

**Draws on:** charts `base-rate-grid`, `prosecutors-fallacy`, `mosaic-independence`, `expectation-balance`, `continuous-families`, `poisson-shapes`, `binomial-shapes`, `exponential-memoryless`, `monty-hall-simulation`, `birthday-problem-curve`, `correlation-scatters`. Course videos BaseRate (the rare-disease figure) and Stats-3 Probability and Stats-4 Distributions.

**Facts:** exact arithmetic for Bayes, the birthday probability and the bet; seeded Monte Carlo in Pyodide for Monty Hall and the birthday curve, as the page's six runnable blocks do.

**Hero:** a rabbit.

### 3. Machine learning I: training and evaluating (15 questions, ~8 min; built at 8:29)

**Deep dives**
1. The bias–variance trade-off, and detecting and fixing overfitting (2)
2. L1 vs. L2 regularization, and elastic net (2)
3. Cross-validation, and the train/validation/test discipline: one split is a lottery (2)
4. Learning curves: more data, or a different model?
5. Precision vs. recall, and where the threshold sits
6. ROC-AUC vs. PR-AUC, and class imbalance (2)
7. Calibration: a score of 0.8 that is right 80% of the time
8. Gradient descent and the learning rate (answers Deep learning's identical question)

**Rapid-fire:** RMSE, MAE and R-squared; cross-entropy vs. MSE for classification; choosing between two models.

**Draws on:** charts `bias-variance`, `regularization-l1-l2`, `one-split-is-a-lottery`, `learning-curve`, `precision-recall-threshold`, `roc-curve`, `base-rate-grid`, `calibration-curve`, `gradient-descent-lr`, `mae-vs-rmse`. Course video Overfitting.

**Facts:** real fits in Pyodide with scikit-learn 1.8.0, on a seeded `make_classification` set or a dataset bundled with scikit-learn (`load_breast_cancer`, `load_diabetes`; the `fetch_*` loaders need the network and are out). Cross-validation spread, ROC and PR curves, calibration bins and the learning-rate paths are all computed. Probe scikit-learn in Pyodide before writing this script: it is the one runtime piece the Data Analyst series never used.

**Abbreviations:** ROC, AUC, PR, RMSE, MAE, MSE.

**Hero:** a beaver.

### 4. Machine learning II: models and features (15 questions, ~8 min; built at 9:34)

**Deep dives**
1. Logistic regression: how it turns a score into a probability, and why not linear regression for a binary target (2)
2. How a decision tree chooses a split
3. Bagging vs. boosting, random forests, and gradient boosting vs. AdaBoost (3)
4. k-nearest neighbors, and what k does to the boundary
5. k-means, and choosing k
6. PCA, and the curse of dimensionality (2)
7. Bagged feature importance vs. SHAP values

**Rapid-fire:** generative vs. discriminative; feature scaling; encoding categorical variables; feature selection.

**Draws on:** charts `odds-vs-probability`, `decision-tree-depth`, `ensemble-variance`, `knn-k-boundary`, `kmeans-elbow`, `pca-scree`, `curse-of-dimensionality`.

**Facts:** scikit-learn in Pyodide for the tree, forest, boosting, kNN, k-means and PCA figures. The SHAP library is not in Pyodide, so the SHAP figure computes exact Shapley values by brute force for a small model in NumPy (a handful of features is cheap), against scikit-learn's `permutation_importance` and the forest's impurity importance. Say "SHAP" only for what those exact values show; don't present library output that was never run.

**Abbreviations:** kNN, PCA, SHAP, AdaBoost.

**Hero:** a raccoon.

### 5. Deep learning (15 questions, ~7 min; built at 9:55)

**Deep dives**
1. What a neuron computes, and why the activations must be non-linear: two linear layers are one linear layer (2)
2. The common activations, and vanishing and exploding gradients: the sigmoid's slope is at most 0.25, so ten layers of it scale a gradient by under one in a million (2)
3. Backpropagation, on the page's sigmoid and its derivative (the code block the page's 17th heading introduces)
4. SGD, momentum, RMSProp and Adam
5. Overfitting in a network, dropout, and weight decay vs. L2 (3)
6. Batch normalization
7. CNN vs. RNN vs. transformer, and self-attention in one figure (2)

**Rapid-fire:** which loss goes with which output layer; weight initialization; epoch, batch and iteration.

**Draws on:** charts `gradient-descent-lr` and `learning-curve`; the gradient-descent figure from Part 3, so the learning rate is not explained twice.

**Facts:** no deep-learning framework runs in Pyodide, so every figure is NumPy by hand: a two-layer network collapsing to one matrix, the sigmoid derivative and the product of ten of them, optimizer paths on a seeded ravine-shaped loss, dropout masks, and a four-token self-attention computed in full. Claims about large models (what a transformer was trained on, how big) are not computable here and stay qualitative, without numbers.

**Abbreviations:** SGD, RMSProp, Adam (adaptive moment estimation), CNN, RNN, ReLU.

**Hero:** an octopus.

### 6. Experimentation I: designing the test (14 questions, ~7.5 min; built at 8:13)

**Deep dives**
1. Designing an A/B test for a new feature, and choosing its primary metric (2)
2. The randomization unit, and why it matters
3. Type I and II errors, and power and what drives it (2, with Statistics' questions on both)
4. Calculating the sample size, from the minimum detectable effect
5. One- vs. two-sided tests (with Statistics' one- vs. two-tailed question), and non-inferiority tests (2)
6. Why fix the sample size instead of peeking, and the sequential probability ratio test that makes looking legitimate (2)
7. CUPED: subtracting what the pre-period already predicts

**Rapid-fire:** a sensitive vs. a robust metric; stratified randomization; the A/A test.

**Draws on:** charts `randomisation-balances-confounders`, `alpha-power-tradeoff`, `power-vs-n`, `sample-size-margin-of-error`, `one-vs-two-sided`, `pvalues-under-null`, `ab-test-peeking`, `pairing-removes-variance`. DA Part 7 drew power, the MDE and peeking; reuse its data where the question is the same, so the two series' numbers agree. Stats-9 StatisticsInPractice runs an A/B test end to end.

**Facts:** sample size and power from `statsmodels.stats.power` and checked against the closed form; the peeking false-positive rate from a seeded simulation of A/A tests checked daily; CUPED's variance reduction measured on seeded pre/post data, all in Pyodide.

**Abbreviations:** A/B, MDE, SPRT, CUPED (Controlled-experiment Using Pre-Experiment Data).

**Hero:** a heron.

### 7. Experimentation II: experiments in practice (14 questions, ~6.5 min)

**Deep dives**
1. Sample ratio mismatch: a 50/50 split that comes back lopsided, and the chi-square test that says whether chance explains it
2. Common pitfalls, and what "no significant difference" does and does not tell you (2)
3. Simpson's paradox in an experiment (with Statistics' Simpson's question)
4. Novelty and primacy effects (with Product sense's novelty question)
5. The multiple comparisons problem (with Statistics' question), Bonferroni against Benjamini–Hochberg
6. Network effects and interference, switchback experiments, and concurrent experiments that interfere (3)
7. Quasi-experiments and difference-in-differences

**Rapid-fire:** ATE vs. ATT; long-running experiments; holdbacks; meta-analysis (with the winner's curse).

**Draws on:** charts `simpsons-paradox`, `novelty-effect-fades`, `multiple-comparisons`, `winners-curse`. The SimpsonsParadox course video and DA Part 7's Simpson's and novelty scenes.

**Facts:** the SRM chi-square in SciPy on the video's own counts; Simpson's on the page's segments; multiple-comparison corrections from `statsmodels.stats.multitest`; difference-in-differences on a small seeded panel. Network effects are a mechanism, not a measurement: draw the mechanism, and give no invented "bias of X%".

**Abbreviations:** SRM, ATE, ATT, DiD.

**Hero:** a turtle.

### 8. Product sense & metrics (14 questions, ~7 min)

**Deep dives**
1. A north-star metric, and the guardrails beside it (2, with Experimentation's guardrail question)
2. Leading vs. lagging indicators, and Goodhart's law (2)
3. Success metrics for a "Save for later" button
4. Diagnosing a sudden 8% drop in daily active users: is it real, is it broad, what changed
5. Signal or noise: a metric that swings 3% on a normal day has not dropped at 2%
6. Testing a new recommendation algorithm, and what to do when you cannot run an A/B test (2)
7. Sizing on the spot: a market estimate, and a feature's impact before it is built (2)

**Rapid-fire:** trading off competing metrics; vanity metrics; ratio metrics.

**Draws on:** charts `metric-definition-drift`, `missing-as-zero`, `noise-looks-like-a-trend`, `power-vs-n`, `dashboard-kpi-trend`. Course video RandomWalks ("Trends that are not there") for signal and noise. DA Part 7's metric and ratio-metric scenes.

**Facts:** the DAU drop's segments, the noise band and the sizing arithmetic are the video's own made-up numbers and the script says so ("say the app has…"); no real company's figures. The Fermi estimate shows its assumptions on screen, since the structure is the answer.

**Abbreviations:** DAU, MAU.

**Hero:** a squirrel.

### 9. Python & pandas (14 questions, ~5.5 min)

**Deep dives**
1. Why vectorization beats a Python loop
2. Split-apply-combine: what `groupby` returns, `agg` vs. `transform` vs. `apply`, and a percentage of each group's total (3)
3. `merge` vs. `join` vs. `concat`, and the merge that silently blows up the row count: a non-unique key on the right, and `validate="many_to_one"` raising instead (2)
4. Missing data, and `SettingWithCopyWarning` (2)
5. Wide to long and back

**Rapid-fire:** `map`, `apply` and `DataFrame.map`; method chaining; a vectorized `CASE` (`np.select`, `Series.case_when`); the `category` dtype; datetimes.

**Draws on:** DA Part 2 (Pandas) for every question but the merge blow-up, whose SQL twin is DA Part 1's fan-out; PandasGroupby.

**Facts:** pandas 3.0.2 in Pyodide, as DA Part 2. Two things to say carefully: pandas 3 has copy-on-write, so `SettingWithCopyWarning` no longer fires there and is named as the behavior of older versions interviewers still ask about (DA Part 2 settled this wording); and a loop-vs-vectorized timing measured in WebAssembly is not a laptop's, so show the ratio and say where it was measured, or say "many times faster" without a number.

**Hero:** a badger.

### 10. SQL (15 questions, ~7 min)

**Deep dives**
1. INNER vs. LEFT JOIN for a retention query, and churn as an anti-join: the users who did not come back are the point (2)
2. A rate that cannot divide by zero: `NULLIF`, and the integer division that truncates a rate to 0
3. Cohort retention: a cohort per first month, then the share still active each month after
4. Sessionization: `LAG`, a flag where the gap passes 30 minutes, and a running sum of the flags
5. The median and percentiles: `PERCENTILE_CONT` against `PERCENTILE_DISC`, and why latency reports p90

**Rapid-fire:** `WHERE` vs. `HAVING`; window functions vs. `GROUP BY`; `ROW_NUMBER`, `RANK` and `DENSE_RANK`; day-over-day change; top N per group; a running total; keeping the most recent row per key; pivoting; `COUNT(*)` vs. `COUNT(col)` vs. `COUNT(DISTINCT col)`.

**Draws on:** chart `join-types-venn`. DA Parts 1 and 4 answer the nine rapid questions in depth, which is why they are rapid here; LeftJoinTrap and WindowFunctions.

**Facts:** every query run by a `check.mjs` in DuckDB-Wasm 1.32.0 through `scripts/lib/sql-engines.mjs`, on the page's own tables (its five `<SqlCodeBlock>`s), as the Data Analyst SQL videos do.

**Hero:** a seal.

### 11. LLM evaluation (9 questions, ~6.5 min)

**Deep dives**
1. How Data Scientist interviews have changed with AI
2. Measuring an LLM feature's quality: from the decision to a rubric, real traffic sampled by intent, expert labels, paired scoring
3. How large an eval set needs to be: at 100 items, a pass rate of 80% means 72% to 88%, so a three-point change is invisible; pairing the comparison (McNemar) helps more than size
4. Whether an LLM judge can be trusted: 90% raw agreement with a 90/10 label split is a Cohen's kappa of 0.44
5. A/B testing an LLM feature: sticky randomization, more variance, a pinned model version, and cost and latency guardrails
6. Reporting the share of complaints an LLM classifier finds: 20% labeled, about 17.6% once its sensitivity (0.90) and specificity (0.95) are corrected for
7. Checking an analysis an assistant wrote

**Rapid-fire:** why a thumbs-up rate is a weak primary metric; benchmark contamination.

**Draws on:** course video LlmTemperature ("the treatment is a distribution, not a fixed change"); DA Part 8's checking scene.

**Facts:** the interval half-widths, kappa and the Rogan–Gladen correction are arithmetic on the page's own numbers; McNemar on the video's own paired pass/fail table. Not computable here: the judge biases (position, length, the judge's own model family), benchmark contamination, and a provider changing a model mid-test. They are named and drawn as mechanisms, with no invented rates.

**Abbreviations:** LLM, CI, p95 (the 95th percentile).

**Hero:** a parrot. Closes the series, pointing to the 110-question bank.

## How the videos join up

Each video ends on a bridge into the next one, written fresh for each (see the rules below). What each bridge has to carry:

- **0 → 1:** nearly every loop opens with probability and statistics.
- **1 → 2:** the tests rest on probability, and the probability round has its own puzzles.
- **2 → 3:** a model is a probability estimate; the first questions about it are whether it generalizes and how it is scored.
- **3 → 4:** with evaluation settled, which model, and why.
- **4 → 5:** when the model is a neural network.
- **5 → 6:** a model that scores well offline still has to win a test.
- **6 → 7:** a well-designed test can still go wrong after launch.
- **7 → 8:** choosing what to test, and what to measure, is the product-sense round.
- **8 → 9:** the case study ends with code.
- **9 → 10:** the same questions in SQL.
- **10 → 11:** the newest round: measuring features built on language models.
- **11** closes the series.

## What carries over from the Data Analyst series

Every rule the Data Analyst series settled holds here, and none of it needs re-deciding:

- **Questions are numbered, figures are not.** The kicker says "Question 5"; a figure is titled by what it shows. Deep-dive questions are numbered aloud; rapid-round numbers appear on screen only.
- **One meaning per color:** red is the trap, the wrong answer or the error; green is the right answer; yellow is what the narration points at; blue is data. Brand tokens only (`video/src/theme/brand.ts`), and type in a hue reads `inkOf`.
- **A figure arrives as its question finishes being read**, not on the first word that names it. When a question and its answer share a beat, cue the figure to the answer's first words.
- **Nothing on screen stands still for more than 3 seconds** (`npm run check:motion`); a bridge needs its own marks and clears to pass.
- **Abbreviations are expanded the first time they are said**, in every video, even ones most learners know (listed per video above).
- **Each video's opening, the line that splits the deep dives from the quick round, the quick round's own lead-in, and the closing bridge are written fresh**, unlike any other video's in either series, so the series does not feel mechanical.
- **One watercolor hero per video, a different creature each**, none of them a creature the Data Analyst series used (panda, elephant, penguin, marmot, duck, fox, owl): otter, hedgehog, rabbit, beaver, raccoon, octopus, heron, turtle, squirrel, badger, seal, parrot, in the order of the table.
- **Images** go through the pipeline (`npm run illustrations -- <video>` from `video/`): `gpt-image-2.5-flare`, quality `low`, transparent background, Batch API, the video's own `illustrations.json` with the editorial watercolor style. A batch still `in_progress` an hour after it was submitted is cancelled and run with `sync`.
- **Voice:** Drew on `eleven_v4_turbo`, recorded in takes of about 1,800 characters split at scene changes (`npm run narrate -- <video>`). After review, **re-voice only the beats whose text changed**, never the whole video and never with `--force`.
- **No series intro yet:** the first scene opens at frame 0, its first beat is `scene: true`, and the script sets no `leadIn`. Adding the intro later is one `<SeriesIntro course="Data Scientist Interview Prep" …/>` per video and needs no re-voicing.
- **Timing:** `minPause: COURSE_MIN_PAUSE`, 0.6 to 1.0 s after a beat that defines a term or lands a result; anything to be read stays at full strength for at least its word count divided by 2 seconds; no on-screen text that is not spoken; every animation cued to a word. Then `check:cues`, `check:sync`, `check:frames`, `check:motion` and `check:mix`.
- **Facts come from the page's engine** (above), through a `check.mjs` or `measure.py` that writes `results.json` for `data.ts` to read, with seeded randomness. A number that cannot be computed honestly is not shown.
- **Previews are rendered below the target resolution** (`npm run render:preview`) and sent for review before the full render.
- **Prose rules apply to the narration:** no em dashes, no filler, every fact checked against the page and a real run.

## Building order

In track order. The kit, the rapid round and both engines are proven by the Data Analyst series, so no separate pilot is needed. The one new runtime piece is scikit-learn in Pyodide (Part 3); probe it with a few fits before Part 3's script is written, so a missing feature changes the script rather than a finished scene.

## Decisions for the user

- **Narrator.** Drew is proposed, for continuity with the Data Analyst series. Hope (the other house voice) would tell the two series apart by ear. One choice for all 12 videos.
- **Python & pandas and SQL against the Data Analyst videos.** Proposed: keep every question, so each video stands alone on its page, built largely from the DA scenes. The alternative drops the word-for-word duplicates and points to DA Parts 1, 2 and 4: Python & pandas would keep one question (the merge blow-up) and SQL its six deep-dive questions, which together make one ~4.5-minute "coding screen" video instead of two (~12.5 minutes), saving about 8 minutes and 6,000 characters. A viewer on the Python page would then be sent to another role's series for 13 of its 14 questions.
- **Statistics as one video or two.** Proposed: one, at ~11.5 minutes and ~8,700 characters. Its answers are the track's longest, and the DA video most like it came in at 0.95 of its estimate, which would put it at the cap. If the script runs over 9,500 characters, the fallback is two parts at the existing seam: Statistics I, sampling and estimation (8 questions, ~5 min), and Statistics II, testing (11 questions, ~6.5 min). That makes 13 videos.
- **Where the shared testing questions live.** Proposed: Type I/II errors, power, one- vs. two-tailed tests, multiple comparisons and Simpson's paradox are answered in Experimentation, as the Data Analyst series did with A/B testing. The alternative keeps them in Statistics, which would push Statistics past the cap and force the split above.
- **Order.** Proposed: the track's order, so each video embeds on its page and bridges in page order. Probability before Statistics would teach more naturally (Statistics now answers the CLT and LLN), at the cost of the videos running in a different order from the pages.

## Still open from the Data Analyst plan

- **Embedding:** where the files are hosted and how a page embeds one; chapters per question would let a viewer jump to the one they need. Each question beat is already marked with the question's text, so a chapter list can be written out once this is decided.
- **Narration budget:** about 64,400 characters for the series, plus re-voicing only the beats that change after review.
