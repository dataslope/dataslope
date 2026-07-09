-- Playground cloud saves + sharing (agent-outputs/20260621-1733 Q5/Q6, revised).
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- D1 stores ONLY metadata; the workspace payload (a gzipped JSON bundle of
-- code files, or a SQL dump + query tabs, see lib/workspaces/bundle.ts) is an
-- R2 object referenced by `r2_key`. SQL dumps routinely exceed D1's 2 MB
-- per-value cap and R2 reads are egress-free, so D1 indexes and R2 carries the
-- bytes. Timestamps are ISO-8601 UTC TEXT (lexicographically comparable),
-- matching the kysely-adapter encoding used by the auth tables.

-- One row per cloud-saved workspace. The primary key is (user_id, id): `id` is
-- the client-generated workspace id (ws_…), so the same id can exist under two
-- accounts without conflict and a signed-in browser can pair local ↔ cloud
-- copies by simple id equality. Retention: pro keeps rows indefinitely; free
-- rows expire ~30 days after `last_used_at` (policy evaluated at read time in
-- lib/workspaces/policy.ts, there is no cron; expired rows are dropped lazily
-- by the routes that encounter them).
CREATE TABLE IF NOT EXISTS cloud_workspaces (
  user_id      TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  id           TEXT    NOT NULL,
  name         TEXT    NOT NULL,
  playground   TEXT    NOT NULL,           -- "python" | "sqlite" | …
  size_bytes   INTEGER NOT NULL,           -- gzipped bundle size in R2
  manifest     TEXT    NOT NULL,           -- display-only JSON summary (file names / tab titles)
  r2_key       TEXT    NOT NULL,           -- object key in WORKSPACES_BUCKET
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  last_used_at TEXT    NOT NULL,           -- refreshed on open/save; free-tier retention clock
  PRIMARY KEY (user_id, id)
);

-- One row per share link. Shares are immutable snapshots with their own R2
-- object, they are NOT views onto a live workspace, so revoking or editing a
-- workspace never breaks or mutates what a link's recipients see. `user_id`
-- is NULL for guest (anonymous) shares. Retention, evaluated at read time:
-- guest shares carry a fixed `expires_at` (~30 days from creation); free
-- members' shares expire ~30 days after `last_viewed_at`; pro shares don't
-- expire while the subscription is active.
CREATE TABLE IF NOT EXISTS playground_shares (
  id             TEXT    NOT NULL PRIMARY KEY,  -- URL slug (crypto-random)
  user_id        TEXT             REFERENCES user(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  playground     TEXT    NOT NULL,
  size_bytes     INTEGER NOT NULL,
  manifest       TEXT    NOT NULL,
  r2_key         TEXT    NOT NULL,
  created_at     TEXT    NOT NULL,
  last_viewed_at TEXT    NOT NULL,
  expires_at     TEXT                            -- set for guest shares; NULL otherwise
);
CREATE INDEX IF NOT EXISTS idx_playground_shares_user ON playground_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_playground_shares_expires ON playground_shares(expires_at);

-- Daily counters bounding guest share creation (no account to meter, so meter
-- by salted IP hash + a global backstop), the same shape as ai_usage_daily
-- in 0003. `scope` is 'ip:<hash>' or 'global'; `day` is a UTC 'YYYY-MM-DD'.
-- Rows are tiny and self-limiting (one per IP per day); stale days are pruned
-- opportunistically by the share-creation route.
CREATE TABLE IF NOT EXISTS share_usage_daily (
  scope TEXT    NOT NULL,
  day   TEXT    NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scope, day)
);
