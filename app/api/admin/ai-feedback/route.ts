/**
 * Admin-only read of Ask AI answer ratings (requireAdmin enforced here).
 * Returns rated exchanges newest first plus up/down totals. Query (optional):
 * `rating` 'up'|'down'; `limit` 1..200 (default 50); `before` ISO timestamp —
 * cursor paging, stable under new feedback in a way OFFSET is not.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface AiFeedbackRow {
  turnId: string;
  userId: string;
  email: string;
  name: string;
  rating: "up" | "down";
  question: string;
  answer: string;
  surface: string;
  slug: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiFeedbackReport {
  rows: AiFeedbackRow[];
  /** Totals across ALL feedback, not just this page. */
  totals: { up: number; down: number };
  /** `createdAt` of the last row, to pass back as `before`; null at the end. */
  nextCursor: string | null;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const params = new URL(request.url).searchParams;
  const ratingParam = params.get("rating");
  const rating = ratingParam === "up" || ratingParam === "down" ? ratingParam : null;
  const limitRaw = Number(params.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.trunc(limitRaw), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const before = params.get("before");

  const where: string[] = [];
  const binds: string[] = [];
  if (rating) {
    where.push("f.rating = ?");
    binds.push(rating);
  }
  if (before) {
    where.push("f.created_at < ?");
    binds.push(before);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  try {
    const rows = await env.DB.prepare(
      `SELECT f.turn_id, f.user_id, f.rating, f.question, f.answer, f.surface,
              f.slug, f.model, f.created_at, f.updated_at,
              u.email, u.name
         FROM ai_answer_feedback f
         LEFT JOIN user u ON u.id = f.user_id
         ${clause}
        ORDER BY f.created_at DESC
        LIMIT ${limit}`,
    )
      .bind(...binds)
      .all<{
        turn_id: string;
        user_id: string;
        rating: "up" | "down";
        question: string;
        answer: string;
        surface: string;
        slug: string;
        model: string;
        created_at: string;
        updated_at: string;
        email: string | null;
        name: string | null;
      }>();

    // Totals ignore the filter and cursor on purpose: they are the standing
    // up/down ratio and must not change as you page.
    const totals = await env.DB.prepare(
      `SELECT rating, COUNT(*) AS n FROM ai_answer_feedback GROUP BY rating`,
    ).all<{ rating: string; n: number }>();

    const results = rows.results ?? [];
    const report: AiFeedbackReport = {
      rows: results.map((r) => ({
        turnId: r.turn_id,
        userId: r.user_id,
        // LEFT JOIN + placeholder so a row that somehow outlives its user is
        // visible rather than silently missing (cascade should prevent it).
        email: r.email ?? "(deleted user)",
        name: r.name ?? "",
        rating: r.rating,
        question: r.question,
        answer: r.answer,
        surface: r.surface,
        slug: r.slug,
        model: r.model,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      totals: {
        up: (totals.results ?? []).find((t) => t.rating === "up")?.n ?? 0,
        down: (totals.results ?? []).find((t) => t.rating === "down")?.n ?? 0,
      },
      nextCursor:
        results.length === limit ? results[results.length - 1].created_at : null,
    };
    return json(report);
  } catch (err) {
    console.error("ai-feedback report failed", err);
    return json({ error: "Failed to load AI feedback." }, 500);
  }
}
