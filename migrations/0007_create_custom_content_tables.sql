-- Custom challenges, MCQs, and quiz sets (user-generated content).
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- Unlike playground shares (0005), the payload lives directly in D1: a
-- challenge/MCQ definition is a small JSON document (kilobytes, capped well
-- below D1's 2 MB per-value limit by the API), so there is no R2 object to
-- pair with the row. Timestamps are ISO-8601 UTC TEXT, matching 0005.
--
-- Retention mirrors playground_shares: `user_id` is NULL for guest-created
-- rows, which carry a fixed `expires_at` (~30 days). Member rows don't
-- expire. Expiry is evaluated at read time and expired rows are dropped
-- lazily by the routes that encounter them; there is no cron.

-- One row per custom item: a code challenge, a SQL challenge, or a
-- multiple-choice question. `id` is the public URL slug (crypto-random,
-- same format as playground_shares.id) served at /c/<id>. `payload` is the
-- kind-specific JSON document validated by lib/custom-content/schema.ts.
CREATE TABLE IF NOT EXISTS custom_items (
  id         TEXT    NOT NULL PRIMARY KEY,  -- URL slug (crypto-random)
  user_id    TEXT             REFERENCES user(id) ON DELETE CASCADE,
  kind       TEXT    NOT NULL,              -- "code" | "sql" | "mcq"
  title      TEXT    NOT NULL,
  payload    TEXT    NOT NULL,              -- kind-specific JSON document
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL,
  expires_at TEXT                           -- set for guest items; NULL otherwise
);
CREATE INDEX IF NOT EXISTS idx_custom_items_user ON custom_items(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_items_expires ON custom_items(expires_at);

-- One row per quiz set: an ordered collection of custom_items served at
-- /quiz/<id>. `item_ids` is a JSON array of custom_items.id values; entries
-- are NOT foreign keys (an item can be deleted or expire independently, the
-- viewer simply skips ids that no longer resolve).
CREATE TABLE IF NOT EXISTS custom_sets (
  id          TEXT    NOT NULL PRIMARY KEY, -- URL slug (crypto-random)
  user_id     TEXT             REFERENCES user(id) ON DELETE CASCADE,
  title       TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  item_ids    TEXT    NOT NULL,             -- ordered JSON array of custom_items.id
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL,
  expires_at  TEXT                          -- set for guest sets; NULL otherwise
);
CREATE INDEX IF NOT EXISTS idx_custom_sets_user ON custom_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_sets_expires ON custom_sets(expires_at);

-- Guest creation rate limits reuse the share_usage_daily counters from 0005
-- under a "ci:"-prefixed scope ("ci:ip:<hash>" / "ci:global"), so no new
-- counter table is needed.
