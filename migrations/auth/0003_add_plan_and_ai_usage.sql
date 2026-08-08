-- "Ask AI" feature: per-user membership plan + usage accounting.
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- `plan` distinguishes membership tiers, which drive BOTH model selection and
-- quotas for Ask AI (free members → a cheaper OpenRouter model; paid members →
-- an OpenAI model). See lib/ai/tier.ts and lib/ai/models.ts. Values: 'free' |
-- 'pro'. New users default to 'free'. A `PRO_USER_EMAILS` allowlist and admins
-- are also treated as pro at request time without this column being set, the
-- bootstrap path (mirrors how ADMIN_EMAILS grants admin before a billing system
-- exists). The column follows the same kysely-adapter sqlite encoding as 0002
-- (plain TEXT). It is exposed on the Better Auth session via the user
-- `additionalFields` config in lib/auth/server.ts.
ALTER TABLE user ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';

-- Per-user, per-day usage counters backing the daily request + token budgets.
-- One indexed read on the request path (budget check) and one increment after
-- each answer (recorded via ctx.waitUntil so it never blocks the stream).
-- Hot *per-minute* limiting is deliberately NOT done here: D1's write budget is
-- tight, so a Durable Object / the native Rate Limiting binding is the right
-- tool for that (see agent-outputs/20260701-1107-ask-ai-cloudflare-implementation.md).
-- `day` is a UTC 'YYYY-MM-DD' string.
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id    TEXT    NOT NULL,
  day        TEXT    NOT NULL,
  requests   INTEGER NOT NULL DEFAULT 0,
  input_tok  INTEGER NOT NULL DEFAULT 0,
  output_tok INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

-- Global per-day token ceiling backstop: bounds total spend regardless of how
-- many accounts / IPs an abuser rotates through. When today's total crosses
-- AI_DAILY_GLOBAL_TOKEN_CAP the endpoint degrades to "busy, try later" rather
-- than running up an open-ended bill. One row per UTC day.
CREATE TABLE IF NOT EXISTS ai_usage_global (
  day       TEXT    NOT NULL PRIMARY KEY,
  total_tok INTEGER NOT NULL DEFAULT 0
);
