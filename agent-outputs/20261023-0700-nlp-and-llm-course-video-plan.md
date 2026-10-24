# NLP and LLM courses: video plan

**Courses:** `content/courses/how-llms-work/` (19 lessons in 5 sections) and `content/courses/natural-language-processing-python/` (15 lessons in 5 sections).
**Format:** the course format the Statistics and Database Design videos set (`video/README.md`; `agent-outputs/20261016-1200-database-design-video-plan.md`): one editorial video per unit, opening on `<SeriesIntro>`, each ending on the question the next unit answers.
**Narrators** (the user's choice, 2026-10-23): **Drew** for How Large Language Models Work, **Hope** for Natural Language Processing with Python. One voice per course, on `eleven_v4_turbo`, recorded in takes.
**Art:** watercolor spots from `gpt-image-2.5-flare`, quality `low`, transparent background, through the Batch API (the user's standing choice).
**Estimate:** about **58 minutes in 10 videos**, about 44,000 characters of narration: 5 LLM videos of 5 to 6.5 minutes (about 21,400 characters) and 5 NLP videos of 4.5 to 7 minutes (about 22,700).

## What the estimate is based on

The 18 Statistics and Database Design unit videos, after the review fixes, run at about 12.8 characters a second with `COURSE_MIN_PAUSE` and the series intro, and narrate roughly 35 to 45% of a unit's explanatory prose. The NLP lessons are long (2,600 to 3,300 words each, code included) but repeat their point from several angles and carry long "your turn" and quiz sections that stay on the page, so their units are sized near the Database Design units rather than in proportion to their word counts.

| Course | Lessons (words, code included) | Videos | Minutes | Characters |
| --- | --- | --- | --- | --- |
| How LLMs work | 18 taught lessons, 33,300 words | 5 | ~28 | ~21,400 |
| NLP with Python | 14 taught lessons, 41,200 words | 5 | ~30 | ~22,700 |

**Budget.** The ElevenLabs account had 80,140 characters left on 2026-10-23 (51k of 131k used; the count resets 2026-11-16). The first recordings are capped at 52,000 characters for the ten videos together, about 5,200 each on average, leaving room for re-voicing the beats a review changes. Each video has its own cap below; a draft over it is cut on paper before anything is sent.

## How LLMs Work (Drew)

Compositions `Llm-<unit>-<Name>` in the Studio folder `How-LLMs-Work`, in course order. Unit numbers follow the course's five `---` sections in `meta.json`.

| # | Composition | Folder | Title on the intro | Lessons | Target | Cap (chars) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Llm-1-Tokens | llm-tokens | What the model reads | what-a-language-model-is, tokens, building-a-tokenizer, token-counts-in-practice | 5.5 min | 4,800 |
| 2 | Llm-2-Meaning | llm-meaning | From ids to meaning | embeddings, similarity, attention-intuition, the-shape-of-a-transformer | 6 min | 5,300 |
| 3 | Llm-3-Generation | llm-generation | Choosing the next token | sampling, why-models-hallucinate, context-windows, reasoning-models | 6.5 min | 5,700 |
| 4 | Llm-4-Cost | llm-cost | What a token costs | pricing-structure, estimating-cost, controlling-cost | 5 min | 4,400 |
| 5 | Llm-5-Benchmarks | llm-benchmarks | Is it good enough? | what-benchmarks-measure, benchmark-pitfalls, evaluating-for-your-task | 5 min | 4,400 |

**No video:** index and next-steps (a welcome and a recap), and every lesson's code walk-throughs, "train it on your own text" and concept checks.

### 1. What the model reads
1. **A next-token machine, applied again and again.** The model returns a distribution over its vocabulary, not a word; generation is that one step repeated, each pick appended. The knowledge is in the weights, not in a database it looks up.
2. **Tokens, not characters.** The lesson's own `strawberry` (o200k_base: `st` `raw` `berry`, ids 302, 1618, 19772; `" strawberry"` after a space is one id), so counting letters is not an operation it has. The rough conversion rate for English, and the lesson's per-script UTF-8 bytes (`utf8-bytes-per-script`).
3. **Byte-pair encoding, built by hand.** Count adjacent pairs, merge the most frequent, repeat: the lesson's own training text and merge order.
4. **Counts in practice.** Compression by text type (prose, code, other languages), different tokenizers giving different counts, and a conversation that resends its history.

**Bridge to 2:** a token id is just a number; nothing in 19772 says "berry" is anything like "cherry". *Next: turning ids into meaning.*

### 2. From ids to meaning
1. **Embeddings.** One vector per token; nearby means related; the dimensions are not interpretable; position has to be added.
2. **Similarity.** Cosine, not straight-line distance, and why; the lesson's working semantic search; where it breaks.
3. **Attention.** The problem it solves (a word whose meaning depends on its neighbours), query, key and value with the lesson's real vectors, many heads and layers, and the cost that grows with the square of the length.
4. **The shape of a transformer.** The full path of a prompt (embed, blocks of attention and feed-forward, unembed to scores), what the parameters are, depth and width, mixture of experts.

**Bridge to 3:** the last layer gives a score to every token in the vocabulary; something still has to pick one. *Next: choosing the next token.*

### 3. Choosing the next token
1. **Sampling.** Softmax, temperature, top-p, and randomness accumulating over a long answer. The LlmTemperature video (Hope) covers temperature on the lesson's own example; this video re-uses its measurements and scenes where they fit and keeps the course's voice (Drew).
2. **Why models hallucinate.** A plausible continuation of a question is an answer, whether or not one exists; there is no "I do not know" signal; where the risk concentrates; why asking it to say so fails; what reduces it.
3. **Context windows.** A hard boundary; filling it is not free (`context-window-budget`, `lost-in-the-middle`, `attention-cost`).
4. **Reasoning models.** Thinking tokens before the answer, steep diminishing returns, where it helps, and what it costs.

**Bridge to 4:** every token it reads, writes or thinks is billed. *Next: what a token costs.*

### 4. What a token costs
1. **The five numbers** on a price sheet; why output costs more than input (one token at a time against all at once); why cached input is cheap; the length threshold. Prices are the lesson's own October 2026 table.
2. **Estimating.** One request; a conversation, where the resend makes the bill grow faster than the chat (`token-cost-stack`); thinking tokens; a monthly estimate.
3. **Controlling it.** The lesson's six levers in its order: route to the cheapest model that passes, cache the stable prefix, cut output, lower reasoning effort, batch, then the prompt.

**Bridge to 5:** "the cheapest model that passes" needs a test to pass. *Next: measuring whether a model is good enough.*

### 5. Is it good enough?
1. **What benchmarks measure** and how to read a score, with its uncertainty.
2. **Four pitfalls:** saturation, contamination, selective reporting, construct mismatch; reading a launch table well.
3. **Your own evaluation:** how many examples, the harness, scoring answers with no exact match, and comparing on cost as well as accuracy.

Closes the course (no `NextLine`).

## Natural Language Processing with Python (Hope)

Compositions `Nlp-<unit>-<Name>` in the Studio folder `NLP-Python`.

| # | Composition | Folder | Title on the intro | Lessons | Target | Cap (chars) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Nlp-1-WhyTextIsHard | nlp-why-text-is-hard | Why text is hard | what-is-nlp, the-nlp-pipeline | 4.5 min | 4,000 |
| 2 | Nlp-2-CleaningText | nlp-cleaning-text | Cleaning text | tokenization, text-normalization, stopwords, stemming-and-lemmatization | 7 min | 6,200 |
| 3 | Nlp-3-CountingWords | nlp-counting-words | What counting reveals | frequency-distributions, pos-tagging, ngrams | 6 min | 5,300 |
| 4 | Nlp-4-TextToFeatures | nlp-text-to-features | From text to features | choosing-your-pipeline, bag-of-words, tf-idf, rule-based-sentiment | 7 min | 6,200 |
| 5 | Nlp-5-History | nlp-history | How the field got here | interesting-discussions | 4.5 min | 4,400 |

**No video:** index and next-steps, and every lesson's "your turn" and check-your-understanding sections.

### 1. Why text is hard
1. **Unstructured and ambiguous.** The lesson's own cases ("lead", "New York", "don't", "Dr."), irregular and noisy text, and why `.split()` is not enough.
2. **What an NLP system does,** and rules against learning, briefly.
3. **The pipeline.** Raw text through tokenize, normalize, stopwords, stem or lemmatize, to features; cleaning steps against analysis steps; the lesson's example of order changing the result.

**Bridge to 2:** the first step is deciding where one word ends. *Next: cutting text into tokens.*

### 2. Cleaning text
1. **Tokenization.** `word_tokenize` against `.split()` on the lesson's sentence ("I don't think Mr. Lee's plan will work, but we'll see!"), sentences and "Dr.", domain tokens.
2. **Normalization.** Case folding, when not to lowercase, punctuation stripping, what it gives and takes.
3. **Stopwords** and the negation trap: "not good" filtered to "good".
4. **Stemming and lemmatization.** Porter's chopping against the dictionary form, and the part of speech the lemmatizer needs.

**Bridge to 3:** with the words clean, the next thing to do is count them. *Next: what counting words reveals.*

### 3. What counting reveals
1. **Frequencies.** `FreqDist`, lexical diversity, the long tail (`zipf-law`, `vocabulary-growth-heaps`), and raw counts dominated by stopwords.
2. **Part-of-speech tags.** Words wear many hats; the Penn tags; extracting patterns; tags making lemmatization accurate.
3. **N-grams.** The sliding window, order is meaning, phrases from counted bigrams, and why a bigger n is not better.

**Bridge to 4:** a model wants numbers, not lists of words. *Next: turning text into features.*

### 4. From text to features
1. **Choosing the pipeline.** A menu, not a recipe; the decision framework; one text, two pipelines; evaluate, do not guess.
2. **Bag of words.** The document-term table, counts against presence, and what it throws away.
3. **TF-IDF.** Draws on the TfIdf standalone video's lesson corpus and `measure.py` (unvoiced, so nothing to match by ear), told in Hope's voice.
4. **Rule-based sentiment.** Scoring against a lexicon, the naive version's failure, negation handling, and the limits that motivate learning.

**Bridge to 5:** none of these ideas is new; most are older than the personal computer. *Next: how the field got here.*

### 5. How the field got here
The lesson's stories: Turing (1950), the Georgetown–IBM demo (1954) and the hype cycle, Shannon and the n-gram (1948), ELIZA (1966) and the effect named after it, Spärck Jones and IDF (1972), Zipf, and word2vec (2013). Closes the course (no `NextLine`).

## Making each video

The steps are the README's: script, facts, scenes, art, checks, voice, voiced checks. What is particular to these two courses:

- **Facts come from the lesson's own code, in the versions the site runs.** The site's Pyodide is 314.0.7 with NLTK 3.9.4, NumPy 2.4.6, scikit-learn 1.8.0 and tiktoken 0.12.0. Each video's `measure.py` runs the lesson's own examples in a local environment pinned to those versions (with the NLTK data packages the lessons load: punkt_tab, stopwords, wordnet, averaged_perceptron_tagger_eng, gutenberg), writes `measurements.json`, and `data.ts` reads it. Where the page shows a block's output, `lib/generated/block-outputs.json` (the site's prepopulated output, run in that Pyodide) is the reference to agree with.
- **Tokenizer claims are run, not copied.** tiktoken's o200k_base is the lesson's tokenizer; every piece and id on screen comes from `measure.py`.
- **Prices are the lesson's.** The October 2026 table in pricing-structure.mdx is the source; the video does not look up current prices.
- **Written for the ear.** Initialisms in plain caps (LLM, BPE, NLTK, TF-IDF), never letter-spaced, and no sentence opening "A" before one (the README's "Writing initialisms for the voice"); every symbol said in words beside it at first use; and a breath after each definition (`pauseAfter`).
- **The review's rules from the start** (`agent-outputs/20261021-0551-course-video-review.md`): a scene's first figure on its first beat, a payoff held long enough to read, no unspoken text that cannot be read in time, no counter showing a false number, figures numbered in every video, one meaning per color.

## Decisions

- **Narrators** (the user, 2026-10-23): Drew for the LLM course, Hope for the NLP course. Every script sets `voice` accordingly.
- **One video per unit, series intro, bridges, `COURSE_MIN_PAUSE`**, as the two earlier courses.
- **Illustrations** from `gpt-image-2.5-flare`, quality `low`, transparent, Batch API, with the standing fallback to `sync` when a batch sits an hour.
- **The existing standalone videos stay as they are.** LlmTemperature (Hope) and TfIdf are not re-voiced or removed; the unit videos draw on their measurements.
- **Five videos per course, then deep dives** (the user, 2026-10-23). The ten unit videos are the backbone and are not split. Once all ten are voiced they get a full review, as the Statistics and Database Design videos did (`agent-outputs/20261021-0551-course-video-review.md`), and its fixes. Then 3 to 5 short standalone deep dives (about 2 minutes each, in the course's voice, embedded at one lesson section) go where the review finds a unit too compressed. Candidates before the review: attention with query, key and value worked through; why a conversation's bill grows faster than the chat; training a BPE tokenizer by hand; Zipf's law on the Gutenberg texts.

## Open

- **Embedding** on the site is still undecided, as for the earlier courses.
