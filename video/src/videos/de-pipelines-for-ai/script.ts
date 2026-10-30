import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "Pipelines for AI" (16:9), Part 11 and the last of the Data
 * Engineer interview prep videos
 * (agent-outputs/20261030-1600-data-engineer-interview-video-plan.md), after
 * content/interview/data-engineer/pipelines-for-ai.mdx. It answers all eleven
 * of the page's questions, each worked through and numbered aloud; there is
 * no quick round. No question is moved here from another page.
 *
 *   1. How have Data Engineer interviews changed with AI? ("changed")
 *   2. Walk through the ingestion pipeline for a RAG assistant. ("rag")
 *   3. How do you choose a chunking strategy? ("chunk")
 *   4. How do you keep embeddings fresh without re-embedding everything?
 *      ("fresh")
 *   5. What changes when you switch embedding models? ("switch")
 *   6. Exact or approximate nearest-neighbor search? ("ann")
 *   7. Should you use pgvector or a dedicated vector database? ("pg")
 *   8. Why do metadata filters make vector search harder? ("filter")
 *   9. What is hybrid search, and when do embeddings alone fail? ("hybrid")
 *   10. How do access control and deletion work in a RAG pipeline? ("access")
 *   11. How do you estimate the cost and time of an embedding backfill?
 *      ("backfill")
 *
 * It opens on Part 10's bridge (the newest pipelines feed AI systems) and,
 * as the last part, closes the series by pointing to the track's practice:
 * concept checks on every topic page and the 110-question bank. No "Next".
 *
 * Reuse. Question 1 is asked in nearly the same words on the Data Scientist
 * page ("How have data scientist interviews changed with AI?"), so its scene
 * is ds-llm-evaluation's ChangedScene, copied and re-cued: the core loop as
 * blocks, what is new laid on top. The course videos lend their measured
 * numbers rather than scenes, since none asks one of these questions:
 * llm-meaning's five-word space (Question 5), llm-tokens' measured prose rate
 * (Question 3's chunk size in characters), and tf-idf's idf, ln(N / df)
 * (Question 9's keyword side), each read from that video's own
 * measurements.json or recomputed the same way in check.mjs. The arrows are
 * llm-meaning's (parts.tsx).
 *
 * Facts. check.mjs runs in Pyodide 314 with NumPy and writes results.json,
 * which data.ts reads:
 *   - the page's one block, run as written: embed doc1#1 and doc3#0 (changed,
 *     new), delete doc2#0, and doc1#0 unchanged.
 *   - Question 5: llm-meaning's space (cat, kitten, dog, wolf, truck in
 *     animal, size, domestic). A "second model" is the same vectors with the
 *     axes rotated one place (size, domestic, animal); its kitten,
 *     0.1, 0.9, 0.9, searched in the first space by distance, lands nearest
 *     truck (0.71), and farthest from wolf. Labelled as a stand-in.
 *   - Questions 6 and 8, a seeded NumPy simulation, said aloud as one
 *     ("model it in NumPy"): 20,000 vectors of 32 numbers in 100 Gaussian
 *     clusters, 200 queries, a cluster index of 100 lists from k-means.
 *     Probing 1 list compares 1% of the vectors and finds 69% of the exact
 *     top ten; 16 lists, 16% and 96%. Each vector gets one of 100 tenants at
 *     random: post-filtering the top ten to the query's tenant leaves none
 *     for 91% of queries. No latency is shown: the share of vectors compared
 *     stands in for work, and no vector database ran.
 *   - Question 9: five made-up tickets a side, the code's ticket fourth by
 *     vector and first by keyword; reciprocal rank fusion with the page's
 *     k = 60 puts it first (1/64 + 1/61 = 0.0320 against 0.0318). TF-IDF's
 *     idf on the eight made-up tickets: "error" in 5, ln(8/5) = 0.47;
 *     "E-4031" in 1, ln 8 = 2.08.
 *   - Question 11, the page's own numbers: 10 million chunks x 400 tokens =
 *     4 billion tokens = 4,000 x a million, so cost is 4,000 times the price
 *     per million. At a million tokens a minute, a rate the screen labels as
 *     one for scale and not a provider's, 4,000 minutes, 2.8 days ("nearly
 *     three"). No price or provider limit is quoted.
 *   - Question 3: 400 tokens is about 1,800 characters of English prose, at
 *     llm-tokens' measured 4.48 characters a token.
 *   - The close: 110 questions in multiple-choice-questions.mdx, and a
 *     concept check on every topic page, counted.
 *   HNSW, the cluster index, pre- and post-filtering, hybrid search's lists,
 *   access filters and deletion are drawn as mechanisms; pgvector's query is
 *   shown as its syntax, not run.
 *
 * Written for Drew's ear: AI, PDF, HTML and API said as they are; RAG
 * expanded once; "sequel" for SQL; HNSW glossed as a graph index; the IVF
 * index called a cluster index; the error code respelled "E four oh three
 * one" (the screen keeps E-4031).
 */
