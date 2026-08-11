/**
 * Record (or withdraw) a thumbs up/down on an Ask AI answer.
 *
 * The panel's rating buttons used to be local React state — a click colored
 * an icon and nothing left the browser. This is the write behind them.
 *
 * **Rated turns only.** A row exists because someone deliberately rated an
 * answer; no conversation is stored otherwise. That is the whole privacy shape
 * of the feature (see `migrations/auth/0008_…` for why), so this route is the
 * only thing in the codebase that writes Ask AI content to a database, and it
 * writes nothing on the unrated path because it is never called on it.
 *
 * Signed-in and same-origin, like every other cookie-authenticated mutation.
 * The stored text is truncated here rather than trusted from the client: the
 * question and answer are echoed back by the browser, so their length is not
 * ours to assume.
 *
 * `rating: null` deletes. There is no "cleared" state to keep — an answer
 * nobody rated and one whose rating was withdrawn mean the same thing, and the
 * row would otherwise outlive the opinion it recorded.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { isSameOrigin } from "@/lib/workspaces/server";

export const dynamic = "force-dynamic";

/** Longest question/answer stored. Long enough for any real Ask AI exchange
 *  (answers are capped by the model's own `maxTokens` well below this), short
 *  enough that one row cannot be used to park arbitrary data in D1. */
const MAX_TEXT = 8000;
/** Defensive caps on the short identifying fields. */
const MAX_ID = 128;
const MAX_SLUG = 256;

interface FeedbackRequest {
  turnId?: unknown;
  rating?: unknown;
  question?: unknown;
  answer?: unknown;
  surface?: unknown;
  slug?: unknown;
  model?: unknown;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.slice(0, max) : "";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Forbidden." }, 403);
  const { env } = getCloudflareContext();

  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to rate answers." }, 401);
  const user = session.user;
  if (user.banned) return json({ error: "This account is suspended." }, 403);

  let body: FeedbackRequest;
  try {
    body = (await request.json()) as FeedbackRequest;
  } catch {
    return json({ error: "Malformed request." }, 400);
  }

  const turnId = str(body.turnId, MAX_ID).trim();
  if (!turnId) return json({ error: "Missing turn id." }, 400);

  const rating = body.rating;
  if (rating !== "up" && rating !== "down" && rating !== null) {
    return json({ error: "Rating must be 'up', 'down' or null." }, 400);
  }

  const now = new Date().toISOString();
  try {
    if (rating === null) {
      await env.DB.prepare(
        `DELETE FROM ai_answer_feedback WHERE user_id = ? AND turn_id = ?`,
      )
        .bind(user.id, turnId)
        .run();
      return json({ ok: true, rating: null });
    }

    // Upsert: changing your mind edits the row you already wrote, and
    // `created_at` deliberately keeps the first rating's time — the admin view
    // is ordered by when feedback arrived, not by when it was last amended.
    await env.DB.prepare(
      `INSERT INTO ai_answer_feedback
         (turn_id, user_id, rating, question, answer, surface, slug, model,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, turn_id) DO UPDATE SET
         rating     = excluded.rating,
         question   = excluded.question,
         answer     = excluded.answer,
         surface    = excluded.surface,
         slug       = excluded.slug,
         model      = excluded.model,
         updated_at = excluded.updated_at`,
    )
      .bind(
        turnId,
        user.id,
        rating,
        str(body.question, MAX_TEXT),
        str(body.answer, MAX_TEXT),
        str(body.surface, MAX_ID),
        str(body.slug, MAX_SLUG),
        str(body.model, MAX_ID),
        now,
        now,
      )
      .run();
    return json({ ok: true, rating });
  } catch (err) {
    console.error("ai/feedback: write failed", err);
    return json({ error: "Couldn't save that rating." }, 500);
  }
}
