/**
 * Admin-only AI usage report backing /admin/ai-usage.
 *
 * One GET returns everything the page renders: per-user rows for one UTC day
 * (Ask AI chat + inline-completion counters from `ai_usage_daily`, joined to
 * the user for name/email/plan) and the recent global daily totals from
 * `ai_usage_global` with the configured ceiling, so the dashboard can show
 * how much of the site-wide budget the day has consumed.
 *
 * Authorization is enforced HERE (requireAdmin), matching the codebase's
 * "auth gates actions, not content" rule — the /admin pages stay statically
 * prerendered and non-admins just get a 403 from this endpoint.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { utcDay } from "@/lib/ai/limits";

export const dynamic = "force-dynamic";

/** Default mirror of lib/ai/limits.ts DEFAULT_GLOBAL_CAP for display. */
const DEFAULT_GLOBAL_CAP = 5_000_000;

/** Per-user usage row for one day, as rendered by the dashboard. */
export interface AiUsageUserRow {
  userId: string;
  email: string;
  name: string;
  plan: string;
  requests: number;
  inputTok: number;
  outputTok: number;
  completions: number;
  completionInTok: number;
  completionOutTok: number;
}

export interface AiUsageReport {
  day: string;
  users: AiUsageUserRow[];
  global: { day: string; totalTok: number }[];
  globalCap: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const requested = new URL(request.url).searchParams.get("day");
  const day =
    requested && DAY_RE.test(requested) ? requested : utcDay(Date.now());

  const users = await env.DB.prepare(
    `SELECT a.user_id, u.email, u.name, u.plan,
            a.requests, a.input_tok, a.output_tok,
            a.completions, a.completion_in_tok, a.completion_out_tok
     FROM ai_usage_daily a
     JOIN user u ON u.id = a.user_id
     WHERE a.day = ?
     ORDER BY (a.input_tok + a.output_tok + a.completion_in_tok + a.completion_out_tok) DESC
     LIMIT 200`,
  )
    .bind(day)
    .all<{
      user_id: string;
      email: string;
      name: string;
      plan: string;
      requests: number;
      input_tok: number;
      output_tok: number;
      completions: number;
      completion_in_tok: number;
      completion_out_tok: number;
    }>();

  const global = await env.DB.prepare(
    "SELECT day, total_tok FROM ai_usage_global ORDER BY day DESC LIMIT 14",
  ).all<{ day: string; total_tok: number }>();

  const globalCap =
    Number(env.AI_DAILY_GLOBAL_TOKEN_CAP) > 0
      ? Number(env.AI_DAILY_GLOBAL_TOKEN_CAP)
      : DEFAULT_GLOBAL_CAP;

  const report: AiUsageReport = {
    day,
    users: (users.results ?? []).map((r) => ({
      userId: r.user_id,
      email: r.email,
      name: r.name,
      plan: r.plan || "free",
      requests: r.requests,
      inputTok: r.input_tok,
      outputTok: r.output_tok,
      completions: r.completions,
      completionInTok: r.completion_in_tok,
      completionOutTok: r.completion_out_tok,
    })),
    global: (global.results ?? []).map((r) => ({
      day: r.day,
      totalTok: r.total_tok,
    })),
    globalCap,
  };
  return json(report);
}
