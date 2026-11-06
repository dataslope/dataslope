# No-cards restyle of the existing videos: waves

Brief: BRIEF.md in this folder. Layout only, no re-voicing, no new images.

## Wave 1 (started)
(DS 0-3 done: only ds-interview had cards; DE-0 done.)
- DE 0-3: de-interview, de-sql-patterns, de-sql-performance, de-dimensional-modeling
- DE 4-7: de-modeling-history, de-python, de-pipelines, de-distributed
- DE 8-11: de-streaming, de-warehousing, de-orchestration, de-pipelines-for-ai
- DS 0-3: ds-interview, ds-statistics, ds-probability, ds-ml-evaluation
- Added to the trim agents' jobs: thinking-statistically, describing-data (Stats-1, 2);
  probability, distributions (Stats-3, 4); db-why-design, db-entities (DbD 1, 2)

## Wave 2 (started)
- DS 4-7: ds-ml-models, ds-deep-learning, ds-experiment-design, ds-experiments-in-practice (started when backend Part 3 finished)
- DS 8-11: ds-product-sense, ds-python-pandas, ds-sql, ds-llm-evaluation (started when Parts 0 and 7 finished)
- DA 0-4: da-interview, da-sql, da-pandas, da-statistics-communication, da-advanced-sql (same)
- DA 5-8: da-spreadsheets, da-visualization, da-ab-testing, da-ai-assisted (started when Part 9 finished)
- DbD 3-5: db-relationships, db-keys, db-relationship-patterns (started when Part 6 finished)
- DbD 6-9: db-constraints, db-normalization, db-designing-schemas, db-relational-history (started when Part 8 finished)
- Stats 5: sampling, sampling-bias, survivorship-bias, sampling-distributions, central-limit-theorem, standard-error (started when Part 1 finished)
- Stats 6-9: estimation, testing-hypotheses, interpreting-results, statistics-in-practice (started when Part 2 finished)
- LLM 1-3: llm-tokens, llm-meaning, llm-attention-score, llm-generation (started when Part 5 finished)
- LLM 4-5: llm-cost, llm-conversation-cost, llm-benchmarks, llm-temperature (started when the Stats 1-2 trim finished)
- NLP 1-3: nlp-why-text-is-hard, nlp-cleaning-text, nlp-lemmas-and-tags, nlp-counting-words (started when the DbD 1-2 trim finished)
- NLP 3-5: nlp-zipfs-law, nlp-text-to-features, nlp-history, tf-idf (started when DS 0-3 finished)
- Standalone A: base-rate, box-sizing, c-pointers, java-equality, left-join-trap, list-vs-set (started when the Stats 3-4 trim finished)
- Standalone B: overfitting, pandas-groupby, random-walks, recursion-fib, simpsons-paradox, sql-null-trap (same)
- Standalone C: type-erasure, why-normalization, window-functions (started when backend Part 4 finished)

## Later waves (start one as each agent finishes)

Folder to composition id: scratchpad folder-ids.txt, or grep src/Root.tsx.

## Status (evening)
Done: DE 0-11, DS 0-11, DA 5-8, DbD 1-9, Stats 1-9 (Stats 6-9 agent still finishing checks), LLM 1-5 + temperature, NLP 1-2 (agent finishing), NLP 3.1/4/5 + tf-idf (agent finishing checks), all standalones.
Still running: DA 0-4.
Disk filled once (ENOSPC) around 18:30; nlp-history/ZipfScene.tsx was truncated and restored (318508e). Whole-project tsc clean afterwards.
