# Statistics for Data Science with Python: video plan

**Course:** `content/courses/statistics-for-data-science-python/` (32 lessons in 9 sections)
**Format:** the editorial style (`video/src/editorial/`): warm paper, Source Serif 4 headlines, watercolor spot illustrations, no burned-in captions. See `video/README.md`.
**Estimate:** about **80 minutes (75 to 95) in 37 videos of 2 to 3 minutes**, grouped into 9 units.
**Pilot:** Unit 5, Sampling. In progress, started 2026-10-16.

## How the videos are cut

Videos follow ideas, not pages. Each video carries one idea, about 2 to 3 minutes of narration, and is embedded at the section of the lesson where that idea is taught. An idea that spans lessons gets one video, embedded in every lesson that needs it.

Why short, idea-sized videos:

- **They are the proven format.** The 18 existing editorial videos are one claim and one visual argument each, about 80 seconds. A course video stretches that to 2 to 3 minutes rather than inventing a new shape.
- **They can be reused.** Standard error, survivorship bias, p-hacking and base-rate neglect each appear in more than one lesson. One video serves all of them.
- **They stay well under the point where viewers stop.** In a study of edX lecture videos, the median time viewers spent watching was at most about 6 minutes however long the video was (Guo, Kim and Rubin, "How video production affects student engagement", L@S 2014).
- **One weak video can be redone without touching the rest.**

## What the estimate is based on

Measured from the lesson files, with code blocks, quizzes and challenges stripped from the prose:

| | |
| --- | --- |
| Lessons | 32, in 9 sections |
| Explanatory prose | 39,263 words, about 165 minutes to read at 238 words a minute |
| Hands-on material | 160 code blocks, 59 challenges, 191 quiz questions, 93 charts |
| Voiced pace | 135 to 140 words a minute with pauses (CPointers 139, LlmTemperature 135) |

A video per page, narrating about 40% of each page, came to 34 videos and 123 minutes. Cutting by idea brings that to about 80, for three reasons:

- **Ideas repeated across pages are told once.** The square-root-of-n law is taught in four lessons (populations-and-samples, sampling-distributions, central-limit-theorem, standard-error). Survivorship bias, p-hacking, base-rate neglect, "summaries lie" and the normal distribution each appear in two.
- **Code mechanics stay on the page.** A video adds little to scipy's four distribution methods, the loc/scale convention or pandas dtypes.
- **Practice and "putting it together" sections stay on the page.**

## The units

★ marks an existing video, which needs extending or only a voice-over. Minutes are estimates.

### Unit 1. Thinking statistically (7 min, 3 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 1.1 | Signal and noise: why one number isn't enough | 2.5 | why-statistics-matters; statistical-thinking: variation, signal vs. noise, the data-generating process, thinking in distributions |
| 1.2 | Population, sample, parameter, statistic | 2.5 | populations-and-samples: population vs. sample, parameters vs. statistics, a statistic is a random variable |
| 1.3 | What kind of data is it, and the encoding trap | 2 | types-of-data: categorical vs. numerical, encoding traps, why type decides which tests are valid |

### Unit 2. Describing data (9 min, 4 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 2.1 | Mean vs. median: where skew pulls the center | 2 | measures-of-center: the three centers, skew and outliers, when each is right |
| 2.2 | Spread: SD, why n−1, and IQR | 2.5 | measures-of-spread: variance and SD, the n−1 divisor, IQR and MAD |
| 2.3 | Shape, tails, and what an outlier isn't | 2 | shape-and-outliers |
| 2.4 | Always plot first: summaries lie, and choosing the plot | 2.5 | visualizing-distributions: why summaries lie, the bin trap, which plot when; statistical-fallacies: trusting a summary without looking |

### Unit 3. Probability (10 min, 5 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 3.1 | Long-run frequency and the law of large numbers | 2 | probability-basics: the frequentist view, simulation, the law of large numbers |
| 3.2 | Conditioning and independence | 2 | conditional-probability: what conditioning means, independence, from a table |
| 3.3 | ★ Bayes and the 99% test that's usually wrong (BaseRate) | 2 | conditional-probability: Bayes' rule, the 99% test, updating a base rate; statistical-fallacies: base-rate neglect |
| 3.4 | Monty Hall | 1.5 | conditional-probability: the Monty Hall problem |
| 3.5 | Expectation, variance, and expected value for decisions | 2.5 | random-variables |

### Unit 4. Distributions (9 min, 4 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 4.1 | Counting distributions, and choosing one | 2.5 | discrete-distributions |
| 4.2 | Probability is area: densities and quantiles | 2 | continuous-distributions: area under the curve, uniform, exponential, quantiles |
| 4.3 | The normal, 68–95–99.7, z-scores | 2.5 | the-normal-distribution; continuous-distributions: the normal, a first look |
| 4.4 | Fitting a distribution, and where to stop trusting it | 2 | working-with-distributions: fitting, sanity-checking, not extrapolating |