export const script: NarrationScript = {
  id: "de-pipelines-for-ai",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "The newest pipelines don't end in a dashboard. They feed an AI assistant, which can only answer from what's in its index.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-steps",
      text: "Extract, clean, split, embed, index, keep fresh, delete. The fundamentals carry over. What's new is the vector store, and the embedding bill.",
      pauseAfter: 0.6,
    },
    { id: "plan", text: "Eleven questions, and every one gets worked through.", pauseAfter: 0.8 },

    // ── 1. How the interview changed ──────────────────────────────────────
    {
      id: "changed",
      scene: true,
      text: "Question one. How have Data Engineer interviews changed with AI? The core hasn't: sequel, modeling, and batch and streaming design.",
      pauseAfter: 0.6,
    },
    {
      id: "changed-layer",
      text: "On top: system design for AI data. Unstructured data, PDFs and tickets parsed into clean text. Vector search trade-offs. And AI in your own workflow.",
      pauseAfter: 0.6,
    },
    {
      id: "changed-verify",
      text: "Some coding rounds allow an assistant, and grade how you check its code: idempotency, partition overwrites, time zones, schema drift.",
      pauseAfter: 0.7,
    },
    { id: "rag-in", text: "Now the pipeline itself." },

    // ── 2. The ingestion pipeline ─────────────────────────────────────────
    {
      id: "rag",
      scene: true,
      text: "Question two. Walk through the ingestion pipeline for a RAG assistant. RAG is retrieval-augmented generation: find the passages, then answer from them.",
      pauseAfter: 0.6,
    },
    {
      id: "rag-halves",
      text: "Two halves. Offline, a pipeline builds the index. Online, each question is embedded, searched with a filter, reranked, and the best hits fill the prompt.",
      pauseAfter: 0.6,
    },
    {
      id: "rag-extract",
      text: "Most of the work is offline. Extract incrementally, with change data capture or an updated-at watermark. Parse and clean: strip boilerplate, keep headings and tables, drop duplicates.",
    },
    {
      id: "rag-meta",
      text: "Chunk, then attach metadata to each chunk: document id, section, timestamps, and who may read it. That makes filters, citations and deletes possible.",
      pauseAfter: 0.6,
    },
    {
      id: "rag-upsert",
      text: "Last, embed and upsert, keyed by a stable chunk id, so a retried batch overwrites instead of duplicating.",
      pauseAfter: 0.7,
    },

    // ── 3. Chunking ───────────────────────────────────────────────────────
    {
      id: "chunk",
      scene: true,
      text: "Question three. How do you choose a chunking strategy? It's precision against context. Small chunks match precisely, but can lose the context the answer needs.",
    },
    {
      id: "chunk-large",
      text: "Large chunks keep context, but one vector must cover several topics, so retrieval gets fuzzier, and each hit takes more of the context window.",
      pauseAfter: 0.6,
    },
    {
      id: "chunk-fixed",
      text: "Common choices: a fixed size, say three to five hundred tokens, overlapping ten to twenty percent, so a sentence cut at a boundary is whole in one chunk.",
    },
    {
      id: "chunk-struct",
      text: "Structure-aware: split on headings and paragraphs, then merge toward the target. Or small-to-big: retrieve small chunks, send the parent section.",
      pauseAfter: 0.6,
    },
    {
      id: "chunk-measure",
      text: "No universal best: measure retrieval recall on labeled real questions, and store the chunk settings with the index version, since changing them means a rebuild.",
      pauseAfter: 0.7,
    },

    // ── 4. Keeping embeddings fresh ───────────────────────────────────────
    {
      id: "fresh",
      scene: true,
      text: "Question four. How do you keep embeddings fresh without re-embedding everything? Treat it as an incremental load: give every chunk a stable id and a content hash, and compare with what's indexed.",
      pauseAfter: 0.6,
    },
    {
      id: "fresh-run",
      text: "In the page's example, doc one, chunk one changed, and doc three is new: embed those two. Doc two is gone: delete it. Doc one, chunk zero costs nothing.",
      pauseAfter: 0.6,
    },
    {
      id: "fresh-leak",
      text: "Skip the deletes, and a removed document keeps answering questions. Wrong at best, a data leak at worst.",
      pauseAfter: 0.7,
    },

    // ── 5. Switching embedding models ─────────────────────────────────────
    {
      id: "switch",
      scene: true,
      text: "Question five. What changes when you switch embedding models? Everything gets re-embedded. Each model has its own space, so a new model's query can't be compared with old documents.",
      pauseAfter: 0.6,
    },
    {
      id: "switch-demo",
      text: "Here's a tiny space of five words. Pretend a second model learned the same meanings with its axes in another order. Its kitten, searched in the old index, lands nearest truck.",
      pauseAfter: 0.7,
    },
    {
      id: "switch-bg",
      text: "So treat it like a blue-green deployment: build a new index version beside the old, backfill and compare, then switch an alias atomically, and keep the old one for rollback.",
    },
    {
      id: "switch-tag",
      text: "And store the model version on every vector, so a mixed index can't happen silently.",
      pauseAfter: 0.7,
    },

    // ── 6. Exact or approximate search ────────────────────────────────────
    {
      id: "ann",
      scene: true,
      text: "Question six. Exact or approximate nearest-neighbor search? Exact search compares the query with every vector: perfectly accurate, and fine into the hundreds of thousands, especially after a filter.",
      pauseAfter: 0.6,
    },
    {
      id: "ann-index",
      text: "Beyond that, approximate indexes trade a little recall for big speedups. HNSW, a graph index, is fast and accurate, but memory-hungry and slow to build. A cluster index searches only the clusters nearest the query.",
    },
    {
      id: "ann-sim",
      text: "Model it in NumPy: twenty thousand vectors in a hundred clusters. Probe one cluster, and you compare one percent of the vectors and find about seventy percent of the true top ten. Probe sixteen: ninety-six.",
      pauseAfter: 0.6,
    },
    {
      id: "ann-measure",
      text: "That's the knob. Measure recall against exact search on a sample; don't trust the defaults.",
      pauseAfter: 0.7,
    },

    // ── 7. pgvector or a dedicated database ───────────────────────────────
    {
      id: "pg",
      scene: true,
      text: "Question seven. Should you use pgvector or a dedicated vector database? pgvector, the Postgres extension, is a strong default if the data's in Postgres and it's millions of vectors, not billions.",
    },
    {
      id: "pg-why",
      text: "One system, real transactions, joins against your relational data, and access filters in plain sequel.",
      pauseAfter: 0.6,
    },
    {
      id: "pg-dedicated",
      text: "A dedicated vector database earns its operational cost at very large scale, very high query rates, or when you need hybrid search and multi-tenancy built in.",
    },
    { id: "pg-lean", text: "Say which way you'd lean, and what evidence would change your mind.", pauseAfter: 0.7 },

    // ── 8. Metadata filters ───────────────────────────────────────────────
    {
      id: "filter",
      scene: true,
      text: "Question eight. Why do metadata filters make vector search harder? Because the index is built for similarity, not for your filter.",
      pauseAfter: 0.6,
    },
    {
      id: "filter-post",
      text: "Post-filtering searches first, then drops what the user may not see. A selective filter leaves far fewer results than you asked for.",
    },
    {
      id: "filter-sim",
      text: "In the same simulation, give each vector one of a hundred tenants. Take the top ten, keep one tenant's, and ninety-one percent of searches come back empty.",
      pauseAfter: 0.6,
    },
    {
      id: "filter-pre",
      text: "Pre-filtering restricts first, then searches. That's correct, but it can defeat the approximate index, which was built over everything.",
    },
    {
      id: "filter-fix",
      text: "Good answers partition by tenant, use an engine that filters during the search, and test with realistic, selective filters.",
      pauseAfter: 0.7,
    },

    // ── 9. Hybrid search ──────────────────────────────────────────────────
    {
      id: "hybrid",
      scene: true,
      text: "Question nine. What is hybrid search, and when do embeddings alone fail? Embeddings capture meaning, but blur exact tokens: error codes, product codes, names, rare jargon.",
    },
    {
      id: "hybrid-code",
      text: "Search the tickets for E four oh three one, and the vector side ranks the ticket with that code fourth, behind general errors.",
      pauseAfter: 0.6,
    },
    {
      id: "hybrid-bm25",
      text: "Hybrid search adds a keyword search, usually BM25. Like TF-IDF, it weighs words by rarity, so a code in one ticket counts for a lot.",
    },
    {
      id: "hybrid-rrf",
      text: "Then fuse the rankings with reciprocal rank fusion: each list gives a ticket one over sixty plus its rank, summed. Fourth by meaning and first by keyword, the code's ticket wins.",
      pauseAfter: 0.6,
    },
    { id: "hybrid-cheap", text: "It's cheap to add, and it usually helps on technical content.", pauseAfter: 0.7 },

    // ── 10. Access control and deletion ───────────────────────────────────
    {
      id: "access",
      scene: true,
      text: "Question ten. How do access control and deletion work in a RAG pipeline? Put permissions on each chunk, and filter at query time by the user's identity, so the assistant retrieves only what that user could open.",
      pauseAfter: 0.6,
    },
    {
      id: "access-redact",
      text: "Redact secrets and personal data before embedding, above all if the embedding model is an outside API.",
      pauseAfter: 0.6,
    },
    {
      id: "access-delete",
      text: "And make deletion real. An erasure request or a removed document deletes the vectors, the cached chunks and any copies in evaluation sets, not just the source row.",
      pauseAfter: 0.7,
    },

    // ── 11. The cost of a backfill ────────────────────────────────────────
    {
      id: "backfill",
      scene: true,
      text: "Question eleven, the last. How do you estimate the cost and time of an embedding backfill? Count tokens: ten million chunks at about four hundred tokens is four billion.",
      pauseAfter: 0.6,
    },
    {
      id: "backfill-div",
      text: "For cost, that's four thousand times the price per million tokens. For time, divide by your rate limit: at a million tokens a minute, four thousand minutes, nearly three days.",
      pauseAfter: 0.6,
    },
    {
      id: "backfill-fail",
      text: "So design for failure partway: batch the requests, retry with backoff on rate limits, checkpoint progress, and upsert idempotently, so a restart resumes rather than starting over.",
    },
    {
      id: "backfill-hash",
      text: "And content hashing pays for itself again: an unchanged chunk is never embedded twice.",
      pauseAfter: 0.9,
    },

    // ── Close ─────────────────────────────────────────────────────────────
    {
      id: "close",
      scene: true,
      text: "Eleven questions, and the same habits under all of them: load incrementally, write idempotently, and make a delete really delete.",
      pauseAfter: 0.8,
    },
    {
      id: "close-practice",
      text: "That closes the series. Every topic page has concept checks, and a bank of a hundred and ten multiple-choice questions shows which rounds need work.",
    },
  ],
};
