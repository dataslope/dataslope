// Abuse / cost controls for "Ask AI", backed by D1 (see migration 0003).
//
// Two per-user daily caps (requests + tokens) and one global daily token
// ceiling as the bounded-downside backstop. These bound spend even if an
// attacker rotates accounts/IPs. Per-MINUTE limiting is intentionally not here
// (D1 write budget) — a Durable Object / the Rate Limiting binding is the right
// tool and is tracked as a follow-up in the implementation report.
import type { ResolvedModel } from "./models";

/** Default global daily token ceiling when AI_DAILY_GLOBAL_TOKEN_CAP is unset. */
const DEFAULT_GLOBAL_CAP = 5_000_000;

/** UTC day string ('YYYY-MM-DD') for a timestamp in ms. */
export function utcDay(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export interface BudgetDecision {
  ok: boolean;
  status?: number;
  message?: string;
}

/** Read-only pre-flight check: is this user (and the site) under budget today? */
export async function checkBudget(
  env: CloudflareEnv,
  userId: string,
  model: ResolvedModel,
  day: string,
): Promise<BudgetDecision> {
  const globalCap =
    Number(env.AI_DAILY_GLOBAL_TOKEN_CAP) > 0
      ? Number(env.AI_DAILY_GLOBAL_TOKEN_CAP)
      : DEFAULT_GLOBAL_CAP;

  const global = await env.DB.prepare(
    "SELECT total_tok FROM ai_usage_global WHERE day = ?",
  )
    .bind(day)
    .first<{ total_tok: number }>();
  if (global && global.total_tok >= globalCap) {
    return {
      ok: false,
      status: 503,
      message: "The assistant is very busy right now. Please try again later.",
    };
  }

  const usage = await env.DB.prepare(
    "SELECT requests, input_tok, output_tok FROM ai_usage_daily WHERE user_id = ? AND day = ?",
  )
    .bind(userId, day)
    .first<{ requests: number; input_tok: number; output_tok: number }>();
  if (usage) {
    if (usage.requests >= model.dailyRequestBudget) {
      return {
        ok: false,
        status: 429,
        message:
          "You've reached today's Ask AI limit. It resets tomorrow — upgrade for a higher limit.",
      };
    }
    if (usage.input_tok + usage.output_tok >= model.dailyTokenBudget) {
      return {
        ok: false,
        status: 429,
        message:
          "You've used today's Ask AI budget. It resets tomorrow — upgrade for a higher limit.",
      };
    }
  }

  return { ok: true };
}

/** Record one request's token usage (per-user + global). Best-effort: run via
 *  ctx.waitUntil so it never blocks the response. */
export async function recordUsage(
  env: CloudflareEnv,
  userId: string,
  day: string,
  inputTok: number,
  outputTok: number,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO ai_usage_daily (user_id, day, requests, input_tok, output_tok)
     VALUES (?, ?, 1, ?, ?)
     ON CONFLICT(user_id, day) DO UPDATE SET
       requests   = requests + 1,
       input_tok  = input_tok + excluded.input_tok,
       output_tok = output_tok + excluded.output_tok`,
  )
    .bind(userId, day, inputTok, outputTok)
    .run();

  await env.DB.prepare(
    `INSERT INTO ai_usage_global (day, total_tok)
     VALUES (?, ?)
     ON CONFLICT(day) DO UPDATE SET total_tok = total_tok + excluded.total_tok`,
  )
    .bind(day, inputTok + outputTok)
    .run();
}
