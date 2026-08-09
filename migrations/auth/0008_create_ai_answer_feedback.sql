-- Ask AI answer ratings: the thumbs up/down under an answer, and the exchange
-- that was rated.
--
-- Applied with:
--   npx wrangler d1 migrations apply dataslope-auth            (local)
--   npx wrangler d1 migrations apply dataslope-auth --remote   (Cloudflare)
--
-- ── Why this table exists ───────────────────────────────────────────────────
--
-- The buttons shipped as local React state: a click coloured an icon, nothing
-- was sent anywhere, and a reload erased it. So no one could act on a downvote,
-- and the panel was quietly asking users for feedback it then threw away.
--
-- ── Why only the rated turns ────────────────────────────────────────────────
--
-- A row is written when someone rates an answer, and never otherwise. Ask AI
-- carries a lot that is not ours to keep — a question is routinely someone's
-- own code, an error from their own job, text pasted out of their own work —
-- and recording every conversation to find the handful of bad answers would
-- collect all of that to use almost none of it. A thumb is an explicit act on
-- one exchange, which makes it both the signal worth having and the consent to
-- keep it. Rating is also the only thing users are told is stored (the panel
-- says so under every answer, and /privacy says it at length); this table is
-- what makes that sentence true rather than aspirational.
--
-- ── Why in dataslope-auth ───────────────────────────────────────────────────
--
-- It is user content keyed by user id, so it belongs with the other AI tables
-- (`ai_usage_daily`, `ai_usage_global`) and inside the database that a user
-- deletion already sweeps. `dataslope-illustrations` is deliberately the
-- database with no user data in it, and putting chat text there would end that
-- property for the sake of filing it beside another review queue.
CREATE TABLE IF NOT EXISTS ai_answer_feedback (
  -- Client-generated id for the assistant turn being rated. Stable for the
  -- life of the conversation, so re-clicking the same thumb finds the same row
  -- rather than writing a second one.
  turn_id     TEXT    NOT NULL,
  -- Cascades, like cloud_workspaces and playground_shares (0005): /privacy
  -- tells users that deleting their account removes their ratings, and the
  -- rating carries the question and answer, so that has to be enforced by the
  -- schema rather than remembered by a cleanup hook.
  user_id     TEXT    NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  rating      TEXT    NOT NULL,  -- 'up' | 'down'
  -- The exchange the rating is about. Truncated by the route (see
  -- app/api/ai/feedback/route.ts) so one row cannot be unbounded.
  question    TEXT    NOT NULL DEFAULT '',
  answer      TEXT    NOT NULL DEFAULT '',
  -- Where it was asked: 'learn' | 'playground', plus the lesson slug or
  -- adapter id, so a pattern of bad answers can be traced to a page.
  surface     TEXT    NOT NULL DEFAULT '',
  slug        TEXT    NOT NULL DEFAULT '',
  -- Which model answered, from the stream's `done` event. A downvote is much
  -- less useful when you cannot tell which tier produced it.
  model       TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL,  -- ISO-8601 UTC
  updated_at  TEXT    NOT NULL,  -- ISO-8601 UTC
  -- One rating per user per turn: changing your mind updates the row, and
  -- un-rating deletes it (there is no "cleared" state worth keeping — an
  -- untouched answer and a withdrawn rating mean the same thing).
  PRIMARY KEY (user_id, turn_id)
);

-- The admin read: newest first, optionally narrowed to one rating.
CREATE INDEX IF NOT EXISTS idx_ai_answer_feedback_created
  ON ai_answer_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_answer_feedback_rating
  ON ai_answer_feedback(rating, created_at DESC);
