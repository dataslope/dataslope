/**
 * "Ask AI" quota read: how many chat prompts the signed-in member has left
 * today, so the panel can render a "N prompts left" counter for free members.
 *
 * Read-only (no same-origin gate needed) and cheap — one D1 row lookup. The
 * chat endpoint remains the enforcement point; this is display-only, so the
 * limits come from `limitsForTier` (they don't depend on provider config
 * being present). `force-dynamic` for the same reason as the chat route: it
 * reads the session and per-day counters, so it must run per request.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth/server";
import { resolveTier } from "@/lib/ai/tier";
import { limitsForTier } from "@/lib/ai/models";
import { utcDay } from "@/lib/ai/limits";
import type { AskAiUsageResponse } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  const { env } = getCloudflareContext();
  const auth = await createAuth(env, request);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return json({ error: "Sign in to use Ask AI." }, 401);

  const tier = resolveTier(session.user, env);
  const limits = limitsForTier(tier);

  const usage = await env.DB.prepare(
    "SELECT requests FROM ai_usage_daily WHERE user_id = ? AND day = ?",
  )
    .bind(session.user.id, utcDay(Date.now()))
    .first<{ requests: number }>();

  const requestsUsed = usage?.requests ?? 0;
  const body: AskAiUsageResponse = {
    tier,
    requestsUsed,
    requestsLimit: limits.dailyRequestBudget,
    requestsRemaining: Math.max(0, limits.dailyRequestBudget - requestsUsed),
  };
  return json(body);
}