### Unit 5. Sampling (10 min, 5 videos): the pilot

| # | Video | Min | Covers | Embeds at | Status |
| --- | --- | --- | --- | --- | --- |
| 5.1 | Bigger and biased is still biased | 2.5 | sampling-and-bias: why the method is everything, convenience sampling, the punchline, bias vs. variance | sampling-and-bias, "The punchline: a bigger biased sample does not help" | in progress (`SamplingBias`) |
| 5.2 | Survivorship bias | 1.5 | sampling-and-bias and statistical-fallacies: survivorship bias | both lessons' "Survivorship bias" sections | in progress (`SurvivorshipBias`) |
| 5.3 | The three distributions to keep apart | 2.5 | sampling-distributions: the three distributions, building one by hand, more samples vs. larger samples, any statistic | sampling-distributions, "The three distributions you must keep separate" | in progress (`SamplingDistributions`) |
| 5.4 | ★ The central limit theorem | 1.5 | central-limit-theorem | central-limit-theorem, "Watch it happen from a skewed population" | built; needs a voice-over (`CentralLimitTheorem`) |
| 5.5 | Standard error and the √n law | 2 | standard-error; the √n sections of populations-and-samples and sampling-distributions | standard-error, "Standard deviation vs. standard error" | in progress (`StandardError`) |

The CLT video already ends on "four times the data, half the spread", so 5.5 starts from there rather than repeating it: SD against SE, estimating SE from one sample and checking it against the simulated spread, what diminishing returns cost, and SE as the ruler every interval and test is built from.

### Unit 6. Estimation (7 min, 3 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 6.1 | What "95% confident" means | 2.5 | confidence-intervals: building one, what 95% means, four misreadings |
| 6.2 | What makes an interval wide | 2 | confidence-intervals: what controls the width, a CI for a proportion, CIs and tests as two views |
| 6.3 | The bootstrap | 2.5 | the-bootstrap |

### Unit 7. Testing (16 min, 7 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 7.1 | The logic of a test | 2.5 | hypothesis-testing: the core idea, the courtroom, the five steps, one- vs. two-sided |
| 7.2 | The p-value as a tail area, and what it isn't | 2.5 | p-values: the definition, tail area, what it is not, how to read one |
| 7.3 | p-hacking and multiple comparisons | 2 | p-values: looking many times; statistical-fallacies: p-hacking and forking paths |
| 7.4 | Errors and power | 2.5 | errors-and-power; ab-testing: power and sample size |
| 7.5 | t-tests: signal over noise | 2.5 | t-tests |
| 7.6 | ANOVA and chi-square | 2 | anova-and-chi-square |
| 7.7 | Correlation, and when to go nonparametric | 2 | correlation-and-nonparametric |

### Unit 8. Interpreting (7 min, 4 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 8.1 | Significant isn't important: effect sizes | 2 | effect-sizes |
| 8.2 | ★ Simpson's paradox and confounding (SimpsonsParadox) | 1.5 | statistical-fallacies: Simpson's paradox, confounding |
| 8.3 | Regression to the mean | 1.5 | statistical-fallacies: regression to the mean |
| 8.4 | Sharpshooters, selection and the unit of analysis | 2 | statistical-fallacies: cherry-picking, selection that manufactures a relationship, the unit of analysis |

### Unit 9. Applied (5 min, 2 videos)

| # | Video | Min | Covers |
| --- | --- | --- | --- |
| 9.1 | Exploratory vs. confirmatory | 2 | exploratory-statistical-analysis |
| 9.2 | An A/B test end to end | 3 | ab-testing |

**No video:** next-steps (a wrap-up page of pointers; a 1-minute closing is optional), and the code-mechanics, practice and quiz sections of every lesson.

## Making each video

The process is the one in `video/README.md`; in short:

1. **Script.** Beats written for the ear, following the lesson's own example and numbers. Mark every beat a scene opens on with `scene: true`.
2. **Facts.** Every number on screen comes from running code committed beside the video (`measure.py` and its output), read into `data.ts`.
3. **Scenes.** Built with the editorial kit and cued to words. Arrowheads come from `arrowHead()` in `video/src/components/arrow.ts`.
4. **Illustrations.** One or two watercolor spots, generated by `npm run illustrations -- <video>`.
5. **Checks.** `npm test`, `npm run check:frames`, and stills read by eye.
6. **Voice.** `npm run narrate -- <video>` records the script as one take. Then a speech-to-text check of the take.
7. **Render.** `npm run render:fhd`, or `npm run render` for 4K.

## Decisions

- **Narrator: Hope** (decided 2026-10-16). One voice for the whole course, so it sounds like one teacher. Every course script sets `voice: "hope"`.

## Open decisions

- **Embedding.** The site has no video component yet. Where the files are hosted, and how a lesson section embeds one, is still to decide.
