/**
 * Admin-only AI usage report backing /admin/ai-usage.
 *
 * One GET returns everything the page renders for a date window: per-user
 * rows aggregated over an inclusive [start, end] UTC-day range (Ask AI chat +
 * inline-completion + suggested-question counters from `ai_usage_daily`,
 * joined to the user for name/email/plan) and the site-wide per-day totals
 * from `ai_usage_global` with the configured daily ceiling, so the dashboard
 * can show how much of the budget the window consumed.
 *
 * Window selection (all params optional, all UTC 'YYYY-MM-DD'):
 *   - `start`, inclusive lower bound. Omitted ⇒ all-time (the "Total" range).
 *   - `end`, inclusive upper bound. Omitted ⇒ today (UTC).
 *   - `day`, legacy single-day shorthand (start = end = day). Kept so an
 *               older cached client keeps working through a deploy.
 * Invalid values are ignored (fall back to the defaults) and a start after
 * end is clamped, so the endpoint can never 400 on the picker's input.
 *
 * Authorization is enforced HERE (requireAdmin), matching the codebase's
 * "auth gates actions, not content" rule, the /admin pages stay statically
 * prerendered and non-admins just get a 403 from this endpoint. Any database
 * failure is logged and returned as a 500 with a message rather than a bare
 * unhandled throw, so the dashboard can surface "try again" instead of a
 * blank Worker error.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/auth/admin";
import { utcDay } from "@/lib/ai/limits";

export const dynamic = "force-dynamic";

/** Default mirror of lib/ai/limits.ts DEFAULT_GLOBAL_CAP for display. */
const DEFAULT_GLOBAL_CAP = 5_000_000;

/** Cap on the per-day rows returned for the "daily totals" table, an
 *  all-time window could otherwise return years of rows. The window's true
 *  totals (totalTok/peakDayTok/activeDays) are computed separately so they
 *  stay accurate even when this table is truncated. */
const DAILY_ROWS_LIMIT = 31;

/** Per-user usage row, summed over the window, as rendered by the dashboard. */
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
  suggests: number;
  suggestInTok: number;
  suggestOutTok: number;
}

export interface AiUsageReport {
  /** Inclusive lower bound of the window, or null for an all-time ("Total")
   *  window with no lower bound. */
  start: string | null;
  /** Inclusive upper bound of the window (UTC day). */
  end: string;
  /** Per-user totals over [start, end], busiest first. */
  users: AiUsageUserRow[];
  /** Site-wide token total per day within the window (newest first, capped at
   *  DAILY_ROWS_LIMIT). */
  daily: { day: string; totalTok: number }[];
  /** Site-wide token total across the whole window. */
  totalTok: number;
  /** Largest single-day site-wide total in the window (for cap context). */
  peakDayTok: number;
  /** Number of distinct days in the window that recorded any usage. */
  activeDays: number;
  /** Per-day site-wide token ceiling, for the cap meter. */
  globalCap: number;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A valid 'YYYY-MM-DD' from the query, or null. */
function readDay(params: URLSearchParams, key: string): string | null {
  const raw = params.get(key);
  return raw && DAY_RE.test(raw) ? raw : null;
}

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const gate = await requireAdmin(env, request);
  if (!gate.ok) return json({ error: gate.message }, gate.status);

  const params = new URL(request.url).searchParams;
  const legacyDay = readDay(params, "day");
  // `day` is the old single-day contract; a window's start/end win when given.
  const end = readDay(params, "end") ?? legacyDay ?? utcDay(Date.now());
  let start = readDay(params, "start") ?? legacyDay; // null ⇒ all-time
  if (start && start > end) start = end; // never let the range invert

  // Optional lower bound: only bind `start` when the range has one. Column
  // references stay identical whether or not the clause is present, so the two
  // tables share the same builder.
  const bound = (col: string) =>
    start ? `${col} <= ? AND ${col} >= ?` : `${col} <= ?`;
  const binds: string[] = start ? [end, start] : [end];

  try {
    const users = await env.DB.prepare(
      `SELECT a.user_id, u.email, u.name, u.plan,
              SUM(a.requests)            AS requests,
              SUM(a.input_tok)           AS input_tok,
              SUM(a.output_tok)          AS output_tok,
              SUM(a.completions)         AS completions,
              SUM(a.completion_in_tok)   AS completion_in_tok,
              SUM(a.completion_out_tok)  AS completion_out_tok,
              SUM(a.suggests)            AS suggests,
              SUM(a.suggest_in_tok)      AS suggest_in_tok,
              SUM(a.suggest_out_tok)     AS suggest_out_tok
       FROM ai_usage_daily a
       JOIN user u ON u.id = a.user_id
       WHERE ${bound("a.day")}
       GROUP BY a.user_id
       ORDER BY (SUM(a.input_tok) + SUM(a.output_tok)
                 + SUM(a.completion_in_tok) + SUM(a.completion_out_tok)
                 + SUM(a.suggest_in_tok) + SUM(a.suggest_out_tok)) DESC
       LIMIT 200`,
    )
      .bind(...binds)
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
        suggests: number;
        suggest_in_tok: number;
        suggest_out_tok: number;
      }>();

    const daily = await env.DB.prepare(
      `SELECT day, total_tok FROM ai_usage_global
       WHERE ${bound("day")}
       ORDER BY day DESC
       LIMIT ${DAILY_ROWS_LIMIT}`,
    )
      .bind(...binds)
      .all<{ day: string; total_tok: number }>();

    const totals = await env.DB.prepare(
      `SELECT COALESCE(SUM(total_tok), 0) AS total_tok,
              COALESCE(MAX(total_tok), 0) AS peak_tok,
              COUNT(*)                    AS active_days
       FROM ai_usage_global
       WHERE ${bound("day")}`,
    )
      .bind(...binds)
      .first<{ total_tok: number; peak_tok: number; active_days: number }>();

    const globalCap =
      Number(env.AI_DAILY_GLOBAL_TOKEN_CAP) > 0
        ? Number(env.AI_DAILY_GLOBAL_TOKEN_CAP)
        : DEFAULT_GLOBAL_CAP;

    const report: AiUsageReport = {
      start,
      end,
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
        suggests: r.suggests,
        suggestInTok: r.suggest_in_tok,
        suggestOutTok: r.suggest_out_tok,
      })),
      daily: (daily.results ?? []).map((r) => ({
        day: r.day,
        totalTok: r.total_tok,
      })),
      totalTok: totals?.total_tok ?? 0,
      peakDayTok: totals?.peak_tok ?? 0,
      activeDays: totals?.active_days ?? 0,
      globalCap,
    };
    return json(report);
  } catch (err) {
    console.error("ai-usage report failed", err);
    return json({ error: "Failed to load AI usage." }, 500);
  }
}
