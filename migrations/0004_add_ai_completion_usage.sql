-- AI inline code completion (pro-only): per-user, per-day usage counters.
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- Completions are tracked separately from Ask AI chat on the same
-- ai_usage_daily row: an editor session can fire hundreds of small completion
-- requests per day, so letting them consume the chat `requests` counter would
-- exhaust a member's Ask AI budget just by typing. Chat budgets keep reading
-- requests/input_tok/output_tok; completion budgets read these three columns
-- (see lib/ai/limits.ts). Completion tokens DO still count toward the global
-- daily ceiling in ai_usage_global, which stays the single bounded-downside
-- backstop for total provider spend.
ALTER TABLE ai_usage_daily ADD COLUMN completions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_daily ADD COLUMN completion_in_tok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ai_usage_daily ADD COLUMN completion_out_tok INTEGER NOT NULL DEFAULT 0;
