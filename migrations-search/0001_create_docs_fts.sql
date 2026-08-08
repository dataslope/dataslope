-- Full-text search index for the course and interview-prep lessons.
--
-- This lives in its own D1 database (`dataslope-search`), deliberately, and
-- not alongside anything else. `wrangler d1 export` refuses to export any
-- database containing a virtual table, and a failed attempt has been reported
-- to leave the database wedged returning "Currently processing a long-running
-- export" to every query (cloudflare/workers-sdk#9519, #6305, both open). That
-- is an acceptable risk for *this* data and only this data: every row here is
-- derived from `content/` and rebuilt on each deploy, so the recovery for any
-- problem is to delete the database and re-seed it. Putting the FTS table in
-- `dataslope-illustrations` would have extended that risk to the regen and
-- deletion-mark queues, which record human decisions and cannot be rebuilt
-- from source.
--
-- One row per (page, heading) rather than per page: on lessons this long, a
-- page-level hit tells the reader which of forty screens to start on, which is
-- barely an answer. Section rows carry an `#anchor` and let `snippet()` quote
-- the part that actually matched.
--
-- The UNINDEXED columns are carried for the response and are not searchable;
-- they still occupy a position in `bm25()`'s weight list, so the query in
-- app/api/search/route.ts passes a 0 for each of them.
--
-- `porter` stemming means "comparing" finds "compare"; `unicode61` folds
-- accents so "café" and "cafe" agree. The site is English-only, which is what
-- makes an English stemmer the right call rather than a compromise.
CREATE VIRTUAL TABLE IF NOT EXISTS docs USING fts5(
  url UNINDEXED,
  page UNINDEXED,
  anchor UNINDEXED,
  section UNINDEXED,
  collection UNINDEXED,
  title,
  heading,
  description,
  prose,
  code,
  tokenize = 'porter unicode61'
);

-- Seeding replaces the whole table, so a build-id marker is enough bookkeeping
-- to tell which deploy's content is live without exporting anything.
CREATE TABLE IF NOT EXISTS docs_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
